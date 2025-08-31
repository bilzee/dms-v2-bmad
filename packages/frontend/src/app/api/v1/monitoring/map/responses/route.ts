import { NextRequest, NextResponse } from 'next/server';

// Mock geographic data for responses - would be replaced with actual database queries
const generateMapResponses = () => {
  const responseTypes = ['FOOD_DISTRIBUTION', 'WATER_SUPPLY', 'SHELTER_SETUP', 'MEDICAL_AID', 'SECURITY_PATROL', 'LOGISTICS'];
  const statuses = ['PLANNED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED'] as const;
  const responderNames = ['Team Alpha', 'Relief Unit B', 'Medical Team 1', 'Security Squad', 'Logistics Team'];
  const entityNames = ['Camp Alpha', 'Community Beta', 'Settlement Gamma', 'Village Delta', 'Camp Epsilon'];
  const deliveryItems = [
    { item: 'Food Rations', quantity: 100 },
    { item: 'Water Bottles', quantity: 250 },
    { item: 'Emergency Blankets', quantity: 75 },
    { item: 'Medical Supplies', quantity: 50 },
    { item: 'Tents', quantity: 25 },
    { item: 'Solar Chargers', quantity: 15 }
  ];
  
  // Generate random coordinates within Borno State bounds
  const generateCoordinates = () => ({
    latitude: 11.5 + Math.random() * 2.5,
    longitude: 13.0 + Math.random() * 2.0,
    accuracy: Math.floor(Math.random() * 10) + 5,
    timestamp: new Date(Date.now() - Math.random() * 86400000 * 7),
    captureMethod: Math.random() > 0.7 ? 'GPS' : Math.random() > 0.5 ? 'MAP_SELECT' : 'MANUAL'
  });

  const responses = Array.from({ length: Math.floor(Math.random() * 60) + 30 }, (_, i) => {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const responseType = responseTypes[Math.floor(Math.random() * responseTypes.length)];
    const coordinates = generateCoordinates();
    const plannedDate = new Date(Date.now() + Math.random() * 86400000 * 7); // Next week
    const deliveredDate = status === 'DELIVERED' ? 
      new Date(Date.now() - Math.random() * 86400000 * 3) : undefined; // Last 3 days if delivered
    
    // Generate delivery items based on response type
    const relevantItems = deliveryItems.filter(item => {
      if (responseType.includes('FOOD')) return item.item.includes('Food');
      if (responseType.includes('WATER')) return item.item.includes('Water');
      if (responseType.includes('SHELTER')) return item.item.includes('Blankets') || item.item.includes('Tents');
      if (responseType.includes('MEDICAL')) return item.item.includes('Medical');
      return Math.random() > 0.5; // Random for other types
    });
    
    const selectedItems = relevantItems.slice(0, Math.floor(Math.random() * 3) + 1);

    return {
      id: `response-${i + 1}`,
      responseType,
      plannedDate,
      deliveredDate,
      responderName: responderNames[Math.floor(Math.random() * responderNames.length)],
      coordinates,
      entityName: entityNames[Math.floor(Math.random() * entityNames.length)],
      status,
      deliveryItems: selectedItems,
    };
  });

  // Calculate status breakdown and total delivery items
  const statusBreakdown = {
    planned: responses.filter(r => r.status === 'PLANNED').length,
    inProgress: responses.filter(r => r.status === 'IN_PROGRESS').length,
    delivered: responses.filter(r => r.status === 'DELIVERED').length,
    cancelled: responses.filter(r => r.status === 'CANCELLED').length,
  };

  const totalDeliveryItems = responses.reduce((total, response) => 
    total + response.deliveryItems.reduce((sum, item) => sum + item.quantity, 0), 0
  );

  return {
    responses,
    statusBreakdown,
    totalDeliveryItems,
  };
};

// GET /api/v1/monitoring/map/responses - Get response activity with delivery status overlay
export async function GET(request: NextRequest) {
  try {
    const { responses, statusBreakdown, totalDeliveryItems } = generateMapResponses();
    
    const connectionStatus = Math.random() > 0.1 ? 'connected' : 
                           Math.random() > 0.5 ? 'degraded' : 'offline';

    const response = {
      success: true,
      data: responses,
      meta: {
        statusBreakdown,
        totalDeliveryItems,
        lastUpdate: new Date(),
        refreshInterval: 25, // 25 seconds - consistent with Story 6.1
        connectionStatus,
        dataSource: 'real-time',
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