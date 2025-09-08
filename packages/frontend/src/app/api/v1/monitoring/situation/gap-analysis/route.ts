import { NextRequest, NextResponse } from 'next/server';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

const assessmentTypes = ['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY'] as const;

// Mock data for gap analysis - would be replaced with actual needs vs response calculations
const generateGapAnalysis = () => {
  const gapAnalysis = [];
  
  for (const assessmentType of assessmentTypes) {
    const totalNeeds = Math.floor(Math.random() * 100) + 50; // 50-150 needs
    const totalResponses = Math.floor(Math.random() * totalNeeds * 0.8) + Math.floor(totalNeeds * 0.2); // 20-100% fulfillment
    const fulfillmentRate = Math.floor((totalResponses / totalNeeds) * 100);
    const criticalGaps = Math.max(0, totalNeeds - totalResponses);
    const affectedEntities = Math.floor(Math.random() * 20) + 5; // 5-25 entities
    
    // Determine priority based on fulfillment rate and critical gaps
    let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (fulfillmentRate < 30 || criticalGaps > 30) {
      priority = 'CRITICAL';
    } else if (fulfillmentRate < 60 || criticalGaps > 15) {
      priority = 'HIGH';
    } else if (fulfillmentRate < 80 || criticalGaps > 5) {
      priority = 'MEDIUM';
    } else {
      priority = 'LOW';
    }
    
    gapAnalysis.push({
      assessmentType,
      totalNeeds,
      totalResponses,
      fulfillmentRate,
      criticalGaps,
      affectedEntities,
      lastAssessment: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Last 24 hours
      lastResponse: totalResponses > 0 ? new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000) : undefined, // Last 12 hours
      priority,
    });
  }
  
  return gapAnalysis;
};

// GET /api/v1/monitoring/situation/gap-analysis - Get needs vs response gap analysis
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assessmentType = searchParams.get('assessmentType'); // Filter by type
    const priority = searchParams.get('priority'); // Filter by priority
    const threshold = searchParams.get('threshold'); // Fulfillment rate threshold
    
    let gapAnalysis = generateGapAnalysis();
    
    // Apply filters
    if (assessmentType) {
      gapAnalysis = gapAnalysis.filter(gap => gap.assessmentType === assessmentType);
    }
    
    if (priority) {
      gapAnalysis = gapAnalysis.filter(gap => gap.priority === priority);
    }
    
    if (threshold) {
      const thresholdValue = parseInt(threshold);
      gapAnalysis = gapAnalysis.filter(gap => gap.fulfillmentRate <= thresholdValue);
    }
    
    // Sort by priority (CRITICAL first) then by fulfillment rate (lowest first)
    gapAnalysis.sort((a, b) => {
      const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.fulfillmentRate - b.fulfillmentRate; // Lower fulfillment = higher priority
    });
    
    const overallFulfillmentRate = gapAnalysis.length > 0 
      ? Math.floor(gapAnalysis.reduce((sum, gap) => sum + gap.fulfillmentRate, 0) / gapAnalysis.length)
      : 100;
    
    const criticalGapsCount = gapAnalysis.filter(gap => gap.priority === 'CRITICAL').length;
    const totalCriticalGaps = gapAnalysis.reduce((sum, gap) => sum + gap.criticalGaps, 0);

    const response = {
      success: true,
      data: gapAnalysis,
      meta: {
        overallFulfillmentRate,
        criticalGapsCount,
        totalCriticalGaps,
        lastAnalysisUpdate: new Date().toISOString(),
        filters: { assessmentType, priority, threshold },
        analysisScope: 'all-active-incidents',
      },
      message: 'Gap analysis retrieved successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch gap analysis:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to fetch gap analysis'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}