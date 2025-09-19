import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized'] },
        { status: 401 }
      );
    }

    // Get the most recent system metrics
    const systemMetrics = await prisma.systemMetrics.findFirst({
      where: { metricType: 'system' },
      orderBy: { timestamp: 'desc' }
    });

    // Get recent API metrics for the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentApiMetrics = await prisma.systemMetrics.findMany({
      where: {
        metricType: 'api',
        timestamp: { gte: oneHourAgo }
      },
      orderBy: { timestamp: 'desc' },
      take: 60 // Last 60 minutes
    });

    // Calculate averages from recent API metrics
    const avgResponseTime = recentApiMetrics.length > 0 
      ? recentApiMetrics.reduce((sum, metric) => sum + (metric.avgResponseTime || 0), 0) / recentApiMetrics.length
      : 0;

    const avgErrorRate = recentApiMetrics.length > 0 
      ? recentApiMetrics.reduce((sum, metric) => sum + (metric.errorRate || 0), 0) / recentApiMetrics.length
      : 0;

    // Get database metrics
    const dbMetrics = await prisma.systemMetrics.findFirst({
      where: { metricType: 'database' },
      orderBy: { timestamp: 'desc' }
    });

    // Construct comprehensive metrics object
    const metrics = {
      system: {
        cpuUsage: systemMetrics?.cpuUsage || 0,
        memoryUsage: systemMetrics?.memoryUsage || 0,
        diskUsage: systemMetrics?.diskUsage || 0,
        networkLatency: systemMetrics?.networkLatency || 0,
        timestamp: systemMetrics?.timestamp || new Date().toISOString()
      },
      api: {
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        errorRate: Math.round(avgErrorRate * 100) / 100,
        requestsPerMinute: recentApiMetrics.length > 0 
          ? recentApiMetrics.reduce((sum, metric) => sum + (metric.requestsPerMinute || 0), 0) / recentApiMetrics.length
          : 0
      },
      database: {
        connectionCount: dbMetrics?.connectionCount || 0,
        avgQueryTime: dbMetrics?.avgQueryTime || 0,
        slowQueries: dbMetrics?.slowQueries || 0
      },
      overall: {
        timestamp: new Date().toISOString(),
        status: 'HEALTHY',
        uptime: '100%'
      }
    };

    // Determine overall system health status
    const cpuHealth = metrics.system.cpuUsage < 80 ? 'GOOD' : metrics.system.cpuUsage < 90 ? 'WARNING' : 'CRITICAL';
    const memoryHealth = metrics.system.memoryUsage < 80 ? 'GOOD' : metrics.system.memoryUsage < 90 ? 'WARNING' : 'CRITICAL';
    const apiHealth = metrics.api.errorRate < 1 ? 'GOOD' : metrics.api.errorRate < 5 ? 'WARNING' : 'CRITICAL';

    if (cpuHealth === 'CRITICAL' || memoryHealth === 'CRITICAL' || apiHealth === 'CRITICAL') {
      metrics.overall.status = 'CRITICAL';
    } else if (cpuHealth === 'WARNING' || memoryHealth === 'WARNING' || apiHealth === 'WARNING') {
      metrics.overall.status = 'WARNING';
    }

    return NextResponse.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to fetch system metrics:', error);
    return NextResponse.json(
      { success: false, errors: ['Failed to fetch system metrics'] },
      { status: 500 }
    );
  }
}