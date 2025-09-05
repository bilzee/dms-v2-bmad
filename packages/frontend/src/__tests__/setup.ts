import { beforeAll, beforeEach, afterAll } from '@jest/globals'

// Mock next/navigation for tests
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => '/'),
}))

// Mock NextAuth
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}))

// Mock fetch globally
global.fetch = jest.fn()

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeAll(async () => {
  // Silence console errors and warnings during tests unless they're important
  console.error = (...args: any[]) => {
    // Only log certain types of errors
    const message = args[0]
    if (typeof message === 'string' && (
      message.includes('Warning:') ||
      message.includes('Error:') ||
      message.includes('Failed to')
    )) {
      originalConsoleError(...args)
    }
  }
  
  console.warn = (...args: any[]) => {
    const message = args[0]
    if (typeof message === 'string' && message.includes('Warning:')) {
      originalConsoleWarn(...args)
    }
  }
})

beforeEach(() => {
  // Reset all mocks between tests
  jest.clearAllMocks()
  
  // Reset fetch mock
  if (global.fetch && typeof global.fetch === 'function') {
    (global.fetch as jest.Mock).mockClear()
  }
})

afterAll(async () => {
  // Restore console methods
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
  
  // Clean up any global resources
  jest.restoreAllMocks()
})