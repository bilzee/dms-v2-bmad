import { createClient } from 'redis';

// Redis client configuration
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000'),
  },
});

// Handle Redis connection errors
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis Client Connected');
});

redisClient.on('ready', () => {
  console.log('Redis Client Ready');
});

redisClient.on('reconnecting', () => {
  console.log('Redis Client Reconnecting');
});

// Initialize Redis connection
let isRedisConnected = false;

async function ensureRedisConnection() {
  if (!isRedisConnected) {
    try {
      await redisClient.connect();
      isRedisConnected = true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      // Continue without Redis - cache operations will be no-ops
    }
  }
}

// Cache key generator
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return `${prefix}:${Buffer.from(sortedParams).toString('base64')}`;
}

// Cache TTL configuration
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  VERY_LONG: 3600, // 1 hour
  STATIC: 86400, // 24 hours
} as const;

export interface CacheOptions {
  ttl?: number;
  key?: string;
  tags?: string[];
  invalidateOnWrite?: boolean;
}

export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    await ensureRedisConnection();
    
    if (!isRedisConnected) {
      return null;
    }

    try {
      const cached = await redisClient.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }
    
    return null;
  }

  static async set<T>(
    key: string, 
    value: T, 
    options: CacheOptions = {}
  ): Promise<void> {
    await ensureRedisConnection();
    
    if (!isRedisConnected) {
      return;
    }

    try {
      const ttl = options.ttl || CACHE_TTL.MEDIUM;
      const serialized = JSON.stringify(value);
      
      await redisClient.setEx(key, ttl, serialized);
      
      // Store cache tags for invalidation
      if (options.tags && options.tags.length > 0) {
        await this.addTags(key, options.tags);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  static async invalidate(key: string): Promise<void> {
    await ensureRedisConnection();
    
    if (!isRedisConnected) {
      return;
    }

    try {
      await redisClient.del(key);
      
      // Remove from tag mappings
      const tags = await this.getTags(key);
      for (const tag of tags) {
        await this.removeTagMapping(key, tag);
      }
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }

  static async invalidateByTag(tag: string): Promise<void> {
    await ensureRedisConnection();
    
    if (!isRedisConnected) {
      return;
    }

    try {
      const tagKey = `tag:${tag}`;
      const keys = await redisClient.sMembers(tagKey);
      
      if (keys.length > 0) {
        await redisClient.del(...keys);
        await redisClient.del(tagKey);
      }
    } catch (error) {
      console.error('Cache invalidate by tag error:', error);
    }
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    await ensureRedisConnection();
    
    if (!isRedisConnected) {
      return;
    }

    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
    }
  }

  private static async addTags(key: string, tags: string[]): Promise<void> {
    if (!isRedisConnected) return;

    try {
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        await redisClient.sAdd(tagKey, key);
        // Set TTL for tag mapping
        await redisClient.expire(tagKey, CACHE_TTL.VERY_LONG);
      }
    } catch (error) {
      console.error('Cache add tags error:', error);
    }
  }

  private static async getTags(key: string): Promise<string[]> {
    if (!isRedisConnected) return [];

    try {
      const tagKeys = await redisClient.keys('tag:*');
      const tags: string[] = [];
      
      for (const tagKey of tagKeys) {
        const isMember = await redisClient.sIsMember(tagKey, key);
        if (isMember) {
          tags.push(tagKey.replace('tag:', ''));
        }
      }
      
      return tags;
    } catch (error) {
      console.error('Cache get tags error:', error);
      return [];
    }
  }

  private static async removeTagMapping(key: string, tag: string): Promise<void> {
    if (!isRedisConnected) return;

    try {
      const tagKey = `tag:${tag}`;
      await redisClient.sRem(tagKey, key);
    } catch (error) {
      console.error('Cache remove tag mapping error:', error);
    }
  }

  static async increment(key: string, increment = 1): Promise<number> {
    await ensureRedisConnection();
    
    if (!isRedisConnected) {
      return 0;
    }

    try {
      return await redisClient.incrBy(key, increment);
    } catch (error) {
      console.error('Cache increment error:', error);
      return 0;
    }
  }

  static async exists(key: string): Promise<boolean> {
    await ensureRedisConnection();
    
    if (!isRedisConnected) {
      return false;
    }

    try {
      return await redisClient.exists(key) === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  static async getKeys(pattern: string = '*'): Promise<string[]> {
    await ensureRedisConnection();
    
    if (!isRedisConnected) {
      return [];
    }

    try {
      return await redisClient.keys(pattern);
    } catch (error) {
      console.error('Cache get keys error:', error);
      return [];
    }
  }

  static async flushDb(): Promise<void> {
    await ensureRedisConnection();
    
    if (!isRedisConnected) {
      return;
    }

    try {
      await redisClient.flushDb();
    } catch (error) {
      console.error('Cache flush error:', error);
    }
  }

  static async getStats(): Promise<{
    connected: boolean;
    keyCount: number;
    memoryUsage?: string;
    hitRate?: number;
  }> {
    if (!isRedisConnected) {
      return { connected: false, keyCount: 0 };
    }

    try {
      const info = await redisClient.info('memory');
      const keyCount = await this.getKeys().length;
      
      // Parse memory info
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : undefined;
      
      return {
        connected: true,
        keyCount,
        memoryUsage,
        hitRate: 0 // Would need to track hits/misses for this
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { connected: false, keyCount: 0 };
    }
  }

  static async disconnect(): Promise<void> {
    if (isRedisConnected) {
      try {
        await redisClient.disconnect();
        isRedisConnected = false;
      } catch (error) {
        console.error('Redis disconnect error:', error);
      }
    }
  }
}

// Cache decorator for automatic caching
export function cached<T>(
  keyPrefix: string,
  keyParams: (args: any[]) => Record<string, any>,
  options: CacheOptions = {}
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<T> {
      const cacheKey = generateCacheKey(keyPrefix, keyParams(args));
      
      // Try to get from cache first
      const cached = await CacheService.get<T>(cacheKey);
      if (cached) {
        return cached;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);
      
      // Cache the result
      await CacheService.set(cacheKey, result, options);
      
      return result;
    };
  };
}

// Query result caching utilities
export class QueryCache {
  static async cacheIncidents(filters: Record<string, any>, results: any[]): Promise<void> {
    const cacheKey = generateCacheKey('incidents', filters);
    await CacheService.set(cacheKey, results, {
      ttl: CACHE_TTL.SHORT,
      tags: ['incidents', 'incidents:all']
    });
  }

  static async getCachedIncidents(filters: Record<string, any>): Promise<any[] | null> {
    const cacheKey = generateCacheKey('incidents', filters);
    return await CacheService.get<any[]>(cacheKey);
  }

  static async invalidateIncidents(): Promise<void> {
    await CacheService.invalidateByTag('incidents');
  }

  static async cacheAssessments(filters: Record<string, any>, results: any[]): Promise<void> {
    const cacheKey = generateCacheKey('assessments', filters);
    await CacheService.set(cacheKey, results, {
      ttl: CACHE_TTL.MEDIUM,
      tags: ['assessments', 'assessments:all']
    });
  }

  static async getCachedAssessments(filters: Record<string, any>): Promise<any[] | null> {
    const cacheKey = generateCacheKey('assessments', filters);
    return await CacheService.get<any[]>(cacheKey);
  }

  static async invalidateAssessments(): Promise<void> {
    await CacheService.invalidateByTag('assessments');
  }

  static async cacheResponses(filters: Record<string, any>, results: any[]): Promise<void> {
    const cacheKey = generateCacheKey('responses', filters);
    await CacheService.set(cacheKey, results, {
      ttl: CACHE_TTL.MEDIUM,
      tags: ['responses', 'responses:all']
    });
  }

  static async getCachedResponses(filters: Record<string, any>): Promise<any[] | null> {
    const cacheKey = generateCacheKey('responses', filters);
    return await CacheService.get<any[]>(cacheKey);
  }

  static async invalidateResponses(): Promise<void> {
    await CacheService.invalidateByTag('responses');
  }
}

// Performance monitoring cache keys
export const PERFORMANCE_CACHE_KEYS = {
  QUERY_PERFORMANCE: 'perf:query',
  API_RESPONSE_TIME: 'perf:api',
  DATABASE_CONNECTIONS: 'perf:db:connections',
  CACHE_HIT_RATE: 'perf:cache:hits'
} as const;

export default CacheService;