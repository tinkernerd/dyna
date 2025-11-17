const albumListEl = document.getElementById("album-list");
const albumTitleEl = document.getElementById("album-title");
const albumCountEl = document.getElementById("album-count");
const photoGridEl = document.getElementById("photo-grid");

const lightboxEl = document.getElementById("lightbox");
const lightboxImgEl = document.getElementById("lightbox-image");
const lightboxMetaEl = document.getElementById("lightbox-meta");
const lightboxCloseEl = document.getElementById("lightbox-close");

const aboutLinkEl = document.getElementById("about-link");
const aboutSectionEl = document.getElementById("about-section");
const aboutBodyEl = document.getElementById("about-body");

let currentAlbumId = null;
let aboutLoaded = false;

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return await res.json();
}

// parse sidecar "extra" text into location + description
function parseExtra(extraRaw) {
  let locationText = null;
  let descriptionText = null;

  if (!extraRaw) return { locationText, descriptionText };

  const raw = extraRaw.trim();
  if (!raw) return { locationText, descriptionText };

  const lines = raw.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (/^location:/i.test(line)) {
      line = line.replace(/^location:\s*/i, "");

      let descPart = "";
      const takenIndex = line.search(/\bTaken\b/i);
      if (takenIndex !== -1) {
        descPart = line.slice(takenIndex).trim();
        line = line.slice(0, takenIndex).trim();
      }

      if (line) {
        locationText = line;
      }

      if (descPart) {
        lines[i] = descPart;
      } else {
        lines.splice(i, 1);
      }
      break;
    }
  }

  const remaining = lines.join("\n").trim();
  if (remaining) {
    descriptionText = remaining;
  }

  return { locationText, descriptionText };
}

async function loadAlbums() {
  try {
    const data = await fetchJSON("/api/albums");
    renderAlbumList(data.albums);
    if (data.albums.length > 0) {
      selectAlbum(data.albums[0].albumId);
    } else {
      albumTitleEl.textContent = "No albums yet";
      albumCountEl.textContent = "Drop folders into the photos directory.";
      photoGridEl.innerHTML = "";
    }
  } catch (err) {
    console.error(err);
    albumTitleEl.textContent = "Error loading albums";
  }
}

function renderAlbumList(albums) {
  albumListEl.innerHTML = "";
  albums.forEach(album => {
    const item = document.createElement("button");
    item.className = "album-item";
    item.dataset.albumId = album.albumId;

    const title = document.createElement("div");
    title.className = "album-item-title";
    title.textContent = album.name;

    const count = document.createElement("div");
    count.className = "album-item-count";
    count.textContent = album.photoCount === 1
      ? "1 photo"
      : `${album.photoCount} photos`;

    item.appendChild(title);
    item.appendChild(count);

    item.addEventListener("click", () => selectAlbum(album.albumId));
    albumListEl.appendChild(item);
  });
}

async function selectAlbum(albumId) {
  if (albumId === currentAlbumId) return;
  currentAlbumId = albumId;

  aboutLinkEl.classList.remove("active");
  aboutSectionEl.classList.add("hidden");
  photoGridEl.style.display = "";

  [...albumListEl.querySelectorAll(".album-item")].forEach(el => {
    el.classList.toggle("active", el.dataset.albumId === albumId);
  });

  albumTitleEl.textContent = "Loading...";
  albumCountEl.textContent = "";
  photoGridEl.innerHTML = "";

  try {
    const data = await fetchJSON(`/api/albums/${encodeURIComponent(albumId)}`);
    albumTitleEl.textContent = data.album.name;
    const count = data.photos.length;
    albumCountEl.textContent = count === 1 ? "1 photo" : `${count} photos`;
    renderPhotos(data.photos);
  } catch (err) {
    console.error(err);
    albumTitleEl.textContent = "Failed to load album";
  }
}

