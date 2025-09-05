import { NextRequest, NextResponse } from 'next/server';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Mock historical comparison data generator
const generateHistoricalComparison = (type: string, filters: any = {}) => {
  const now = new Date();
  const currentData = { date: now, metrics: {} as Record<string, number> };
  const historicalData = [];
  const trends = [];
  
  // Generate 30 days of historical data
  for (let day = 29; day >= 0; day--) {
    const date = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
    const metrics: Record<string, number> = {};
    
    switch (type) {
      case 'assessments':
        metrics.totalAssessments = Math.floor(Math.random() * 20) + 5;
        metrics.verifiedAssessments = Math.floor(metrics.totalAssessments * (0.6 + Math.random() * 0.3));
        metrics.pendingAssessments = metrics.totalAssessments - metrics.verifiedAssessments;
        metrics.averageProcessingTime = Math.floor(Math.random() * 120) + 30; // 30-150 minutes
        break;
        
      case 'responses':
        metrics.totalResponses = Math.floor(Math.random() * 15) + 3;
        metrics.completedResponses = Math.floor(metrics.totalResponses * (0.5 + Math.random() * 0.4));
        metrics.inProgressResponses = Math.floor((metrics.totalResponses - metrics.completedResponses) * 0.7);
        metrics.plannedResponses = metrics.totalResponses - metrics.completedResponses - metrics.inProgressResponses;
        metrics.averageDeliveryTime = Math.floor(Math.random() * 72) + 12; // 12-84 hours
        break;
        
      case 'incidents':
        metrics.activeIncidents = Math.floor(Math.random() * 8) + 2;
        metrics.resolvedIncidents = Math.floor(Math.random() * 5) + 1;
        metrics.averageResolutionTime = Math.floor(Math.random() * 240) + 120; // 120-360 hours
        metrics.criticalIncidents = Math.floor(metrics.activeIncidents * (0.1 + Math.random() * 0.3));
        break;
        
      case 'entities':
        metrics.totalEntities = Math.floor(Math.random() * 50) + 20;
        metrics.entitiesWithActivity = Math.floor(metrics.totalEntities * (0.6 + Math.random() * 0.3));
        metrics.entitiesAtRisk = Math.floor(metrics.totalEntities * (0.1 + Math.random() * 0.2));
        metrics.averageAssessmentsPerEntity = Math.round((Math.random() * 5 + 2) * 10) / 10;
        break;
    }
    
    if (day === 0) {
      currentData.metrics = metrics;
    } else {
      historicalData.push({ date, metrics });
    }
  }
  
  // Calculate trends
  if (historicalData.length > 0) {
    const previousMetrics = historicalData[historicalData.length - 1].metrics;
    Object.keys(currentData.metrics).forEach(metricKey => {
      const currentValue = currentData.metrics[metricKey];
      const previousValue = previousMetrics[metricKey];
      
      if (previousValue && previousValue > 0) {
        const change = ((currentValue - previousValue) / previousValue) * 100;
        const direction = Math.abs(change) < 5 ? 'stable' : change > 0 ? 'up' : 'down';
        
        trends.push({
          metric: metricKey,
          change: Math.round(change * 10) / 10,
          direction,
        });
      }
    });
  }
  
  return {
    current: currentData,
    historical: historicalData,
    trends,
  };
};

// GET /api/v1/monitoring/historical/[type] - Get historical comparison data for trend analysis
export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const { type } = params;
    const { searchParams } = new URL(request.url);
    
    // Parse parameters
    const timeRange = searchParams.get('timeRange') || '30d'; // 7d, 30d, 90d
    const metricTypes = searchParams.get('metricTypes')?.split(',').filter(Boolean);
    const comparisonPeriod = searchParams.get('comparisonPeriod'); // For period-over-period comparison
    
    // Validate type
    const validTypes = ['assessments', 'responses', 'incidents', 'entities'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid historical data type',
        message: `Type must be one of: ${validTypes.join(', ')}`,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }
    
    const filters = {
      timeRange,
      metricTypes,
      comparisonPeriod,
    };
    
    const historicalData = generateHistoricalComparison(type, filters);
    
    // Generate additional analytics
    const analytics = {
      averageChange: historicalData.trends.length > 0 
        ? Math.round(historicalData.trends.reduce((sum, t) => sum + Math.abs(t.change), 0) / historicalData.trends.length * 10) / 10
        : 0,
      volatilityScore: Math.floor(Math.random() * 100), // Mock volatility calculation
      trendDirection: historicalData.trends.length > 0
        ? historicalData.trends.filter(t => t.direction === 'up').length > historicalData.trends.filter(t => t.direction === 'down').length
          ? 'improving' : 'declining'
        : 'stable',
      periodComparison: comparisonPeriod ? {
        currentPeriodAvg: Math.floor(Math.random() * 100) + 50,
        comparisonPeriodAvg: Math.floor(Math.random() * 100) + 50,
        percentChange: Math.floor(Math.random() * 40) - 20, // -20% to +20%
      } : undefined,
    };
    
    const response = {
      success: true,
      data: {
        ...historicalData,
        analytics,
      },
      meta: {
        filters,
        dataPoints: historicalData.historical.length + 1, // +1 for current
        timeRange,
        generatedAt: new Date().toISOString(),
        cacheExpiry: new Date(Date.now() + 300000).toISOString(), // 5 minutes
        lastUpdate: new Date().toISOString(),
      },
      message: `Historical ${type} comparison data retrieved successfully`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch historical comparison data:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch historical comparison data',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}