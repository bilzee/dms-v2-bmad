import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PUT /api/v1/notifications/:id/read - Mark notification as read
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    // Check authentication
    const authError = await requireAuth(request);
    if (authError) return authError;

    const { id: notificationId } = await context.params;

    // Update notification status
    const updatedNotification = await prisma.notification.update({
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
        sentAt: updatedNotification.sentAt
      },
      message: 'Notification marked as read',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Notification not found'],
        message: 'Notification with the specified ID does not exist',
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to mark notification as read'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}