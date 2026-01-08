# 🚀 Quick APK Build Reference

## Fastest Way to Build APK

```bash
cd flutter_pos_app
./build-apk.sh
```

## Manual Commands

### Release APK (Production)
```bash
cd flutter_pos_app
flutter clean
flutter pub get
flutter build apk --release
```

**Output:** `build/app/outputs/flutter-apk/app-release.apk`

### Debug APK (Testing)
```bash
flutter build apk --debug
```

**Output:** `build/app/outputs/flutter-apk/app-debug.apk`

### Split APKs (Smaller Size)
```bash
flutter build apk --split-per-abi --release
```

**Output:** Separate APKs for each CPU architecture

### App Bundle (Play Store)
```bash
flutter build appbundle --release
```

**Output:** `build/app/outputs/bundle/release/app-release.aab`

## Install APK on Device

```bash
adb install build/app/outputs/flutter-apk/app-release.apk
```

Or transfer APK to device and install manually.

## Troubleshooting

**Build fails?**
```bash
cd android && ./gradlew clean && cd ..
flutter clean && flutter pub get
```

**Need more details?** See `BUILD_APK_GUIDE.md`

