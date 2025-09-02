const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  transformIgnorePatterns: [
    // Allow transformation of these ESM modules
    '/node_modules/(?!(next-auth|@auth|zustand|@tanstack)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 10000,
}

module.exports = async () => {
  const jestConfig = await createJestConfig(customJestConfig)()
  
  // Override default transformIgnorePatterns to handle ESM modules
  jestConfig.transformIgnorePatterns = [
    '/node_modules/(?!(next-auth|@auth|zustand|@tanstack|react-hook-form)/)',
  ]
  
  return jestConfig
}