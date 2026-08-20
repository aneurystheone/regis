import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aneurys.regis',
  appName: 'regis',
  webDir: 'dist',
  // server: {
  //   url: 'http://10.0.2.2:3000', // IP para live reload / emulador
  //   cleartext: true
  // },
  plugins: {
    SocialLogin: {
      google: {
        webClientId: '261771410586-tmgjtmojp2q6nsa8patp070aa9aq8r8i.apps.googleusercontent.com',
      },
    },
  },
};

export default config;
