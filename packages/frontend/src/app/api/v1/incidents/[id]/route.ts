import { NextRequest, NextResponse } from 'next/server';
import {
  IncidentDetailResponse,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
} from '@dms/shared';

// Mock incident details data
const mockIncidentDetails = {
  'incident-1': {
    id: 'incident-1',
    name: 'Borno State Flood - August 2024',
    type: IncidentType.FLOOD,
    subType: 'Flash Flood',
    source: 'WHO Emergency Assessment Report',
    severity: IncidentSeverity.SEVERE,
    status: IncidentStatus.ACTIVE,
    date: new Date('2024-08-15'),
    description: 'Severe flooding affecting multiple camps and communities in Borno State following heavy rainfall. Flash floods have displaced thousands and damaged critical infrastructure.',
    coordinates: {
      latitude: 11.8311,
      longitude: 13.1506,
    },
    affectedEntityIds: ['1', '3', '5'],
    affectedEntities: [
      {
        id: '1',
        type: 'CAMP',
        name: 'Maiduguri Camp A',
        lga: 'Maiduguri',
        ward: 'Bolori Ward',
        longitude: 13.1506,
        latitude: 11.8311,
        campDetails: {},
        communityDetails: undefined,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-08-15'),
      },
      {
        id: '3',
        type: 'CAMP',
        name: 'Monguno Camp B',
        lga: 'Monguno',
        ward: 'Town Ward',
        longitude: 13.6092,
        latitude: 12.6743,
        campDetails: {},
        communityDetails: undefined,
        createdAt: new Date('2024-02-20'),
        updatedAt: new Date('2024-08-15'),
      },
      {
        id: '5',
        type: 'COMMUNITY',
        name: 'Dikwa Settlement',
        lga: 'Dikwa',
        ward: 'Dikwa Ward',
        longitude: 13.9167,
        latitude: 12.0333,
        campDetails: undefined,
        communityDetails: {},
        createdAt: new Date('2024-03-10'),
        updatedAt: new Date('2024-08-15'),
      },
    ],
    preliminaryAssessmentIds: ['assess-1', 'assess-2'],
    preliminaryAssessments: [
      {
        id: 'assess-1',
        type: 'PRELIMINARY',
        date: new Date('2024-08-15'),
        affectedEntityId: '1',
        assessorName: 'Dr. Ahmed Musa',
        assessorId: 'assessor-1',
        verificationStatus: 'VERIFIED',
        syncStatus: 'SYNCED',
        data: {
          reportingDate: new Date('2024-08-15'),
          reportingLatitude: 11.8311,
          reportingLongitude: 13.1506,
          reportingLGA: 'Maiduguri',
          reportingWard: 'Bolori Ward',
          numberLivesLost: 0,
          numberInjured: 12,
          numberDisplaced: 2500,
          numberHousesAffected: 850,
          schoolsAffected: '3 primary schools flooded',
          medicalFacilitiesAffected: '1 clinic partially damaged',
          agriculturalLandsAffected: '500 hectares of farmland submerged',
          reportingAgent: 'WHO Field Team',
          additionalDetails: 'Urgent need for temporary shelter and clean water distribution.',
        },
        mediaAttachments: [],
        createdAt: new Date('2024-08-15'),
        updatedAt: new Date('2024-08-15'),
      },
    ],
    actionItems: [
      {
        id: 'action-1',
        description: 'Coordinate evacuation of high-risk areas',
        assignedTo: 'Relief Team Alpha',
        dueDate: new Date('2024-08-25'),
        status: 'IN_PROGRESS',
        priority: 'HIGH',
      },
      {
        id: 'action-2',
        description: 'Set up emergency water distribution points',
        assignedTo: 'WASH Team',
        dueDate: new Date('2024-08-27'),
        status: 'PENDING',
        priority: 'HIGH',
      },
      {
        id: 'action-3',
        description: 'Assess damaged infrastructure',
        assignedTo: 'Engineering Team',
        dueDate: new Date('2024-08-30'),
        status: 'PENDING',
        priority: 'MEDIUM',
      },
    ],
    timeline: [
      {
        id: 'timeline-1',
        type: 'STATUS_CHANGE',
        timestamp: new Date('2024-08-15T08:00:00Z'),
        coordinatorId: 'coord-1',
        coordinatorName: 'Sarah Johnson',
        description: 'Incident created and marked as ACTIVE',
        metadata: { 
          previousStatus: null, 
          newStatus: IncidentStatus.ACTIVE 
        },
      },
      {
        id: 'timeline-2',
        type: 'ENTITY_LINKED',
        timestamp: new Date('2024-08-15T09:30:00Z'),
        coordinatorId: 'coord-1',
        coordinatorName: 'Sarah Johnson',
        description: 'Linked 3 affected entities',
        metadata: { 
          entityIds: ['1', '3', '5'],
          entityNames: ['Maiduguri Camp A', 'Monguno Camp B', 'Dikwa Settlement']
        },
      },
      {
        id: 'timeline-3',
        type: 'ASSESSMENT_ADDED',
        timestamp: new Date('2024-08-15T14:20:00Z'),
        coordinatorId: 'coord-2',
        coordinatorName: 'Dr. Ahmed Musa',
        description: 'Preliminary assessment completed for Maiduguri Camp A',
        metadata: { 
          assessmentId: 'assess-1',
          entityId: '1'
        },
      },
      {
        id: 'timeline-4',
        type: 'NOTE_ADDED',
        timestamp: new Date('2024-08-16T10:15:00Z'),
        coordinatorId: 'coord-1',
        coordinatorName: 'Sarah Johnson',
        description: 'Updated response priorities based on field reports',
        metadata: { 
          note: 'Water contamination confirmed in affected areas. WASH response upgraded to HIGH priority.'
        },
      },
    ],
    createdAt: new Date('2024-08-15T08:00:00Z'),
    updatedAt: new Date('2024-08-20T16:30:00Z'),
  },
  'incident-2': {
    id: 'incident-2',
    name: 'Maiduguri Market Fire',
    type: IncidentType.FIRE,
    subType: 'Structural Fire',
    source: 'Local Fire Department Report',
    severity: IncidentSeverity.MODERATE,
    status: IncidentStatus.CONTAINED,
    date: new Date('2024-08-18'),
    description: 'Fire outbreak at Maiduguri Central Market. Fire has been contained but significant damage to merchant stalls and goods.',
    coordinates: {
      latitude: 11.8469,
      longitude: 13.1571,
    },
    affectedEntityIds: ['2'],
    affectedEntities: [
      {
        id: '2',
        type: 'COMMUNITY',
        name: 'Maiduguri Central Market Area',
        lga: 'Maiduguri',
        ward: 'Central Ward',
        longitude: 13.1571,
        latitude: 11.8469,
        campDetails: undefined,
        communityDetails: {},
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-08-18'),
      },
    ],
    preliminaryAssessmentIds: ['assess-3'],
    preliminaryAssessments: [],
    actionItems: [
      {
        id: 'action-4',
        description: 'Assess structural damage to market buildings',
        assignedTo: 'Fire Safety Inspector',
        dueDate: new Date('2024-08-22'),
        status: 'COMPLETED',
        priority: 'HIGH',
      },
      {
        id: 'action-5',
        description: 'Provide temporary trading spaces',
        assignedTo: 'Market Management',
        dueDate: new Date('2024-08-25'),
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
      },
    ],
    timeline: [
      {
        id: 'timeline-5',
        type: 'STATUS_CHANGE',
        timestamp: new Date('2024-08-18T06:30:00Z'),
        coordinatorId: 'coord-3',
        coordinatorName: 'Ibrahim Katsina',
        description: 'Fire incident reported and marked as ACTIVE',
        metadata: { 
          previousStatus: null, 
          newStatus: IncidentStatus.ACTIVE 
        },
      },
      {
        id: 'timeline-6',
        type: 'STATUS_CHANGE',
        timestamp: new Date('2024-08-18T11:45:00Z'),
        coordinatorId: 'coord-3',
        coordinatorName: 'Ibrahim Katsina',
        description: 'Fire contained, status updated',
        metadata: { 
          previousStatus: IncidentStatus.ACTIVE, 
          newStatus: IncidentStatus.CONTAINED,
          milestone: 'Fire suppression successful'
        },
      },
    ],
    createdAt: new Date('2024-08-18T06:30:00Z'),
    updatedAt: new Date('2024-08-19T14:20:00Z'),
  },
  'incident-3': {
    id: 'incident-3',
    name: 'Adamawa Landslide Event',
    type: IncidentType.LANDSLIDE,
    subType: 'Soil Movement',
    source: 'NEMA Field Report',
    severity: IncidentSeverity.CATASTROPHIC,
    status: IncidentStatus.ACTIVE,
    date: new Date('2024-01-15'),
    description: 'Major landslide affecting multiple communities in Adamawa State',
    coordinates: {
      latitude: 9.3265,
      longitude: 12.3984,
    },
    affectedEntityIds: ['entity-1', 'entity-2', 'entity-3', 'entity-4', 'entity-5'],
    affectedEntities: [
      {
        id: 'entity-1',
        type: 'COMMUNITY',
        name: 'Adamawa Village A',
        lga: 'Adamawa',
        ward: 'Central Ward',
        longitude: 12.3984,
        latitude: 9.3265,
        campDetails: undefined,
        communityDetails: {},
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-15'),
      },
      {
        id: 'entity-2',
        type: 'COMMUNITY', 
        name: 'Mountain Settlement B',
        lga: 'Adamawa',
        ward: 'North Ward',
        longitude: 12.4100,
        latitude: 9.3400,
        campDetails: undefined,
        communityDetails: {},
        createdAt: new Date('2024-01-12'),
        updatedAt: new Date('2024-01-15'),
      },
    ],
    preliminaryAssessmentIds: ['prelim-1', 'prelim-2'],
    preliminaryAssessments: [
      {
        id: 'prelim-1',
        type: 'PRELIMINARY',
        date: new Date('2024-01-16'),
        affectedEntityId: 'entity-1',
        assessorName: 'Coordinator John',
        assessorId: 'coord-1',
        verificationStatus: 'VERIFIED',
        syncStatus: 'SYNCED',
        data: {
          reportingDate: new Date('2024-01-16'),
          reportingLatitude: 9.3265,
          reportingLongitude: 12.3984,
          reportingLGA: 'Adamawa',
          reportingWard: 'Central Ward',
          numberLivesLost: 2,
          numberInjured: 15,
          numberDisplaced: 500,
          numberHousesAffected: 120,
          schoolsAffected: '2 schools damaged',
          medicalFacilitiesAffected: '1 health center blocked',
          agriculturalLandsAffected: '200 hectares affected',
          reportingAgent: 'NEMA Response Team',
          additionalDetails: 'Access roads blocked, need emergency evacuation',
        },
        mediaAttachments: [],
        createdAt: new Date('2024-01-16'),
        updatedAt: new Date('2024-01-16'),
      },
    ],
    actionItems: [
      {
        id: 'action-1',
        description: 'Deploy emergency response team to affected area',
        assignedTo: 'coordinator-1',
        dueDate: new Date('2024-01-22'),
        status: 'IN_PROGRESS',
        priority: 'HIGH',
      },
      {
        id: 'action-2', 
        description: 'Establish temporary shelter for displaced families',
        assignedTo: 'coordinator-2',
        dueDate: new Date('2024-01-25'),
        status: 'PENDING',
        priority: 'HIGH',
      },
    ],
    timeline: [
      {
        id: 'timeline-1',
        type: 'STATUS_CHANGE',
        timestamp: new Date('2024-01-15T08:00:00Z'),
        coordinatorId: 'coord-1',
        coordinatorName: 'John Doe',
        description: 'Incident created and marked as ACTIVE',
        metadata: { 
          previousStatus: null, 
          newStatus: IncidentStatus.ACTIVE 
        },
      },
      {
        id: 'timeline-2',
        type: 'ENTITY_LINKED',
        timestamp: new Date('2024-01-16T10:30:00Z'),
        coordinatorId: 'coord-2',
        coordinatorName: 'Jane Smith',
        description: 'Linked 5 affected entities to incident',
        metadata: { 
          entityCount: 5 
        },
      },
    ],
    createdAt: new Date('2024-01-15T08:00:00Z'),
    updatedAt: new Date('2024-01-20T16:30:00Z'),
  },
};

