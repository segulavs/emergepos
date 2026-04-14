# 🚀 Production APK Build Guide - POS Mobile

This guide will help you build a production-ready APK for the POS Mobile app.

## ✅ Pre-Build Checklist

- [x] App name set to "POS Mobile"
- [x] Package name updated to `com.emergepos.mobile`
- [x] ProGuard rules configured
- [x] Build script ready
- [ ] Keystore created (for production signing - optional but recommended)

## 📦 Quick Build (Testing)

For testing without signing, you can build immediately:

```bash
cd flutter_pos_app
./build-apk.sh
# Select option 2 (Release APK)
```

The APK will be at: `build/app/outputs/flutter-apk/app-release.apk`

## 🔐 Production Signing (Recommended)

For production delivery, you should sign the APK with your own keystore:

### Step 1: Create a Keystore

```bash
cd flutter_pos_app/android
keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

You'll be prompted for:
- Keystore password
- Key password
- Your name and organizational information

**⚠️ IMPORTANT:** Save your passwords and keystore file securely. You'll need them for all future updates!

### Step 2: Configure Signing

```bash
# Copy the template
cp key.properties.template key.properties

# Edit key.properties with your values
# nano key.properties  # or use your preferred editor
```

Update `key.properties`:
```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=upload
storeFile=../upload-keystore.jks
```

### Step 3: Build Signed APK

```bash
cd ..  # Back to flutter_pos_app directory
./build-apk.sh
# Select option 2 (Release APK)
```

The signed APK will be ready for distribution!

## 📱 Build Options

### 1. Debug APK (Development)
- Unoptimized, larger size
- Includes debug symbols
- For development testing only

### 2. Release APK (Production) ⭐ Recommended
- Optimized and minified
- Smaller file size
- Ready for distribution
- Location: `build/app/outputs/flutter-apk/app-release.apk`

### 3. Split APKs (Smaller Size)
- Separate APK for each CPU architecture
- Users install only the APK matching their device
- Reduces download size by ~30-40%
- Location: `build/app/outputs/flutter-apk/`

### 4. App Bundle (AAB) - For Play Store
- Required format for Google Play Store
- Google handles APK generation
- Location: `build/app/outputs/bundle/release/app-release.aab`

## 🎯 App Configuration

### Current Settings

- **App Name:** POS Mobile
- **Package ID:** `com.emergepos.mobile`
- **Version:** 1.0.0 (build 1)
- **Min Android:** API 21 (Android 5.0)
- **Target Android:** Latest (API 34+)

### Update Version

Edit `pubspec.yaml`:
```yaml
version: 1.0.1+2
# Format: version_name+build_number
```

Then rebuild the APK.

## 📊 APK Size Optimization

Current optimizations enabled:
- ✅ Code minification (ProGuard)
- ✅ Resource shrinking
- ✅ Multidex support

To reduce size further:
1. Use split APKs: `flutter build apk --split-per-abi --release`
2. Remove unused assets
3. Use WebP format for images
4. Enable R8 full mode (already enabled)

## 📤 Distribution Methods

### 1. Direct Installation
- Share APK file via email/cloud storage
- Users enable "Install from Unknown Sources"
- Install directly on device

### 2. Google Play Store
- Build App Bundle: `flutter build appbundle --release`
- Upload to Play Console
- Follow Play Store guidelines

### 3. Internal Distribution
- Firebase App Distribution
- Enterprise MDM solutions
- Internal download portal

## 🧪 Testing Before Distribution

1. **Install on test device:**
   ```bash
   adb install build/app/outputs/flutter-apk/app-release.apk
   ```

2. **Verify functionality:**
   - [ ] App launches correctly
   - [ ] Login works
   - [ ] POS features functional
   - [ ] Offline mode works
   - [ ] Barcode scanning works (if applicable)
   - [ ] Network requests work

3. **Check logs:**
   ```bash
   adb logcat | grep -i "flutter\|pos"
   ```

## 🔧 Troubleshooting

### Build Fails
```bash
cd android
./gradlew clean
cd ..
flutter clean
flutter pub get
flutter build apk --release
```

### "SDK location not found"
Create `android/local.properties`:
```properties
sdk.dir=/path/to/Android/sdk
```

### APK won't install
- Check if device meets minSdk requirements
- Enable "Install from Unknown Sources"
- Verify APK is not corrupted (re-download)

### App crashes on launch
- Check device logs: `adb logcat`
- Build debug version for more info: `flutter build apk --debug`
- Verify all permissions are granted

## ✅ Pre-Delivery Checklist

Before distributing your APK:

- [ ] App builds successfully
- [ ] APK installs on test devices
- [ ] All features tested and working
- [ ] Backend API connectivity verified
- [ ] Offline functionality tested
- [ ] App icon displays correctly
- [ ] App name shows as "POS Mobile"
- [ ] Version number is correct
- [ ] Keystore configured (if signing)
- [ ] ProGuard rules don't break functionality

## 📝 Next Steps

1. **Build your APK:** `./build-apk.sh`
2. **Test thoroughly** on multiple devices
3. **Distribute** via your chosen method
4. **Monitor** for user feedback and crashes

## 🆘 Need Help?

- Flutter Docs: https://flutter.dev/docs/deployment/android
- Android Signing: https://developer.android.com/studio/publish/app-signing
- Play Store Guide: https://developer.android.com/distribute

---

**Your app is ready for delivery! 🎉**

Build command: `cd flutter_pos_app && ./build-apk.sh`
