# Same-Port Setup Guide

This guide explains how to run the backend and frontend on the same port (8000).

## Overview

The backend (FastAPI) can serve both the API and the frontend static files on port 8000. This is useful for:
- Simplified deployment
- No CORS issues
- Single port to manage
- Production-like local development

## Quick Start

### Step 1: Build the Frontend

Run the build script to compile the React app and copy it to the backend:

```bash
./build-frontend-for-backend.sh
```

This will:
1. Install frontend dependencies (if needed)
2. Build the React application
3. Copy the build output to `backend/static/`

### Step 2: Start the Backend

```bash
cd backend
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

### Step 3: Access the Application

- **Frontend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health

## How It Works

1. **Static File Serving**: The backend serves static files from `backend/static/` directory
2. **SPA Routing**: All non-API routes serve `index.html` for React Router
3. **API Routes**: All `/api/*` routes are handled by FastAPI
4. **Frontend API Client**: Configured to use same origin (no CORS needed)

## Directory Structure

After building, your `backend/static/` directory should look like:

```
backend/static/
├── index.html
├── static/
│   ├── css/
│   ├── js/
│   └── media/
├── manifest.json
└── favicon.ico
```

## Configuration

### Frontend API Configuration

The frontend is already configured to work with same-origin requests. In `frontend/src/lib/api.js`:

```javascript
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
export const API_BASE = `${BACKEND_URL}/api`;
```

When `BACKEND_URL` is empty (default), it uses the same origin, so:
- Frontend at: `http://localhost:8000`
- API calls go to: `http://localhost:8000/api`

### Backend Static Serving

The backend automatically detects and serves static files if `backend/static/` exists:

```python
STATIC_DIR = ROOT_DIR / "static"  # backend/static
if STATIC_DIR.exists():
    # Mount static assets
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR / "static")))
    
    # Serve SPA for all non-API routes
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # ... serves index.html for SPA routing
```

## Development Workflow

### Option 1: Rebuild After Changes

After making frontend changes:

```bash
./build-frontend-for-backend.sh
# Backend will auto-reload (if using --reload flag)
```

### Option 2: Separate Development (Recommended for Active Development)

For active frontend development, run them separately:

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
# Frontend runs on http://localhost:3000
# API calls proxy to http://localhost:8000
```

Set environment variable for frontend:
```bash
export REACT_APP_BACKEND_URL=http://localhost:8000
npm start
```

## Troubleshooting

### Frontend Not Loading

1. **Check if static directory exists:**
   ```bash
   ls -la backend/static/
   ```

2. **Rebuild the frontend:**
   ```bash
   ./build-frontend-for-backend.sh
   ```

3. **Check backend logs** for static file serving messages

### API Calls Failing

1. **Check CORS configuration** in `backend/server.py`
2. **Verify API base URL** in browser DevTools Network tab
3. **Check backend is running** on port 8000

### 404 Errors on Routes

This is normal for React Router. The backend serves `index.html` for all non-API routes, and React Router handles the routing client-side.

## Production Deployment

In production (Docker, Railway, etc.), the frontend is built during the Docker build process and copied to `backend/static/`. See `Dockerfile.local` for reference.

## Alternative: Different Ports

If you prefer to run frontend and backend on different ports:

1. **Backend**: Port 8000 (default)
2. **Frontend**: Port 3000 (React dev server)

Set environment variable:
```bash
export REACT_APP_BACKEND_URL=http://localhost:8000
```

This is the default setup when using `start-dev.sh` or `local-start-backend.sh`.
