#!/bin/sh
set -e

PHOTOS_DIR=${PHOTOS_DIR:-/data/photos}
STOCK_PHOTOS_URL=${STOCK_PHOTOS_URL:-""}

echo "[entrypoint] Using photos dir: $PHOTOS_DIR"

# Ensure base dir exists
mkdir -p "$PHOTOS_DIR"

# Check if directory is empty
if [ -z "$(ls -A "$PHOTOS_DIR" 2>/dev/null)" ]; then
  echo "[entrypoint] Photos directory is empty."

  if [ -n "$STOCK_PHOTOS_URL" ]; then
    echo "[entrypoint] Seeding stock photos from: $STOCK_PHOTOS_URL"

    tmpdir=$(mktemp -d)
    cd "$tmpdir"

    # Download archive (zip or tar) – you choose the format/URL
    wget -O photos.zip "$STOCK_PHOTOS_URL"

    # Adjust this depending on what you download
    unzip -q photos.zip

    # Try to move everything under the first folder into PHOTOS_DIR
    first_subdir=$(find . -mindepth 1 -maxdepth 1 -type d | head -n 1)

    if [ -n "$first_subdir" ]; then
      mv "$first_subdir"/* "$PHOTOS_DIR"/
    else
      mv ./* "$PHOTOS_DIR"/
    fi

    cd /
    rm -rf "$tmpdir"

    echo "[entrypoint] Stock photos seeded into $PHOTOS_DIR"
  else
    echo "[entrypoint] STOCK_PHOTOS_URL not set; skipping stock photo seed."
  fi
else
  echo "[entrypoint] Photos directory is not empty; skipping stock photo seed."
fi

echo "[entrypoint] Starting app: $@"
exec "$@"
