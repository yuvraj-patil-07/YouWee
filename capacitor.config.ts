import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yuvraj.youwe',
  appName: 'YouWe',
  webDir: 'dist',
  server: {
    url: 'https://youwe-jmx4.onrender.com',
    cleartext: true
  }
};

export default config;
