#!/bin/bash

# Script to build frontend and place it in backend/static for same-port serving
# This allows the backend to serve both API and frontend on port 8000

set -e

echo "🔨 Building frontend for backend static serving..."

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Build the frontend
echo "📦 Building React frontend..."
cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📥 Installing frontend dependencies..."
    npm install --legacy-peer-deps
fi

# Build the frontend
echo "🏗️  Building frontend..."
npm run build

# Create backend/static directory if it doesn't exist
cd ..
if [ ! -d "backend/static" ]; then
    echo "📁 Creating backend/static directory..."
    mkdir -p backend/static
fi

# Copy built files to backend/static
echo "📋 Copying built files to backend/static..."
rm -rf backend/static/*
cp -r frontend/build/* backend/static/

echo ""
echo "✅ Frontend built and copied to backend/static!"
echo ""
echo "📁 Directory structure:"
echo "   backend/static/index.html"
echo "   backend/static/static/ (JS, CSS, and other assets)"
echo ""
echo "🚀 You can now start the backend and it will serve the frontend on the same port:"
echo ""
echo "   cd backend"
echo "   uvicorn server:app --host 0.0.0.0 --port 8000 --reload"
echo ""
echo "📋 Access URLs:"
echo "   🌐 Application: http://localhost:8000"
echo "   📚 API Docs: http://localhost:8000/docs"
echo "   🔍 Health Check: http://localhost:8000/api/health"
echo ""
echo "💡 Note: The frontend API client is configured to use the same origin,"
echo "   so no additional configuration is needed!"
