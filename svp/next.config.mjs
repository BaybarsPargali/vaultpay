/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  
  // Optimize for production
  reactStrictMode: true,
  
  // Ignore TypeScript errors during build (we check separately in CI)
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Ignore ESLint errors during build (we check separately in CI)
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Image optimization
  images: {
    domains: [],
    unoptimized: false,
  },
  
  // Environment variables that should be available at build time
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '0.1.0',
  },
  
  // Experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Handle Node.js native modules that shouldn't be bundled
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'child_process': 'commonjs child_process',
        'fs': 'commonjs fs',
        'path': 'commonjs path',
        'os': 'commonjs os',
        'crypto': 'commonjs crypto',
      });
    }
    
    // Handle bigint-buffer native module
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'bigint-buffer': false,
    };
    
    return config;
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
