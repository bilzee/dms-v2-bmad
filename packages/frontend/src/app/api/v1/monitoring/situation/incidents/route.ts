import { NextRequest, NextResponse } from 'next/server';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

const incidentTypes = ['FLOOD', 'FIRE', 'LANDSLIDE', 'CYCLONE', 'CONFLICT', 'EPIDEMIC', 'OTHER'] as const;
const severityLevels = ['MINOR', 'MODERATE', 'SEVERE', 'CATASTROPHIC'] as const;
const statusLevels = ['ACTIVE', 'CONTAINED', 'RESOLVED'] as const;

// Mock data for multi-incident overview
const generateIncidentOverview = () => {
  const incidents = [];
  const incidentCount = Math.floor(Math.random() * 8) + 3; // 3-10 incidents
  
  for (let i = 0; i < incidentCount; i++) {
    const severity = severityLevels[Math.floor(Math.random() * severityLevels.length)];
    const status = statusLevels[Math.floor(Math.random() * statusLevels.length)];
    const assessmentCount = Math.floor(Math.random() * 50) + 5; // 5-55
    const responseCount = Math.floor(Math.random() * 40) + 2; // 2-42
    const gapScore = Math.floor((responseCount / assessmentCount) * 100); // Fulfillment rate
    
    incidents.push({
      id: `INC-${String(i + 1).padStart(3, '0')}`,
      name: `Incident ${i + 1}`,
      type: incidentTypes[Math.floor(Math.random() * incidentTypes.length)],
      severity,
      status,
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
      assessmentCount,
      responseCount,
      gapScore: Math.min(gapScore, 100),
      lastUpdate: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Last 24 hours
    });
  }
  
  return incidents;
};

// GET /api/v1/monitoring/situation/incidents - Get multi-incident overview with priority indicators
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // Filter by status
    const severity = searchParams.get('severity'); // Filter by severity
    const sortBy = searchParams.get('sortBy') || 'date'; // Sort criteria
    const sortOrder = searchParams.get('sortOrder') || 'desc'; // Sort order
    
    let incidents = generateIncidentOverview();
    
    // Apply filters
    if (status) {
      incidents = incidents.filter(incident => incident.status === status);
    }
    
    if (severity) {
      incidents = incidents.filter(incident => incident.severity === severity);
    }
    
    // Apply sorting
    incidents.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'severity':
          const severityOrder = { 'CATASTROPHIC': 4, 'SEVERE': 3, 'MODERATE': 2, 'MINOR': 1 };
          comparison = severityOrder[b.severity] - severityOrder[a.severity];
          break;
        case 'gapScore':
          comparison = a.gapScore - b.gapScore; // Lower gap score = higher priority
          break;
        case 'assessmentCount':
          comparison = b.assessmentCount - a.assessmentCount;
          break;
        case 'date':
        default:
          comparison = new Date(b.date).getTime() - new Date(a.date).getTime();
          break;
      }
      return sortOrder === 'desc' ? comparison : -comparison;
    });
    
    const totalActive = incidents.filter(i => i.status === 'ACTIVE').length;
    const totalContained = incidents.filter(i => i.status === 'CONTAINED').length;
    const totalResolved = incidents.filter(i => i.status === 'RESOLVED').length;
    const criticalCount = incidents.filter(i => i.severity === 'CATASTROPHIC' || i.severity === 'SEVERE').length;

    const response = {
      success: true,
      data: incidents,
      meta: {
        totalActive,
        totalContained,
        totalResolved,
        criticalCount,
        totalIncidents: incidents.length,
        filters: { status, severity },
        sorting: { sortBy, sortOrder },
        lastUpdate: new Date().toISOString(),
      },
      message: 'Multi-incident overview retrieved successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch incident overview:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch incident overview',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}