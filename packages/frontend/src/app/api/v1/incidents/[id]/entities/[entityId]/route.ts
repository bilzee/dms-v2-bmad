import { NextRequest, NextResponse } from 'next/server';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Mock incident-entity relationships (shared with parent route)
const mockIncidentEntities: Record<string, string[]> = {
  '1': ['1', '3', '5'],
  '2': ['2'],
  '3': ['4', '5'],
};

// Mock entity data (shared with parent route)  
const mockEntities = {
  '1': {
    id: '1',
    name: 'Maiduguri Camp A',
    type: 'CAMP' as const,
    lga: 'Maiduguri',
    ward: 'Bolori Ward',
    population: 15000,
  },
  '2': {
    id: '2',
    name: 'Bama Community Center',
    type: 'COMMUNITY' as const,
    lga: 'Bama',
    ward: 'Central Ward',
    population: 8500,
  },
  '3': {
    id: '3',
    name: 'Monguno Camp B',
    type: 'CAMP' as const,
    lga: 'Monguno',
    ward: 'Town Ward',
    population: 12000,
  },
  '4': {
    id: '4',
    name: 'Konduga Village',
    type: 'COMMUNITY' as const,
    lga: 'Konduga',
    ward: 'Konduga Ward',
    population: 5200,
  },
  '5': {
    id: '5',
    name: 'Dikwa Settlement',
    type: 'COMMUNITY' as const,
    lga: 'Dikwa',
    ward: 'Dikwa Ward',
    population: 7800,
  },
};

// DELETE /api/v1/incidents/[id]/entities/[entityId] - Unlink entity from incident
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; entityId: string } }
) {
  try {
    const incidentId = params.id;
    const entityId = params.entityId;

    // Validate incident ID
    if (!incidentId || typeof incidentId !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Invalid incident ID',
        message: 'Incident ID is required and must be a string',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Validate entity ID
    if (!entityId || typeof entityId !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Invalid entity ID',
        message: 'Entity ID is required and must be a string',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Check if entity exists
    const entity = mockEntities[entityId as keyof typeof mockEntities];
    if (!entity) {
      return NextResponse.json({
        success: false,
        error: 'Entity not found',
        message: `No entity found with ID: ${entityId}`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // Get current linked entities
    const currentLinkedEntities = mockIncidentEntities[incidentId] || [];
    
    // Check if entity is linked to this incident
    if (!currentLinkedEntities.includes(entityId)) {
      return NextResponse.json({
        success: false,
        error: 'Entity not linked',
        message: `Entity ${entity.name} is not linked to this incident`,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // In a real implementation, this would:
    // 1. Validate permissions (ensure user can unlink entities)
    // 2. Check for dependencies (responses, assessments linked to this entity)
    // 3. Remove incident-entity relationship from database
    // 4. Update incident statistics
    // 5. Create timeline event
    // 6. Trigger notifications
    // 7. Archive relationship data for audit trail

    // Remove entity from incident
    const updatedLinkedEntities = currentLinkedEntities.filter(id => id !== entityId);
    mockIncidentEntities[incidentId] = updatedLinkedEntities;

    // Calculate remaining population impact
    const remainingPopulation = updatedLinkedEntities
      .map(id => mockEntities[id as keyof typeof mockEntities]?.population || 0)
      .reduce((sum, pop) => sum + pop, 0);

    // Create timeline event
    const timelineEvent = {
      id: `timeline-${Date.now()}`,
      type: 'ENTITY_UNLINKED' as const,
      timestamp: new Date(),
      coordinatorId: 'current-user-id',
      coordinatorName: 'Current User',
      description: `Unlinked entity ${entity.name} from incident`,
      metadata: {
        unlinkedEntityId: entityId,
        unlinkedEntityName: entity.name,
        unlinkedEntityType: entity.type,
        remainingLinkedEntities: updatedLinkedEntities.length,
        impactReduction: entity.population,
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        incidentId,
        unlinkedEntity: {
          id: entityId,
          name: entity.name,
          type: entity.type,
          population: entity.population,
          unlinkDate: new Date(),
        },
        summary: {
          remainingLinkedEntities: updatedLinkedEntities.length,
          populationImpactReduction: entity.population,
          remainingPopulationImpact: remainingPopulation,
        },
        timeline: timelineEvent,
      },
      message: `Successfully unlinked ${entity.name} from incident`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to unlink entity from incident:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to unlink entity from incident',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// GET /api/v1/incidents/[id]/entities/[entityId] - Get specific entity relationship details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; entityId: string } }
) {
  try {
    const incidentId = params.id;
    const entityId = params.entityId;

    // Validate incident ID
    if (!incidentId || typeof incidentId !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Invalid incident ID',
        message: 'Incident ID is required and must be a string',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Validate entity ID
    if (!entityId || typeof entityId !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Invalid entity ID',
        message: 'Entity ID is required and must be a string',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Check if entity exists
    const entity = mockEntities[entityId as keyof typeof mockEntities];
    if (!entity) {
      return NextResponse.json({
        success: false,
        error: 'Entity not found',
        message: `No entity found with ID: ${entityId}`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // Get current linked entities
    const currentLinkedEntities = mockIncidentEntities[incidentId] || [];
    
    // Check if entity is linked to this incident
    if (!currentLinkedEntities.includes(entityId)) {
      return NextResponse.json({
        success: false,
        error: 'Entity not linked',
        message: `Entity ${entity.name} is not linked to this incident`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // Mock relationship details
    const relationshipDetails = {
      incidentId,
      entityId,
      entity: {
        ...entity,
        coordinates: {
          latitude: 11.8311 + Math.random() * 0.1, // Mock coordinates
          longitude: 13.1506 + Math.random() * 0.1,
        },
      },
      relationship: {
        linkDate: new Date(Date.now() - Math.random() * 86400000 * 10), // Random date within last 10 days
        impactLevel: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)] as 'LOW' | 'MEDIUM' | 'HIGH',
        estimatedDistance: Math.floor(Math.random() * 50) + 5, // 5-55 km
        linkingCoordinator: {
          id: 'coord-1',
          name: 'Sarah Johnson',
        },
        lastAssessment: new Date(Date.now() - Math.random() * 86400000 * 3), // Within last 3 days
        responseCount: Math.floor(Math.random() * 5), // 0-4 responses
      },
      impactAssessment: {
        peopleAffected: entity.population,
        infrastructureDamage: ['None', 'Minor', 'Moderate', 'Severe'][Math.floor(Math.random() * 4)] as string,
        accessibilityStatus: ['Full', 'Limited', 'Blocked'][Math.floor(Math.random() * 3)] as string,
        immediateNeeds: [
          'Clean Water',
          'Emergency Shelter',
          'Medical Supplies',
          'Food Distribution'
        ].filter(() => Math.random() > 0.5), // Random subset of needs
      },
    };

    return NextResponse.json({
      success: true,
      data: relationshipDetails,
      message: 'Entity relationship details retrieved successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to get entity relationship details:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get entity relationship details',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}