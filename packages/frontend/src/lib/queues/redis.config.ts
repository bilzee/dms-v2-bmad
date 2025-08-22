import IORedis from 'ioredis';

// Redis connection configuration
export const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnClusterDown: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

export default connection;