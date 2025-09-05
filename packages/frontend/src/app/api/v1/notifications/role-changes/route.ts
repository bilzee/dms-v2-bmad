import { NextRequest, NextResponse } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';
import { requireAuth } from '@/lib/auth-middleware';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// GET /api/v1/notifications/role-changes - Get role change notifications
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authError = await requireAuth(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const isAdmin = searchParams.get('isAdmin') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build filter conditions
    const whereConditions: any = {
      type: {
        in: ['ROLE_ASSIGNED', 'ROLE_REMOVED', 'ROLE_ACTIVATED', 'BULK_ASSIGNMENT']
      }
    };

    if (userId && !isAdmin) {
      whereConditions.entityId = userId;
    }

    if (isAdmin) {
      whereConditions.targetRoles = {
        hasSome: ['ADMIN']
      };
    }

    // Fetch notifications
    const notifications = await DatabaseService.prisma.notification.findMany({
      where: whereConditions,
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        priority: true,
        status: true,
        targetRoles: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        sentAt: true,
        updatedAt: true
      }
    });

    // Get total count for pagination
    const totalCount = await DatabaseService.prisma.notification.count({
      where: whereConditions
    });

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + notifications.length < totalCount
        }
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to fetch role change notifications:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch notifications',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}