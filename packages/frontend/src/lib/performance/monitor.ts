import { NextRequest, NextResponse } from 'next/server';
import CacheService, { PERFORMANCE_CACHE_KEYS } from '@/lib/cache/redis';

interface PerformanceMetrics {
  timestamp: number;
  duration: number;
  method: string;
  url: string;
  statusCode: number;
  userAgent?: string;
  ipAddress?: string;
  userId?: string;
  endpoint: string;
}

interface QueryPerformance {
  timestamp: number;
  duration: number;
  query: string;
  parameters: any;
  success: boolean;
  error?: string;
}

class PerformanceMonitor {
  private static metrics: PerformanceMetrics[] = [];
  private static queryMetrics: QueryPerformance[] = [];
  private static maxMetricsCount = 1000;

  static async trackRequest(request: NextRequest, response: NextResponse, duration: number): Promise<void> {
    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      duration,
      method: request.method,
      url: request.url,
      statusCode: response.status,
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: this.getClientIP(request),
      endpoint: this.getEndpointPath(request.url),
    };

    // Store in memory
    this.metrics.push(metrics);
    if (this.metrics.length > this.maxMetricsCount) {
      this.metrics = this.metrics.slice(-this.maxMetricsCount);
    }

    // Cache in Redis for persistence
    try {
      const cacheKey = `${PERFORMANCE_CACHE_KEYS.API_RESPONSE_TIME}:${Date.now()}`;
      await CacheService.set(cacheKey, metrics, { ttl: 3600 }); // 1 hour
    } catch (error) {
      console.error('Failed to cache performance metrics:', error);
    }

