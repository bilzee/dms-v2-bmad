import { NextRequest, NextResponse } from 'next/server';
import {
  IncidentEntityLinkRequest,
} from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Mock entity data
const mockEntities = {
  '1': {
    id: '1',
    name: 'Maiduguri Camp A',
    type: 'CAMP' as const,
    lga: 'Maiduguri',
    ward: 'Bolori Ward',
    latitude: 11.8311,
    longitude: 13.1506,
    population: 15000,
  },
  '2': {
    id: '2',
    name: 'Bama Community Center',
    type: 'COMMUNITY' as const,
    lga: 'Bama',
    ward: 'Central Ward',
    latitude: 11.5204,
    longitude: 13.6896,
    population: 8500,
  },
  '3': {
    id: '3',
    name: 'Monguno Camp B',
    type: 'CAMP' as const,
    lga: 'Monguno',
    ward: 'Town Ward',
    latitude: 12.6743,
    longitude: 13.6092,
    population: 12000,
  },
  '4': {
    id: '4',
    name: 'Konduga Village',
    type: 'COMMUNITY' as const,
    lga: 'Konduga',
    ward: 'Konduga Ward',
    latitude: 11.8833,
    longitude: 13.4167,
    population: 5200,
  },
  '5': {
    id: '5',
    name: 'Dikwa Settlement',
    type: 'COMMUNITY' as const,
    lga: 'Dikwa',
    ward: 'Dikwa Ward',
    latitude: 12.0333,
    longitude: 13.9167,
    population: 7800,
  },
};

// Mock incident-entity relationships
const mockIncidentEntities: Record<string, string[]> = {
  '1': ['1', '3', '5'], // Flood incident affects camps and settlements
  '2': ['2'], // Fire incident affects market area
  '3': ['4', '5'], // Landslide affects communities
};

// POST /api/v1/incidents/[id]/entities - Link entities to incident
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const incidentId = params.id;
    const body: IncidentEntityLinkRequest = await request.json();

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
    if (!body.entityIds || !Array.isArray(body.entityIds) || body.entityIds.length === 0) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Invalid entity IDs'],
        message: 'entityIds is required and must be a non-empty array',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Validate entity existence
    const invalidEntityIds = body.entityIds.filter(id => !mockEntities[id as keyof typeof mockEntities]);
    if (invalidEntityIds.length > 0) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Invalid entity IDs'],
        message: `The following entity IDs do not exist: ${invalidEntityIds.join(', ')}`,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Get current linked entities
    const currentLinkedEntities = mockIncidentEntities[incidentId] || [];
    
    // Find new entities to link
    const newEntityIds = body.entityIds.filter(id => !currentLinkedEntities.includes(id));
    const alreadyLinkedIds = body.entityIds.filter(id => currentLinkedEntities.includes(id));

    if (newEntityIds.length === 0) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['No new entities to link'],
        message: `All specified entities are already linked to this incident: ${alreadyLinkedIds.join(', ')}`,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // In a real implementation, this would:
    // 1. Validate incident exists
    // 2. Create incident-entity relationships in database
    // 3. Calculate impact assessments
    // 4. Create timeline events
    // 5. Trigger notifications
    // 6. Update incident statistics

    const linkedEntities = newEntityIds.map(id => {
      const entity = mockEntities[id as keyof typeof mockEntities];
      return {
        ...entity,
        linkDate: new Date(),
        impactLevel: 'MEDIUM' as const, // Would be calculated based on distance/severity
        linkingCoordinator: {
          id: 'current-user-id',
          name: 'Current User',
        },
      };
    });

    // Update mock data
    mockIncidentEntities[incidentId] = [...currentLinkedEntities, ...newEntityIds];

    // Create timeline event
    const timelineEvent = {
      id: `timeline-${Date.now()}`,
      type: 'ENTITY_LINKED' as const,
      timestamp: new Date(),
      coordinatorId: 'current-user-id',
      coordinatorName: 'Current User',
      description: `Linked ${newEntityIds.length} entities to incident`,
      metadata: {
        newEntityIds,
        entityNames: linkedEntities.map(e => e.name),
        totalLinkedEntities: mockIncidentEntities[incidentId].length,
      },
    };

    // Calculate total population impact
    const totalPopulation = mockIncidentEntities[incidentId]
      .map(id => mockEntities[id as keyof typeof mockEntities]?.population || 0)
      .reduce((sum, pop) => sum + pop, 0);

    return NextResponse.json({
      success: true,
      data: {
        incidentId,
        linkedEntities,
        summary: {
          newEntitiesLinked: newEntityIds.length,
          alreadyLinked: alreadyLinkedIds.length,
          totalLinkedEntities: mockIncidentEntities[incidentId].length,
          totalPopulationImpact: totalPopulation,
        },
        timeline: timelineEvent,
      },
      message: `Successfully linked ${newEntityIds.length} entities to incident`,
      timestamp: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to link entities to incident:', error);
    
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
      errors: ['Failed to link entities to incident'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// GET /api/v1/incidents/[id]/entities - Get linked entities for incident
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const incidentId = params.id;

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

    // Get linked entity IDs
    const linkedEntityIds = mockIncidentEntities[incidentId] || [];
    
    // Get entity details
    const linkedEntities = linkedEntityIds.map(id => {
      const entity = mockEntities[id as keyof typeof mockEntities];
      return {
        ...entity,
        linkDate: new Date(Date.now() - Math.random() * 86400000 * 5), // Random date within last 5 days
        impactLevel: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)] as 'LOW' | 'MEDIUM' | 'HIGH',
      };
    }).filter(Boolean);

    // Calculate statistics
    const statistics = {
      totalLinkedEntities: linkedEntities.length,
      byType: {
        CAMP: linkedEntities.filter(e => e.type === 'CAMP').length,
        COMMUNITY: linkedEntities.filter(e => e.type === 'COMMUNITY').length,
      },
      byImpactLevel: {
        HIGH: linkedEntities.filter(e => e.impactLevel === 'HIGH').length,
        MEDIUM: linkedEntities.filter(e => e.impactLevel === 'MEDIUM').length,
        LOW: linkedEntities.filter(e => e.impactLevel === 'LOW').length,
      },
      totalPopulationImpact: linkedEntities.reduce((sum, entity) => sum + entity.population, 0),
      affectedLGAs: [...new Set(linkedEntities.map(e => e.lga))],
    };

    return NextResponse.json({
      success: true,
      data: {
        incidentId,
        linkedEntities,
        statistics,
        lastUpdated: new Date(),
      },
      message: `Found ${linkedEntities.length} linked entities`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to get linked entities:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to get linked entities'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
