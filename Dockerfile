# Use Node 18 LTS on Debian
FROM node:18-bullseye

# Create app directory
WORKDIR /usr/src/app

# Install dependencies (from server/package.json)
COPY server/package*.json ./
RUN npm install --production

# Copy the rest of the server code
COPY server/. .

# Environment defaults inside the container
ENV DATA_ROOT=/data
ENV PHOTO_ROOT=/data/photos
ENV THUMB_ROOT=/data/thumbs
ENV ABOUT_FILE=/data/about.md

# Make sure the data directories exist (in case the volume is empty)
RUN mkdir -p /data/photos /data/thumbs

# Expose app port
EXPOSE 3000

# Start the server via npm
CMD ["npm", "start"]
