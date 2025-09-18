const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '<rootDir>/src/__tests__/setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
  ],
  moduleNameMapper: {
    // Handle Prisma client mocking - MUST BE FIRST
    '^@/lib/prisma$': '<rootDir>/src/lib/__mocks__/prisma.ts',
    
    // Handle UI component paths - MOST SPECIFIC FIRST
    '^@/components/ui/(.*)$': '<rootDir>/src/components/ui/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    
    // Handle workspace packages - FIXED TO MATCH TSCONFIG
    '^@dms/shared$': '<rootDir>/../shared/index.ts',
    '^@dms/shared/(.*)$': '<rootDir>/../shared/$1',
    
    // Handle CSS modules and assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 
      '<rootDir>/__mocks__/fileMock.js',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(react-leaflet|leaflet|.*\\.mjs$))',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/globals.css',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)