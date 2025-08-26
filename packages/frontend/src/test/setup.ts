import '@testing-library/jest-dom';

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock pointer capture methods for Radix UI
Object.defineProperty(Element.prototype, 'hasPointerCapture', {
  value: jest.fn().mockReturnValue(false),
  writable: true,
});

Object.defineProperty(Element.prototype, 'setPointerCapture', {
  value: jest.fn(),
  writable: true,
});

Object.defineProperty(Element.prototype, 'releasePointerCapture', {
  value: jest.fn(),
  writable: true,
});

// Mock scrollIntoView
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: jest.fn(),
  writable: true,
});