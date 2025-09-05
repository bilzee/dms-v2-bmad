import { NextRequest, NextResponse } from 'next/server';
import { RapidResponse, ItemCompletionData, ResponseType, ResponseStatus, VerificationStatus, SyncStatus } from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Mock database function to get response
async function getResponseById(id: string): Promise<RapidResponse | null> {
  // In development, return mock response data
  // In production, this would query the actual database
  const mockResponse: RapidResponse = {
    id,
    responseType: ResponseType.FOOD,
    status: ResponseStatus.IN_PROGRESS,
    plannedDate: new Date('2024-08-20'),
    affectedEntityId: 'entity-1',
    assessmentId: 'assessment-1',
    responderId: 'responder-1',
    responderName: 'John Doe',
    verificationStatus: VerificationStatus.PENDING,
    syncStatus: SyncStatus.SYNCED,
    data: {
      foodItemsDelivered: [
        { item: 'Rice', quantity: 100, unit: 'kg' },
        { item: 'Cooking Oil', quantity: 20, unit: 'liters' },
      ],
      householdsServed: 50,
      personsServed: 200,
      nutritionSupplementsProvided: 0,
    },
    otherItemsDelivered: [
      { item: 'Rice', quantity: 100, unit: 'kg' },
      { item: 'Cooking Oil', quantity: 20, unit: 'liters' },
      { item: 'Blankets', quantity: 50, unit: 'pieces' },
    ],
    deliveryEvidence: [],
    partialDeliveryData: {
      deliveryId: 'delivery_123',
      totalPercentageComplete: 75.5,
      itemCompletionTracking: [
        {
          item: 'Rice',
          plannedQuantity: 100,
          deliveredQuantity: 90,
          remainingQuantity: 10,
          percentageComplete: 90,
          unit: 'kg',
          reasonCodes: ['SUPPLY_001'],
          followUpRequired: true,
        },
        {
          item: 'Cooking Oil',
          plannedQuantity: 20,
          deliveredQuantity: 15,
          remainingQuantity: 5,
          percentageComplete: 75,
          unit: 'liters',
          reasonCodes: ['LOGISTICS_001'],
          followUpRequired: true,
        },
        {
          item: 'Blankets',
          plannedQuantity: 50,
          deliveredQuantity: 35,
          remainingQuantity: 15,
          percentageComplete: 70,
          unit: 'pieces',
          reasonCodes: ['SUPPLY_002'],
          followUpRequired: true,
        },
      ],
      reasonCodes: [
        {
          code: 'SUPPLY_001',
          category: 'SUPPLY_SHORTAGE',
          description: 'Insufficient stock available at warehouse',
          appliesTo: ['Rice'],
        },
        {
          code: 'LOGISTICS_001',
          category: 'LOGISTICS_CHALLENGE',
          description: 'Vehicle breakdown during delivery route',
          appliesTo: ['Cooking Oil'],
        },
        {
          code: 'SUPPLY_002',
          category: 'SUPPLY_SHORTAGE',
          description: 'Supply chain disruption affecting availability',
          appliesTo: ['Blankets'],
        },
      ],
      followUpRequired: true,
      followUpTasks: [
        {
          id: 'task_001',
          type: 'COMPLETE_DELIVERY',
          priority: 'HIGH',
          estimatedDate: new Date('2024-08-25'),
          description: 'Complete delivery of remaining Rice (10 kg)',
          status: 'PENDING',
        },
        {
          id: 'task_002',
          type: 'SUPPLY_PROCUREMENT',
          priority: 'MEDIUM',
          estimatedDate: new Date('2024-08-27'),
          assignedTo: 'Supply Team',
          description: 'Procure additional Cooking Oil and Blankets',
          status: 'PENDING',
        },
      ],
      partialDeliveryTimestamp: new Date('2024-08-22'),
      estimatedCompletionDate: new Date('2024-08-28'),
    },
    createdAt: new Date('2024-08-15'),
    updatedAt: new Date('2024-08-22'),
  };
  
  return mockResponse;
}

