# Multi-stage Dockerfile for Node.js Backend Service
# Production-ready with security hardening and optimization

# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install dependencies with clean cache
RUN npm ci --only=production --cache /tmp/.npm \
    && npm cache clean --force \
    && rm -rf /tmp/.npm

# Stage 2: Build (if needed for production builds)
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files and source
COPY package*.json ./
COPY src/ ./src/
COPY --from=deps /app/node_modules ./node_modules

# Build application if needed
RUN npm run build || echo "No build script found, skipping build"

# Stage 3: Production runtime
FROM node:18-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production --cache /tmp/.npm \
    && npm cache clean --force \
    && rm -rf /tmp/.npm

# Copy application code
COPY --from=builder --chown=nodejs:nodejs /app ./
COPY --chown=nodejs:nodejs src/ ./src/

# Create necessary directories
RUN mkdir -p /app/logs /app/data /app/tmp \
    && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Environment variables
ENV NODE_ENV=production \
    PORT=8000 \
    START_WORKER=true

# Start the application
CMD ["node", "src/index.js"]
