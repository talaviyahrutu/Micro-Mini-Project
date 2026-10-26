# Backend Dockerfile for API Sentinel
FROM node:20-alpine AS runner

WORKDIR /app

# Install curl for healthcheck probe
RUN apk add --no-cache curl

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy application source code
COPY src/ ./src/

# Set production environment defaults
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Healthcheck probe using the /healthz endpoint
HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5000/healthz || exit 1

CMD ["node", "src/server.js"]
