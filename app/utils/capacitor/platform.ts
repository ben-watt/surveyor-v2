import { Capacitor } from '@capacitor/core';

export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const getPlatform = (): 'ios' | 'android' | 'web' => {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
};

export const isIOS = (): boolean => {
  return getPlatform() === 'ios';
};

export const isAndroid = (): boolean => {
  return getPlatform() === 'android';
};

export const isWeb = (): boolean => {
  return getPlatform() === 'web';
};

export const canUseNativeCamera = (): boolean => {
  return isNativePlatform() && (isIOS() || isAndroid());
};
