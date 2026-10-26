# Multi-Stage Dockerfile for API Sentinel Frontend
# Stage 1: Build the Vite + React bundle
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production Nginx Server
FROM nginx:1.25-alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx reverse proxy configuration
COPY nginx.conf /etc/nginx/conf.d/sentinel.conf

# Copy compiled production assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Healthcheck for frontend web server
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
