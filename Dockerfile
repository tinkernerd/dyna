# Use Node 18 LTS on Debian
FROM node:18-bullseye

# Create app directory
WORKDIR /usr/src/app

# Install dependencies (from server/package.json)
COPY server/package*.json ./
RUN npm install --production

# Copy the rest of the server code
COPY server/. .

# Install wget for seeding demo photos
RUN apt-get update && apt-get install -y wget \
    && rm -rf /var/lib/apt/lists/*

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose app port
EXPOSE 3000

# Use entrypoint to seed photos, then run npm start
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]
