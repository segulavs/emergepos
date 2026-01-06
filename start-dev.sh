#!/bin/bash

# Development startup script for POS System (without Docker)

set -e

echo "🚀 Starting POS System in development mode..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install it first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "backend/server.py" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Install backend dependencies
echo "📦 Installing Python dependencies..."
cd backend
if [ ! -d "venv" ]; then
    echo "🐍 Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt

# Set environment variables for development
export MONGO_URL="mongodb://localhost:27017/pos_system"
export DB_NAME="pos_system"
export JWT_SECRET="pos-system-jwt-secret-change-in-production"
export SUPER_ADMIN_KEY="stockmaster-admin-2024"
export CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000"

echo ""
echo "⚠️  Note: This development setup requires MongoDB to be running separately."
echo "   You can:"
echo "   1. Install MongoDB locally: https://docs.mongodb.com/manual/installation/"
echo "   2. Use MongoDB Atlas (cloud): https://www.mongodb.com/atlas"
echo "   3. Use Docker for MongoDB only: docker run -d -p 27017:27017 --name mongodb mongo:7.0"
echo ""

# Start the FastAPI server
echo "🖥️  Starting FastAPI server..."
echo "📋 Server will be available at: http://localhost:8000"
echo "📋 API documentation: http://localhost:8000/docs"
echo "📋 Health check: http://localhost:8000/api/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

uvicorn server:app --host 0.0.0.0 --port 8000 --reload