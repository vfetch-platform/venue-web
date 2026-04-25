/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  images: {
    remotePatterns: [
      ...(process.env.NODE_ENV === 'development'
        ? [{ protocol: 'http' as const, hostname: 'localhost' }]
        : []),
      { protocol: 'https', hostname: 'images.vfetch.co.uk' },
    ],
    // Smaller set of generated sizes — covers thumbnails (48, 96) and modal previews (256, 384)
    imageSizes: [48, 96, 256, 384],
    deviceSizes: [640, 750, 1080, 1200, 1920],
    formats: ['image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL + '/:path*',
      },
    ];
  },
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https?:\/\/[^/]+\/api\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        },
      },
    },
  ],
});

module.exports = withPWA(nextConfig);