// jest.setup.api.js - API testing setup file
const { TextEncoder, TextDecoder } = require('node:util');

// Polyfill for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Next.js Request/Response for API route testing
global.Request = global.Request || class MockRequest {
  constructor(url, options = {}) {
    this.url = url;
    this.method = options.method || 'GET';
    this.headers = new Headers(options.headers || {});
    this.body = options.body;
  }
};

global.Response = global.Response || class MockResponse {
  constructor(body, options = {}) {
    this.body = body;
    this.status = options.status || 200;
    this.headers = new Headers(options.headers || {});
  }
  
  json() {
    return Promise.resolve(JSON.parse(this.body));
  }
};

// Mock Headers if not available
global.Headers = global.Headers || class MockHeaders {
  constructor(init = {}) {
    this.headers = {};
    if (init) {
      Object.entries(init).forEach(([key, value]) => {
        this.headers[key.toLowerCase()] = value;
      });
    }
  }
  
  get(name) {
    return this.headers[name.toLowerCase()];
  }
  
  set(name, value) {
    this.headers[name.toLowerCase()] = value;
  }
  
  has(name) {
    return name.toLowerCase() in this.headers;
  }
  
  delete(name) {
    delete this.headers[name.toLowerCase()];
  }
};