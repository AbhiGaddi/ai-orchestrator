import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Electron: assets must use relative paths, not absolute
  assetPrefix: process.env.ELECTRON ? './' : undefined,

  // Disable image optimization (not available in Electron file:// context)
  images: {
    unoptimized: true,
  },

  // Allow Electron to access the app without CORS issues
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
};

export default nextConfig;
