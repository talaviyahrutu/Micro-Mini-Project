# Production Multi-Stage Dockerfile for API Sentinel
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (sqlite3/bcrypt) if needed
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Final runtime image
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime tools
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app /app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

CMD ["npm", "start"]
