#!/bin/bash

# MongoDB setup script for development

set -e

echo "🗄️  Setting up MongoDB for POS System..."

# Check if Docker is available
if command -v docker &> /dev/null && docker info > /dev/null 2>&1; then
    echo "🐳 Using Docker to run MongoDB..."
    
    # Stop existing MongoDB container if running
    docker stop pos-mongodb 2>/dev/null || true
    docker rm pos-mongodb 2>/dev/null || true
    
    # Start MongoDB container
    docker run -d \
        --name pos-mongodb \
        -p 27017:27017 \
        -e MONGO_INITDB_ROOT_USERNAME=admin \
        -e MONGO_INITDB_ROOT_PASSWORD=pos-admin-2024 \
        -e MONGO_INITDB_DATABASE=pos_system \
        -v pos_mongodb_data:/data/db \
        mongo:7.0-jammy
    
    echo "✅ MongoDB is running in Docker container"
    echo "📋 Connection: mongodb://admin:pos-admin-2024@localhost:27017/pos_system"
    
elif command -v mongod &> /dev/null; then
    echo "🔧 MongoDB is installed locally"
    echo "📋 Make sure MongoDB is running: sudo systemctl start mongod"
    echo "📋 Connection: mongodb://localhost:27017/pos_system"
    
else
    echo "❌ Neither Docker nor MongoDB is available"
    echo ""
    echo "🛠️  Installation options:"
    echo ""
    echo "1. Install Docker Desktop:"
    echo "   - macOS: https://docs.docker.com/desktop/install/mac-install/"
    echo "   - Windows: https://docs.docker.com/desktop/install/windows-install/"
    echo "   - Linux: https://docs.docker.com/desktop/install/linux-install/"
    echo ""
    echo "2. Install MongoDB locally:"
    echo "   - macOS: brew install mongodb-community"
    echo "   - Ubuntu: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/"
    echo "   - Windows: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/"
    echo ""
    echo "3. Use MongoDB Atlas (cloud):"
    echo "   - Sign up at: https://www.mongodb.com/atlas"
    echo "   - Update MONGO_URL in start-dev.sh with your Atlas connection string"
    exit 1
fi

echo ""
echo "🎉 MongoDB setup complete!"
echo "   You can now run: ./start-dev.sh"