// server.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const exifr = require("exifr");
const sharp = require("sharp");

const app = express();

// Fixed locations inside the container
const DATA_ROOT = "/data";
const PHOTO_ROOT = path.join(DATA_ROOT, "photos");
const THUMB_ROOT = path.join(DATA_ROOT, "thumbs");
const ABOUT_FILE = path.join(DATA_ROOT, "about.md");

// Ensure folders exist at runtime
for (const dir of [DATA_ROOT, PHOTO_ROOT, THUMB_ROOT]) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    console.error(`Failed to create directory ${dir}:`, err);
  }
}

// serve frontend and assets
app.use(express.static(path.join(__dirname, "public")));
app.use("/photos", express.static(PHOTO_ROOT));
app.use("/thumbs", express.static(THUMB_ROOT));

// list album folders
async function listAlbumFolders() {
  const entries = await fs.promises.readdir(PHOTO_ROOT, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

// sidecar text reader (per photo)
async function readSidecarText(albumPath, filename) {
  const base = path.parse(filename).name;
  const exts = [".md", ".txt"];

  for (const ext of exts) {
    const candidate = path.join(albumPath, `${base}${ext}`);
    try {
      await fs.promises.access(candidate, fs.constants.F_OK);
      const content = await fs.promises.readFile(candidate, "utf8");
      if (content.trim().length > 0) {
        return content;
      }
    } catch (_) {
      // ignore missing files
    }
  }

  return null;
}

// thumbnail generator
async function getOrCreateThumbnail(albumName, filename) {
  const src = path.join(PHOTO_ROOT, albumName, filename);
  const albumThumbDir = path.join(THUMB_ROOT, albumName);

  try {
    await fs.promises.access(albumThumbDir, fs.constants.F_OK);
  } catch (_) {
    await fs.promises.mkdir(albumThumbDir, { recursive: true });
  }

  const dest = path.join(albumThumbDir, filename);

  let needNewThumb = false;

  try {
    const [srcStat, destStat] = await Promise.all([
      fs.promises.stat(src),
      fs.promises.stat(dest),
    ]);

    if (srcStat.mtimeMs > destStat.mtimeMs) {
      needNewThumb = true;
    }
  } catch (_) {
    needNewThumb = true;
  }

  if (needNewThumb) {
    await sharp(src)
      .resize({ width: 900 }) // thumbnail width
      .jpeg({ quality: 65 }) // compressed preview
      .toFile(dest);
  }

  return `/thumbs/${encodeURIComponent(albumName)}/${encodeURIComponent(
    filename
  )}`;
}

// list images inside album
async function listImagesInAlbum(albumName) {
  const albumPath = path.join(PHOTO_ROOT, albumName);
  const entries = await fs.promises.readdir(albumPath, { withFileTypes: true });

  const imageFiles = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => {
      const ext = path.extname(name).toLowerCase();
      return [".jpg", ".jpeg", ".png", ".webp"].includes(ext);
    });

  const photoPromises = imageFiles.map(async (filename) => {
    const fullPath = path.join(albumPath, filename);
    const stats = await fs.promises.stat(fullPath);

    let exif = {};
    try {
      exif =
        (await exifr.parse(fullPath, [
          "Model",
          "Make",
          "LensModel",
          "FNumber",
          "ExposureTime",
          "ISO",
          "FocalLength",
        ])) || {};
    } catch (err) {
      console.warn("EXIF read error:", err.message);
    }

    const camera = exif.Model || exif.Make || null;
    const lens = exif.LensModel || null;
    const aperture = exif.FNumber ? `f/${exif.FNumber}` : null;
    const shutter = exif.ExposureTime ? `${exif.ExposureTime}s` : null;
    const iso = exif.ISO ? `ISO ${exif.ISO}` : null;
    const focalLength = exif.FocalLength ? `${exif.FocalLength}mm` : null;

    const extra = await readSidecarText(albumPath, filename);
    const thumbUrl = await getOrCreateThumbnail(albumName, filename);

    return {
      filename,
      url: `/photos/${encodeURIComponent(albumName)}/${encodeURIComponent(
        filename
      )}`, // full res
      thumbUrl, // preview
      createdAt: stats.birthtimeMs || stats.mtimeMs,
      meta: { camera, lens, aperture, shutter, iso, focalLength },
      extra,
    };
  });

  const photos = await Promise.all(photoPromises);

  photos.sort((a, b) => a.createdAt - b.createdAt);

  return photos;
}

// list albums
app.get("/api/albums", async (req, res) => {
  try {
    const folders = await listAlbumFolders();

    const albums = await Promise.all(
      folders.map(async (name) => {
        const photos = await listImagesInAlbum(name);
        const cover = photos[0] ? photos[0].thumbUrl || photos[0].url : null;
        return {
          name,
          albumId: name,
          cover,
          photoCount: photos.length,
        };
      })
    );

    albums.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ albums });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load albums" });
  }
});

// album detail
app.get("/api/albums/:albumId", async (req, res) => {
  const albumId = req.params.albumId;

  try {
    const albumPath = path.join(PHOTO_ROOT, albumId);
    if (!fs.existsSync(albumPath)) {
      return res.status(404).json({ error: "Album not found" });
    }

    const photos = await listImagesInAlbum(albumId);
    res.json({ album: { name: albumId, albumId }, photos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load album" });
  }
});

// about markdown
app.get("/api/about", async (req, res) => {
  try {
    let markdown =
      "# About\n\nCreate an `about.md` file in the `data` folder (mounted as `/data/about.md`) to customize this page.";

    try {
      const content = await fs.promises.readFile(ABOUT_FILE, "utf8");
      if (content.trim().length > 0) {
        markdown = content;
      }
    } catch (_) {
      // no about.md, use default
    }

    res.json({ markdown });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load about content" });
  }
});

// fallback route
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});