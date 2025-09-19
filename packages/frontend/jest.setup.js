import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/router', () => require('next-router-mock'))

// Mock Web APIs for Next.js API routes
global.Request = global.Request || class MockRequest {
  constructor(url, options = {}) {
    this.url = url;
    this.method = options.method || 'GET';
    this.headers = new Headers(options.headers || {});
    this.body = options.body;
  }
}

global.Response = global.Response || class MockResponse {
  constructor(body, options = {}) {
    this.body = body;
    this.status = options.status || 200;
    this.statusText = options.statusText || 'OK';
    this.headers = new Headers(options.headers || {});
  }
  
  static json(data, options) {
    return new MockResponse(JSON.stringify(data), {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) }
    });
  }
}

global.Headers = global.Headers || class MockHeaders {
  constructor(init = {}) {
    this.map = new Map();
    if (init) {
      Object.entries(init).forEach(([key, value]) => {
        this.set(key, value);
      });
    }
  }
  
  get(name) { return this.map.get(name.toLowerCase()); }
  set(name, value) { this.map.set(name.toLowerCase(), value); }
  has(name) { return this.map.has(name.toLowerCase()); }
  delete(name) { return this.map.delete(name.toLowerCase()); }
}

global.ReadableStream = global.ReadableStream || class MockReadableStream {}

// Mock Next.js server components
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  return {
    ...actual,
    NextRequest: jest.fn().mockImplementation((url, options = {}) => {
      return {
        url,
        method: options.method || 'GET',
        headers: new global.Headers(options.headers || {}),
        body: options.body,
        json: () => Promise.resolve(options.body ? JSON.parse(options.body) : {}),
        cookies: {
          get: jest.fn(),
          set: jest.fn(),
          delete: jest.fn(),
        },
        nextUrl: {
          searchParams: new URLSearchParams(),
          pathname: new URL(url).pathname,
        }
      };
    }),
    NextResponse: {
      json: (data, options = {}) => ({
        json: () => Promise.resolve(data),
        status: options.status || 200,
        headers: new global.Headers(options.headers || {}),
      }),
    }
  };
});

// Mock crypto API for JWT operations
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid-' + Math.random().toString(36).substr(2, 9),
    subtle: {
      importKey: jest.fn().mockResolvedValue({}),
      sign: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
      verify: jest.fn().mockResolvedValue(true),
    },
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
})

// Mock NextAuth.js v5 / Auth.js to avoid ESM import issues
jest.mock('@/auth', () => ({
  auth: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}))

// Mock Prisma Client to avoid browser environment issues
jest.mock('@prisma/client', () => {
  // Only load mock utilities in test environment
  if (process.env.NODE_ENV === 'test') {
    try {
      const { createMockPrisma } = require('./src/__tests__/utils/mockPrisma');
      return {
        PrismaClient: jest.fn(() => createMockPrisma()),
        __esModule: true,
      };
    } catch (error) {
      // Fallback to simple mock if mock utilities fail to load
      console.warn('Failed to load Prisma mock utilities, using fallback mock');
      return {
        PrismaClient: jest.fn(() => ({
          $connect: jest.fn(),
          $disconnect: jest.fn(),
          $transaction: jest.fn(),
          user: {},
          userActivity: {},
          securityEvent: {},
          systemMetrics: {},
          performanceMetrics: {},
        })),
        __esModule: true,
      };
    }
  }
  
  // For non-test environments, return a basic mock
  return {
    PrismaClient: jest.fn(() => ({
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $transaction: jest.fn(),
    })),
    __esModule: true,
  };
})

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: {
      user: {
        id: 'test-user',
        name: 'Test User',
        email: 'test@example.com',
        roles: [
          { id: 'role-1', name: 'COORDINATOR', permissions: [], isActive: true }
        ],
        activeRole: { id: 'role-1', name: 'COORDINATOR', permissions: [], isActive: true },
        permissions: []
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    },
    status: 'authenticated',
  })),
  SessionProvider: ({ children }) => children,
  getSession: jest.fn(() => Promise.resolve({
    user: {
      id: 'test-user',
      name: 'Test User', 
      email: 'test@example.com'
    }
  })),
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