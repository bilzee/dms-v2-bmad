import { NextRequest, NextResponse } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const incidentId = params.id;
    const url = new URL(request.url);
    const includeAll = url.searchParams.get('includeAll') !== 'false'; // Default to true

    if (!incidentId) {
      return NextResponse.json({
        success: false,
        data: null,
        errors: ['Incident ID is required'],
        message: 'Invalid request parameters',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Verify incident exists
    const incident = await DatabaseService.getIncidentById(incidentId);
    if (!incident) {
      return NextResponse.json({
        success: false,
        data: null,
        errors: ['Incident not found'],
        message: `Incident with ID ${incidentId} does not exist`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // Get affected entities for this incident
    let affectedEntities: any[] = [];
    try {
      affectedEntities = await DatabaseService.getAffectedEntitiesByIncident(incidentId) || [];
    } catch (dbError) {
      console.warn('Database query failed for affected entities:', dbError);
      // Continue with empty array - graceful degradation
    }

    // Transform entities to match the expected interface
    const entities = [];

    // Add "All Affected Entities" option if requested
    if (includeAll) {
      entities.push({
        id: 'all',
        name: 'All Affected Entities',
        type: 'aggregate' as const,
        // No coordinates for aggregate view
      });
    }

    // Add individual entities with coordinates
    affectedEntities.forEach((entity: any) => {
      entities.push({
        id: entity.id,
        name: entity.name || `${entity.type} ${entity.id}`,
        type: entity.type || 'LGA', // Default to LGA if type not specified
        coordinates: entity.coordinates ? [entity.coordinates.longitude, entity.coordinates.latitude] : undefined,
      });
    });

    // If no entities found, provide a helpful response
    if (entities.length === 0 || (entities.length === 1 && entities[0].id === 'all')) {
      // Add a default message entity for better UX
      if (includeAll && entities.length === 1) {
        entities.push({
          id: 'no-entities',
          name: 'No specific entities affected',
          type: 'aggregate' as const,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        entities,
        totalCount: entities.length,
        incidentName: incident.name,
      },
      message: `Successfully retrieved ${entities.length} entities for incident ${incident.name}`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to fetch entities by incident:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to fetch entities'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}