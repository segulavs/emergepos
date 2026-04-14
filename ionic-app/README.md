# EmergePOS Ionic Capacitor Mobile App

This is the mobile application for EmergePOS built with Ionic React and Capacitor.

## Features

- **Cross-platform**: iOS and Android support via Capacitor
- **Modern Stack**: Built with React, TypeScript, and Ionic
- **State Management**: Zustand for state management
- **API Integration**: Full integration with EmergePOS backend API
- **Key Features**:
  - User authentication
  - Point of Sale (POS) interface
  - Product management
  - Transaction history
  - Store selection
  - Dashboard with analytics

## Prerequisites

- Node.js 18+ and npm/yarn
- For iOS development: Xcode (macOS only)
- For Android development: Android Studio

## Installation

1. Install dependencies:
```bash
npm install
# or
yarn install
```

2. Create a `.env` file in the root directory (optional):
```env
VITE_BACKEND_URL=http://your-backend-url:8000
```

For mobile development:
- iOS Simulator: Use `http://localhost:8000`
- Android Emulator: Use `http://10.0.2.2:8000`
- Physical devices: Use your computer's IP address (e.g., `http://192.168.1.100:8000`)

## Development

### Web Development

Run the app in the browser:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

Build the app:
```bash
npm run build
```

### Mobile Development

#### Add Platforms

Add iOS platform:
```bash
npm run cap:add:ios
```

Add Android platform:
```bash
npm run cap:add:android
```

#### Sync Capacitor

After making changes to your web code, sync with native platforms:
```bash
npm run cap:sync
```

#### Open in Native IDEs

Open in Xcode (iOS):
```bash
npm run cap:open:ios
```

Open in Android Studio:
```bash
npm run cap:open:android
```

#### Run on Devices/Emulators

Run on iOS:
```bash
npm run cap:run:ios
```

Run on Android:
```bash
npm run cap:run:android
```

## Project Structure

```
ionic-app/
├── src/
│   ├── components/      # Reusable components
│   ├── lib/             # API services and state management
│   ├── pages/           # Page components
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── capacitor.config.ts  # Capacitor configuration
├── ionic.config.json    # Ionic configuration
├── vite.config.ts      # Vite build configuration
└── package.json        # Dependencies and scripts
```

## Configuration

### Backend URL

The app automatically detects the backend URL:
1. Checks `VITE_BACKEND_URL` environment variable
2. For native platforms, uses platform-specific defaults:
   - iOS: `http://localhost:8000`
   - Android: `http://10.0.2.2:8000`

You can modify this in `src/lib/api.ts`.

### Capacitor Configuration

Edit `capacitor.config.ts` to customize:
- App ID and name
- Server URL for development
- Plugin configurations

## Building for Production

### iOS

1. Build the web app:
```bash
npm run build
```

2. Sync with Capacitor:
```bash
npm run cap:sync
```

3. Open in Xcode:
```bash
npm run cap:open:ios
```

4. In Xcode:
   - Select your signing team
   - Choose a device or simulator
   - Click Run

### Android

1. Build the web app:
```bash
npm run build
```

2. Sync with Capacitor:
```bash
npm run cap:sync
```

3. Open in Android Studio:
```bash
npm run cap:open:android
```

4. In Android Studio:
   - Select a device or emulator
   - Click Run

## Troubleshooting

### Backend Connection Issues

- Ensure your backend is running and accessible
- Check CORS settings on the backend
- Verify the backend URL in `.env` or `src/lib/api.ts`
- For physical devices, ensure your device and computer are on the same network

### Build Issues

- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Capacitor cache: `rm -rf .capacitor`
- Re-sync Capacitor: `npm run cap:sync`

### iOS Issues

- Ensure Xcode Command Line Tools are installed
- Check that CocoaPods is installed: `pod --version`
- Run `pod install` in the `ios/App` directory if needed

### Android Issues

- Ensure Android SDK is properly configured
- Check that JAVA_HOME is set correctly
- Verify Gradle is properly installed

## API Integration

The app uses the same API structure as the web frontend. All API calls are defined in `src/lib/api.ts` and use Axios for HTTP requests.

Authentication tokens are stored in localStorage and automatically included in API requests.

## License

Same as the main EmergePOS project.
