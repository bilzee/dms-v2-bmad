import '@testing-library/jest-dom'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  SessionProvider: ({ children }) => children,
  getSession: jest.fn(() => Promise.resolve(null)),
  signIn: jest.fn(),
  signOut: jest.fn(),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}))

// Mock zustand persist
jest.mock('zustand/middleware', () => ({
  persist: jest.fn((fn) => fn),
  devtools: jest.fn((fn) => fn),
}))

// Setup fetch mock
global.fetch = jest.fn()

// Mock window.location
delete window.location
window.location = {
  href: 'http://localhost:3000',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
}