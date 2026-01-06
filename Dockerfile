# Multi-stage build for production optimization
FROM node:18-alpine AS frontend-builder

# Set working directory for frontend
WORKDIR /app/frontend

# Copy package files
COPY frontend/package.json frontend/yarn.lock* frontend/package-lock.json* ./

# Clean npm cache and install dependencies
RUN npm cache clean --force && \
    rm -rf node_modules package-lock.json yarn.lock && \
    npm install --legacy-peer-deps

# Copy frontend source
COPY frontend/ .

# Build frontend for production
RUN npm run build

# Python backend stage
FROM python:3.11-slim AS backend

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ .

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/frontend/build ./static

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app
USER app

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Start command
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]