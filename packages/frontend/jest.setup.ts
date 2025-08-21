import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    push: jest.fn(),
    pop: jest.fn(),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
}));

// Mock IndexedDB for offline functionality
const mockIDBFactory = {
  open: jest.fn(() => Promise.resolve({
    objectStoreNames: { contains: jest.fn(() => false) },
    transaction: jest.fn(() => ({
      objectStore: jest.fn(() => ({
        add: jest.fn(() => ({ onsuccess: null, onerror: null })),
        put: jest.fn(() => ({ onsuccess: null, onerror: null })),
        get: jest.fn(() => ({ onsuccess: null, onerror: null })),
        delete: jest.fn(() => ({ onsuccess: null, onerror: null })),
        getAll: jest.fn(() => ({ onsuccess: null, onerror: null })),
      })),
    })),
  })),
  deleteDatabase: jest.fn(() => Promise.resolve()),
};

Object.defineProperty(global, 'indexedDB', {
  value: mockIDBFactory,
  writable: true,
});

// Mock getUserMedia for camera functionality
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn(() => Promise.resolve({
      getTracks: () => [{ stop: jest.fn() }],
    })),
  },
  writable: true,
});

// Mock geolocation
Object.defineProperty(global.navigator, 'geolocation', {
  value: {
    getCurrentPosition: jest.fn((success) => success({
      coords: {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
      },
      timestamp: Date.now(),
    })),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
  },
  writable: true,
});

// Mock File API
(global as any).File = class MockFile {
  public bits: any[];
  public name: string;
  public size: number;
  public type: string;
  public lastModified: number;
  public webkitRelativePath: string = '';

  constructor(bits: any[], name: string, options: any = {}) {
    this.bits = bits;
    this.name = name;
    this.size = bits.reduce((acc: number, bit: any) => acc + (bit.length || bit.byteLength || 0), 0);
    this.type = options.type || '';
    this.lastModified = Date.now();
  }

  arrayBuffer(): Promise<ArrayBuffer> {
    return Promise.resolve(new ArrayBuffer(0));
  }

  slice(): Blob {
    return new Blob();
  }

  stream(): ReadableStream {
    return new ReadableStream();
  }

  text(): Promise<string> {
    return Promise.resolve('');
  }
};

(global as any).FileList = class MockFileList extends Array {
  item(index: number) {
    return this[index] || null;
  }
};

(global as any).FileReader = class MockFileReader {
  public readyState: number = 0;
  public result: string | ArrayBuffer | null = null;
  public error: any = null;
  public onload: ((event: any) => void) | null = null;
  public onerror: ((event: any) => void) | null = null;
  public onabort: ((event: any) => void) | null = null;
  public onloadstart: ((event: any) => void) | null = null;
  public onloadend: ((event: any) => void) | null = null;
  public onprogress: ((event: any) => void) | null = null;

  static readonly EMPTY = 0;
  static readonly LOADING = 1;
  static readonly DONE = 2;

  readAsDataURL() {
    setTimeout(() => {
      this.readyState = 2;
      this.result = 'data:image/jpeg;base64,fake-base64-data';
      if (this.onload) this.onload({ target: this });
    }, 0);
  }

  readAsText() {
    setTimeout(() => {
      this.readyState = 2;
      this.result = 'fake text content';
      if (this.onload) this.onload({ target: this });
    }, 0);
  }

  readAsArrayBuffer() {
    setTimeout(() => {
      this.readyState = 2;
      this.result = new ArrayBuffer(0);
      if (this.onload) this.onload({ target: this });
    }, 0);
  }

  abort() {
    this.readyState = 0;
    if (this.onabort) this.onabort({ target: this });
  }
};

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:fake-url');
global.URL.revokeObjectURL = jest.fn();

// Suppress console errors in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};

// Set test timeout
jest.setTimeout(10000);