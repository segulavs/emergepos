# 🚀 How to Start the POS System Locally

## Prerequisites
- Docker Desktop installed and running
- Node.js 18+ installed
- Git (optional, for version control)

## Option 1: Quick Start (Recommended)

### Step 1: Start Backend Services
```bash
# Navigate to project directory
cd /path/to/your/pos-system

# Start backend with MongoDB
./local-start-backend.sh
```

This will:
- Start MongoDB database
- Start FastAPI backend on port 8000
- Show health check status
- Display connection URLs

### Step 2: Start Frontend
```bash
# Open a new terminal window
cd frontend

# Install dependencies (first time only)
npm install --legacy-peer-deps

# Start development server
npm start
```

The frontend will be available at: http://localhost:3000

## Option 2: Full Docker Environment

### Single Command Start
```bash
# Start everything with Docker
./local-start.sh
```

This starts both frontend and backend in containers.

## Option 3: Development Mode (Separate Services)

### Terminal 1 - Backend
```bash
./local-start-backend.sh
```

### Terminal 2 - Frontend
```bash
cd frontend
npm start
```

## 🔍 Verify Everything is Running

### Check Backend Health
```bash
curl http://localhost:8000/api/health
```
Should return: `{"status":"healthy","timestamp":"...","version":"1.0.0"}`

### Check Frontend
Open browser to: http://localhost:3000

### Check API Documentation
Visit: http://localhost:8000/docs

## 🔐 Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@posystem.com | SuperAdmin123! |
| Org Admin | orgadmin@posystem.com | OrgAdmin123! |
| Store Admin | storeadmin@posystem.com | StoreAdmin123! |
| Cashier | cashier@posystem.com | Cashier123! |

## 🛑 Stop the Application

### Stop Backend Services
```bash
docker-compose -f docker-compose.backend-only.yml down
```

### Stop Frontend
Press `Ctrl+C` in the terminal running `npm start`

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 8000 (backend)
lsof -ti:8000 | xargs kill -9

# Kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9
```

### Docker Issues
```bash
# Reset Docker environment
docker-compose -f docker-compose.backend-only.yml down -v
docker system prune -f
```

### Frontend Dependency Issues
```bash
# Fix dependencies
./fix-dependencies.sh
```

### MongoDB Connection Issues
```bash
# Restart MongoDB
./local-start-backend.sh
```

## 📊 System URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health
- **MongoDB**: mongodb://admin:pos-admin-2024@localhost:27017/pos_system

## 🎯 Next Steps

1. Login to http://localhost:3000 with any credentials above
2. Explore different user interfaces based on roles
3. Test POS functionality with the sample Coca Cola product
4. Add more products and process transactions
5. View analytics and reports

---

**Your POS system is now running locally! 🎉**