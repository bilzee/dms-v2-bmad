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

    // Get recent user activity from the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const userActivities = await prisma.userActivity.findMany({
      where: {
        timestamp: { gte: twentyFourHoursAgo },
        OR: [
          { eventType: 'USER_ACTION' },
          { eventType: 'SYSTEM_EVENT' },
          { eventType: 'SECURITY_EVENT' },
          { eventType: 'API_ACCESS' }
        ]
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
      select: {
        id: true,
        userId: true,
        userName: true,
        action: true,
        resource: true,
        eventType: true,
        details: true,
        timestamp: true
      }
    });

    // Format activities for display
    const formattedActivities = userActivities.map(activity => ({
      id: activity.id,
      userId: activity.userId,
      userName: activity.userName,
      action: activity.action,
      resource: activity.resource,
      eventType: activity.eventType,
      description: (typeof activity.details === 'object' && activity.details && 'description' in activity.details) 
        ? String(activity.details.description) 
        : `${activity.action} on ${activity.resource}`,
      timestamp: activity.timestamp
    }));

    return NextResponse.json({
      success: true,
      data: formattedActivities,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to fetch recent activity:', error);
    return NextResponse.json(
      { success: false, errors: ['Failed to fetch recent activity'] },
      { status: 500 }
    );
  }
}