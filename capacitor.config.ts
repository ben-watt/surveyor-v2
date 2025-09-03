import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.company.surveyor',
  appName: 'Surveyor',
  webDir: 'out',
  server: {
    url: 'http://192.168.1.238:3000', // For development - point to Next.js dev server
    cleartext: true
  },
  plugins: {
    Camera: {
      presentationStyle: 'fullscreen',
      quality: 90,
      allowEditing: false,
      resultType: 'uri',
      saveToGallery: false
    },
    Filesystem: {
      requestPermissions: true
    }
  }
};

export default config;
