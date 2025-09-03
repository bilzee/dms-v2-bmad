import { NextRequest, NextResponse } from 'next/server';

interface ActiveAlert {
  id: string;
  type: 'PERFORMANCE' | 'ERROR_RATE' | 'QUEUE_BACKLOG' | 'SYNC_FAILURE' | 'USER_ACTIVITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  threshold: number;
  currentValue: number;
  isActive: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Mock active alerts data
const generateMockActiveAlerts = (): ActiveAlert[] => {
  const alerts: ActiveAlert[] = [];
  
  // Simulate some active alerts based on current "system state"
  const cpuUsage = Math.random() * 100;
  const errorRate = Math.random() * 10;
  const queueSize = Math.floor(Math.random() * 150) + 10;
  
  // High CPU alert
  if (cpuUsage > 70) {
    alerts.push({
      id: `alert-cpu-${Date.now()}`,
      type: 'PERFORMANCE',
      severity: cpuUsage > 85 ? 'CRITICAL' : 'HIGH',
      title: 'High CPU Usage',
      description: `System CPU usage is at ${cpuUsage.toFixed(1)}%`,
      threshold: 70,
      currentValue: cpuUsage,
      isActive: true,
      createdAt: new Date(Date.now() - Math.random() * 60 * 60 * 1000), // Random time within last hour
      updatedAt: new Date(),
    });
  }
  
  // Error rate alert
  if (errorRate > 3) {
    alerts.push({
      id: `alert-error-${Date.now()}`,
      type: 'ERROR_RATE',
      severity: errorRate > 7 ? 'CRITICAL' : errorRate > 5 ? 'HIGH' : 'MEDIUM',
      title: 'Elevated Error Rate',
      description: `System error rate is at ${errorRate.toFixed(2)}%`,
      threshold: 3,
      currentValue: errorRate,
      isActive: true,
      createdAt: new Date(Date.now() - Math.random() * 30 * 60 * 1000), // Random time within last 30 minutes
      updatedAt: new Date(),
    });
  }
  
  // Queue backlog alert
  if (queueSize > 50) {
    alerts.push({
      id: `alert-queue-${Date.now()}`,
      type: 'QUEUE_BACKLOG',
      severity: queueSize > 100 ? 'HIGH' : 'MEDIUM',
      title: 'Queue Backlog Alert',
      description: `Sync queue has ${queueSize} pending items`,
      threshold: 50,
      currentValue: queueSize,
      isActive: true,
      createdAt: new Date(Date.now() - Math.random() * 15 * 60 * 1000), // Random time within last 15 minutes
      updatedAt: new Date(),
    });
  }
  
  // Sync failure alert (random chance)
  if (Math.random() > 0.7) {
    const failureRate = Math.random() * 20 + 5; // 5-25%
    alerts.push({
      id: `alert-sync-${Date.now()}`,
      type: 'SYNC_FAILURE',
      severity: failureRate > 20 ? 'CRITICAL' : failureRate > 15 ? 'HIGH' : 'MEDIUM',
      title: 'High Sync Failure Rate',
      description: `Sync failure rate is at ${failureRate.toFixed(1)}%`,
      threshold: 10,
      currentValue: failureRate,
      isActive: true,
      acknowledgedBy: Math.random() > 0.5 ? 'admin@dms.gov' : undefined,
      acknowledgedAt: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 10 * 60 * 1000) : undefined,
      createdAt: new Date(Date.now() - Math.random() * 45 * 60 * 1000), // Random time within last 45 minutes
      updatedAt: new Date(),
    });
  }
  
  return alerts;
};

// GET /api/v1/system/alerts/active - Get active system alerts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const type = searchParams.get('type');
    const acknowledged = searchParams.get('acknowledged');
    const limit = parseInt(searchParams.get('limit') || '50');

    let activeAlerts = generateMockActiveAlerts();

    // Filter by severity
    if (severity) {
      const severities = severity.split(',');
      activeAlerts = activeAlerts.filter(alert => 
        severities.includes(alert.severity)
      );
    }

    // Filter by type
    if (type) {
      const types = type.split(',');
      activeAlerts = activeAlerts.filter(alert => 
        types.includes(alert.type)
      );
    }

    // Filter by acknowledgment status
    if (acknowledged === 'true') {
      activeAlerts = activeAlerts.filter(alert => alert.acknowledgedBy);
    } else if (acknowledged === 'false') {
      activeAlerts = activeAlerts.filter(alert => !alert.acknowledgedBy);
    }

    // Sort by severity and creation time
    const severityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    activeAlerts.sort((a, b) => {
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Apply limit
    activeAlerts = activeAlerts.slice(0, limit);

    // Generate summary statistics
    const summary = {
      totalActive: activeAlerts.length,
      unacknowledged: activeAlerts.filter(a => !a.acknowledgedBy).length,
      bySeverity: {
        CRITICAL: activeAlerts.filter(a => a.severity === 'CRITICAL').length,
        HIGH: activeAlerts.filter(a => a.severity === 'HIGH').length,
        MEDIUM: activeAlerts.filter(a => a.severity === 'MEDIUM').length,
        LOW: activeAlerts.filter(a => a.severity === 'LOW').length,
      },
      byType: {
        PERFORMANCE: activeAlerts.filter(a => a.type === 'PERFORMANCE').length,
        ERROR_RATE: activeAlerts.filter(a => a.type === 'ERROR_RATE').length,
        QUEUE_BACKLOG: activeAlerts.filter(a => a.type === 'QUEUE_BACKLOG').length,
        SYNC_FAILURE: activeAlerts.filter(a => a.type === 'SYNC_FAILURE').length,
        USER_ACTIVITY: activeAlerts.filter(a => a.type === 'USER_ACTIVITY').length,
      },
      mostRecentAlert: activeAlerts.length > 0 ? activeAlerts[0].createdAt : null,
    };

    return NextResponse.json({
      success: true,
      data: {
        alerts: activeAlerts,
        summary,
        systemStatus: {
          overall: summary.bySeverity.CRITICAL > 0 ? 'CRITICAL' 
                  : summary.bySeverity.HIGH > 0 ? 'WARNING'
                  : summary.totalActive > 0 ? 'DEGRADED' 
                  : 'HEALTHY',
          lastChecked: new Date(),
        },
      },
      message: `Retrieved ${activeAlerts.length} active alerts`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch active alerts:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch active alerts',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// POST /api/v1/system/alerts/active - Acknowledge an alert
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.alertId) {
      return NextResponse.json({
        success: false,
        error: 'Missing alert ID',
        message: 'alertId is required for acknowledgment',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // In a real implementation, this would:
    // 1. Find the alert in the database
    // 2. Update acknowledgment status
    // 3. Log the acknowledgment action
    // 4. Potentially stop alert notifications

    return NextResponse.json({
      success: true,
      data: {
        alertId: body.alertId,
        acknowledgedBy: 'current-user@dms.gov', // Would come from auth
        acknowledgedAt: new Date(),
      },
      message: 'Alert acknowledged successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to acknowledge alert:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body',
        message: 'Please check your request format',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to acknowledge alert',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}