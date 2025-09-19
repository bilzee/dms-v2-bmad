import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/v1/coordinator/communications - Get communication feeds and activity
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized'] },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const incidentId = searchParams.get('incidentId');
    const messageType = searchParams.get('type'); // notification, audit, activity, system
    const limit = parseInt(searchParams.get('limit') || '50');
    const priority = searchParams.get('priority'); // HIGH, MEDIUM, LOW

    // Get notifications (incident-related messages)
    const notifications = await prisma.notification.findMany({
      where: {
        ...(incidentId && { entityId: incidentId }),
        ...(messageType === 'notification' && { type: { in: ['INCIDENT_UPDATE', 'RESPONSE_UPDATE', 'ASSESSMENT_UPDATE'] } }),
        ...(priority && { priority })
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // Get audit logs for coordinator activities
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        ...(messageType === 'audit' && {}),
        action: { in: ['CREATE_RESPONSE', 'UPDATE_ASSESSMENT', 'ALLOCATE_RESOURCE', 'ASSIGN_TEAM'] }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });

    // Get user activity (for team coordination)
    const userActivity = await prisma.userActivity.findMany({
      where: {
        ...(messageType === 'activity' && {}),
        action: { in: ['LOGIN', 'SYNC', 'ASSESSMENT_SUBMIT', 'RESPONSE_SUBMIT'] }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });

    // Get system events (errors, performance alerts)
    const systemEvents = await prisma.securityEvent.findMany({
      where: {
        ...(messageType === 'system' && {}),
        eventType: { in: ['API_ERROR', 'PERFORMANCE_ALERT', 'SYNC_FAILURE'] }
      },
      orderBy: { timestamp: 'desc' },
      take: Math.min(limit, 20) // Limit system events
    });

    // Transform to unified communication feed format
    const communicationFeed = [
      // Notifications
      ...notifications.map(n => ({
        id: n.id,
        type: 'notification',
        title: n.title,
        message: n.message,
        priority: n.priority,
        timestamp: n.createdAt,
        entityId: n.entityId,
        metadata: n.metadata,
        status: n.status,
        source: 'system',
        category: 'incident',
        actions: n.type === 'INCIDENT_UPDATE' ? ['view_incident', 'acknowledge'] : ['view', 'acknowledge']
      })),
      
      // Audit logs
      ...auditLogs.map(log => ({
        id: log.id,
        type: 'audit',
        title: `${log.action.replace('_', ' ').toLowerCase()}`,
        message: log.details || `${log.action} performed`,
        priority: 'MEDIUM',
        timestamp: log.timestamp,
        entityId: log.resourceId || 'system',
        metadata: { userId: log.userId, resource: log.resource },
        status: 'completed',
        source: 'coordinator',
        category: 'activity',
        actions: ['view_details']
      })),
      
      // User activity
      ...userActivity.map(activity => ({
        id: activity.id,
        type: 'activity',
        title: `Team Member ${activity.action.toLowerCase()}`,
        message: (typeof activity.details === 'string' ? activity.details : `User performed ${activity.action}`),
        priority: 'LOW',
        timestamp: activity.timestamp,
        entityId: activity.resourceId || 'system',
        metadata: { userId: activity.userId, resource: activity.resource },
        status: 'info',
        source: 'team',
        category: 'coordination',
        actions: ['view_user']
      })),
      
      // System events
      ...systemEvents.map(event => ({
        id: event.id,
        type: 'system',
        title: `System ${event.eventType.replace('_', ' ').toLowerCase()}`,
        message: event.description || 'System event occurred',
        priority: event.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
        timestamp: event.timestamp,
        entityId: event.ipAddress || 'system',
        metadata: { severity: event.severity, userId: event.userId },
        status: event.requiresInvestigation ? 'requires_attention' : 'resolved',
        source: 'system',
        category: 'technical',
        actions: event.requiresInvestigation ? ['investigate', 'acknowledge'] : ['view']
      }))
    ];

    // Sort by timestamp (most recent first)
    communicationFeed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit to final feed
    const limitedFeed = communicationFeed.slice(0, limit);

    // Calculate summary statistics
    const summary = {
      totalMessages: limitedFeed.length,
      unreadCount: limitedFeed.filter(msg => msg.status === 'PENDING' || msg.status === 'requires_attention').length,
      highPriorityCount: limitedFeed.filter(msg => msg.priority === 'HIGH').length,
      messagesByType: {
        notification: limitedFeed.filter(msg => msg.type === 'notification').length,
        audit: limitedFeed.filter(msg => msg.type === 'audit').length,
        activity: limitedFeed.filter(msg => msg.type === 'activity').length,
        system: limitedFeed.filter(msg => msg.type === 'system').length
      },
      messagesByCategory: {
        incident: limitedFeed.filter(msg => msg.category === 'incident').length,
        activity: limitedFeed.filter(msg => msg.category === 'activity').length,
        coordination: limitedFeed.filter(msg => msg.category === 'coordination').length,
        technical: limitedFeed.filter(msg => msg.category === 'technical').length
      },
      recentActivity: {
        lastHour: limitedFeed.filter(msg => 
          new Date(msg.timestamp).getTime() > Date.now() - 60 * 60 * 1000
        ).length,
        last24Hours: limitedFeed.filter(msg => 
          new Date(msg.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
        ).length
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        communicationFeed: limitedFeed,
        summary
      },
      message: `Found ${limitedFeed.length} communication messages`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to fetch communication feed:', error);
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to fetch communication feed'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// POST /api/v1/coordinator/communications - Send message or create communication
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized'] },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, title, message, targetRoles, entityId, priority, metadata } = body;

    // Validate required fields
    if (!type || !title || !message) {
      return NextResponse.json({
        success: false,
        errors: ['Missing required fields: type, title, message'],
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        type: type.toUpperCase(),
        title,
        message,
        targetRoles: targetRoles || ['COORDINATOR'],
        entityId: entityId || 'system',
        priority: priority || 'MEDIUM',
        metadata: metadata || {},
        status: 'PENDING'
      }
    });

    // Create audit log for this communication
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SEND_COMMUNICATION',
        resource: 'notification',
        resourceId: notification.id,
        details: `Sent ${type} message: ${title}`,
        timestamp: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        communication: {
          id: notification.id,
          type,
          title,
          message,
          targetRoles,
          entityId,
          priority,
          status: notification.status,
          createdAt: notification.createdAt
        }
      },
      message: 'Communication sent successfully',
      timestamp: new Date().toISOString()
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to send communication:', error);
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to send communication'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}