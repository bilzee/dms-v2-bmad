/** @type {import('next').NextConfig} */
const path = require('path')
// MVP: Disable PWA to avoid build complexity
const withPWA = require('next-pwa')({
  dest: 'public',
  register: false,
  skipWaiting: false,
  disable: true, // MVP: Disable PWA entirely
  reloadOnOnline: true,
  customWorkerDir: 'worker',
  // Service worker background sync configuration
  workboxOptions: {
    disableDevLogs: true,
  },
})

const nextConfig = {
  webpack: (config, { isServer }) => {
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