// Calculate detailed tracking metrics
function calculateDetailedTrackingMetrics(itemTracking: ItemCompletionData[]) {
  const totalItems = itemTracking.length;
  const itemsFullyDelivered = itemTracking.filter(item => item.percentageComplete >= 100).length;
  const itemsPartiallyDelivered = itemTracking.filter(item => 
    item.percentageComplete > 0 && item.percentageComplete < 100
  ).length;
  const itemsPending = itemTracking.filter(item => item.percentageComplete === 0).length;
  
  const totalPercentageComplete = totalItems > 0 
    ? itemTracking.reduce((sum, item) => sum + item.percentageComplete, 0) / totalItems 
    : 0;

  // Calculate by category
  const categoryBreakdown = itemTracking.reduce((acc, item) => {
    const status = item.percentageComplete >= 100 ? 'complete' : 
                  item.percentageComplete > 0 ? 'partial' : 'pending';
    
    if (!acc[status]) acc[status] = [];
    acc[status].push(item);
    
    return acc;
  }, {} as Record<string, ItemCompletionData[]>);

  // Calculate quantities
  const totalPlannedQuantity = itemTracking.reduce((sum, item) => sum + item.plannedQuantity, 0);
  const totalDeliveredQuantity = itemTracking.reduce((sum, item) => sum + item.deliveredQuantity, 0);
  const totalRemainingQuantity = itemTracking.reduce((sum, item) => sum + item.remainingQuantity, 0);

  return {
    summary: {
      totalPercentageComplete: Math.round(totalPercentageComplete * 100) / 100,
      itemsFullyDelivered,
      itemsPartiallyDelivered,
      itemsPending,
      totalItems,
      followUpRequired: itemsFullyDelivered < totalItems,
    },
    quantities: {
      totalPlannedQuantity,
      totalDeliveredQuantity,
      totalRemainingQuantity,
      deliveryEfficiency: totalPlannedQuantity > 0 
        ? Math.round((totalDeliveredQuantity / totalPlannedQuantity) * 100 * 100) / 100
        : 0,
    },
    categoryBreakdown: {
      complete: categoryBreakdown.complete || [],
      partial: categoryBreakdown.partial || [],
      pending: categoryBreakdown.pending || [],
    },
    itemDetails: itemTracking.map(item => ({
      ...item,
      completionStatus: item.percentageComplete >= 100 ? 'COMPLETE' : 
                       item.percentageComplete > 0 ? 'PARTIAL' : 'PENDING',
      deliveryEfficiency: item.plannedQuantity > 0 
        ? Math.round((item.deliveredQuantity / item.plannedQuantity) * 100 * 100) / 100
        : 0,
    })),
  };
}

