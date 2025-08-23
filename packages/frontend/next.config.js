/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@dms/shared'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
    };
    return config;
  },
};

module.exports = nextConfig;