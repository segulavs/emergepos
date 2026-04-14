import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.emergepos.mobile',
  appName: 'EmergePOS',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    // For development, you can uncomment and set your backend URL
    // url: 'http://localhost:8000',
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#999999',
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#ffffff',
    },
  },
};

export default config;
