# ==============================================================================
# Dockerfile — React Frontend (Multi-stage Build)
# EV Telematics Platform | Production Build
# Stage 1: Build the React app with Node
# Stage 2: Serve the static bundle with Nginx Alpine
# ==============================================================================

# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first (layer cache optimization)
COPY package.json package-lock.json ./

# Install dependencies with clean install for reproducible builds
RUN npm ci --silent

# Copy source code
COPY . .

# Set production API base URL — in production, Nginx proxies /api to backend
# so the frontend just calls relative /api/* paths
ENV VITE_API_BASE_URL=/api \
    VITE_ENV=production \
    VITE_ENABLE_API_LOGS=false \
    NODE_OPTIONS=--max-old-space-size=1536

# Build the production bundle
RUN npm run build

# ── Stage 2: Serve ───────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

# Remove default nginx configuration
RUN rm -rf /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*

# Copy the built React app from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# The nginx.conf is mounted via docker-compose from deploy/nginx.conf
# This keeps the config outside the image for easy updates

EXPOSE 80

# Nginx runs in the foreground
CMD ["nginx", "-g", "daemon off;"]
