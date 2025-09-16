import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Get real response data from database
const getMapResponses = async () => {
  // Query responses
  const responses = await prisma.rapidResponse.findMany();

  // Get affected entities for responses
  const affectedEntityIds = responses
    .map(r => r.affectedEntityId)
    .filter((id): id is string => id !== null);
  
  const affectedEntities = await prisma.affectedEntity.findMany({
    where: {
      id: {
        in: affectedEntityIds
      }
    }
  });

  // Create entity map for quick lookup
  const entityMap = new Map(
    affectedEntities.map(entity => [entity.id, entity])
  );

  // Transform responses to match the expected interface
  const transformedResponses = responses.map(response => {
    // Get the affected entity for this response
    const affectedEntity = entityMap.get(response.affectedEntityId);
    
    // Extract delivery items from the JSON data field
    let deliveryItems = [];
    try {
      if (response.data && typeof response.data === 'object') {
        // Try to extract delivery items from the data field
        const data = response.data as any;
        if (data.deliveryItems && Array.isArray(data.deliveryItems)) {
          deliveryItems = data.deliveryItems;
        } else if (data.items && Array.isArray(data.items)) {
          deliveryItems = data.items;
        }
      }
      
      // Also check otherItemsDelivered
      if (response.otherItemsDelivered && Array.isArray(response.otherItemsDelivered)) {
        deliveryItems = [...deliveryItems, ...response.otherItemsDelivered];
      }
    } catch (error) {
      // If parsing fails, use empty array
      deliveryItems = [];
    }

    // Generate coordinates data from affected entity
    const coordinates = {
      latitude: affectedEntity?.latitude ?? 12.0,
      longitude: affectedEntity?.longitude ?? 14.0,
      accuracy: 10, // Default accuracy
      timestamp: response.updatedAt ?? new Date(),
      captureMethod: 'GPS' as const,
    };

    return {
      id: response.id,
      responseType: response.responseType,
      plannedDate: response.plannedDate,
      deliveredDate: response.deliveredDate,
      responderName: response.responderName,
      coordinates,
      entityName: affectedEntity?.name || `${affectedEntity?.type || 'Unknown'} Entity`,
      status: response.status,
      deliveryItems: deliveryItems.map((item: any) => ({
        item: item.item || item.name || 'Unknown Item',
        quantity: item.quantity || 1,
      })),
    };
  });

  // Calculate status breakdown and total delivery items
  const statusBreakdown = {
    planned: transformedResponses.filter(r => r.status === 'PLANNED').length,
    inProgress: transformedResponses.filter(r => r.status === 'IN_PROGRESS').length,
    delivered: transformedResponses.filter(r => r.status === 'DELIVERED').length,
    cancelled: transformedResponses.filter(r => r.status === 'CANCELLED').length,
  };

  const totalDeliveryItems = transformedResponses.reduce((total, response) => 
    total + response.deliveryItems.reduce((sum, item) => sum + item.quantity, 0), 0
  );

  return {
    responses: transformedResponses,
    statusBreakdown,
    totalDeliveryItems,
  };
};

// GET /api/v1/monitoring/map/responses - Get response activity with delivery status overlay
export async function GET(request: NextRequest) {
  try {
    const { responses, statusBreakdown, totalDeliveryItems } = await getMapResponses();
    
    const connectionStatus = 'connected'; // Since we're using real data

    const response = {
      success: true,
      data: responses,
      meta: {
        statusBreakdown,
        totalDeliveryItems,
        lastUpdate: new Date(),
        refreshInterval: 25, // 25 seconds - consistent with Story 6.1
        connectionStatus,
        dataSource: 'database',
      },
      message: 'Map responses retrieved successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch map responses:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch map responses',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}