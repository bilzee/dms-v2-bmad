/** @type {import('next').NextConfig} */
const path = require('path')
// Epic 10: Enable PWA for humanitarian field operations
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: false,
  disable: process.env.NODE_ENV === 'development', // Only disable in development
  reloadOnOnline: true,
  disableDevLogs: true,
  // Cache critical offline routes for humanitarian operations
  runtimeCaching: [
    {
      urlPattern: /^\/api\/v1\/(assessments|responses|entities|incidents|queue|monitoring)/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'dms-api-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        networkTimeoutSeconds: 3, // Fail fast for field operations
      },
    },
    {
      urlPattern: /\.(png|jpg|jpeg|svg|gif|ico|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'dms-images-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    {
      urlPattern: /^\/dashboard/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'dms-pages-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        networkTimeoutSeconds: 3, // Fail fast for offline fallback
      },
    },
    {
      urlPattern: /\/_next\/static\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'dms-static-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
  ],
})

const nextConfig = {
  eslint: {
    // Re-enabled after successful build validation
    ignoreDuringBuilds: false,
    // Allow warnings but fail on errors
    dirs: ['pages', 'app', 'components', 'lib', 'src'],
  },
  typescript: {
    // Re-enabled after successful build validation - production ready
    ignoreBuildErrors: false,
  },
  // Epic 10: Bundle analyzer for performance optimization
  ...(process.env.ANALYZE === 'true' && {
    ...require('@next/bundle-analyzer')({
      enabled: true,
    }),
  }),
  webpack: (config, { dev, isServer }) => {
    // Exclude test files from production builds
    config.module.rules.push({
      test: /\.(test|spec)\.(js|jsx|ts|tsx)$/,
      use: 'ignore-loader',
    });

    // Exclude __tests__ directories
    config.module.rules.push({
      test: /__tests__/,
      use: 'ignore-loader',
    });

    // Epic 10: Optimize chunk splitting and tree shaking for performance
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        // Enable aggressive tree shaking
        usedExports: true,
        sideEffects: false,
        // Enable module concatenation for better tree shaking
        concatenateModules: true,
        // Configure terser for dead code elimination
        minimizer: [
          ...config.optimization.minimizer || [],
          new (require('terser-webpack-plugin'))({
            terserOptions: {
              compress: {
                drop_console: true, // Remove console.logs in production
                drop_debugger: true,
                dead_code: true,
                unused: true,
                // Aggressive tree shaking options
                pure_funcs: ['console.log', 'console.info', 'console.debug'],
                passes: 2, // Multiple passes for better optimization
              },
              mangle: {
                safari10: true,
              },
            },
            extractComments: false,
          }),
        ],
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Separate vendor chunk for large third-party libraries
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
            },
            // Separate chunk for UI components (Radix, Lucide)
            ui: {
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|@heroicons)[\\/]/,
              name: 'ui-components',
              chunks: 'all',
              priority: 20,
              reuseExistingChunk: true,
            },
            // Heavy libraries get their own chunks
            charts: {
              test: /[\\/]node_modules[\\/](recharts|chart\.js|d3)[\\/]/,
              name: 'charts',
              chunks: 'all',
              priority: 30,
              reuseExistingChunk: true,
            },
            maps: {
              test: /[\\/]node_modules[\\/](leaflet|react-leaflet)[\\/]/,
              name: 'maps',
              chunks: 'all',
              priority: 30,
              reuseExistingChunk: true,
            },
            forms: {
              test: /[\\/]node_modules[\\/](react-hook-form|@hookform)[\\/]/,
              name: 'forms',
              chunks: 'all',
              priority: 25,
              reuseExistingChunk: true,
            },
            // Common utilities
            utils: {
              test: /[\\/]node_modules[\\/](date-fns|lodash|uuid|clsx)[\\/]/,
              name: 'utils',
              chunks: 'all',
              priority: 15,
              reuseExistingChunk: true,
            },
            // Framework chunks
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 40,
              reuseExistingChunk: true,
            },
            // Default for smaller libraries
            default: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    // Only apply these fallbacks on the client side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // Prevent bundling of Node.js modules in the browser
        child_process: false,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      }
    }
    
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
    };
    
    return config
  },
  
  // Transpile shared and backend packages
  transpilePackages: ['@dms/shared', '@dms/backend'],
  
  // Experimental features for better server components support
  experimental: {
    // Server Actions are available by default now, this option can be removed
    serverComponentsExternalPackages: ['bullmq', 'ioredis'],
    // Add monorepo root for file tracing to include backend modules
    outputFileTracingRoot: path.join(__dirname, '../../')
  }
}

module.exports = withPWA(nextConfig)