import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.motion2.baseball',
  appName: '野球AIバイオメカニクス',
  webDir: 'www',
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0284c7',
    preferredContentMode: 'mobile'
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#0284c7',
      showSpinner: false
    }
  }
};

export default config;
