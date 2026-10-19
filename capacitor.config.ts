import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mergemeadow.game',
  appName: 'Pati Çiftliği',
  webDir: 'mobile-shell',
  server: {
    url: 'https://pati-ciftligi.emrebalcan494.chatgpt.site/?v=40',
    cleartext: false,
    androidScheme: 'https'
  },
  android: { backgroundColor: '#193526' }
};

export default config;
