# Fixing "blocked:other" CORS Error

## What is "blocked:other"?

"blocked:other" is a browser error that occurs when a request is blocked by browser security policies, often related to CORS (Cross-Origin Resource Sharing).

## Quick Fixes

### 1. **Check Browser Console**
Open Developer Tools (F12) and check:
- **Console tab**: Look for CORS errors or blocked request messages
- **Network tab**: Check if the request shows as "blocked" or "failed"
- Look for the actual error message

### 2. **Verify Backend is Running**
```bash
# Check if backend is running
curl http://localhost:8000/api/health

# Should return: {"status":"healthy",...}
```

### 3. **Check CORS Configuration**

The backend is configured to allow all origins by default. If you're using same-port setup, CORS shouldn't be an issue.

### 4. **Common Causes**

#### A. Browser Extensions
- Ad blockers
- Privacy extensions
- Security extensions

**Solution**: Try incognito/private mode or disable extensions

#### B. Mixed Content
- HTTP page trying to access HTTPS API (or vice versa)

**Solution**: Use same protocol (both HTTP or both HTTPS)

#### C. Browser Security Policy
- Some browsers block certain requests

**Solution**: Try a different browser

#### D. CORS Preflight Failing
- OPTIONS request failing before actual request

**Solution**: Backend now has explicit OPTIONS handler

### 5. **For Same-Port Setup**

If frontend and backend are on the same port (8000):
- CORS shouldn't be needed (same origin)
- Check that `REACT_APP_BACKEND_URL` is not set (should be empty)
- Verify API calls go to `/api` (relative path)

### 6. **Debug Steps**

1. **Check API Configuration**:
   ```javascript
   // In browser console
   console.log('API_BASE:', window.location.origin + '/api');
   ```

2. **Test API Directly**:
   ```bash
   curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"test"}'
   ```

3. **Check Network Tab**:
   - Open DevTools → Network
   - Try to login
   - Look for `/api/auth/login` request
   - Check:
     - Status (blocked, failed, pending)
     - Request URL
     - Response headers
     - Error message

4. **Check Backend Logs**:
   - Look for "Login attempt for email: ..." message
   - If you don't see it, request isn't reaching backend

### 7. **Temporary Workaround**

If CORS is the issue and you need a quick fix:

```bash
# Start Chrome with disabled security (NOT for production!)
# macOS:
open -na Google\ Chrome --args --user-data-dir=/tmp/chrome_dev --disable-web-security

# Linux:
google-chrome --disable-web-security --user-data-dir=/tmp/chrome_dev

# Windows:
chrome.exe --disable-web-security --user-data-dir=C:\temp\chrome_dev
```

**⚠️ WARNING**: Only use this for development, never in production!

### 8. **Proper Solution**

The backend is now configured with:
- Explicit OPTIONS handler for CORS preflight
- Proper CORS middleware configuration
- Support for all HTTP methods

Restart the backend after the changes:
```bash
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

### 9. **Still Not Working?**

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Try different browser** (Chrome, Firefox, Safari)
3. **Check firewall/antivirus** - might be blocking requests
4. **Check if port 8000 is accessible**:
   ```bash
   lsof -i :8000  # macOS/Linux
   netstat -ano | findstr :8000  # Windows
   ```
