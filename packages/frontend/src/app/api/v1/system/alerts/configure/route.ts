import { NextRequest, NextResponse } from 'next/server';

interface AlertConfiguration {
  id: string;
  type: 'PERFORMANCE' | 'ERROR_RATE' | 'QUEUE_BACKLOG' | 'SYNC_FAILURE' | 'USER_ACTIVITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  threshold: number;
  enabled: boolean;
  notificationChannels: ('EMAIL' | 'SMS' | 'PUSH')[];
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

// Mock alert configurations storage
let mockAlertConfigurations: AlertConfiguration[] = [
  {
    id: 'alert-1',
    type: 'PERFORMANCE',
    severity: 'HIGH',
    threshold: 85,
    enabled: true,
    notificationChannels: ['EMAIL', 'PUSH'],
    title: 'High CPU Usage',
    description: 'CPU usage exceeds 85%',
    createdAt: new Date('2024-08-20'),
    updatedAt: new Date('2024-08-25'),
  },
  {
    id: 'alert-2',
    type: 'ERROR_RATE',
    severity: 'CRITICAL',
    threshold: 5,
    enabled: true,
    notificationChannels: ['EMAIL', 'SMS', 'PUSH'],
    title: 'High Error Rate',
    description: 'System error rate exceeds 5%',
    createdAt: new Date('2024-08-20'),
    updatedAt: new Date('2024-08-25'),
  },
  {
    id: 'alert-3',
    type: 'QUEUE_BACKLOG',
    severity: 'MEDIUM',
    threshold: 100,
    enabled: true,
    notificationChannels: ['EMAIL'],
    title: 'Queue Backlog',
    description: 'Queue size exceeds 100 items',
    createdAt: new Date('2024-08-21'),
    updatedAt: new Date('2024-08-24'),
  },
  {
    id: 'alert-4',
    type: 'SYNC_FAILURE',
    severity: 'HIGH',
    threshold: 15,
    enabled: false,
    notificationChannels: ['EMAIL', 'PUSH'],
    title: 'Sync Failure Rate',
    description: 'Sync failure rate exceeds 15%',
    createdAt: new Date('2024-08-22'),
    updatedAt: new Date('2024-08-23'),
  },
];

// POST /api/v1/system/alerts/configure - Create or update alert configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.type || !body.severity || body.threshold === undefined || !body.title) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        message: 'type, severity, threshold, and title are required',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Validate alert type
    const validTypes = ['PERFORMANCE', 'ERROR_RATE', 'QUEUE_BACKLOG', 'SYNC_FAILURE', 'USER_ACTIVITY'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid alert type',
        message: `Alert type must be one of: ${validTypes.join(', ')}`,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Validate severity
    const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    if (!validSeverities.includes(body.severity)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid severity level',
        message: `Severity must be one of: ${validSeverities.join(', ')}`,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Validate notification channels
    const validChannels = ['EMAIL', 'SMS', 'PUSH'];
    if (body.notificationChannels && !Array.isArray(body.notificationChannels)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid notification channels',
        message: 'notificationChannels must be an array',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    if (body.notificationChannels) {
      for (const channel of body.notificationChannels) {
        if (!validChannels.includes(channel)) {
          return NextResponse.json({
            success: false,
            error: 'Invalid notification channel',
            message: `Notification channels must be one of: ${validChannels.join(', ')}`,
            timestamp: new Date().toISOString(),
          }, { status: 400 });
        }
      }
    }

    // Create new alert configuration
    const newAlert: AlertConfiguration = {
      id: `alert-${Date.now()}`,
      type: body.type,
      severity: body.severity,
      threshold: body.threshold,
      enabled: body.enabled !== false, // Default to true
      notificationChannels: body.notificationChannels || ['EMAIL'],
      title: body.title,
      description: body.description || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add to mock storage
    mockAlertConfigurations.push(newAlert);

    return NextResponse.json({
      success: true,
      data: {
        alert: newAlert,
      },
      message: 'Alert configuration created successfully',
      timestamp: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create alert configuration:', error);
    
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
      error: 'Failed to create alert configuration',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// GET /api/v1/system/alerts/configure - Get all alert configurations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const enabled = searchParams.get('enabled');
    const type = searchParams.get('type');
    const severity = searchParams.get('severity');

    let filteredAlerts = [...mockAlertConfigurations];

    // Filter by enabled status
    if (enabled === 'true') {
      filteredAlerts = filteredAlerts.filter(alert => alert.enabled);
    } else if (enabled === 'false') {
      filteredAlerts = filteredAlerts.filter(alert => !alert.enabled);
    }

    // Filter by type
    if (type) {
      filteredAlerts = filteredAlerts.filter(alert => alert.type === type);
    }

    // Filter by severity
    if (severity) {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
    }

    return NextResponse.json({
      success: true,
      data: {
        alerts: filteredAlerts,
        totalCount: filteredAlerts.length,
        enabledCount: filteredAlerts.filter(a => a.enabled).length,
        summary: {
          byType: {
            PERFORMANCE: filteredAlerts.filter(a => a.type === 'PERFORMANCE').length,
            ERROR_RATE: filteredAlerts.filter(a => a.type === 'ERROR_RATE').length,
            QUEUE_BACKLOG: filteredAlerts.filter(a => a.type === 'QUEUE_BACKLOG').length,
            SYNC_FAILURE: filteredAlerts.filter(a => a.type === 'SYNC_FAILURE').length,
            USER_ACTIVITY: filteredAlerts.filter(a => a.type === 'USER_ACTIVITY').length,
          },
          bySeverity: {
            LOW: filteredAlerts.filter(a => a.severity === 'LOW').length,
            MEDIUM: filteredAlerts.filter(a => a.severity === 'MEDIUM').length,
            HIGH: filteredAlerts.filter(a => a.severity === 'HIGH').length,
            CRITICAL: filteredAlerts.filter(a => a.severity === 'CRITICAL').length,
          },
        },
      },
      message: `Retrieved ${filteredAlerts.length} alert configurations`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch alert configurations:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch alert configurations',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}