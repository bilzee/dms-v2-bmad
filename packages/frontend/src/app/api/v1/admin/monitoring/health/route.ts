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

    // Get system health indicators from various sources
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get latest system metrics
    const systemMetrics = await prisma.systemMetrics.findFirst({
      where: { metricType: 'system' },
      orderBy: { timestamp: 'desc' }
    });

    // Get recent security events
    const recentSecurityEvents = await prisma.securityEvent.count({
      where: {
        timestamp: { gte: twentyFourHoursAgo },
        severity: { in: ['HIGH', 'CRITICAL'] }
      }
    });

    // Get database performance
    const dbMetrics = await prisma.systemMetrics.findFirst({
      where: { metricType: 'database' },
      orderBy: { timestamp: 'desc' }
    });

    // Get API performance metrics
    const apiMetrics = await prisma.systemMetrics.findMany({
      where: {
        metricType: 'api',
        timestamp: { gte: oneHourAgo }
      }
    });

    // Calculate API health
    const avgResponseTime = apiMetrics.length > 0 
      ? apiMetrics.reduce((sum, metric) => sum + (metric.avgResponseTime || 0), 0) / apiMetrics.length
      : 0;
    
    const avgErrorRate = apiMetrics.length > 0 
      ? apiMetrics.reduce((sum, metric) => sum + (metric.errorRate || 0), 0) / apiMetrics.length
      : 0;

    // Get active user sessions
    const activeSessions = await prisma.session.count({
      where: { expires: { gt: now } }
    });

    // Get recent system alerts
    const systemAlerts = await prisma.systemAlert.count({
      where: { 
        isActive: true,
        lastTriggered: { gte: twentyFourHoursAgo }
      }
    });

    // Calculate overall system health score
    let healthScore = 100;
    
    // Deduct for high CPU usage
    if (systemMetrics?.cpuUsage && systemMetrics.cpuUsage > 80) {
      healthScore -= 10;
    }
    if (systemMetrics?.cpuUsage && systemMetrics.cpuUsage > 90) {
      healthScore -= 10;
    }

    // Deduct for high memory usage
    if (systemMetrics?.memoryUsage && systemMetrics.memoryUsage > 80) {
      healthScore -= 10;
    }
    if (systemMetrics?.memoryUsage && systemMetrics.memoryUsage > 90) {
      healthScore -= 10;
    }

    // Deduct for slow API response times
    if (avgResponseTime > 1000) {
      healthScore -= 5;
    }
    if (avgResponseTime > 2000) {
      healthScore -= 10;
    }

    // Deduct for high error rates
    if (avgErrorRate > 1) {
      healthScore -= 10;
    }
    if (avgErrorRate > 5) {
      healthScore -= 15;
    }

    // Deduct for security events
    if (recentSecurityEvents > 0) {
      healthScore -= recentSecurityEvents * 5;
    }

    // Deduct for system alerts
    if (systemAlerts > 0) {
      healthScore -= systemAlerts * 3;
    }

    // Ensure score doesn't go below 0
    healthScore = Math.max(0, healthScore);

    // Determine health status
    let healthStatus = 'HEALTHY';
    if (healthScore < 60) {
      healthStatus = 'CRITICAL';
    } else if (healthScore < 80) {
      healthStatus = 'WARNING';
    }

    // Construct health indicators
    const healthIndicators = {
      overall: {
        score: Math.round(healthScore),
        status: healthStatus,
        timestamp: now.toISOString()
      },
      system: {
        cpuUsage: systemMetrics?.cpuUsage || 0,
        memoryUsage: systemMetrics?.memoryUsage || 0,
        diskUsage: systemMetrics?.diskUsage || 0,
        networkLatency: systemMetrics?.networkLatency || 0,
        status: (systemMetrics?.cpuUsage && systemMetrics.cpuUsage > 90) || (systemMetrics?.memoryUsage && systemMetrics.memoryUsage > 90) ? 'CRITICAL' : 'GOOD'
      },
      database: {
        connectionCount: dbMetrics?.connectionCount || 0,
        avgQueryTime: dbMetrics?.avgQueryTime || 0,
        slowQueries: dbMetrics?.slowQueries || 0,
        status: (dbMetrics?.avgQueryTime && dbMetrics.avgQueryTime > 1000) ? 'WARNING' : 'GOOD'
      },
      api: {
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(avgErrorRate * 100) / 100,
        requestsPerMinute: apiMetrics.length > 0 
          ? Math.round(apiMetrics.reduce((sum, metric) => sum + (metric.requestsPerMinute || 0), 0) / apiMetrics.length)
          : 0,
        status: avgResponseTime > 2000 || avgErrorRate > 5 ? 'CRITICAL' : 
                avgResponseTime > 1000 || avgErrorRate > 1 ? 'WARNING' : 'GOOD'
      },
      security: {
        recentEvents: recentSecurityEvents,
        activeAlerts: systemAlerts,
        status: recentSecurityEvents > 0 || systemAlerts > 0 ? 'WARNING' : 'GOOD'
      },
      users: {
        activeSessions: activeSessions,
        status: 'GOOD'
      }
    };

    return NextResponse.json({
      success: true,
      data: healthIndicators,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Failed to fetch system health:', error);
    return NextResponse.json(
      { success: false, errors: ['Failed to fetch system health'] },
      { status: 500 }
    );
  }
}