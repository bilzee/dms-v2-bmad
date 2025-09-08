import { NextRequest, NextResponse } from 'next/server';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Mock data for development - would be replaced with actual system monitoring
const mockSystemMetrics = {
  timestamp: new Date(),
  cpuUsage: Math.random() * 100,
  memoryUsage: Math.random() * 100,
  apiResponseTime: Math.random() * 200 + 50, // 50-250ms
  databaseLatency: Math.random() * 100 + 10, // 10-110ms
  queueProcessingRate: Math.random() * 1000 + 500, // 500-1500 items/min
  activeConnections: Math.floor(Math.random() * 100) + 20, // 20-120 connections
  errorRate: Math.random() * 5, // 0-5% error rate
};

const mockTrends = {
  cpu: Array.from({ length: 20 }, () => Math.random() * 100),
  memory: Array.from({ length: 20 }, () => Math.random() * 100),
  apiLatency: Array.from({ length: 20 }, () => Math.random() * 200 + 50),
  errorRate: Array.from({ length: 20 }, () => Math.random() * 5),
};

const mockThresholds = {
  cpuWarning: 70,
  cpuCritical: 85,
  memoryWarning: 75,
  memoryCritical: 90,
  apiLatencyWarning: 200,
  apiLatencyCritical: 500,
  errorRateWarning: 2,
  errorRateCritical: 5,
};

// GET /api/v1/system/performance/metrics - Get real-time system performance metrics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '1h'; // 1h, 6h, 24h, 7d
    const includeHistory = searchParams.get('includeHistory') === 'true';

    // Generate fresh metrics for this request
    const currentMetrics = {
      ...mockSystemMetrics,
      timestamp: new Date(),
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      apiResponseTime: Math.random() * 200 + 50,
      databaseLatency: Math.random() * 100 + 10,
      queueProcessingRate: Math.random() * 1000 + 500,
      activeConnections: Math.floor(Math.random() * 100) + 20,
      errorRate: Math.random() * 5,
    };

    const response = {
      success: true,
      data: {
        metrics: currentMetrics,
        trends: includeHistory ? mockTrends : undefined,
        thresholds: mockThresholds,
        timeRange,
        systemHealth: {
          overall: currentMetrics.cpuUsage < 70 && currentMetrics.memoryUsage < 75 && currentMetrics.errorRate < 2 
            ? 'HEALTHY' 
            : currentMetrics.cpuUsage > 85 || currentMetrics.memoryUsage > 90 || currentMetrics.errorRate > 5
            ? 'CRITICAL'
            : 'DEGRADED',
          components: {
            cpu: currentMetrics.cpuUsage < 70 ? 'HEALTHY' : currentMetrics.cpuUsage < 85 ? 'WARNING' : 'CRITICAL',
            memory: currentMetrics.memoryUsage < 75 ? 'HEALTHY' : currentMetrics.memoryUsage < 90 ? 'WARNING' : 'CRITICAL',
            database: currentMetrics.databaseLatency < 50 ? 'HEALTHY' : currentMetrics.databaseLatency < 100 ? 'WARNING' : 'CRITICAL',
            api: currentMetrics.apiResponseTime < 200 ? 'HEALTHY' : currentMetrics.apiResponseTime < 500 ? 'WARNING' : 'CRITICAL',
          },
        },
      },
      message: 'System performance metrics retrieved successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch system performance metrics:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to fetch system performance metrics'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}