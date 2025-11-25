FROM node:18-bullseye

WORKDIR /usr/src/app

# Install deps
COPY server/package*.json ./
RUN npm install --production

# Copy app
COPY server/. .

# Install tools for seeding (wget + unzip)
RUN apt-get update && apt-get install -y wget unzip \
    && rm -rf /var/lib/apt/lists/*

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

# Use entrypoint; CMD is still "npm start"
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]
