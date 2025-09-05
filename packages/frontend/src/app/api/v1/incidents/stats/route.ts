import { NextRequest, NextResponse } from 'next/server';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Mock data for development - replace with actual database queries in production
const MOCK_INCIDENTS = [
  {
    id: 'incident-1',
    name: 'Adamawa Landslide Event',
    type: 'LANDSLIDE',
    severity: 'CATASTROPHIC',
    status: 'ACTIVE',
    date: new Date('2024-01-15'),
    affectedEntityCount: 5,
    assessmentCount: 8,
    responseCount: 3,
    lastUpdated: new Date('2024-01-20')
  },
  {
    id: 'incident-2',
    name: 'Maiduguri Market Fire',
    type: 'FIRE',
    severity: 'MODERATE',
    status: 'CONTAINED',
    date: new Date('2024-02-10'),
    affectedEntityCount: 1,
    assessmentCount: 2,
    responseCount: 1,
    lastUpdated: new Date('2024-02-12')
  },
  {
    id: 'incident-3',
    name: 'Borno State Flood - August 2024',
    type: 'FLOOD',
    severity: 'SEVERE',
    status: 'ACTIVE',
    date: new Date('2024-08-01'),
    affectedEntityCount: 3,
    assessmentCount: 5,
    responseCount: 2,
    lastUpdated: new Date('2024-08-15')
  }
];

export async function GET(request: NextRequest) {
  try {
    // Calculate statistics from mock data
    const stats = {
      totalIncidents: MOCK_INCIDENTS.length,
      activeIncidents: MOCK_INCIDENTS.filter(i => i.status === 'ACTIVE').length,
      highPriorityIncidents: MOCK_INCIDENTS.filter(i => 
        i.severity === 'SEVERE' || i.severity === 'CATASTROPHIC'
      ).length,
      recentlyUpdated: MOCK_INCIDENTS.filter(i => {
        const daysSinceUpdate = Math.abs(Date.now() - i.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceUpdate <= 7;
      }).length,
      byType: MOCK_INCIDENTS.reduce((acc, incident) => {
        acc[incident.type] = (acc[incident.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      bySeverity: MOCK_INCIDENTS.reduce((acc, incident) => {
        acc[incident.severity] = (acc[incident.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byStatus: MOCK_INCIDENTS.reduce((acc, incident) => {
        acc[incident.status] = (acc[incident.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    return NextResponse.json({
      success: true,
      data: {
        stats
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch incident stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch incident statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}