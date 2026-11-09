FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends libreoffice-impress fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
USER node
EXPOSE 8090
CMD ["node", "src/server.js"]