    // Log slow queries
    if (duration > 3000) { // 3 seconds
      console.warn(`Slow API request: ${request.method} ${request.url} took ${duration}ms`, {
        duration,
        statusCode: response.status,
        userAgent: metrics.userAgent,
        ipAddress: metrics.ipAddress,
      });
    }
  }

  static async trackQuery(query: string, parameters: any, duration: number, success: boolean, error?: string): Promise<void> {
    const queryMetrics: QueryPerformance = {
      timestamp: Date.now(),
      duration,
      query: this.sanitizeQuery(query),
      parameters,
      success,
      error,
    };

    // Store in memory
    this.queryMetrics.push(queryMetrics);
    if (this.queryMetrics.length > this.maxMetricsCount) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsCount);
    }

    // Cache in Redis
    try {
      const cacheKey = `${PERFORMANCE_CACHE_KEYS.QUERY_PERFORMANCE}:${Date.now()}`;
      await CacheService.set(cacheKey, queryMetrics, { ttl: 3600 });
    } catch (error) {
      console.error('Failed to cache query metrics:', error);
    }

    // Log slow queries
    if (duration > 1000) { // 1 second
      console.warn(`Slow database query: took ${duration}ms`, {
        duration,
        success,
        error,
        query: queryMetrics.query,
      });
    }
  }

  static getPerformanceStats(timeRange: number = 3600000): { // Default 1 hour
    requestStats: {
      totalRequests: number;
      averageResponseTime: number;
      slowRequests: number;
      errorRate: number;
      byEndpoint: Record<string, {
        count: number;
        avgTime: number;
        errorRate: number;
      }>;
    };
    queryStats: {
      totalQueries: number;
      averageQueryTime: number;
      slowQueries: number;
      errorRate: number;
    };
  } {
    const cutoff = Date.now() - timeRange;

    // Request statistics
    const recentRequests = this.metrics.filter(m => m.timestamp >= cutoff);
    const successfulRequests = recentRequests.filter(r => r.statusCode < 400);
    const slowRequests = recentRequests.filter(r => r.duration > 3000);

    const byEndpoint: Record<string, {
      count: number;
      totalTime: number;
      errorCount: number;
    }> = {};

    recentRequests.forEach(req => {
      if (!byEndpoint[req.endpoint]) {
        byEndpoint[req.endpoint] = { count: 0, totalTime: 0, errorCount: 0 };
      }
      byEndpoint[req.endpoint].count++;
      byEndpoint[req.endpoint].totalTime += req.duration;
      if (req.statusCode >= 400) {
        byEndpoint[req.endpoint].errorCount++;
      }
    });

    const endpointStats = Object.entries(byEndpoint).reduce((acc, [endpoint, stats]) => {
      acc[endpoint] = {
        count: stats.count,
        avgTime: stats.totalTime / stats.count,
        errorRate: (stats.errorCount / stats.count) * 100,
      };
      return acc;
    }, {} as Record<string, any>);

    // Query statistics
    const recentQueries = this.queryMetrics.filter(q => q.timestamp >= cutoff);
    const successfulQueries = recentQueries.filter(q => q.success);
    const slowQueries = recentQueries.filter(q => q.duration > 1000);

    return {
      requestStats: {
        totalRequests: recentRequests.length,
        averageResponseTime: recentRequests.length > 0 
          ? recentRequests.reduce((sum, req) => sum + req.duration, 0) / recentRequests.length 
          : 0,
        slowRequests: slowRequests.length,
        errorRate: recentRequests.length > 0 
          ? ((recentRequests.length - successfulRequests.length) / recentRequests.length) * 100 
          : 0,
        byEndpoint: endpointStats,
      },
      queryStats: {
        totalQueries: recentQueries.length,
        averageQueryTime: recentQueries.length > 0 
          ? recentQueries.reduce((sum, q) => sum + q.duration, 0) / recentQueries.length 
          : 0,
        slowQueries: slowQueries.length,
        errorRate: recentQueries.length > 0 
          ? ((recentQueries.length - successfulQueries.length) / recentQueries.length) * 100 
          : 0,
      },
    };
  }

  static async getSystemMetrics(): Promise<{
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage?: number;
    uptime: number;
    activeConnections: number;
  }> {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    // Get active database connections (approximate)
    let activeConnections = 0;
    try {
      const cachedConnections = await CacheService.get<number>(PERFORMANCE_CACHE_KEYS.DATABASE_CONNECTIONS);
      activeConnections = cachedConnections || 0;
    } catch (error) {
      // Ignore cache errors
    }

    return {
      memoryUsage,
      uptime,
      activeConnections,
    };
  }

  static async getCacheStats(): Promise<{
    hitRate: number;
    totalKeys: number;
    memoryUsage?: string;
    connected: boolean;
  }> {
    try {
      const stats = await CacheService.getStats();
      return {
        hitRate: stats.hitRate || 0,
        totalKeys: stats.keyCount,
        memoryUsage: stats.memoryUsage,
        connected: stats.connected,
      };
    } catch (error) {
      return {
        hitRate: 0,
        totalKeys: 0,
        connected: false,
      };
    }
  }

  private static getClientIP(request: NextRequest): string | undefined {
    return (
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      'unknown'
    )?.split(',')[0]?.trim();
  }

  private static getEndpointPath(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return url;
    }
  }

  private static sanitizeQuery(query: string): string {
    // Remove sensitive data and limit length
    return query
      .replace(/\b(password|secret|token|key)\b.*?(?=[\s,;]|$)/gi, '[REDACTED]')
      .substring(0, 200);
  }

  static async clearMetrics(): Promise<void> {
    this.metrics = [];
    this.queryMetrics = [];
    await CacheService.invalidatePattern(`${PERFORMANCE_CACHE_KEYS.API_RESPONSE_TIME}:*`);
    await CacheService.invalidatePattern(`${PERFORMANCE_CACHE_KEYS.QUERY_PERFORMANCE}:*`);
  }
}

