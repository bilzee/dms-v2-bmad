import { NextRequest, NextResponse } from 'next/server';
import type { PriorityQueueItem } from '@dms/shared';

// Import AutomaticPriorityAssigner for priority calculation
import { AutomaticPriorityAssigner } from '@/lib/sync/AutomaticPriorityAssigner';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Function to add job to backend BullMQ queue
async function addToBullMQQueue(queueItem: PriorityQueueItem) {
  try {
    // Import backend services dynamically - only works on server
    if (typeof window === 'undefined') {
      const { addPriorityJob } = await import('../../../../../../../../backend/src/lib/queue/syncProcessor');
      
      // Add to BullMQ queue with priority
      await addPriorityJob(queueItem);
      return true;
    }
  } catch (error) {
    console.warn('BullMQ backend not available, simulating queue add:', error);
  }
  
  return false;
}

/**
 * POST /api/v1/sync/queue/add - Add item to priority sync queue
 */
export async function POST(request: NextRequest) {
  try {
    // In real implementation, add authentication checks
    // const session = await getServerSession(authOptions);
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const requestBody = await request.json();
    const { options, ...queueItemData } = requestBody;

    // Validate required fields
    if (!queueItemData.id || !queueItemData.type) {
      return NextResponse.json(
        { success: false, data: null, errors: ['Missing required fields: id, type'] },
        { status: 400 }
      );
    }

    // Calculate priority score using existing logic
    const priorityScore = AutomaticPriorityAssigner.calculatePriorityScore(queueItemData);
    const priorityReason = AutomaticPriorityAssigner.generatePriorityReason(queueItemData);

    const enhancedItem: PriorityQueueItem = {
      ...queueItemData,
      priorityScore,
      priorityReason,
      createdAt: queueItemData.createdAt || new Date(),
      retryCount: queueItemData.retryCount || 0,
      priority: getPriorityFromScore(priorityScore),
    };

    // Try to add to BullMQ queue
    const addedToBullMQ = await addToBullMQQueue(enhancedItem);

    if (!addedToBullMQ) {
      // Fallback: Log that we would add to queue (for testing when BullMQ not available)
      console.log('Would add to queue:', enhancedItem);
    }

    return NextResponse.json({
      success: true,
      data: { 
        id: queueItemData.id, 
        priorityScore,
        priorityReason,
        addedToBullMQ
      }
    });

  } catch (error) {
    console.error('Failed to add item to queue:', error);
    return NextResponse.json(
      { 
        success: false,
      data: null,
        errors: [error instanceof Error ? error.message : 'Failed to add item to queue']
      },
      { status: 500 }
    );
  }
}

/**
 * Convert priority score to priority level
 */
function getPriorityFromScore(score: number): 'HIGH' | 'NORMAL' | 'LOW' {
  if (score >= 70) return 'HIGH';
  if (score >= 20) return 'NORMAL';
  return 'LOW';
}