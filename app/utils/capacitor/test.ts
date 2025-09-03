// Test script to verify Capacitor integration
import { canUseNativeCamera, getPlatform, isNativePlatform } from './platform';

export const testCapacitorIntegration = () => {
  console.log('=== Capacitor Integration Test ===');
  
  console.log('Platform:', getPlatform());
  console.log('Is native platform:', isNativePlatform());
  console.log('Can use native camera:', canUseNativeCamera());
  
  if (typeof window !== 'undefined') {
    console.log('Running in browser environment');
    console.log('User agent:', navigator.userAgent);
  }
  
  console.log('=== Test Complete ===');
};