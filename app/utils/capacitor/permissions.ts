import { Camera, CameraPermissionState } from '@capacitor/camera';
import { isNativePlatform } from './platform';

export const requestCameraPermissions = async (): Promise<boolean> => {
  if (!isNativePlatform()) {
    return true; // Web doesn't need explicit permission request via Capacitor
  }

  try {
    const permissions = await Camera.requestPermissions();
    return permissions.camera === 'granted';
  } catch (error) {
    console.error('Error requesting camera permissions:', error);
    return false;
  }
};

export const checkCameraPermissions = async (): Promise<boolean> => {
  if (!isNativePlatform()) {
    return true; // Web permissions are handled by the browser
  }

  try {
    const permissions = await Camera.checkPermissions();
    return permissions.camera === 'granted';
  } catch (error) {
    console.error('Error checking camera permissions:', error);
    return false;
  }
};

export const getCameraPermissionStatus = async (): Promise<CameraPermissionState> => {
  if (!isNativePlatform()) {
    return 'granted'; // Default for web
  }

  try {
    const permissions = await Camera.checkPermissions();
    return permissions.camera;
  } catch (error) {
    console.error('Error getting camera permission status:', error);
    return 'denied';
  }
};