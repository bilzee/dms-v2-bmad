import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { PriorityQueueItem, PriorityOverrideRequest } from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Mock queue data (in real implementation, use actual database/queue system)
let mockQueue: PriorityQueueItem[] = [
  {
    id: 'queue-item-1',
    type: 'ASSESSMENT',
    action: 'CREATE',
    data: { assessmentType: 'HEALTH', affectedPopulationEstimate: 500 },
    retryCount: 0,
    priority: 'HIGH',
    priorityScore: 85,
    priorityReason: 'Health emergency detected; High beneficiary count',
    createdAt: new Date('2025-08-27T10:00:00Z'),
    estimatedSyncTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
  },
  {
    id: 'queue-item-2',
    type: 'RESPONSE',
    action: 'UPDATE',
    data: { responseType: 'HEALTH', plannedDate: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    retryCount: 0,
    priority: 'NORMAL',
    priorityScore: 45,
    priorityReason: 'Health response within 24h',
    createdAt: new Date('2025-08-27T11:00:00Z'),
    estimatedSyncTime: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
  },
];

const overrideRequestSchema = z.object({
  itemId: z.string().min(1),
  newPriority: z.number().int().min(0).max(100),
  justification: z.string().min(10).max(500), // Require meaningful justification
  coordinatorId: z.string().min(1),
});

/**
 * POST /api/v1/sync/priority/override - Manual priority override
 */
export async function POST(request: NextRequest) {
  try {
    // In real implementation, add authentication and authorization checks
    // const session = await getServerSession(authOptions);
    // if (!session?.user || session.user.role !== 'COORDINATOR') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await request.json();
    
    // Validate request body
    const validatedData = overrideRequestSchema.parse(body);

    // Find the queue item
    const itemIndex = mockQueue.findIndex(item => item.id === validatedData.itemId);
    if (itemIndex === -1) {
      return NextResponse.json(
        { success: false, data: null, errors: ['Queue item not found'] },
        { status: 404 }
      );
    }

    const item = mockQueue[itemIndex];

    // Check if multi-factor authentication is required (for high-value overrides)
    if (Math.abs(validatedData.newPriority - (item.priorityScore || 0)) > 30) {
      // In real implementation, check MFA status
      console.log('High-impact priority override requires MFA verification');
    }

    // Create override record
    const override = {
      coordinatorId: validatedData.coordinatorId,
      coordinatorName: 'Current Coordinator', // TODO: Get from user session
      originalPriority: item.priorityScore || 0,
      overridePriority: validatedData.newPriority,
      justification: validatedData.justification,
      timestamp: new Date(),
    };

    // Update the queue item
    const updatedItem: PriorityQueueItem = {
      ...item,
      priorityScore: validatedData.newPriority,
      priorityReason: `Manual override: ${validatedData.justification}`,
      manualOverride: override,
      estimatedSyncTime: new Date(Date.now() + Math.max(1, (100 - validatedData.newPriority)) * 60 * 1000), // Recalculate ETA
    };

    mockQueue[itemIndex] = updatedItem;

    // Log the override for audit purposes
    console.log('Priority override applied:', {
      itemId: validatedData.itemId,
      coordinatorId: validatedData.coordinatorId,
      originalPriority: override.originalPriority,
      newPriority: validatedData.newPriority,
      justification: validatedData.justification,
      timestamp: override.timestamp,
    });

    return NextResponse.json({
      success: true,
      data: updatedItem,
      message: 'Priority override applied successfully',
    });

  } catch (error) {
    console.error('Failed to apply priority override:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          errors: ['Invalid request data'],
          details: error.errors 
        } as any,
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, data: null, errors: ['Failed to apply priority override'] },
      { status: 500 }
    );
  }
}