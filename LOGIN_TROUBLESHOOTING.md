# Login Troubleshooting Guide

## Issue: Login doesn't respond / hangs

### Symptoms
- CSS files load (304 Not Modified)
- Login form doesn't respond when submitted
- No error message appears
- Request seems to hang

### Quick Checks

1. **Check Browser Console**
   - Open Developer Tools (F12)
   - Go to Console tab
   - Look for errors or API request logs
   - Check Network tab to see if request is being made

2. **Check Backend Logs**
   - Look for "Login attempt for email: ..." messages
   - Check for any errors in the backend terminal

3. **Test API Directly**
   ```bash
   curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"test"}'
   ```

### Common Issues

#### 1. **CORS Issues**
If you see CORS errors in console:
- Check `CORS_ORIGINS` environment variable
- Default allows all origins (`*`)
- For same-port setup, CORS shouldn't be an issue

#### 2. **API Base URL Wrong**
Check browser console for the actual request URL:
- Should be: `http://localhost:8000/api/auth/login`
- If different, check `REACT_APP_BACKEND_URL` environment variable

#### 3. **Request Timeout**
- Default timeout is 30 seconds
- If request hangs, check:
  - Is MongoDB running?
  - Is backend server running?
  - Are there network issues?

#### 4. **JavaScript Errors**
- Check browser console for JavaScript errors
- Errors might prevent the request from being sent
- Look for red error messages

### Debugging Steps

1. **Enable Detailed Logging**
   - Browser console now shows API requests/responses
   - Backend logs login attempts
   - Check both for clues

2. **Check Network Tab**
   - Open DevTools → Network tab
   - Try to login
   - Look for `/api/auth/login` request
   - Check:
     - Status code
     - Request/Response headers
     - Response body
     - Timing (pending, failed, etc.)

3. **Verify Backend is Running**
   ```bash
   curl http://localhost:8000/api/health
   ```
   Should return: `{"status":"healthy",...}`

4. **Check MongoDB Connection**
   - Backend logs should show MongoDB connection status on startup
   - If MongoDB is not running, login will fail

### Solutions

#### Solution 1: Rebuild Frontend
If frontend was built before recent changes:
```bash
./build-frontend-for-backend.sh
```

#### Solution 2: Clear Browser Cache
- Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
- Or clear browser cache completely

#### Solution 3: Check Environment Variables
```bash
# Backend
echo $MONGO_URL
echo $CORS_ORIGINS

# Frontend (if running separately)
echo $REACT_APP_BACKEND_URL
```

#### Solution 4: Restart Backend
```bash
# Stop backend (Ctrl+C)
# Then restart
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

### Expected Behavior

**Successful Login:**
1. User enters email/password
2. Clicks "Sign In"
3. Button shows "Signing in..."
4. Console shows: `[API] POST /api/auth/login`
5. Console shows: `[API] Response 200 from /auth/login`
6. Toast notification: "Login successful!"
7. Redirects to `/dashboard`

**Failed Login:**
1. User enters email/password
2. Clicks "Sign In"
3. Button shows "Signing in..."
4. Console shows: `[API] POST /api/auth/login`
5. Console shows: `[API] Response 401 from /auth/login`
6. Toast notification: "Invalid credentials"
7. Button returns to "Sign In"

### Still Not Working?

1. **Check all logs** (browser console + backend terminal)
2. **Test API directly** with curl (see above)
3. **Verify MongoDB** is running and accessible
4. **Check network** - is request actually being sent?
5. **Try different browser** or incognito mode
