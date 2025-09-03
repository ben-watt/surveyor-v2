/** @type {import('next').NextConfig} */

const {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
} = require("next/constants");

/** @type {(phase: string, defaultConfig: import("next").NextConfig) => Promise<import("next").NextConfig>} */
module.exports = async (phase) => {
  /** @type {import("next").NextConfig} */
  const nextConfig = {
    // Temporarily disabled for initial Capacitor setup - will enable later
    // output: 'export', // Required for Capacitor static export
    images: {
      domains: ['placehold.co'],
      // unoptimized: true, // Required for static export
      remotePatterns: [
        {
          protocol: 'https',
          hostname: '**.amazonaws.com',
        },
        {
          protocol: 'https',
          hostname: 'placehold.co',
        }
      ],
    }
  }
  

  if (phase === PHASE_DEVELOPMENT_SERVER || phase === PHASE_PRODUCTION_BUILD) {
    const withSerwist = (await import("@serwist/next")).default({
      // Note: This is only an example. If you use Pages Router,
      // use something else that works, such as "service-worker/index.ts".
      swSrc: "app/sw.ts",
      swDest: "public/sw.js",
    });
    return withSerwist(nextConfig);
  }

  return nextConfig;
};