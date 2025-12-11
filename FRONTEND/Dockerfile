# Multi-stage build for optimized image size and build time

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
# Install dependencies
RUN npm ci && npm cache clean --force

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code and config files
COPY . .

# Build argument for API base URL
ARG VITE_API_BASE_URL=http://backend:3000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build the application
RUN npm run build

# Stage 3: Production (using nginx for serving static files)
FROM nginx:alpine AS runner

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create a custom nginx config for SPA routing
# Note: API calls are made directly to backend using VITE_API_BASE_URL from build
# This nginx config only handles frontend routing
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    # Optional: Proxy API requests if needed (uncomment if frontend should proxy) \
    # location /api { \
    #     proxy_pass http://backend:3000; \
    #     proxy_http_version 1.1; \
    #     proxy_set_header Upgrade $http_upgrade; \
    #     proxy_set_header Connection "upgrade"; \
    #     proxy_set_header Host $host; \
    #     proxy_set_header X-Real-IP $remote_addr; \
    #     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
    #     proxy_set_header X-Forwarded-Proto $scheme; \
    # } \
}' > /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