// GET endpoint for detailed delivery tracking
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const responseId = params.id;

    // Get response with partial delivery data
    const response = await getResponseById(responseId);
    if (!response) {
      return NextResponse.json(
        { error: 'Response not found' },
        { status: 404 }
      );
    }

    // Check if response has tracking data
    if (!response.partialDeliveryData || !response.partialDeliveryData.itemCompletionTracking) {
      return NextResponse.json(
        { error: 'No tracking data found for this response' },
        { status: 404 }
      );
    }

    // Calculate detailed metrics
    const trackingDetails = calculateDetailedTrackingMetrics(
      response.partialDeliveryData.itemCompletionTracking
    );

    // Prepare comprehensive tracking response
    const trackingResponse = {
      responseId,
      responseType: response.responseType,
      responseStatus: response.status,
      deliveryId: response.partialDeliveryData.deliveryId,
      partialDeliveryTimestamp: response.partialDeliveryData.partialDeliveryTimestamp,
      estimatedCompletionDate: response.partialDeliveryData.estimatedCompletionDate,
      
      // Tracking metrics
      trackingMetrics: trackingDetails,
      
      // Reason codes analysis
      reasonCodes: {
        total: response.partialDeliveryData.reasonCodes.length,
        byCategory: response.partialDeliveryData.reasonCodes.reduce((acc, code) => {
          acc[code.category] = (acc[code.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        details: response.partialDeliveryData.reasonCodes,
      },
      
      // Follow-up tasks analysis
      followUpTasks: {
        total: response.partialDeliveryData.followUpTasks.length,
        byStatus: response.partialDeliveryData.followUpTasks.reduce((acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byPriority: response.partialDeliveryData.followUpTasks.reduce((acc, task) => {
          acc[task.priority] = (acc[task.priority] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byType: response.partialDeliveryData.followUpTasks.reduce((acc, task) => {
          acc[task.type] = (acc[task.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        details: response.partialDeliveryData.followUpTasks,
      },
      
      // Historical tracking (in real implementation, this would come from audit logs)
      trackingHistory: [
        {
          timestamp: response.partialDeliveryData.partialDeliveryTimestamp,
          action: 'PARTIAL_DELIVERY_RECORDED',
          details: `Recorded partial delivery with ${trackingDetails.summary.totalPercentageComplete}% completion`,
          performedBy: response.responderName,
        },
      ],
      
      // Recommendations based on current state
      recommendations: generateRecommendations(response.partialDeliveryData.itemCompletionTracking),
    };

    return NextResponse.json(trackingResponse);

  } catch (error) {
    console.error('Get tracking data error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Generate recommendations based on tracking data
function generateRecommendations(itemTracking: ItemCompletionData[]) {
  const recommendations = [];

  // Critical items (0% completion)
  const criticalItems = itemTracking.filter(item => item.percentageComplete === 0);
  if (criticalItems.length > 0) {
    recommendations.push({
      type: 'CRITICAL',
      priority: 'HIGH',
      title: 'Urgent: Undelivered Items',
      description: `${criticalItems.length} items have not been delivered at all. Immediate action required.`,
      items: criticalItems.map(item => item.item),
      suggestedActions: ['Contact supply team', 'Check logistics', 'Verify accessibility'],
    });
  }

  // Low completion items (< 50%)
  const lowCompletionItems = itemTracking.filter(item => 
    item.percentageComplete > 0 && item.percentageComplete < 50
  );
  if (lowCompletionItems.length > 0) {
    recommendations.push({
      type: 'WARNING',
      priority: 'MEDIUM',
      title: 'Low Completion Rate',
      description: `${lowCompletionItems.length} items have less than 50% completion rate.`,
      items: lowCompletionItems.map(item => `${item.item} (${item.percentageComplete}%)`),
      suggestedActions: ['Review supply chain', 'Check delivery constraints', 'Consider alternative sources'],
    });
  }

  // Near completion items (80-99%)
  const nearCompletionItems = itemTracking.filter(item => 
    item.percentageComplete >= 80 && item.percentageComplete < 100
  );
  if (nearCompletionItems.length > 0) {
    recommendations.push({
      type: 'INFO',
      priority: 'LOW',
      title: 'Near Completion',
      description: `${nearCompletionItems.length} items are close to completion and require final delivery.`,
      items: nearCompletionItems.map(item => `${item.item} (${item.remainingQuantity} ${item.unit} remaining)`),
      suggestedActions: ['Schedule final delivery', 'Prepare remaining quantities', 'Confirm delivery logistics'],
    });
  }

  // Overall efficiency check
  const overallCompletion = itemTracking.reduce((sum, item) => sum + item.percentageComplete, 0) / itemTracking.length;
  if (overallCompletion < 70) {
    recommendations.push({
      type: 'WARNING',
      priority: 'MEDIUM',
      title: 'Low Overall Completion',
      description: `Overall completion rate is ${overallCompletion.toFixed(1)}%. Consider reviewing delivery strategy.`,
      items: [],
      suggestedActions: ['Review delivery plan', 'Assess resource constraints', 'Consider phased delivery approach'],
    });
  }

  return recommendations;
}