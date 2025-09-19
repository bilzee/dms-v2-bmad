// Mock Redis client for testing
const mockRedisClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
  setEx: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  sAdd: jest.fn().mockResolvedValue(1),
  sMembers: jest.fn().mockResolvedValue([]),
  sIsMember: jest.fn().mockResolvedValue(false),
  sRem: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue([]),
  exists: jest.fn().mockResolvedValue(0),
  incrBy: jest.fn().mockResolvedValue(1),
  flushDb: jest.fn().mockResolvedValue('OK'),
  expire: jest.fn().mockResolvedValue(1),
  info: jest.fn().mockResolvedValue('used_memory_human: 1MB'),
  on: jest.fn(),
  quit: jest.fn().mockResolvedValue(undefined),
};

// Mock data storage
const mockDataStore: Record<string, string> = {};
const mockSetStore: Record<string, Set<string>> = {};

// Configure mockRedisClient.get to return mock data
mockRedisClient.get = jest.fn().mockImplementation((key: string) => {
  return Promise.resolve(mockDataStore[key] || null);
});

// Configure mockRedisClient.setEx to store mock data
mockRedisClient.setEx = jest.fn().mockImplementation((key: string, ttl: number, value: string) => {
  mockDataStore[key] = value;
  return Promise.resolve('OK');
});

// Configure mockRedisClient.del to remove mock data
mockRedisClient.del = jest.fn().mockImplementation((...keys: string[]) => {
  keys.forEach(key => {
    delete mockDataStore[key];
  });
  return Promise.resolve(keys.length);
});

// Configure mockRedisClient.sMembers to return mock sets
mockRedisClient.sMembers = jest.fn().mockImplementation((key: string) => {
  return Promise.resolve(mockSetStore[key] ? Array.from(mockSetStore[key]) : []);
});

// Configure mockRedisClient.sAdd to add to mock sets
mockRedisClient.sAdd = jest.fn().mockImplementation((key: string, value: string) => {
  if (!mockSetStore[key]) {
    mockSetStore[key] = new Set();
  }
  mockSetStore[key].add(value);
  return Promise.resolve(1);
});

// Configure mockRedisClient.sIsMember to check mock sets
mockRedisClient.sIsMember = jest.fn().mockImplementation((key: string, value: string) => {
  return Promise.resolve(mockSetStore[key]?.has(value) || false);
});

// Configure mockRedisClient.sRem to remove from mock sets
mockRedisClient.sRem = jest.fn().mockImplementation((key: string, value: string) => {
  if (mockSetStore[key]) {
    mockSetStore[key].delete(value);
    if (mockSetStore[key].size === 0) {
      delete mockSetStore[key];
    }
  }
  return Promise.resolve(1);
});

// Configure mockRedisClient.keys to return keys matching pattern
mockRedisClient.keys = jest.fn().mockImplementation((pattern: string) => {
  const regex = new RegExp(pattern.replace(/\*/g, '.*'));
  return Promise.resolve(Object.keys(mockDataStore).filter(key => regex.test(key)));
});

// Configure mockRedisClient.exists to check if key exists
mockRedisClient.exists = jest.fn().mockImplementation((key: string) => {
  return Promise.resolve(mockDataStore[key] ? 1 : 0);
});

// Helper to clear mock data
const clearRedisMockData = () => {
  Object.keys(mockDataStore).forEach(key => delete mockDataStore[key]);
  Object.keys(mockSetStore).forEach(key => delete mockSetStore[key]);
};

// Mock Redis module
jest.mock('redis', () => ({
  createClient: jest.fn().mockReturnValue(mockRedisClient),
}));

// Set up Redis mock
export const createClient = jest.fn().mockReturnValue(mockRedisClient);
export const clearMockData = clearRedisMockData;
export default { createClient, mockRedisClient, clearMockData };