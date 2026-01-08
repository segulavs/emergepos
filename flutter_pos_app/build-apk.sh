#!/bin/bash

# Flutter POS App - APK Build Script
# This script builds Android APK files for the Flutter POS app

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Flutter POS App - APK Builder${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if Flutter is installed
if ! command -v flutter &> /dev/null; then
    echo -e "${RED}Error: Flutter is not installed or not in PATH${NC}"
    echo "Please install Flutter from https://flutter.dev/docs/get-started/install"
    exit 1
fi

# Check Flutter doctor
echo -e "${YELLOW}Checking Flutter setup...${NC}"
flutter doctor

# Navigate to Flutter app directory
cd "$(dirname "$0")"

# Clean previous builds
echo -e "${YELLOW}Cleaning previous builds...${NC}"
flutter clean

# Get dependencies
echo -e "${YELLOW}Getting Flutter dependencies...${NC}"
flutter pub get

# Build type selection
echo ""
echo -e "${GREEN}Select build type:${NC}"
echo "1) Debug APK (for testing)"
echo "2) Release APK (for production)"
echo "3) Split APKs by ABI (smaller file size)"
echo "4) App Bundle (AAB) for Play Store"
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        echo -e "${YELLOW}Building Debug APK...${NC}"
        flutter build apk --debug
        APK_PATH="build/app/outputs/flutter-apk/app-debug.apk"
        ;;
    2)
        echo -e "${YELLOW}Building Release APK...${NC}"
        flutter build apk --release
        APK_PATH="build/app/outputs/flutter-apk/app-release.apk"
        ;;
    3)
        echo -e "${YELLOW}Building Split APKs by ABI...${NC}"
        flutter build apk --split-per-abi --release
        echo -e "${GREEN}Split APKs created in: build/app/outputs/flutter-apk/${NC}"
        echo "  - app-armeabi-v7a-release.apk (32-bit ARM)"
        echo "  - app-arm64-v8a-release.apk (64-bit ARM)"
        echo "  - app-x86_64-release.apk (64-bit x86)"
        exit 0
        ;;
    4)
        echo -e "${YELLOW}Building App Bundle (AAB)...${NC}"
        flutter build appbundle --release
        AAB_PATH="build/app/outputs/bundle/release/app-release.aab"
        echo -e "${GREEN}App Bundle created: ${AAB_PATH}${NC}"
        echo "Upload this file to Google Play Store"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice. Building Release APK by default...${NC}"
        flutter build apk --release
        APK_PATH="build/app/outputs/flutter-apk/app-release.apk"
        ;;
esac

# Check if APK was created
if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ APK Build Successful!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "APK Location: ${GREEN}$APK_PATH${NC}"
    echo -e "APK Size: ${GREEN}$APK_SIZE${NC}"
    echo ""
    echo -e "${YELLOW}To install on device:${NC}"
    echo "  adb install $APK_PATH"
    echo ""
    echo -e "${YELLOW}Or transfer the APK to your Android device and install manually.${NC}"
else
    echo -e "${RED}Error: APK file not found at $APK_PATH${NC}"
    exit 1
fi

