import { NextRequest, NextResponse } from 'next/server';

const dataCategories = ['assessments', 'responses', 'incidents', 'entities'] as const;

// Mock data for data freshness tracking - would be replaced with actual sync status queries
const generateDataFreshnessIndicators = () => {
  const indicators = [];
  
  for (const category of dataCategories) {
    const totalCount = Math.floor(Math.random() * 200) + 50; // 50-250 items
    const realTimeCount = Math.floor(totalCount * (0.6 + Math.random() * 0.3)); // 60-90%
    const recentCount = Math.floor((totalCount - realTimeCount) * 0.7); // 70% of remaining
    const offlinePendingCount = totalCount - realTimeCount - recentCount;
    const syncQueueSize = Math.floor(Math.random() * 20) + 2; // 2-22 items in queue
    
    indicators.push({
      category,
      totalCount,
      realTimeCount, // Synced within 5 minutes
      recentCount, // Synced within 1 hour
      offlinePendingCount, // Not yet synced
      oldestPending: offlinePendingCount > 0 
        ? new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000) // Up to 48 hours old
        : undefined,
      syncQueueSize,
    });
  }
  
  return indicators;
};

// GET /api/v1/monitoring/situation/data-freshness - Get data freshness indicators for offline submissions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category'); // Filter by category
    const includeDetails = searchParams.get('includeDetails') === 'true';
    
    let freshnessData = generateDataFreshnessIndicators();
    
    // Apply category filter
    if (category && dataCategories.includes(category as any)) {
      freshnessData = freshnessData.filter(indicator => indicator.category === category);
    }
    
    // Calculate summary statistics
    const totalItems = freshnessData.reduce((sum, indicator) => sum + indicator.totalCount, 0);
    const totalRealTime = freshnessData.reduce((sum, indicator) => sum + indicator.realTimeCount, 0);
    const totalRecent = freshnessData.reduce((sum, indicator) => sum + indicator.recentCount, 0);
    const totalOfflinePending = freshnessData.reduce((sum, indicator) => sum + indicator.offlinePendingCount, 0);
    const totalQueueSize = freshnessData.reduce((sum, indicator) => sum + indicator.syncQueueSize, 0);
    
    const realTimePercentage = totalItems > 0 ? Math.floor((totalRealTime / totalItems) * 100) : 100;
    const recentPercentage = totalItems > 0 ? Math.floor((totalRecent / totalItems) * 100) : 0;
    const offlinePendingPercentage = totalItems > 0 ? Math.floor((totalOfflinePending / totalItems) * 100) : 0;
    
    // Find oldest pending item across all categories
    const oldestPendingDates = freshnessData
      .map(indicator => indicator.oldestPending)
      .filter(date => date !== undefined) as Date[];
    
    const oldestPending = oldestPendingDates.length > 0 
      ? new Date(Math.min(...oldestPendingDates.map(d => d.getTime())))
      : undefined;

    const response = {
      success: true,
      data: freshnessData,
      meta: {
        summary: {
          totalItems,
          totalRealTime,
          totalRecent,
          totalOfflinePending,
          totalQueueSize,
          realTimePercentage,
          recentPercentage,
          offlinePendingPercentage,
          oldestPending: oldestPending?.toISOString(),
        },
        categories: dataCategories,
        thresholds: {
          realTimeMinutes: 5,
          recentHours: 1,
        },
        filters: { category },
        includeDetails,
        lastUpdate: new Date().toISOString(),
      },
      message: 'Data freshness indicators retrieved successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch data freshness indicators:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch data freshness indicators',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}