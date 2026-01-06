# 📱 Flutter POS Mobile App Setup Guide

## 🎯 Overview

This Flutter mobile app provides offline-first POS functionality that syncs with your existing POS system backend. It includes:

- **Offline POS Operations**: Process sales without internet connection
- **Automatic Sync**: Syncs transactions when connection is restored
- **Barcode Scanning**: Quick product lookup and adding to cart
- **Role-based Access**: Different interfaces for different user roles
- **Real-time Inventory**: Stock levels update in real-time
- **Receipt Generation**: Print receipts via Bluetooth/USB printers

## 🛠️ Prerequisites

### System Requirements
- Flutter SDK 3.10.0 or higher
- Dart SDK 3.0.0 or higher
- Android Studio / VS Code with Flutter extensions
- Android device/emulator (API level 21+) or iOS device/simulator (iOS 11+)

### Backend Requirements
- Your POS backend must be running (see START_APP_GUIDE.md)
- Backend accessible at: http://localhost:8000 (or your server IP)

## 🚀 Setup Instructions

### Step 1: Install Flutter
```bash
# Download Flutter SDK from https://flutter.dev/docs/get-started/install
# Add Flutter to your PATH

# Verify installation
flutter doctor
```

### Step 2: Setup the Project
```bash
# Navigate to the Flutter app directory
cd flutter_pos_app

# Get dependencies
flutter pub get

# Generate code (for models)
flutter packages pub run build_runner build
```

### Step 3: Configure Backend URL
Edit `lib/services/api_service.dart` and update the base URL:

```dart
// For local development
static const String baseUrl = 'http://10.0.2.2:8000/api'; // Android emulator
// static const String baseUrl = 'http://localhost:8000/api'; // iOS simulator
// static const String baseUrl = 'http://YOUR_SERVER_IP:8000/api'; // Physical device
```

### Step 4: Run the App
```bash
# List available devices
flutter devices

# Run on connected device/emulator
flutter run

# Or run in debug mode
flutter run --debug
```

## 📱 App Features

### 🔐 Authentication
- Login with existing POS system credentials
- Secure token-based authentication
- Auto-logout on token expiration

### 🛒 Point of Sale
- **Product Search**: Search by name, SKU, or barcode
- **Barcode Scanner**: Built-in camera scanner for quick product lookup
- **Shopping Cart**: Add/remove items, adjust quantities
- **Multiple Payment Methods**: Cash, Card, Mobile Money
- **Customer Info**: Optional customer name and phone
- **Discount Application**: Apply discounts to transactions
- **Receipt Generation**: Generate and print receipts

### 📦 Inventory Management
- **Real-time Stock Levels**: View current inventory
- **Stock Alerts**: Low stock and out-of-stock indicators
- **Product Categories**: Browse products by category
- **Product Details**: View product information and images

### 📊 Offline Functionality
- **Local Database**: SQLite for offline data storage
- **Transaction Queue**: Store transactions locally when offline
- **Auto-sync**: Automatic synchronization when connection restored
- **Conflict Resolution**: Handle sync conflicts intelligently
- **Sync Status**: Visual indicators for sync status

### 📈 Analytics (Store Admin+)
- **Sales Reports**: Daily, weekly, monthly sales
- **Product Performance**: Top-selling products
- **Transaction History**: Complete transaction logs
- **Store Performance**: Multi-store analytics

## 🔧 Configuration

### Backend Connection
Update the API base URL in `lib/services/api_service.dart`:

```dart
// For development with local backend
static const String baseUrl = 'http://10.0.2.2:8000/api';

// For production
static const String baseUrl = 'https://your-domain.com/api';
```

### Offline Storage
The app uses SQLite for offline storage. Database is automatically created on first run.

### Sync Settings
Modify sync behavior in `lib/services/sync_service.dart`:

```dart
// Sync interval (default: 5 minutes)
Timer.periodic(const Duration(minutes: 5), (timer) => {});

// Retry attempts for failed syncs
static const int maxRetries = 3;
```

## 📋 User Roles & Permissions

### Cashier
- Process POS transactions
- View product inventory
- Access transaction history
- Basic customer management

### Store Admin
- All Cashier permissions
- Manage store inventory
- View store analytics
- Manage store settings
- Create cashier accounts

### Organization Admin
- All Store Admin permissions
- Manage multiple stores
- View organization analytics
- Manage all users
- Organization settings

## 🧪 Testing

### Login Credentials
Use the same credentials from your backend setup:

| Role | Email | Password |
|------|-------|----------|
| Cashier | cashier@posystem.com | Cashier123! |
| Store Admin | storeadmin@posystem.com | StoreAdmin123! |
| Org Admin | orgadmin@posystem.com | OrgAdmin123! |

### Test Scenarios

1. **Online POS Transaction**
   - Login as Cashier
   - Add products to cart
   - Process payment
   - Verify transaction syncs

2. **Offline POS Transaction**
   - Disconnect internet
   - Process transaction
   - Reconnect internet
   - Verify auto-sync

3. **Barcode Scanning**
   - Use barcode scanner
   - Scan product barcode: 1234567890123
   - Verify Coca Cola product is added

## 🔍 Troubleshooting

### Common Issues

#### 1. Connection Errors
```
Error: Unable to connect to server
```
**Solution**: 
- Verify backend is running at correct URL
- Check firewall settings
- For Android emulator, use `10.0.2.2` instead of `localhost`

#### 2. Build Errors
```
Error: Packages not found
```
**Solution**:
```bash
flutter clean
flutter pub get
flutter packages pub run build_runner build --delete-conflicting-outputs
```

#### 3. Camera Permission (Barcode Scanner)
**Solution**: Add camera permissions to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
```

#### 4. Sync Issues
**Solution**:
- Check internet connection
- Verify backend API is accessible
- Clear app data and re-login

### Debug Commands
```bash
# View logs
flutter logs

# Debug on device
flutter run --debug

# Profile performance
flutter run --profile

# Build release APK
flutter build apk --release
```

## 📦 Building for Production

### Android APK
```bash
# Build release APK
flutter build apk --release

# APK location: build/app/outputs/flutter-apk/app-release.apk
```

### iOS App
```bash
# Build iOS app (requires macOS and Xcode)
flutter build ios --release
```

## 🔄 Sync Architecture

### Data Flow
```
Mobile App (SQLite) ←→ Sync Service ←→ Backend API (MongoDB)
```

### Sync Strategy
1. **Pull Sync**: Download latest products and settings
2. **Push Sync**: Upload offline transactions and changes
3. **Conflict Resolution**: Last-write-wins with timestamps
4. **Incremental Sync**: Only sync changed data

### Offline Capabilities
- ✅ Process POS transactions
- ✅ View product catalog
- ✅ Check inventory levels
- ✅ Generate receipts
- ✅ Queue operations for sync

## 🎨 Customization

### Branding
Update app branding in:
- `lib/utils/app_theme.dart` - Colors and themes
- `android/app/src/main/res/` - Android app icon
- `ios/Runner/Assets.xcassets/` - iOS app icon

### Features
Add custom features by:
1. Creating new screens in `lib/screens/`
2. Adding providers in `lib/providers/`
3. Extending API service in `lib/services/api_service.dart`

## 📞 Support

### Development Help
- Flutter Documentation: https://flutter.dev/docs
- Dart Documentation: https://dart.dev/guides

### Backend Integration
- Ensure backend API endpoints match the mobile app expectations
- Test API endpoints using the backend's Swagger UI at http://localhost:8000/docs

---

**Your Flutter POS mobile app is ready! 📱✨**