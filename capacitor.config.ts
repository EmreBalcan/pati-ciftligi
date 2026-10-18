import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mergemeadow.game',
  appName: 'Pati Çiftliği',
  webDir: 'mobile-shell',
  server: {
    url: 'https://merge-meadow-mobile.emrebalcan494.chatgpt.site/?v=37',
    cleartext: false,
    androidScheme: 'https'
  },
  android: { backgroundColor: '#193526' }
};

export default config;
