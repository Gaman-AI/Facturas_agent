# Multi-stage Dockerfile for Node.js Backend Service with Python OCR Support
# Production-ready with security hardening and optimization

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install system dependencies including Python for OCR
RUN apk add --no-cache \
    python3 \
    python3-dev \
    py3-pip \
    make \
    g++ \
    gcc \
    musl-dev \
    linux-headers \
    libffi-dev \
    openssl-dev \
    && rm -rf /var/cache/apk/*

# Create symlinks for python
RUN ln -sf python3 /usr/bin/python && \
    ln -sf pip3 /usr/bin/pip

# Copy package files
COPY package*.json ./

# Install dependencies with clean cache
RUN npm ci --only=production --cache /tmp/.npm \
    && npm cache clean --force \
    && rm -rf /tmp/.npm

# Stage 2: Python dependencies
FROM deps AS python-deps
COPY requirements.txt requirements_ocr.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir -r requirements_ocr.txt

# Stage 3: Build (if needed for production builds)
FROM python-deps AS builder
WORKDIR /app

# Copy package files and source
COPY package*.json ./
COPY src/ ./src/
COPY --from=deps /app/node_modules ./node_modules

# Build application if needed
RUN npm run build || echo "No build script found, skipping build"

# Stage 4: Production runtime
FROM builder AS runner
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
RUN mkdir -p /app/logs /app/data /app/tmp /app/uploads \
    && chown -R nodejs:nodejs /app

# Set proper permissions for Python scripts
RUN chmod +x /app/src/services/run_ocr.py 2>/dev/null || true

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Environment variables
ENV NODE_ENV=production \
    PORT=8080 \
    START_WORKER=true \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Start the application
CMD ["node", "src/index.js"]
