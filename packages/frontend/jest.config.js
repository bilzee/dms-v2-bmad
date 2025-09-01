const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testEnvironment: 'jest-environment-jsdom', // Default for components
  moduleNameMapper: {
    // Fix path alias resolution for @/ imports
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@dms/shared$': '<rootDir>/../shared',
    // Mock CSS modules and static assets
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': 'jest-transform-stub',
  },
  // Ignore Next.js build files, node_modules, and E2E tests
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/src/e2e/', // Exclude E2E tests from Jest
  ],
  // Transform ES modules from react-leaflet
  transformIgnorePatterns: [
    'node_modules/(?!(react-leaflet|leaflet)/)',
  ],
  // Add support for TypeScript and JSX
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  // Global test setup for mocking browser APIs
  setupFiles: ['<rootDir>/src/test/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
  ],
  testEnvironmentOptions: {
    url: 'http://localhost',
  },
  silent: false,
  verbose: true,
  maxWorkers: 1,
  forceExit: true,
  detectOpenHandles: true,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)