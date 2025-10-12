'use client';

import config from '@/amplify_outputs.json';
import { Amplify } from 'aws-amplify';

// Enhanced configuration for Capacitor compatibility
const getAmplifyConfig = () => {
  if (typeof window === 'undefined') {
    // SSR - use basic config
    return config;
  }

  const hostname = window.location.hostname;

  // For development environments, use default auth config to prevent session issues
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return config;
  }

  // For production domains, use custom cookie storage
  return {
    ...config,
    auth: {
      ...config.auth,
      cookieStorage: {
        domain: hostname,
        path: '/',
        expires: 365,
        secure: false, // Allow HTTP in development
        sameSite: 'strict',
      },
    },
  };
};

const amplifyConfig = getAmplifyConfig();

// Determine SSR configuration based on environment
const shouldUseSSR = () => {
  if (typeof window === 'undefined') return true; // Always use SSR during server-side rendering

  const hostname = window.location.hostname;

  // Disable SSR for development environments to prevent auth issues
  return !(hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname));
};

Amplify.configure(amplifyConfig, {
  ssr: shouldUseSSR(),
  // Additional configuration for Capacitor
  API: {
    GraphQL: {
      headers: async () => {
        return {};
      },
    },
  },
});

export default function ConfigureAmplifyClientSide() {
  return null;
}
