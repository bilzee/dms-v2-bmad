import { NextRequest, NextResponse } from 'next/server';
import {
  IncidentTimelineResponse,
  IncidentStatus,
} from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Mock timeline data for different incidents
const mockTimelines = {
  'incident-1': {
    incidentId: 'incident-1',
    timeline: [
      {
        id: 'timeline-1',
        type: 'STATUS_CHANGE' as const,
        timestamp: new Date('2024-08-15T08:00:00Z'),
        coordinatorId: 'coord-1',
        coordinatorName: 'Sarah Johnson',
        description: 'Incident created and marked as ACTIVE',
        metadata: { 
          previousStatus: null, 
          newStatus: IncidentStatus.ACTIVE,
          source: 'WHO Emergency Assessment Report'
        },
      },
      {
        id: 'timeline-2',
        type: 'ENTITY_LINKED' as const,
        timestamp: new Date('2024-08-15T09:30:00Z'),
        coordinatorId: 'coord-1',
        coordinatorName: 'Sarah Johnson',
        description: 'Linked 3 affected entities to incident',
        metadata: { 
          entityIds: ['1', '3', '5'],
          entityNames: ['Maiduguri Camp A', 'Monguno Camp B', 'Dikwa Settlement'],
          totalPopulation: 34800
        },
      },
      {
        id: 'timeline-3',
        type: 'ASSESSMENT_ADDED' as const,
        timestamp: new Date('2024-08-15T14:20:00Z'),
        coordinatorId: 'coord-2',
        coordinatorName: 'Dr. Ahmed Musa',
        description: 'Preliminary assessment completed for Maiduguri Camp A',
        metadata: { 
          assessmentId: 'assess-1',
          entityId: '1',
          assessmentType: 'PRELIMINARY',
          severity: 'SEVERE'
        },
      },
      {
        id: 'timeline-4',
        type: 'NOTE_ADDED' as const,
        timestamp: new Date('2024-08-16T10:15:00Z'),
        coordinatorId: 'coord-1',
        coordinatorName: 'Sarah Johnson',
        description: 'Updated response priorities based on field reports',
        metadata: { 
          note: 'Water contamination confirmed in affected areas. WASH response upgraded to HIGH priority.',
          priority: 'HIGH'
        },
      },
      {
        id: 'timeline-5',
        type: 'ASSESSMENT_ADDED' as const,
        timestamp: new Date('2024-08-17T11:45:00Z'),
        coordinatorId: 'coord-3',
        coordinatorName: 'Ibrahim Katsina',
        description: 'Health assessment completed for affected camps',
        metadata: { 
          assessmentId: 'assess-2',
          entityId: '3',
          assessmentType: 'HEALTH',
          criticalFindings: ['waterborne disease risk', 'overcrowding']
        },
      },
      {
        id: 'timeline-6',
        type: 'NOTE_ADDED' as const,
        timestamp: new Date('2024-08-18T16:30:00Z'),
        coordinatorId: 'coord-2',
        coordinatorName: 'Dr. Ahmed Musa',
        description: 'Emergency response teams deployed to all affected areas',
        metadata: { 
          note: 'Mobile medical units dispatched. Water purification systems en route.',
          teamsDeployed: 5
        },
      },
      {
        id: 'timeline-7',
        type: 'NOTE_ADDED' as const,
        timestamp: new Date('2024-08-20T12:00:00Z'),
        coordinatorId: 'coord-1',
        coordinatorName: 'Sarah Johnson',
        description: 'Evacuation operations completed for high-risk areas',
        metadata: { 
          note: 'All residents from flood-prone areas have been safely relocated to temporary shelters.',
          evacuatedPopulation: 1200,
          sheltersActivated: 3
        },
      },
    ],
    statusHistory: [
      {
        status: IncidentStatus.ACTIVE,
        changedAt: new Date('2024-08-15T08:00:00Z'),
        changedBy: 'Sarah Johnson',
        coordinatorId: 'coord-1',
        notes: 'Initial incident creation based on WHO assessment',
        duration: '5 days 12 hours',
      },
    ],
  },
  'incident-2': {
    incidentId: 'incident-2',
    timeline: [
      {
        id: 'timeline-8',
        type: 'STATUS_CHANGE' as const,
        timestamp: new Date('2024-08-18T06:30:00Z'),
        coordinatorId: 'coord-3',
        coordinatorName: 'Ibrahim Katsina',
        description: 'Fire incident reported and marked as ACTIVE',
        metadata: { 
          previousStatus: null, 
          newStatus: IncidentStatus.ACTIVE,
          source: 'Local Fire Department Report'
        },
      },
      {
        id: 'timeline-9',
        type: 'ENTITY_LINKED' as const,
        timestamp: new Date('2024-08-18T07:15:00Z'),
        coordinatorId: 'coord-3',
        coordinatorName: 'Ibrahim Katsina',
        description: 'Linked affected market area to incident',
        metadata: { 
          entityIds: ['2'],
          entityNames: ['Maiduguri Central Market Area'],
          businessesAffected: 150
        },
      },
      {
        id: 'timeline-10',
        type: 'NOTE_ADDED' as const,
        timestamp: new Date('2024-08-18T09:45:00Z'),
        coordinatorId: 'coord-3',
        coordinatorName: 'Ibrahim Katsina',
        description: 'Fire suppression operations underway',
        metadata: { 
          note: 'Three fire trucks deployed. Evacuating surrounding structures.',
          fireTeams: 3,
          buildingsEvacuated: 8
        },
      },
      {
        id: 'timeline-11',
        type: 'STATUS_CHANGE' as const,
        timestamp: new Date('2024-08-18T11:45:00Z'),
        coordinatorId: 'coord-3',
        coordinatorName: 'Ibrahim Katsina',
        description: 'Fire contained, status updated to CONTAINED',
        metadata: { 
          previousStatus: IncidentStatus.ACTIVE, 
          newStatus: IncidentStatus.CONTAINED,
          milestone: 'Fire suppression successful',
          damageAssessment: 'Partial damage to 25 market stalls'
        },
      },
      {
        id: 'timeline-12',
        type: 'NOTE_ADDED' as const,
        timestamp: new Date('2024-08-18T15:20:00Z'),
        coordinatorId: 'coord-3',
        coordinatorName: 'Ibrahim Katsina',
        description: 'Structural safety assessment initiated',
        metadata: { 
          note: 'Structural engineers assessing building integrity before reopening.',
          structuresUnderReview: 12
        },
      },
    ],
    statusHistory: [
      {
        status: IncidentStatus.ACTIVE,
        changedAt: new Date('2024-08-18T06:30:00Z'),
        changedBy: 'Ibrahim Katsina',
        coordinatorId: 'coord-3',
        notes: 'Fire outbreak reported at central market',
        duration: '5 hours 15 minutes',
      },
      {
        status: IncidentStatus.CONTAINED,
        changedAt: new Date('2024-08-18T11:45:00Z'),
        changedBy: 'Ibrahim Katsina',
        coordinatorId: 'coord-3',
        notes: 'Fire suppression successful, containment achieved',
        duration: '2 days 2 hours',
      },
    ],
  },
  'incident-3': {
    incidentId: 'incident-3',
    timeline: [
      {
        id: 'timeline-5',
        type: 'STATUS_CHANGE' as const,
        timestamp: new Date('2024-01-15T08:00:00Z'),
        coordinatorId: 'coord-1',
        coordinatorName: 'John Doe',
        description: 'Landslide incident reported and marked as ACTIVE',
        metadata: { 
          previousStatus: null, 
          newStatus: IncidentStatus.ACTIVE,
          source: 'NEMA Field Report'
        },
      },
      {
        id: 'timeline-6',
        type: 'ENTITY_LINKED' as const,
        timestamp: new Date('2024-01-16T10:30:00Z'),
        coordinatorId: 'coord-2',
        coordinatorName: 'Jane Smith',
        description: 'Linked 5 affected communities to incident',
        metadata: { 
          entityIds: ['entity-1', 'entity-2', 'entity-3', 'entity-4', 'entity-5'],
          entityNames: ['Adamawa Village A', 'Mountain Settlement B', 'Highland Community', 'Valley Settlement', 'Riverside Village'],
          totalPopulation: 2500
        },
      },
      {
        id: 'timeline-7',
        type: 'ASSESSMENT_ADDED' as const,
        timestamp: new Date('2024-01-17T14:15:00Z'),
        coordinatorId: 'coord-1',
        coordinatorName: 'John Doe',
        description: 'New preliminary assessment added for affected area',
        metadata: { 
          assessmentId: 'prelim-1',
          entityId: 'entity-1',
          assessmentType: 'PRELIMINARY',
          severity: 'CATASTROPHIC'
        },
      },
      {
        id: 'timeline-8',
        type: 'NOTE_ADDED' as const,
        timestamp: new Date('2024-01-20T16:45:00Z'),
        coordinatorId: 'coord-3',
        coordinatorName: 'Ahmed Hassan',
        description: 'Updated response coordination strategy for landslide recovery',
        metadata: { 
          note: 'Coordinating with local authorities for evacuation and emergency shelter setup',
          priority: 'HIGH'
        },
      },
    ],
    statusHistory: [
      {
        status: IncidentStatus.ACTIVE,
        changedAt: new Date('2024-01-15T08:00:00Z'),
        changedBy: 'John Doe',
        coordinatorId: 'coord-1',
        notes: 'Landslide incident created based on NEMA field report',
        duration: 'Ongoing',
      },
    ],
  },
};

