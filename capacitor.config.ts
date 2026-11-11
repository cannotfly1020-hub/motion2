import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.motion2.baseball',
  appName: '野球AI解析',
  webDir: 'www',
  ios: {
    contentInset: 'never',
    backgroundColor: '#0b1329',
    preferredContentMode: 'mobile'
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#0b1329',
      showSpinner: false
    }
  }
};

export default config;
