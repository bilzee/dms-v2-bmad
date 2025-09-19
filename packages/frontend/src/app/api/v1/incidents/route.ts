import { NextRequest, NextResponse } from 'next/server';
import {
  IncidentCreationRequest,
  IncidentListResponse,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  IncidentFilters
} from '@dms/shared';
import DatabaseService from '@/lib/services/DatabaseService';
import { createRoleBasedFilterMiddleware, hasResourceAccess } from '@/lib/middleware/role-based-filter';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// GET /api/v1/incidents - List incidents with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    // Apply role-based filtering
    const roleFilterMiddleware = createRoleBasedFilterMiddleware();
    const { userContext, filters: roleBasedFilters } = await roleFilterMiddleware(request);

    if (!userContext) {
      return NextResponse.json({
        success: false,
        data: null,
        errors: ['Authentication required'],
        message: 'Please authenticate to access incidents',
        timestamp: new Date().toISOString(),
      }, { status: 401 });
    }

    // Check if user has access to incidents
    if (!hasResourceAccess(userContext, 'incident')) {
      return NextResponse.json({
        success: false,
        data: null,
        errors: ['Access denied'],
        message: 'You do not have permission to access incidents',
        timestamp: new Date().toISOString(),
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const searchTerm = searchParams.get('searchTerm') || '';

    // Build database filters with role-based restrictions
    const dbFilters = {
      ...roleBasedFilters,
      dateRange: roleBasedFilters.dateRange ? {
        start: new Date(roleBasedFilters.dateRange.start),
        end: new Date(roleBasedFilters.dateRange.end)
      } : undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize
    };

    // Get incidents from database
    const incidents = await DatabaseService.getIncidents(dbFilters);
    
    // Apply search filter (post-database filtering for now)
    let filteredIncidents = incidents;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredIncidents = incidents.filter(incident =>
        incident.name.toLowerCase().includes(term) ||
        incident.type.toLowerCase().includes(term)
      );
    }

    // Get real incident statistics from database
    const incidentStats = await DatabaseService.getIncidentStats();

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
            'CATASTROPHIC': 4, 
            'SEVERE': 3, 
            'MODERATE': 2, 
            'MINOR': 1 
          };
          aValue = severityOrder[a.severity as keyof typeof severityOrder] || 0;
          bValue = severityOrder[b.severity as keyof typeof severityOrder] || 0;
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

    const totalCount = filteredIncidents.length;
    const totalPages = Math.ceil(totalCount / pageSize);

    const response: IncidentListResponse = {
      success: true,
      data: {
        incidents: filteredIncidents.map(incident => ({
          ...incident,
          affectedEntityCount: 0, // TODO: Count from relationships
          assessmentCount: 0, // TODO: Count from rapid assessments
          responseCount: 0, // TODO: Count from relationships
          lastUpdated: incident.updatedAt
        })) as any,
        totalCount,
        pagination: {
          page,
          pageSize,
          totalPages,
          totalCount,
        },
        stats: incidentStats,
        filters: {
          availableTypes: Object.values(IncidentType),
          availableSeverities: Object.values(IncidentSeverity),
          availableStatuses: Object.values(IncidentStatus),
          affectedLGAs: ['Maiduguri', 'Bama', 'Monguno', 'Adamawa'], // TODO: Get from database
        },
      },
      message: `Found ${totalCount} incidents`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch incidents:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to fetch incidents'],
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
      data: null,
        errors: ['Missing required fields'],
        message: 'Name, type, severity, and date are required',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Validate incident type
    if (!Object.values(IncidentType).includes(body.type)) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Invalid incident type'],
        message: `Incident type must be one of: ${Object.values(IncidentType).join(', ')}`,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Validate severity
    if (!Object.values(IncidentSeverity).includes(body.severity)) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Invalid severity level'],
        message: `Severity must be one of: ${Object.values(IncidentSeverity).join(', ')}`,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Create incident in database using real DatabaseService
    const incidentData = {
      name: body.name,
      type: body.type,
      subType: body.subType || null,
      source: body.source || 'Manual Entry',
      severity: body.severity,
      status: 'ACTIVE', // New incidents start as ACTIVE
      date: new Date(body.date),
      // Note: preliminaryAssessmentIds field removed from schema
    };

    const newIncident = await DatabaseService.createIncident(incidentData);

    // TODO: In full implementation:
    // 1. Create audit trail entry
    // 2. Trigger notifications
    // 3. Link affected entities
    // 4. Send real-time updates

    return NextResponse.json({
      success: true,
      data: {
        incident: {
          ...newIncident,
          affectedEntityIds: body.affectedEntityIds || [],
          affectedEntityCount: (body.affectedEntityIds || []).length,
          assessmentCount: body.preliminaryAssessmentId ? 1 : 0,
          responseCount: 0,
          lastUpdated: newIncident.updatedAt,
        },
      },
      message: 'Incident created successfully',
      timestamp: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create incident:', error);
    
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
      errors: ['Failed to create incident'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}