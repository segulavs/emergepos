plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.example.flutter_pos_app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "com.example.flutter_pos_app"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        
        // Enable multidex for large apps
        multiDexEnabled = true
    }

    buildTypes {
        release {
            // Signing with debug keys for now - replace with your own keystore for production
            // See: https://flutter.dev/docs/deployment/android#signing-the-app
            signingConfig = signingConfigs.getByName("debug")
            
            // Enable code shrinking and obfuscation
            isMinifyEnabled = false
            isShrinkResources = false
            
            // ProGuard rules (if minifyEnabled is true)
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    
    // Enable split APKs by ABI to reduce APK size
    splits {
        abi {
            isEnable = false // Set to true to generate split APKs
            reset()
            // include("armeabi-v7a", "arm64-v8a", "x86_64")
        }
    }
}

flutter {
    source = "../.."
}
