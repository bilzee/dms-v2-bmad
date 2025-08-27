import { NextRequest, NextResponse } from 'next/server';
import {
  IncidentCreationRequest,
  IncidentListResponse,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  IncidentFilters
} from '@dms/shared';

// Mock data for development - would be replaced with actual database calls
const mockIncidents = [
  {
    id: '1',
    name: 'Borno State Flood - August 2024',
    type: IncidentType.FLOOD,
    severity: IncidentSeverity.SEVERE,
    status: IncidentStatus.ACTIVE,
    date: new Date('2024-08-15'),
    affectedEntityCount: 3,
    assessmentCount: 5,
    responseCount: 2,
    lastUpdated: new Date('2024-08-20'),
  },
  {
    id: '2',
    name: 'Maiduguri Market Fire',
    type: IncidentType.FIRE,
    severity: IncidentSeverity.MODERATE,
    status: IncidentStatus.CONTAINED,
    date: new Date('2024-08-18'),
    affectedEntityCount: 1,
    assessmentCount: 2,
    responseCount: 3,
    lastUpdated: new Date('2024-08-19'),
  },
  {
    id: '3',
    name: 'Adamawa Landslide Event',
    type: IncidentType.LANDSLIDE,
    severity: IncidentSeverity.CATASTROPHIC,
    status: IncidentStatus.ACTIVE,
    date: new Date('2024-08-22'),
    affectedEntityCount: 5,
    assessmentCount: 8,
    responseCount: 1,
    lastUpdated: new Date('2024-08-23'),
  },
];

const mockStats = {
  totalIncidents: 3,
  activeIncidents: 2,
  highPriorityIncidents: 2, // SEVERE + CATASTROPHIC
  recentlyUpdated: 3,
  byType: {
    [IncidentType.FLOOD]: 1,
    [IncidentType.FIRE]: 1,
    [IncidentType.LANDSLIDE]: 1,
    [IncidentType.CYCLONE]: 0,
    [IncidentType.CONFLICT]: 0,
    [IncidentType.EPIDEMIC]: 0,
    [IncidentType.EARTHQUAKE]: 0,
    [IncidentType.WILDFIRE]: 0,
    [IncidentType.OTHER]: 0,
  },
  bySeverity: {
    [IncidentSeverity.MINOR]: 0,
    [IncidentSeverity.MODERATE]: 1,
    [IncidentSeverity.SEVERE]: 1,
    [IncidentSeverity.CATASTROPHIC]: 1,
  },
  byStatus: {
    [IncidentStatus.ACTIVE]: 2,
    [IncidentStatus.CONTAINED]: 1,
    [IncidentStatus.RESOLVED]: 0,
  },
};

// GET /api/v1/incidents - List incidents with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const searchTerm = searchParams.get('searchTerm') || '';
    
    let filters: IncidentFilters = {};
    try {
      const filtersParam = searchParams.get('filters');
      if (filtersParam) {
        filters = JSON.parse(filtersParam);
      }
    } catch (error) {
      console.warn('Failed to parse filters:', error);
    }

    // Apply filtering
    let filteredIncidents = [...mockIncidents];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredIncidents = filteredIncidents.filter(incident =>
        incident.name.toLowerCase().includes(term) ||
        incident.type.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      filteredIncidents = filteredIncidents.filter(incident =>
        filters.status!.includes(incident.status)
      );
    }

    // Severity filter
    if (filters.severity && filters.severity.length > 0) {
      filteredIncidents = filteredIncidents.filter(incident =>
        filters.severity!.includes(incident.severity)
      );
    }

    // Type filter
    if (filters.type && filters.type.length > 0) {
      filteredIncidents = filteredIncidents.filter(incident =>
        filters.type!.includes(incident.type)
      );
    }

    // Date range filter
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      filteredIncidents = filteredIncidents.filter(incident => {
        const incidentDate = new Date(incident.date);
        return incidentDate >= new Date(start) && incidentDate <= new Date(end);
      });
    }

    // Apply sorting
    filteredIncidents.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'severity':
          const severityOrder = { 
            [IncidentSeverity.CATASTROPHIC]: 4, 
            [IncidentSeverity.SEVERE]: 3, 
            [IncidentSeverity.MODERATE]: 2, 
            [IncidentSeverity.MINOR]: 1 
          };
          aValue = severityOrder[a.severity];
          bValue = severityOrder[b.severity];
          break;
        case 'priority':
          // Priority = severity + status weight
          const statusWeight = { 
            [IncidentStatus.ACTIVE]: 3, 
            [IncidentStatus.CONTAINED]: 2, 
            [IncidentStatus.RESOLVED]: 1 
          };
          aValue = (severityOrder[a.severity] || 0) * 10 + (statusWeight[a.status] || 0);
          bValue = (severityOrder[b.severity] || 0) * 10 + (statusWeight[b.status] || 0);
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Apply pagination
    const totalCount = filteredIncidents.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedIncidents = filteredIncidents.slice(startIndex, endIndex);

    const response: IncidentListResponse = {
      success: true,
      data: {
        incidents: paginatedIncidents,
        totalCount,
        pagination: {
          page,
          pageSize,
          totalPages,
          totalCount,
        },
        stats: mockStats,
        filters: {
          availableTypes: Object.values(IncidentType),
          availableSeverities: Object.values(IncidentSeverity),
          availableStatuses: Object.values(IncidentStatus),
          affectedLGAs: ['Maiduguri', 'Bama', 'Monguno', 'Adamawa'], // Mock LGAs
        },
      },
      message: `Found ${totalCount} incidents`,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch incidents:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch incidents',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// POST /api/v1/incidents - Create new incident
export async function POST(request: NextRequest) {
  try {
    const body: IncidentCreationRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.type || !body.severity || !body.date) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        message: 'Name, type, severity, and date are required',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Validate incident type
    if (!Object.values(IncidentType).includes(body.type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid incident type',
        message: `Incident type must be one of: ${Object.values(IncidentType).join(', ')}`,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Validate severity
    if (!Object.values(IncidentSeverity).includes(body.severity)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid severity level',
        message: `Severity must be one of: ${Object.values(IncidentSeverity).join(', ')}`,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // In a real implementation, this would:
    // 1. Save to database
    // 2. Create audit trail entry
    // 3. Trigger notifications
    // 4. Link preliminary assessments if provided
    // 5. Link affected entities

    const newIncident = {
      id: Date.now().toString(), // Mock ID generation
      name: body.name,
      type: body.type,
      subType: body.subType,
      source: body.source,
      severity: body.severity,
      status: IncidentStatus.ACTIVE, // New incidents start as ACTIVE
      date: new Date(body.date),
      description: body.description,
      coordinates: body.coordinates,
      affectedEntityIds: body.affectedEntityIds || [],
      affectedEntityCount: (body.affectedEntityIds || []).length,
      preliminaryAssessmentId: body.preliminaryAssessmentId,
      assessmentCount: body.preliminaryAssessmentId ? 1 : 0,
      responseCount: 0,
      actionItems: [],
      timeline: [
        {
          id: '1',
          type: 'STATUS_CHANGE' as const,
          timestamp: new Date(),
          coordinatorId: 'current-user-id', // Would come from auth
          coordinatorName: 'Current User', // Would come from auth
          description: 'Incident created',
          metadata: { status: IncidentStatus.ACTIVE },
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUpdated: new Date(),
    };

    return NextResponse.json({
      success: true,
      data: {
        incident: newIncident,
      },
      message: 'Incident created successfully',
      timestamp: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create incident:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body',
        message: 'Please check your request format',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create incident',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}