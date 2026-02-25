# AGENTS.md

## Cursor Cloud specific instructions

### Architecture overview
This is a POS & Inventory Management System with three main components:
- **Backend**: FastAPI (Python) at `backend/server.py` — single-file monolith (~5000 lines), runs on port 8000
- **Frontend**: React 19 (CRA + CRACO) in `frontend/`, runs on port 3000
- **Database**: MongoDB 7.0, runs on port 27017

The Flutter mobile app (`flutter_pos_app/`) is a separate client that connects to the same backend API.

### Flutter app specifics
- **Build/analyze**: `flutter analyze` (requires Flutter SDK 3.10+). Web: `flutter build web`. Android: `flutter build apk`.
- **JSON serialization uses `fieldRename: FieldRename.snake`**: The backend returns snake_case JSON. The models use `@JsonSerializable(fieldRename: FieldRename.snake)` and `.g.dart` files are pre-generated (no need to run `build_runner`).
- **Receipt printing**: Uses `esc_pos_utils` / `esc_pos_printer` for ESC/POS thermal printer support. Printer IP is configured in the Settings screen.
- **CORS for Flutter web testing**: When testing the Flutter web build against the backend, add `http://localhost:8080` (or whichever port the web build is served on) to the backend's `CORS_ORIGINS` env var.

### Running services

1. **MongoDB**: Start via Docker before backend:
   ```
   sudo docker start pos-mongodb || sudo docker run -d --name pos-mongodb -p 27017:27017 -e MONGO_INITDB_DATABASE=pos_system mongo:7.0-jammy
   ```
2. **Backend**: From `backend/`, activate venv and run:
   ```
   source venv/bin/activate
   export MONGO_URL="mongodb://localhost:27017/pos_system"
   export DB_NAME="pos_system"
   export JWT_SECRET="pos-system-jwt-secret-change-in-production"
   export SUPER_ADMIN_KEY="stockmaster-admin-2024"
   export CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000"
   uvicorn server:app --host 0.0.0.0 --port 8000 --reload
   ```
3. **Frontend**: From `frontend/`:
   ```
   BROWSER=none REACT_APP_BACKEND_URL=http://localhost:8000 npm start
   ```

### Key gotchas

- **Frontend installs require `--legacy-peer-deps`**: The React 19 + CRA 5 combination has peer dependency conflicts. Always use `npm install --legacy-peer-deps`.
- **No conftest.py for backend tests**: The `tests/test_health.py` expects a `client` fixture (FastAPI TestClient) but no `conftest.py` exists. Tests will fail with "fixture 'client' not found" until one is created.
- **httpx required for tests**: The test client (`starlette.testclient`) requires `httpx`, which is not in `requirements.txt`. Install it with `pip install httpx` before running tests.
- **Frontend has no tests**: No test files exist under `frontend/src/`. Running `npm test` will exit with code 1 ("No tests found").
- **Docker daemon needs manual start**: In cloud agent VMs, run `sudo dockerd > /tmp/dockerd.log 2>&1 &` and wait ~5s before Docker commands.
- **MongoDB runs without auth in dev**: The `start-dev.sh` script connects to `mongodb://localhost:27017/pos_system` (no auth). The `docker-compose.yml` uses auth credentials—these are separate configurations.

### Lint & format (backend)
- `flake8 server.py` — linter (pre-existing style issues exist in the codebase)
- `black --check server.py` — format checker
- `isort --check server.py` — import sort checker

### API docs
When backend is running: http://localhost:8000/docs (Swagger UI), http://localhost:8000/redoc
