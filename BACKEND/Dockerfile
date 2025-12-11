# Multi-stage build for optimized image size and build time

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Build (if needed for any build steps)
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
# Install all dependencies including devDependencies for building
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy package files
COPY package*.json ./

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Set working directory to backend root
WORKDIR /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Install curl for healthcheck
USER root
RUN apk add --no-cache curl
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"]

