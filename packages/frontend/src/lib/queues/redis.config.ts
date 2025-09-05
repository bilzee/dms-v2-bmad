import IORedis from 'ioredis';

// Lazy Redis connection - only create when actually needed and in browser/runtime environment
let _connection: IORedis | null = null;

export const getConnection = (): IORedis => {
  if (!_connection) {
    _connection = new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }
  return _connection;
};

// For backward compatibility, but only create connection when accessed
export const connection = new Proxy({} as IORedis, {
  get(target, prop) {
    // During build time, return a mock that doesn't actually connect
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      // Return a mock for build time
      return () => Promise.resolve();
    }
    return getConnection()[prop as keyof IORedis];
  }
});

export default connection;