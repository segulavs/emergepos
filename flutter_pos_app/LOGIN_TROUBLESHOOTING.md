# Login Troubleshooting Guide

If login is not working after installing the APK, follow these steps:

## Quick Fixes

### 1. Verify Server URL is Correct

The default server URL should be:
```
https://disciplined-recreation-production.up.railway.app/api
```

**Important:** The URL must end with `/api`, not `/login`.

### 2. Check Settings

1. Open the app
2. Go to **Settings** tab (bottom navigation)
3. Check the **Current Server URL** - it should be:
   ```
   https://disciplined-recreation-production.up.railway.app/api
   ```
4. If it's different, click **"Reset to Default"**

### 3. Test Connection

In the Settings screen, you can test the connection by trying to save the URL again.

### 4. Check Network Connection

- Ensure your device has internet connection
- Try accessing the server in a browser:
  ```
  https://disciplined-recreation-production.up.railway.app/api/health
  ```
  This should return: `{"status":"healthy"}`

## Common Issues

### Issue: "Unable to connect to server"

**Possible Causes:**
1. No internet connection
2. Wrong server URL
3. Server is down
4. Firewall blocking the connection

**Solutions:**
- Check internet connection
- Verify server URL in Settings
- Try accessing the server URL in a browser

### Issue: "Authentication failed"

**Possible Causes:**
1. Wrong email/password
2. Server URL is incorrect (pointing to wrong backend)
3. User account doesn't exist

**Solutions:**
- Verify credentials are correct
- Check that server URL points to the correct backend
- Ensure user account exists in the database

### Issue: "404 Not Found" or "Route not found"

**Possible Causes:**
1. Server URL missing `/api` suffix
2. Server URL has extra slashes or incorrect format

**Solutions:**
- Server URL should be: `https://your-server.com/api`
- Not: `https://your-server.com` or `https://your-server.com/login`
- Go to Settings and reset to default

### Issue: SSL Certificate Error

**Possible Causes:**
1. Server using self-signed certificate
2. Certificate expired

**Solutions:**
- This is rare for Railway deployments (they use valid certificates)
- If using a custom domain, ensure SSL is properly configured

## Debugging Steps

### Step 1: Enable Debug Mode

If you have access to the app's logs (via `adb logcat` on Android):

```bash
adb logcat | grep -i "flutter\|api\|login"
```

Look for:
- `API Service initialized with base URL: ...`
- `API Request: POST https://...`
- `API Error: ...`

### Step 2: Check API Configuration

In Settings screen, you'll see:
- **Current Server URL**: The URL being used
- **Default Server**: The default URL configured

### Step 3: Test API Endpoint Directly

Using curl or Postman, test the login endpoint:

```bash
curl -X POST https://disciplined-recreation-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'
```

### Step 4: Verify Backend is Running

Check if the backend is accessible:
```bash
curl https://disciplined-recreation-production.up.railway.app/api/health
```

Should return: `{"status":"healthy"}`

## Expected Behavior

### Correct Configuration

1. **Default URL**: `https://disciplined-recreation-production.up.railway.app/api`
2. **Login Endpoint**: `POST /auth/login`
3. **Full URL**: `https://disciplined-recreation-production.up.railway.app/api/auth/login`

### Login Request Format

The app sends:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Expected Response:
```json
{
  "access_token": "jwt-token-here",
  "user": { ... }
}
```

## Resetting Configuration

If nothing works:

1. Go to **Settings**
2. Click **"Reset to Default"**
3. Restart the app
4. Try logging in again

## Still Having Issues?

1. **Check server logs** on Railway dashboard
2. **Verify backend is running** and accessible
3. **Check network connectivity** on your device
4. **Try a different network** (WiFi vs Mobile data)
5. **Clear app data** (Android: Settings > Apps > POS Mobile > Clear Data)

## Contact Support

If the issue persists, provide:
- Error message from login attempt
- Current Server URL from Settings
- Device and Android version
- Network type (WiFi/Mobile)
- Any relevant logs from `adb logcat`

---

**Default Configuration:**
- Server: `https://disciplined-recreation-production.up.railway.app/api`
- Login Endpoint: `/auth/login`
- Health Check: `/health`
