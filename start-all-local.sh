#!/bin/bash

# Script to start all services locally (Backend, Frontend, and Ionic App)

set -e

echo "🚀 Starting EmergePOS - All Services Locally"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if MongoDB is running
check_mongodb() {
    if command -v mongosh &> /dev/null; then
        if mongosh --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
            echo -e "${GREEN}✅ MongoDB is running${NC}"
            return 0
        fi
    fi
    
    # Check if Docker MongoDB is running
    if docker ps | grep -q mongodb; then
        echo -e "${GREEN}✅ MongoDB (Docker) is running${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}⚠️  MongoDB is not running${NC}"
    echo "   Starting MongoDB with Docker..."
    docker run -d -p 27017:27017 --name mongodb mongo:7.0 2>/dev/null || {
        if docker ps -a | grep -q mongodb; then
            echo "   Starting existing MongoDB container..."
            docker start mongodb
        fi
    }
    sleep 3
    echo -e "${GREEN}✅ MongoDB started${NC}"
}

# Function to start backend
start_backend() {
    echo ""
    echo -e "${BLUE}📦 Starting Backend Server...${NC}"
    cd backend
    
    # Check if venv exists
    if [ ! -d "venv" ]; then
        echo "   Creating virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate venv and install dependencies
    source venv/bin/activate
    pip install -q -r requirements.txt
    
    # Set environment variables
    export MONGO_URL="mongodb://localhost:27017/pos_system"
    export DB_NAME="pos_system"
    export JWT_SECRET="pos-system-jwt-secret-change-in-production"
    export SUPER_ADMIN_KEY="stockmaster-admin-2024"
    export CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://localhost:5173,http://127.0.0.1:5173"
    
    echo "   Backend will start at: http://localhost:8000"
    echo "   API Docs: http://localhost:8000/docs"
    
    # Start backend in background
    uvicorn server:app --host 0.0.0.0 --port 8000 --reload > ../backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../backend.pid
    cd ..
    
    # Wait for backend to be ready
    echo "   Waiting for backend to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Backend is running (PID: $BACKEND_PID)${NC}"
            return 0
        fi
        sleep 1
    done
    echo -e "${YELLOW}⚠️  Backend may still be starting...${NC}"
}

# Function to start frontend
start_frontend() {
    echo ""
    echo -e "${BLUE}🎨 Starting React Frontend...${NC}"
    cd frontend
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "   Installing dependencies..."
        npm install --legacy-peer-deps
    fi
    
    echo "   Frontend will start at: http://localhost:3000"
    
    # Start frontend in background
    npm start > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../frontend.pid
    cd ..
    
    sleep 5
    echo -e "${GREEN}✅ Frontend is starting (PID: $FRONTEND_PID)${NC}"
}

# Function to start Ionic app
start_ionic() {
    echo ""
    echo -e "${BLUE}📱 Starting Ionic App...${NC}"
    cd ionic-app
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "   Installing dependencies..."
        npm install
    fi
    
    echo "   Ionic app will start at: http://localhost:5173"
    
    # Start Ionic in background
    npm run dev > ../ionic.log 2>&1 &
    IONIC_PID=$!
    echo $IONIC_PID > ../ionic.pid
    cd ..
    
    sleep 3
    echo -e "${GREEN}✅ Ionic app is starting (PID: $IONIC_PID)${NC}"
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    
    if [ -f backend.pid ]; then
        kill $(cat backend.pid) 2>/dev/null || true
        rm backend.pid
    fi
    
    if [ -f frontend.pid ]; then
        kill $(cat frontend.pid) 2>/dev/null || true
        rm frontend.pid
    fi
    
    if [ -f ionic.pid ]; then
        kill $(cat ionic.pid) 2>/dev/null || true
        rm ionic.pid
    fi
    
    echo "✅ All services stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Main execution
echo "Checking prerequisites..."

# Check MongoDB
check_mongodb

# Start all services
start_backend
start_frontend
start_ionic

# Summary
echo ""
echo "=============================================="
echo -e "${GREEN}🎉 All services are starting!${NC}"
echo "=============================================="
echo ""
echo "📋 Service URLs:"
echo "   🖥️  Backend API:    http://localhost:8000"
echo "   📚 API Docs:        http://localhost:8000/docs"
echo "   🎨 React Frontend:  http://localhost:3000"
echo "   📱 Ionic App:       http://localhost:5173"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f backend.log"
echo "   Frontend: tail -f frontend.log"
echo "   Ionic:    tail -f ionic.log"
echo ""
echo "🛑 Press Ctrl+C to stop all services"
echo ""

# Keep script running
wait
