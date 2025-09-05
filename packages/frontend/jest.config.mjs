export default {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-node',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)',
    '**/*.(test|spec).(ts|tsx|js|jsx)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/../shared/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/__tests__/**/*'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(next-auth|@auth|zustand|@tanstack|react-hook-form)/)'
  ],
  testTimeout: 10000
}