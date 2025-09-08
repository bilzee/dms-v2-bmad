import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { NotificationQueue } from '@/lib/queues/notification.queue';
import { emailService } from '@/lib/services/email.service';
import { pushNotificationService } from '@/lib/services/push.service';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

const NotificationRequestSchema = z.object({
  type: z.enum(['INCIDENT_CREATED', 'ASSESSMENT_SUBMITTED', 'VERIFICATION_REQUIRED']),
  title: z.string().min(1),
  message: z.string().min(1),
  targetRoles: z.array(z.enum(['ASSESSOR', 'RESPONDER', 'COORDINATOR', 'DONOR', 'ADMIN'])),
  entityId: z.string().uuid(),
  priority: z.enum(['HIGH', 'NORMAL', 'LOW']),
  metadata: z.object({
    incidentType: z.string().optional(),
    severity: z.string().optional(),
    assessorName: z.string().optional(),
    location: z.string().optional(),
    affectedPopulation: z.number().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request data
    const validationResult = NotificationRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          errors: ['Invalid notification request'],
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { type, title, message, targetRoles, entityId, priority, metadata } = validationResult.data;

    // Create notification record
    const notificationId = crypto.randomUUID();
    const currentDate = new Date();

    const notification = {
      id: notificationId,
      type,
      title,
      message,
      targetRoles,
      entityId,
      priority,
      metadata: metadata || {},
      status: 'SENT',
      createdAt: currentDate,
      sentAt: currentDate,
    };

    // Delivery results tracking
    const deliveryResults = {
      pushNotifications: 'PENDING' as string,
      emailNotifications: 'PENDING' as string,
      inAppNotifications: 'SENT' as string,
    };

    try {
      // 1. Save notification to database for audit trail
      const savedNotification = await prisma.notification.create({
        data: notification,
      });

      // 2. Queue background job for immediate delivery
      await NotificationQueue.add('send-notification', {
        notificationId: savedNotification.id,
        targetRoles,
        priority,
      });

      // 3. For HIGH priority, send immediate push notifications
      if (priority === 'HIGH') {
        const coordinators = await prisma.user.findMany({
          where: {
            roles: {
              some: {
                name: { in: targetRoles },
                isActive: true,
              },
            },
          },
          include: {
            roles: true,
          },
        });

        await pushNotificationService.sendImmediate(coordinators, notification);
        deliveryResults.pushNotifications = 'SENT';
      }

      deliveryResults.emailNotifications = 'QUEUED';
    } catch (deliveryError) {
      console.error('Notification delivery failed:', deliveryError);
      // Don't throw - log and continue with degraded service
    }
    
    console.log('Notification sent:', {
      id: notificationId,
      type,
      title,
      targetRoles,
      priority,
      entityId,
    });

    // Simulate different response times based on priority
    if (priority === 'HIGH') {
      // High priority notifications are processed immediately
    } else if (priority === 'NORMAL') {
      // Normal priority notifications have slight delay
      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      // Low priority notifications are queued for batch processing
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return NextResponse.json(
      { 
        success: true,
        notificationId,
        message: `Notification sent to ${targetRoles.join(', ')} roles`,
        deliveryStatus: deliveryResults
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error sending notification:', error);
    
    return NextResponse.json(
      { 
        errors: ['Internal server error'],
        message: 'Failed to send notification'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      errors: ['Method not allowed'],
      message: 'Use POST to send notifications'
    },
    { status: 405 }
  );
}