FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN mkdir -p uploads && chown -R node:node /app
USER node
EXPOSE 3005
HEALTHCHECK --interval=30s --timeout=3s CMD wget --no-verbose --tries=1 --spider http://localhost:3005/api/health || exit 1
CMD ["node", "index.js"]