// GET /api/v1/incidents/[id] - Get incident details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: incidentId } = await params;

    // Validate incident ID
    if (!incidentId || typeof incidentId !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Invalid incident ID',
        message: 'Incident ID is required and must be a string',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Get incident details (mock data)
    const incidentDetails = mockIncidentDetails[incidentId as keyof typeof mockIncidentDetails];

    if (!incidentDetails) {
      return NextResponse.json({
        success: false,
        error: 'Incident not found',
        message: `No incident found with ID: ${incidentId}`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    const response: IncidentDetailResponse = {
      success: true,
      data: {
        incident: incidentDetails,
      },
      message: 'Incident details retrieved successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to fetch incident details:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch incident details',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// PATCH /api/v1/incidents/[id] - Update incident details (partial update)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: incidentId } = await params;
    const updates = await request.json();

    // Validate incident ID
    if (!incidentId || typeof incidentId !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Invalid incident ID',
        message: 'Incident ID is required and must be a string',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Check if incident exists
    const existingIncident = mockIncidentDetails[incidentId as keyof typeof mockIncidentDetails];
    if (!existingIncident) {
      return NextResponse.json({
        success: false,
        error: 'Incident not found',
        message: `No incident found with ID: ${incidentId}`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // In a real implementation, this would:
    // 1. Validate the updates
    // 2. Update the database record
    // 3. Create audit trail entries
    // 4. Trigger notifications if necessary

    // Mock response
    return NextResponse.json({
      success: true,
      data: {
        incident: {
          ...existingIncident,
          ...updates,
          updatedAt: new Date(),
        },
      },
      message: 'Incident updated successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to update incident:', error);
    
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
      error: 'Failed to update incident',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// DELETE /api/v1/incidents/[id] - Delete incident (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: incidentId } = await params;

    // Validate incident ID
    if (!incidentId || typeof incidentId !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Invalid incident ID',
        message: 'Incident ID is required and must be a string',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Check if incident exists
    const existingIncident = mockIncidentDetails[incidentId as keyof typeof mockIncidentDetails];
    if (!existingIncident) {
      return NextResponse.json({
        success: false,
        error: 'Incident not found',
        message: `No incident found with ID: ${incidentId}`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // In a real implementation, this would:
    // 1. Perform soft delete (mark as deleted)
    // 2. Create audit trail entry
    // 3. Update related records
    // 4. Send notifications

    return NextResponse.json({
      success: true,
      data: {
        incidentId,
        deletedAt: new Date(),
      },
      message: 'Incident deleted successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to delete incident:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to delete incident',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}