# Quick Start Guide

## Initial Setup

1. **Install Dependencies**
   ```bash
   cd ionic-app
   npm install
   ```

2. **Configure Backend URL** (Optional)
   
   Create a `.env` file:
   ```env
   VITE_BACKEND_URL=http://your-backend-url:8000
   ```
   
   For mobile development:
   - **iOS Simulator**: `http://localhost:8000`
   - **Android Emulator**: `http://10.0.2.2:8000`
   - **Physical Device**: `http://YOUR_COMPUTER_IP:8000` (e.g., `http://192.168.1.100:8000`)

## Development

### Web Browser
```bash
npm run dev
```
Visit `http://localhost:5173`

### Mobile Development

#### First Time Setup

1. **Build the web app:**
   ```bash
   npm run build
   ```

2. **Add iOS platform:**
   ```bash
   npm run cap:add:ios
   ```

3. **Add Android platform:**
   ```bash
   npm run cap:add:android
   ```

#### Daily Development Workflow

1. **Make changes to your code**

2. **Build:**
   ```bash
   npm run build
   ```

3. **Sync with Capacitor:**
   ```bash
   npm run cap:sync
   ```

4. **Open in native IDE:**
   - iOS: `npm run cap:open:ios`
   - Android: `npm run cap:open:android`

5. **Run from IDE** (Xcode or Android Studio)

## Testing on Physical Devices

### iOS
1. Connect your iPhone/iPad via USB
2. Open Xcode: `npm run cap:open:ios`
3. Select your device from the device dropdown
4. Click Run

### Android
1. Enable USB debugging on your Android device
2. Connect via USB
3. Open Android Studio: `npm run cap:open:android`
4. Select your device from the device dropdown
5. Click Run

## Common Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run cap:sync` - Sync web code with native platforms
- `npm run cap:open:ios` - Open in Xcode
- `npm run cap:open:android` - Open in Android Studio

## Troubleshooting

### Backend Connection
- Ensure backend is running
- Check CORS settings
- Verify network connectivity
- For physical devices, ensure same WiFi network

### Build Errors
- Delete `node_modules` and reinstall
- Clear Capacitor cache: `rm -rf .capacitor`
- Re-sync: `npm run cap:sync`
