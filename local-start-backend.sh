#!/bin/bash

# Backend-only startup script for POS System

set -e

echo "🚀 Starting POS System backend with Docker (frontend separate)..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install it first."
    exit 1
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.backend-only.yml down

# Build and start services
echo "🔨 Building and starting backend services..."
docker-compose -f docker-compose.backend-only.yml up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service health..."
for i in {1..30}; do
    if docker-compose -f docker-compose.backend-only.yml ps | grep -q "(healthy)"; then
        echo "✅ Backend services are healthy!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Services failed to start properly"
        docker-compose -f docker-compose.backend-only.yml logs --tail=20
        exit 1
    fi
    sleep 2
done

echo ""
echo "🎉 POS System backend is running!"
echo ""
echo "📋 Backend URLs:"
echo "   🖥️  API Server: http://localhost:8000"
echo "   📊 API Health: http://localhost:8000/api/health"
echo "   📚 API Docs: http://localhost:8000/docs"
echo "   🗄️  MongoDB: mongodb://admin:pos-admin-2024@localhost:27017/pos_system"
echo ""
echo "🎨 To start the frontend separately:"
echo "   cd frontend"
echo "   npm install --legacy-peer-deps"
echo "   npm start"
echo "   # Frontend will be available at http://localhost:3000"
echo ""
echo "🔧 Useful commands:"
echo "   View logs: docker-compose -f docker-compose.backend-only.yml logs -f"
echo "   Stop services: docker-compose -f docker-compose.backend-only.yml down"
echo "   Restart: docker-compose -f docker-compose.backend-only.yml restart"
echo ""
echo "📖 Default credentials:"
echo "   Create a super admin at: http://localhost:8000/api/admin/super-admin?admin_key=stockmaster-admin-2024"