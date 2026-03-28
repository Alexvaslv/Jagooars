import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.communityhub.app',
  appName: 'Community Hub',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
