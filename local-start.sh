#!/bin/bash

# Local development startup script for POS System

set -e

echo "🚀 Starting POS System locally with Docker..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    echo ""
    echo "🔄 Alternative options:"
    echo "   1. Start Docker Desktop and try again"
    echo "   2. Use backend-only mode: ./local-start-backend.sh"
    echo "   3. Use development mode: ./start-dev.sh"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install it first."
    exit 1
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Check if we should fix dependencies first
if [ ! -f "frontend/node_modules/.package-lock.json" ] && [ ! -f "frontend/package-lock.json" ]; then
    echo "🔧 Frontend dependencies need to be fixed first..."
    echo "   This is a one-time setup to resolve dependency conflicts."
    read -p "   Fix dependencies now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./fix-dependencies.sh
    else
        echo "⚠️  Skipping dependency fix. Build may fail."
        echo "   You can fix dependencies later with: ./fix-dependencies.sh"
    fi
fi

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 15

# Check service health
echo "🔍 Checking service health..."
for i in {1..30}; do
    if docker-compose ps | grep -q "Up (healthy)"; then
        echo "✅ Services are healthy!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Services failed to start properly"
        echo "📋 Checking logs..."
        docker-compose logs --tail=20
        echo ""
        echo "🔧 Troubleshooting options:"
        echo "   1. Try backend-only mode: ./local-start-backend.sh"
        echo "   2. Fix dependencies: ./fix-dependencies.sh"
        echo "   3. Check logs: docker-compose logs -f"
        exit 1
    fi
    sleep 2
done

echo ""
echo "🎉 POS System is running locally!"
echo ""
echo "📋 Service URLs:"
echo "   🖥️  Application: http://localhost:8000"
echo "   📊 API Health: http://localhost:8000/api/health"
echo "   📚 API Docs: http://localhost:8000/docs"
echo "   🗄️  MongoDB: mongodb://admin:pos-admin-2024@localhost:27017/pos_system"
echo ""
echo "🔧 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart: docker-compose restart"
echo "   Shell into app: docker-compose exec pos-app bash"
echo "   MongoDB shell: docker-compose exec mongodb mongosh -u admin -p pos-admin-2024"
echo ""
echo "📖 Default credentials:"
echo "   Create a super admin at: http://localhost:8000/api/admin/super-admin?admin_key=stockmaster-admin-2024"