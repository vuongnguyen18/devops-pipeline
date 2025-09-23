# Simple production-ish Node image
FROM node:18-alpine
WORKDIR /app

# Install dependencies first (layer cache)
COPY app/package*.json ./
RUN npm ci --only=production

# Copy source
COPY app/ .

ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "start"]
