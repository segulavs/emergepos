#!/bin/bash

# Fix frontend dependencies script

set -e

echo "🔧 Fixing frontend dependencies..."

cd frontend

# Remove existing lock files and node_modules
echo "🧹 Cleaning existing dependencies..."
rm -rf node_modules package-lock.json yarn.lock

# Clear npm cache
echo "🗑️  Clearing npm cache..."
npm cache clean --force

# Install dependencies with legacy peer deps
echo "📦 Installing dependencies with legacy peer deps..."
npm install --legacy-peer-deps

echo "✅ Dependencies fixed!"
echo ""
echo "📋 You can now:"
echo "   - Run local development: ./start-dev.sh"
echo "   - Build Docker images: ./local-start.sh"
echo "   - Start frontend dev server: cd frontend && npm start"