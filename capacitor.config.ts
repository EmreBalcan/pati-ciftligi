import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mergemeadow.game',
  appName: 'Merge Meadow',
  webDir: 'mobile-shell',
  server: {
    url: 'https://merge-meadow-mobile.emrebalcan494.chatgpt.site/',
    cleartext: false,
    androidScheme: 'https'
  },
  android: { backgroundColor: '#193526' }
};

export default config;
