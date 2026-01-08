# 📦 Building Android APK - Complete Guide

This guide explains how to build standalone Android APK files for the Flutter POS app.

## 🚀 Quick Start

### Option 1: Using the Build Script (Recommended)

```bash
cd flutter_pos_app
./build-apk.sh
```

The script will:
- Check Flutter installation
- Clean previous builds
- Get dependencies
- Let you choose build type (Debug/Release/Split APKs/App Bundle)
- Generate the APK file

### Option 2: Manual Build Commands

#### Build Release APK (Production)
```bash
cd flutter_pos_app
flutter clean
flutter pub get
flutter build apk --release
```

The APK will be located at:
```
build/app/outputs/flutter-apk/app-release.apk
```

#### Build Debug APK (Testing)
```bash
flutter build apk --debug
```

APK location:
```
build/app/outputs/flutter-apk/app-debug.apk
```

#### Build Split APKs (Smaller File Size)
```bash
flutter build apk --split-per-abi --release
```

This creates separate APKs for different CPU architectures:
- `app-armeabi-v7a-release.apk` (32-bit ARM devices)
- `app-arm64-v8a-release.apk` (64-bit ARM devices - most modern devices)
- `app-x86_64-release.apk` (64-bit x86 devices - emulators)

**Note:** Users only need to install the APK that matches their device's architecture.

#### Build App Bundle (AAB) for Google Play Store
```bash
flutter build appbundle --release
```

AAB location:
```
build/app/outputs/bundle/release/app-release.aab
```

## 📋 Prerequisites

1. **Flutter SDK** (3.10.0 or higher)
   ```bash
   flutter --version
   ```

2. **Android SDK** (installed via Android Studio or standalone)
   ```bash
   flutter doctor
   ```

3. **Java Development Kit (JDK)** 17 or higher
   ```bash
   java -version
   ```

## 🔧 Build Configuration

### Current Configuration

- **Application ID:** `com.example.flutter_pos_app`
- **Min SDK:** Set by Flutter (typically 21+)
- **Target SDK:** Set by Flutter (typically 34+)
- **Signing:** Currently using debug keys (for testing)

### For Production Release

Before releasing to production, you should:

1. **Create a Keystore:**
   ```bash
   keytool -genkey -v -keystore ~/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```

2. **Create `android/key.properties`:**
   ```properties
   storePassword=<password from previous step>
   keyPassword=<password from previous step>
   keyAlias=upload
   storeFile=<location of the key store file>
   ```

3. **Update `android/app/build.gradle.kts`:**
   - Add keystore configuration
   - Enable code shrinking and obfuscation
   - Use release signing config

## 📱 Installing the APK

### Method 1: Using ADB (Android Debug Bridge)
```bash
adb install build/app/outputs/flutter-apk/app-release.apk
```

### Method 2: Transfer to Device
1. Copy the APK file to your Android device
2. On the device, enable "Install from Unknown Sources" in Settings
3. Open the APK file using a file manager
4. Follow the installation prompts

### Method 3: Direct Transfer via USB
```bash
# Connect device via USB
adb devices

# Push APK to device
adb push build/app/outputs/flutter-apk/app-release.apk /sdcard/Download/

# Then install from device's file manager
```

## 🔍 Troubleshooting

### Build Fails with "Gradle Error"
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
sdk.dir=/path/to/your/Android/sdk
```

### "Out of memory" during build
Increase Gradle memory in `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
```

### APK too large
- Use split APKs: `flutter build apk --split-per-abi --release`
- Enable code shrinking in `build.gradle.kts`
- Remove unused assets and dependencies

### App crashes on device
- Check device logs: `adb logcat`
- Build debug APK for better error messages: `flutter build apk --debug`
- Verify all permissions are granted
- Check if device meets minimum SDK requirements

## 📊 APK Size Optimization

### Current APK Sizes (Approximate)
- **Single APK (Release):** ~30-50 MB
- **Split APK (arm64-v8a):** ~20-30 MB
- **Split APK (armeabi-v7a):** ~18-25 MB

### To Reduce Size Further:
1. Enable code shrinking and obfuscation
2. Remove unused dependencies
3. Optimize images and assets
4. Use split APKs by ABI
5. Enable R8 code shrinking

## 🎯 Build Types Comparison

| Build Type | Use Case | Size | Performance | Debug Info |
|------------|----------|------|-------------|------------|
| Debug | Development/Testing | Larger | Slower | Full |
| Release | Production | Smaller | Optimized | Minimal |
| Split APK | Distribution | Smallest | Optimized | Minimal |

## 📝 Version Management

Update version in `pubspec.yaml`:
```yaml
version: 1.0.0+1
# Format: version_name+build_number
```

- **version_name:** User-visible version (1.0.0)
- **build_number:** Internal build number (+1)

## 🔐 Signing for Production

For production releases, you must sign the APK with your own keystore. The current setup uses debug keys which are fine for testing but not for production distribution.

See: https://flutter.dev/docs/deployment/android#signing-the-app

## 📦 Distribution Options

1. **Direct Installation:** Share APK file directly
2. **Google Play Store:** Upload AAB file
3. **Internal Distribution:** Use enterprise distribution methods
4. **Firebase App Distribution:** For beta testing

## ✅ Verification Checklist

Before distributing your APK:

- [ ] App builds successfully
- [ ] App installs on test devices
- [ ] All features work correctly
- [ ] Permissions are properly requested
- [ ] App connects to backend API
- [ ] Offline functionality works
- [ ] Camera/barcode scanning works
- [ ] App doesn't crash on launch
- [ ] Version number is updated
- [ ] App icon and name are correct

## 🆘 Need Help?

- Flutter Build Docs: https://flutter.dev/docs/deployment/android
- Android Build Guide: https://developer.android.com/studio/build
- Flutter Issues: https://github.com/flutter/flutter/issues

---

**Your APK is ready to distribute! 📱✨**

