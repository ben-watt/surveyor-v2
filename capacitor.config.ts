import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.company.surveyor',
  appName: 'Surveyor',
  webDir: '.next',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
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
