#!/bin/sh
set -e

PHOTOS_DIR="/data/photos"
JAPAN_DIR="$PHOTOS_DIR/Japan"
NATURE_DIR="$PHOTOS_DIR/Nature"

# Default to "yes" unless explicitly disabled
STOCK_IMAGES="${STOCK_IMAGES:-yes}"

echo "[entrypoint] STOCK_IMAGES = $STOCK_IMAGES"
echo "[entrypoint] Using photos dir: $PHOTOS_DIR"

mkdir -p "$PHOTOS_DIR"

# If user disabled stock images, skip immediately
if [ "$STOCK_IMAGES" != "yes" ]; then
  echo "[entrypoint] Stock image seeding disabled. Skipping."
  exec "$@"
fi

# Check if photos dir is empty
if [ -z "$(ls -A "$PHOTOS_DIR" 2>/dev/null)" ]; then
  echo "[entrypoint] Photos directory is empty, seeding demo albums..."

  mkdir -p "$JAPAN_DIR" "$NATURE_DIR"

  echo "[entrypoint] Downloading Japan demo photos..."
  wget -q -O "$JAPAN_DIR/sample_photo1.jpeg" "https://raw.githubusercontent.com/tinkernerd/dyna/main/data/photos/Japan/sample_photo1.jpeg"
  wget -q -O "$JAPAN_DIR/sample_photo2.jpg"   "https://raw.githubusercontent.com/tinkernerd/dyna/main/data/photos/Japan/sample_photo2.jpg"
  wget -q -O "$JAPAN_DIR/sample_photo3.jpg"   "https://raw.githubusercontent.com/tinkernerd/dyna/main/data/photos/Japan/sample_photo3.jpg"
  wget -q -O "$JAPAN_DIR/sample_photo4.jpg"   "https://raw.githubusercontent.com/tinkernerd/dyna/main/data/photos/Japan/sample_photo4.jpg"
  wget -q -O "$JAPAN_DIR/sample_photo1.md"    "https://raw.githubusercontent.com/tinkernerd/dyna/main/data/photos/Japan/sample_photo1.md"

  echo "[entrypoint] Downloading Nature demo photos..."
  wget -q -O "$NATURE_DIR/sample_photo1.jpg"  "https://raw.githubusercontent.com/tinkernerd/dyna/main/data/photos/Nature/sample_photo1.jpg"
  wget -q -O "$NATURE_DIR/sample_photo2.jpg"  "https://raw.githubusercontent.com/tinkernerd/dyna/main/data/photos/Nature/sample_photo2.jpg"
  wget -q -O "$NATURE_DIR/sample_photo3.jpg"  "https://raw.githubusercontent.com/tinkernerd/dyna/main/data/photos/Nature/sample_photo3.jpg"

  echo "[entrypoint] Demo photos seeded."
else
  echo "[entrypoint] Photos directory is not empty, skipping seed."
fi

echo "[entrypoint] Starting app: $@"
exec "$@"
