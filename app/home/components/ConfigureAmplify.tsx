"use client";

import config from "@/amplify_outputs.json";
import { Amplify } from "aws-amplify";

// Enhanced configuration for Capacitor compatibility  
const getAmplifyConfig = () => {
  if (typeof window === 'undefined') {
    // SSR - use basic config
    return config;
  }
  
  const hostname = window.location.hostname;
  
  // For IP addresses or localhost, don't override cookie storage at all
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    console.log('ConfigureAmplify: Using default auth config for hostname:', hostname);
    return config;
  }
  
  // For real domains, use custom cookie storage
  console.log('ConfigureAmplify: Using custom cookie storage for hostname:', hostname);
  return {
    ...config,
    auth: {
      ...config.auth,
      cookieStorage: {
        domain: hostname,
        path: '/',
        expires: 365,
        secure: false, // Allow HTTP in development
        sameSite: 'strict'
      }
    }
  };
};

const amplifyConfig = getAmplifyConfig();

console.log('ConfigureAmplify: Final config:', {
  hasCustomCookieStorage: !!(amplifyConfig.auth as any)?.cookieStorage,
  hostname: typeof window !== 'undefined' ? window.location.hostname : 'SSR'
});

// Determine if we should use SSR based on environment
const shouldUseSSR = () => {
  if (typeof window === 'undefined') return true; // Always use SSR during server-side rendering
  
  const hostname = window.location.hostname;
  
  // Disable SSR for IP addresses and localhost during client-side operation
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    console.log('ConfigureAmplify: Disabling SSR for hostname:', hostname);
    return false;
  }
  
  console.log('ConfigureAmplify: Enabling SSR for hostname:', hostname);
  return true;
};

Amplify.configure(amplifyConfig, { 
  ssr: shouldUseSSR(),
  // Additional configuration for Capacitor
  API: {
    GraphQL: {
      headers: async () => {
        return {};
      }
    }
  }
});

export default function ConfigureAmplifyClientSide() {
  return null;
}