// GET /api/v1/incidents/[id]/timeline - Get incident timeline and status history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: incidentId } = await params;
    const { searchParams } = new URL(request.url);

    // Validate incident ID
    if (!incidentId || typeof incidentId !== 'string') {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Invalid incident ID'],
        message: 'Incident ID is required and must be a string',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Parse query parameters
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const eventType = searchParams.get('eventType'); // Filter by event type
    const since = searchParams.get('since'); // Filter events since timestamp
    const includeStatusHistory = searchParams.get('includeStatusHistory') !== 'false';

    // Get timeline data
    const timelineData = mockTimelines[incidentId as keyof typeof mockTimelines];

    if (!timelineData) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Incident not found'],
        message: `No incident found with ID: ${incidentId}`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    let filteredTimeline = [...timelineData.timeline];

    // Apply filters
    if (eventType) {
      filteredTimeline = filteredTimeline.filter(event => event.type === eventType);
    }

    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        filteredTimeline = filteredTimeline.filter(event => 
          new Date(event.timestamp) >= sinceDate
        );
      }
    }

    // Sort by timestamp (most recent first)
    filteredTimeline.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply pagination
    const totalEvents = filteredTimeline.length;
    const paginatedTimeline = filteredTimeline.slice(offset, offset + limit);

    // Calculate statistics
    const eventTypeStats = filteredTimeline.reduce((stats, event) => {
      stats[event.type] = (stats[event.type] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    const coordinatorStats = filteredTimeline.reduce((stats, event) => {
      stats[event.coordinatorName] = (stats[event.coordinatorName] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    // Prepare response
    const response: IncidentTimelineResponse = {
      success: true,
      data: {
        incidentId,
        timeline: paginatedTimeline,
        statusHistory: includeStatusHistory ? timelineData.statusHistory : [],
      },
      message: `Retrieved ${paginatedTimeline.length} timeline events`,
    };

    // Add metadata
    const responseWithMetadata = {
      ...response,
      metadata: {
        pagination: {
          offset,
          limit,
          totalEvents,
          hasMore: offset + limit < totalEvents,
        },
        statistics: {
          totalEvents: timelineData.timeline.length,
          eventTypeBreakdown: eventTypeStats,
          coordinatorActivity: coordinatorStats,
          timespan: {
            earliest: timelineData.timeline[timelineData.timeline.length - 1]?.timestamp,
            latest: timelineData.timeline[0]?.timestamp,
          },
        },
        availableFilters: {
          eventTypes: [...new Set(timelineData.timeline.map(e => e.type))],
          coordinators: [...new Set(timelineData.timeline.map(e => e.coordinatorName))],
        },
      },
    };

    return NextResponse.json(responseWithMetadata);

  } catch (error) {
    console.error('Failed to get incident timeline:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to get incident timeline'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// POST /api/v1/incidents/[id]/timeline - Add timeline event (for manual notes/updates)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: incidentId } = await params;
    const body = await request.json();

    // Validate incident ID
    if (!incidentId || typeof incidentId !== 'string') {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Invalid incident ID'],
        message: 'Incident ID is required and must be a string',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Validate required fields
    if (!body.description || typeof body.description !== 'string') {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Missing required field'],
        message: 'description is required and must be a string',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Check if incident exists
    const timelineData = mockTimelines[incidentId as keyof typeof mockTimelines];
    if (!timelineData) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Incident not found'],
        message: `No incident found with ID: ${incidentId}`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // Create new timeline event
    const newEvent = {
      id: `timeline-${Date.now()}`,
      type: 'NOTE_ADDED' as const,
      timestamp: new Date(),
      coordinatorId: 'current-user-id', // Would come from authentication
      coordinatorName: 'Current User', // Would come from authentication
      description: body.description,
      metadata: {
        note: body.description,
        priority: body.priority || 'NORMAL',
        tags: body.tags || [],
        attachments: body.attachments || [],
      },
    };

    // In a real implementation, this would:
    // 1. Validate user permissions
    // 2. Save to database
    // 3. Send notifications
    // 4. Update incident's last activity timestamp

    return NextResponse.json({
      success: true,
      data: {
        timeline: newEvent,
        incidentId,
      },
      message: 'Timeline event added successfully',
      timestamp: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to add timeline event:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Invalid JSON in request body'],
        message: 'Please check your request format',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to add timeline event'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
