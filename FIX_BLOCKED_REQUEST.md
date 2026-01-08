# Fixing "ERR_BLOCKED_BY_CLIENT" and "Not found" Errors

## Issues Identified

1. **ERR_BLOCKED_BY_CLIENT**: Browser extension (ad blocker) blocking the request
2. **URL Mismatch**: Frontend at `0.0.0.0:8000` but API trying `localhost:8000`
3. **"Not found"**: Route might not be matching correctly

## Solutions

### 1. Fix URL Mismatch (Already Applied)

The frontend now automatically normalizes `0.0.0.0` to `localhost` to avoid CORS issues.

### 2. Fix ERR_BLOCKED_BY_CLIENT

This error is caused by browser extensions (usually ad blockers) blocking the request.

**Quick Fixes:**

#### Option A: Disable Ad Blocker (Temporary)
- Disable your ad blocker for `localhost` or `0.0.0.0`
- Or use incognito/private mode (extensions are usually disabled)

#### Option B: Access via localhost
Instead of `0.0.0.0:8000`, use:
```
http://localhost:8000
```

#### Option C: Whitelist in Ad Blocker
Add to your ad blocker's whitelist:
- `localhost:8000`
- `0.0.0.0:8000`
- `127.0.0.1:8000`

### 3. Verify Backend is Running

```bash
# Check if backend is running
curl http://localhost:8000/api/health

# Should return: {"status":"healthy",...}
```

### 4. Check Route Registration

The login route should be at: `POST /api/auth/login`

Test it directly:
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
```

### 5. Access the Application Correctly

**Recommended**: Always use `localhost` instead of `0.0.0.0`:

```
✅ http://localhost:8000
❌ http://0.0.0.0:8000
```

### 6. Browser Console Check

Open DevTools (F12) and check:
1. **Console tab**: Look for errors
2. **Network tab**: 
   - Find the `/api/auth/login` request
   - Check the request URL
   - Check if it's blocked (red)
   - Check response status

### 7. Restart Backend

After the fixes, restart the backend:

```bash
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

Then access via: **http://localhost:8000** (not 0.0.0.0)

## Expected Behavior After Fix

1. Open browser to: `http://localhost:8000`
2. Console should show: `[API Config] API_BASE: http://localhost:8000/api`
3. Login request should go to: `http://localhost:8000/api/auth/login`
4. No more "blocked" errors
5. Either success or proper error message (not "Not found")

## Still Having Issues?

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Try different browser** (Chrome, Firefox, Safari)
3. **Check backend logs** for "Login attempt for email: ..."
4. **Verify MongoDB** is running and accessible
5. **Check firewall** isn't blocking port 8000