// Middleware factory for performance monitoring
export function createPerformanceMiddleware() {
  return async (request: NextRequest, next: () => Promise<NextResponse>): Promise<NextResponse> => {
    const startTime = Date.now();
    
    try {
      const response = await next();
      const duration = Date.now() - startTime;
      
      await PerformanceMonitor.trackRequest(request, response, duration);
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorResponse = NextResponse.json({
        success: false,
        data: null,
        errors: ['Internal server error'],
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      }, { status: 500 });
      
      await PerformanceMonitor.trackRequest(request, errorResponse, duration);
      
      throw error;
    }
  };
}

// Database query monitoring wrapper
export async function monitorQuery<T>(
  query: string,
  parameters: any,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let success = false;
  let result: T;
  let error: string | undefined;

  try {
    result = await operation();
    success = true;
    return result;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown error';
    success = false;
    throw err;
  } finally {
    const duration = Date.now() - startTime;
    await PerformanceMonitor.trackQuery(query, parameters, duration, success, error);
  }
}

// Performance reporting utilities
export class PerformanceReporter {
  static async generateReport(timeRange: number = 3600000): Promise<{
    summary: {
      timeRange: number;
      generatedAt: string;
      systemHealth: 'GOOD' | 'WARNING' | 'CRITICAL';
    };
    apiPerformance: ReturnType<typeof PerformanceMonitor.getPerformanceStats>['requestStats'];
    databasePerformance: ReturnType<typeof PerformanceMonitor.getPerformanceStats>['queryStats'];
    systemMetrics: Awaited<ReturnType<typeof PerformanceMonitor.getSystemMetrics>>;
    cacheMetrics: Awaited<ReturnType<typeof PerformanceMonitor.getCacheStats>>;
    recommendations: string[];
  }> {
    const performanceStats = PerformanceMonitor.getPerformanceStats(timeRange);
    const systemMetrics = await PerformanceMonitor.getSystemMetrics();
    const cacheMetrics = await PerformanceMonitor.getCacheStats();

    const recommendations: string[] = [];
    let systemHealth: 'GOOD' | 'WARNING' | 'CRITICAL' = 'GOOD';

    // Analyze API performance
    if (performanceStats.requestStats.averageResponseTime > 2000) {
      recommendations.push('API response times are above 2 seconds average. Consider optimizing queries.');
      systemHealth = 'WARNING';
    }

    if (performanceStats.requestStats.errorRate > 5) {
      recommendations.push('API error rate is above 5%. Check error logs.');
      systemHealth = systemHealth === 'WARNING' ? 'CRITICAL' : 'WARNING';
    }

    // Analyze database performance
    if (performanceStats.queryStats.averageQueryTime > 500) {
      recommendations.push('Database query times are above 500ms average. Review indexing and query optimization.');
      systemHealth = systemHealth === 'WARNING' ? 'CRITICAL' : 'WARNING';
    }

    if (performanceStats.queryStats.errorRate > 2) {
      recommendations.push('Database error rate is above 2%. Check database connection and query syntax.');
      systemHealth = 'CRITICAL';
    }

    // Analyze system metrics
    const memoryUsageMB = systemMetrics.memoryUsage.heapUsed / 1024 / 1024;
    if (memoryUsageMB > 500) {
      recommendations.push('Memory usage is above 500MB. Monitor for memory leaks.');
      systemHealth = systemHealth === 'WARNING' ? 'CRITICAL' : 'WARNING';
    }

    // Analyze cache performance
    if (cacheMetrics.hitRate < 80 && cacheMetrics.connected) {
      recommendations.push('Cache hit rate is below 80%. Consider adjusting cache strategy.');
    }

    if (!cacheMetrics.connected) {
      recommendations.push('Redis cache is not connected. Check Redis configuration.');
      systemHealth = 'CRITICAL';
    }

    return {
      summary: {
        timeRange,
        generatedAt: new Date().toISOString(),
        systemHealth,
      },
      apiPerformance: performanceStats.requestStats,
      databasePerformance: performanceStats.queryStats,
      systemMetrics,
      cacheMetrics,
      recommendations,
    };
  }
}

export default PerformanceMonitor;