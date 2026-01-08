# Debugging "Failed to load stores" Error

## Issue
Cannot see stores on `/stores` page, getting "Failed to load stores" or "Not authenticated" error.

## Quick Checks

### 1. Check Browser Console (F12 → Console)
Look for:
- `[Stores] Loading stores...`
- `[API] GET /api/stores`
- `[API] Request headers:` - Should show `Authorization: Bearer ...`
- Any error messages

### 2. Check if Token Exists
In browser console, run:
```javascript
localStorage.getItem('pos_token')
localStorage.getItem('pos_user')
```

If both are `null`, you need to log in again.

### 3. Test API Directly
```bash
# Get token from browser localStorage
TOKEN="your_token_here"

# Test stores endpoint
curl -X GET http://localhost:8000/api/stores \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### 4. Check Backend Logs
Look for:
- `Getting stores for user: ...`
- `Found X stores for organization ...`
- Any authentication errors

## Common Issues & Solutions

### Issue 1: "Not authenticated"
**Cause**: Token not being sent or invalid

**Solutions**:
1. **Log out and log in again** - This will refresh the token
2. **Check token in localStorage**:
   ```javascript
   // In browser console
   console.log('Token:', localStorage.getItem('pos_token'));
   ```
3. **Clear and re-login**:
   ```javascript
   // In browser console
   localStorage.clear();
   // Then log in again
   ```

### Issue 2: "No organization associated"
**Cause**: User account doesn't have `organization_id`

**Solutions**:
1. **Check user role**:
   - `org_admin` should have `organization_id` automatically
   - `super_admin` might not have one (they manage all orgs)
2. **Create organization** (if super_admin)
3. **Link user to organization** (admin task)

### Issue 3: No stores in database
**Cause**: No stores have been created yet

**Solutions**:
1. **Create a store**:
   - Click "+ Add Store" button
   - Fill in store details
   - Save
2. **Check if you have permission**:
   - Only `super_admin` and `org_admin` can create stores
   - `store_admin` and `cashier` can only view assigned stores

### Issue 4: Token expired
**Cause**: JWT token has expired (default: 24 hours)

**Solutions**:
1. **Log out and log in again**
2. **Check token expiration** (if you have access to backend logs)

## Step-by-Step Debugging

1. **Open browser console** (F12)
2. **Go to Stores page** (`/stores`)
3. **Check console logs**:
   - Should see `[Stores] Loading stores...`
   - Should see `[API] GET ...` with token
   - Check for any errors

4. **Check Network tab**:
   - Find `/api/stores` request
   - Check:
     - Status code (200 = success, 401 = auth error, 400 = bad request)
     - Request headers (should have `Authorization: Bearer ...`)
     - Response body (error message)

5. **Check backend terminal**:
   - Should see: `Getting stores for user: ...`
   - Check for any errors

## Expected Behavior

**Successful Load**:
- Console: `[Stores] Response: {data: [...]}`
- Page shows stores in grid
- No error toasts

**No Stores**:
- Console: `[Stores] No stores found`
- Toast: "No stores found. Create your first store to get started."
- Page shows: "No stores found. Create your first store!"

**Auth Error**:
- Console: `[Stores] Failed to load stores: ...`
- Toast: "Authentication failed. Please log out and log in again."
- Auto-redirect to login after 2 seconds

## Still Not Working?

1. **Clear browser data**:
   - Clear localStorage
   - Clear cookies
   - Hard refresh (Ctrl+Shift+R)

2. **Check user account**:
   - Verify user has `organization_id`
   - Verify user role allows viewing stores

3. **Check MongoDB**:
   - Verify stores collection has data
   - Verify stores have correct `organization_id`

4. **Try different browser** or incognito mode