function renderPhotos(photos) {
  photoGridEl.innerHTML = "";

  photos.forEach(photo => {
    const card = document.createElement("article");
    card.className = "photo-card";

    const wrapper = document.createElement("div");
    wrapper.className = "photo-card-image-wrapper";

    const img = document.createElement("img");
    img.src = photo.thumbUrl || photo.url;
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener("click", () => openLightbox(photo));

    wrapper.appendChild(img);
    card.appendChild(wrapper);

    const { locationText, descriptionText } = parseExtra(photo.extra);

    const metaBar = document.createElement("div");
    metaBar.className = "photo-meta";

    const bits = [];
    const m = photo.meta || {};
    if (m.camera) bits.push(m.camera);
    if (m.lens) bits.push(m.lens);
    if (m.focalLength) bits.push(m.focalLength);
    if (m.aperture) bits.push(m.aperture);
    if (m.shutter) bits.push(m.shutter);
    if (m.iso) bits.push(m.iso);

    bits.forEach(text => {
      const pill = document.createElement("span");
      pill.className = "meta-pill";
      pill.textContent = text;
      metaBar.appendChild(pill);
    });

    if (locationText) {
      const locPill = document.createElement("span");
      locPill.className = "meta-pill meta-location";
      locPill.textContent = `Location: ${locationText}`;
      metaBar.appendChild(locPill);
    }

    if (bits.length === 0 && !locationText) {
      const empty = document.createElement("span");
      empty.className = "meta-empty";
      empty.textContent = "Camera data unavailable ";
      metaBar.appendChild(empty);
    }

    card.appendChild(metaBar);

    if (descriptionText) {
      const extra = document.createElement("div");
      extra.className = "photo-extra";
      extra.textContent = descriptionText;
      card.appendChild(extra);
    }

    photoGridEl.appendChild(card);
  });
}

// about page

async function showAbout() {
  currentAlbumId = null;

  [...albumListEl.querySelectorAll(".album-item")].forEach(el => {
    el.classList.remove("active");
  });

  aboutLinkEl.classList.add("active");
  aboutSectionEl.classList.remove("hidden");
  photoGridEl.style.display = "none";

  albumTitleEl.textContent = "About";
  albumCountEl.textContent = "";

  if (!aboutLoaded) {
    try {
      const data = await fetchJSON("/api/about");
      const md = data.markdown || "";
      if (window.marked) {
        aboutBodyEl.innerHTML = window.marked.parse(md);
      } else {
        aboutBodyEl.textContent = md;
      }
      aboutLoaded = true;
    } catch (err) {
      console.error(err);
      aboutBodyEl.textContent = "Could not load about content.";
    }
  }
}

aboutLinkEl.addEventListener("click", showAbout);

// lightbox

function openLightbox(photo) {
  lightboxImgEl.src = photo.url;

  const m = photo.meta || {};
  const parts = [];
  if (m.camera) parts.push(m.camera);
  if (m.lens) parts.push(m.lens);
  if (m.focalLength) parts.push(m.focalLength);
  if (m.aperture) parts.push(m.aperture);
  if (m.shutter) parts.push(m.shutter);
  if (m.iso) parts.push(m.iso);

  const { locationText } = parseExtra(photo.extra);
  if (locationText) {
    parts.push(`Location: ${locationText}`);
  }

  if (parts.length > 0) {
    lightboxMetaEl.textContent = parts.join(" · ");
    lightboxMetaEl.classList.remove("meta-empty");
  } else {
    lightboxMetaEl.textContent = "no camera data";
    lightboxMetaEl.classList.add("meta-empty");
  }

  lightboxEl.classList.remove("hidden");
}

function closeLightbox() {
  lightboxEl.classList.add("hidden");
  lightboxImgEl.src = "";
  lightboxMetaEl.textContent = "";
  lightboxMetaEl.classList.remove("meta-empty");
}

lightboxCloseEl.addEventListener("click", closeLightbox);
lightboxEl.addEventListener("click", event => {
  if (event.target === lightboxEl) closeLightbox();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeLightbox();
});

// init
loadAlbums();
