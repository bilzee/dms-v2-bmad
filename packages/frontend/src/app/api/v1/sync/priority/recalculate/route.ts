import { NextRequest, NextResponse } from 'next/server';
import type { PriorityQueueItem, PriorityRule } from '@dms/shared';

// Mock data (same as other endpoints - in real implementation, use shared database)
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
    estimatedSyncTime: new Date(Date.now() + 5 * 60 * 1000),
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
    estimatedSyncTime: new Date(Date.now() + 15 * 60 * 1000),
  },
];

let priorityRules: PriorityRule[] = [
  {
    id: 'rule-1',
    name: 'Health Emergency Priority',
    entityType: 'ASSESSMENT',
    conditions: [
      {
        field: 'data.assessmentType',
        operator: 'EQUALS',
        value: 'HEALTH',
        modifier: 20,
      },
    ],
    priorityModifier: 25,
    isActive: true,
    createdBy: 'admin',
    createdAt: new Date('2025-08-27T10:00:00Z'),
  },
];

/**
 * Simplified priority calculation (uses the AutomaticPriorityAssigner logic)
 */
function recalculatePriorityScore(item: PriorityQueueItem, rules: PriorityRule[]): { score: number; reason: string } {
  let baseScore = 15; // NORMAL priority base
  let reasons: string[] = [];

  // Base priority conversion
  switch (item.priority) {
    case 'HIGH': baseScore = 30; break;
    case 'NORMAL': baseScore = 15; break;
    case 'LOW': baseScore = 5; break;
  }

  // Type-based priority
  if (item.type === 'ASSESSMENT') {
    baseScore += 20;
    reasons.push('Assessment item');
  } else if (item.type === 'RESPONSE') {
    baseScore += 15;
    reasons.push('Response item');
  } else if (item.type === 'MEDIA') {
    baseScore += 10;
    reasons.push('Media item');
  }

  // Apply active rules
  const applicableRules = rules.filter(rule => 
    rule.isActive && rule.entityType === item.type
  );

  for (const rule of applicableRules) {
    let ruleApplies = true;
    
    // Simple rule evaluation (simplified for demo)
    for (const condition of rule.conditions) {
      if (condition.field === 'data.assessmentType') {
        const assessmentType = (item.data as any)?.assessmentType;
        if (condition.operator === 'EQUALS' && assessmentType !== condition.value) {
          ruleApplies = false;
          break;
        }
      }
    }

    if (ruleApplies) {
      baseScore += rule.priorityModifier;
      reasons.push(`Applied rule: ${rule.name}`);
    }
  }

  // Age bonus (older items get slight boost)
  const ageHours = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60);
  if (ageHours > 48) {
    baseScore += 5;
    reasons.push('Aging bonus (>48h)');
  } else if (ageHours > 24) {
    baseScore += 3;
    reasons.push('Aging bonus (>24h)');
  }

  // Ensure score is within bounds
  const finalScore = Math.max(0, Math.min(100, Math.round(baseScore)));

  return {
    score: finalScore,
    reason: reasons.length > 0 ? reasons.join('; ') : 'Automatic assignment',
  };
}

/**
 * PUT /api/v1/sync/priority/recalculate - Recalculate priorities for all queue items
 */
export async function PUT(request: NextRequest) {
  try {
    // In real implementation, add authentication and authorization checks
    // const session = await getServerSession(authOptions);
    // if (!session?.user || session.user.role !== 'COORDINATOR') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    console.log('Starting priority recalculation for all queue items...');

    let updatedCount = 0;
    const updateLog: Array<{ id: string; oldScore: number; newScore: number; reason: string }> = [];

    // Recalculate priorities for all items (except manual overrides)
    mockQueue.forEach((item, index) => {
      // Skip items with manual overrides unless explicitly requested
      if (item.manualOverride) {
        console.log(`Skipping item ${item.id} - has manual override`);
        return;
      }

      const oldScore = item.priorityScore || 0;
      const { score: newScore, reason } = recalculatePriorityScore(item, priorityRules);

      if (newScore !== oldScore) {
        mockQueue[index] = {
          ...item,
          priorityScore: newScore,
          priorityReason: reason,
          estimatedSyncTime: new Date(Date.now() + Math.max(1, (100 - newScore)) * 60 * 1000),
        };

        updateLog.push({
          id: item.id,
          oldScore,
          newScore,
          reason,
        });

        updatedCount++;
      }
    });

    // Sort queue by new priorities
    mockQueue.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

    console.log(`Priority recalculation completed. Updated ${updatedCount} items.`);

    return NextResponse.json({
      success: true,
      data: {
        updatedCount,
        totalItems: mockQueue.length,
        updateLog: updateLog.slice(0, 10), // Return first 10 updates for logging
        recalculatedAt: new Date(),
      },
      message: `Priority recalculation completed. Updated ${updatedCount} of ${mockQueue.length} items.`,
    });

  } catch (error) {
    console.error('Failed to recalculate priorities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to recalculate priorities' },
      { status: 500 }
    );
  }
}