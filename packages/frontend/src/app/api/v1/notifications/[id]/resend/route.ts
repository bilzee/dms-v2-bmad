import { NextRequest, NextResponse } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';
import NotificationService from '@/lib/services/NotificationService';
import { requireAuth } from '@/lib/auth-middleware';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/v1/notifications/:id/resend - Resend notification
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // Check authentication
    const authError = await requireAuth(request);
    if (authError) return authError;

    const { id: notificationId } = await context.params;

    // Get notification details
    const notification = await DatabaseService.prisma.notification.findUnique({
      where: {
        id: notificationId
      }
    });

    if (!notification) {
      return NextResponse.json({
        success: false,
        error: 'Notification not found',
        message: 'Notification with the specified ID does not exist',
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // Only resend failed notifications
    if (notification.status !== 'FAILED') {
      return NextResponse.json({
        success: false,
        error: 'Invalid notification status',
        message: 'Only failed notifications can be resent',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Create notification object for resending
    const roleChangeNotification = {
      type: notification.type as any,
      userId: notification.entityId,
      userName: (notification.metadata as any)?.userName || 'Unknown User',
      userEmail: (notification.metadata as any)?.userEmail || '',
      adminId: (notification.metadata as any)?.adminId || 'unknown',
      adminName: (notification.metadata as any)?.adminName || 'Unknown Admin',
      roles: (notification.metadata as any)?.roles || [],
      reason: (notification.metadata as any)?.reason,
      timestamp: new Date()
    };

    try {
      // Resend email notification if configured
      if (process.env.SEND_EMAIL_NOTIFICATIONS === 'true') {
        await (NotificationService as any).sendEmailNotification(roleChangeNotification);
      }

      // Resend in-app notification
      await (NotificationService as any).sendInAppNotification(roleChangeNotification);

      // Update notification status
      await DatabaseService.prisma.notification.update({
        where: {
          id: notificationId
        },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          updatedAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          notificationId,
          status: 'SENT',
          resentAt: new Date().toISOString()
        },
        message: 'Notification resent successfully',
        timestamp: new Date().toISOString(),
      });

    } catch (resendError) {
      console.error('Failed to resend notification:', resendError);

      // Mark as failed again
      await DatabaseService.prisma.notification.update({
        where: {
          id: notificationId
        },
        data: {
          status: 'FAILED',
          updatedAt: new Date()
        }
      });

      return NextResponse.json({
        success: false,
        error: 'Failed to resend notification',
        message: resendError instanceof Error ? resendError.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Failed to resend notification:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to resend notification',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}