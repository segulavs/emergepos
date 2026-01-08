# Quick Start Guide

## Running the Backend Server

### Step 1: Activate Virtual Environment

```bash
cd backend
source venv/bin/activate
```

You should see `(venv)` in your terminal prompt.

### Step 2: Set Environment Variables (Optional)

If you need to configure MongoDB or other settings:

```bash
export MONGO_URL="mongodb://localhost:27017/pos_system"
export DB_NAME="pos_system"
export JWT_SECRET="pos-system-jwt-secret-change-in-production"
export SUPER_ADMIN_KEY="stockmaster-admin-2024"
export CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000"
```

### Step 3: Start the Server

```bash
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

The `--reload` flag enables auto-reload on code changes.

### Step 4: Access the Application

- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health
- **Frontend** (if built): http://localhost:8000

## Using the Development Script

Alternatively, use the provided script which handles everything:

```bash
# From project root
./start-dev.sh
```

This script will:
1. Create virtual environment if needed
2. Install dependencies
3. Set environment variables
4. Start the server

## Troubleshooting

### ModuleNotFoundError

If you get `ModuleNotFoundError`, make sure:
1. Virtual environment is activated: `source backend/venv/bin/activate`
2. Dependencies are installed: `pip install -r backend/requirements.txt`

### MongoDB Connection Error

Make sure MongoDB is running:
- **Local**: `mongod` or via Docker
- **Docker**: `docker run -d -p 27017:27017 --name mongodb mongo:7.0`
- **Atlas**: Set `MONGO_URL` to your Atlas connection string

### Port Already in Use

If port 8000 is already in use:
```bash
# Use a different port
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

## Deactivating Virtual Environment

When you're done:
```bash
deactivate
```
