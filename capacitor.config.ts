import type { CapacitorConfig } from '@capacitor/cli';

// Live URL mode ke liye build/sync chalate waqt environment variable set karein:
// Example: CAPACITOR_SERVER_URL=https://gj959417-hub.github.io/gg/ npx cap sync android
// Default (empty) hone par local bundled `dist/` files offline-ready APK mein pack hongi.
const liveServerUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: 'com.bermudastrike.game3d',
  appName: 'Bermuda Strike 3D',
  webDir: 'dist',
  ...(liveServerUrl
    ? {
        server: {
          url: liveServerUrl,
          cleartext: false,
          androidScheme: 'https',
        },
      }
    : {
        server: {
          androidScheme: 'https',
        },
      }),
  android: {
    backgroundColor: '#0b0f14',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#0b0f14',
    },
  },
};

export default config;
