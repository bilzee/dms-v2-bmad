import { NextRequest, NextResponse } from 'next/server';
import {
  IncidentDetailResponse,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
} from '@dms/shared';
import DatabaseService from '@/lib/services/DatabaseService';

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

    // Get incident details from database
    const incidentDetails = await DatabaseService.getIncidentWithDetails(incidentId);

    if (!incidentDetails) {
      return NextResponse.json({
        success: false,
        error: 'Incident not found',
        message: `No incident found with ID: ${incidentId}`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // Get timeline data (currently empty - would need timeline table implementation)
    const timeline = await DatabaseService.getIncidentTimeline(incidentId);

    // Transform database result to match expected response format
    const transformedIncident = {
      id: incidentDetails.id,
      name: incidentDetails.name,
      type: incidentDetails.type,
      subType: incidentDetails.subType || null,
      source: incidentDetails.source || 'Database Record',
      severity: incidentDetails.severity,
      status: incidentDetails.status,
      date: incidentDetails.date,
      description: incidentDetails.description || '',
      coordinates: incidentDetails.coordinates ? {
        latitude: incidentDetails.coordinates.latitude || 0,
        longitude: incidentDetails.coordinates.longitude || 0,
      } : null,
      affectedEntityIds: incidentDetails.affectedEntities?.map(entity => entity.id) || [],
      affectedEntities: incidentDetails.affectedEntities?.map(entity => ({
        id: entity.id,
        type: entity.type,
        name: entity.name,
        lga: entity.lga,
        ward: entity.ward,
        longitude: entity.longitude,
        latitude: entity.latitude,
        campDetails: entity.campDetails || undefined,
        communityDetails: entity.communityDetails || undefined,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      })) || [],
      preliminaryAssessmentIds: incidentDetails.preliminaryAssessmentIds || [],
      preliminaryAssessments: [], // TODO: Implement assessment relationship
      actionItems: [], // TODO: Implement action items table and relationship
      timeline: timeline,
      createdAt: incidentDetails.createdAt,
      updatedAt: incidentDetails.updatedAt,
    };

    const response: IncidentDetailResponse = {
      success: true,
      data: {
        incident: transformedIncident,
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
    const existingIncident = await DatabaseService.getIncidentById(incidentId);
    if (!existingIncident) {
      return NextResponse.json({
        success: false,
        error: 'Incident not found',
        message: `No incident found with ID: ${incidentId}`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // Update incident in database
    const updatedIncident = await DatabaseService.updateIncident(incidentId, {
      ...updates,
      updatedAt: new Date(),
    });

    // TODO: In full implementation:
    // 1. Create audit trail entry
    // 2. Trigger notifications if necessary
    // 3. Update related records if needed

    return NextResponse.json({
      success: true,
      data: {
        incident: {
          ...updatedIncident,
          affectedEntityCount: 0, // TODO: Get from relationships
          assessmentCount: existingIncident.preliminaryAssessmentIds?.length || 0,
          responseCount: 0, // TODO: Count from relationships
          lastUpdated: updatedIncident.updatedAt,
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
    const existingIncident = await DatabaseService.getIncidentById(incidentId);
    if (!existingIncident) {
      return NextResponse.json({
        success: false,
        error: 'Incident not found',
        message: `No incident found with ID: ${incidentId}`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // Perform soft delete by updating status
    await DatabaseService.updateIncident(incidentId, {
      status: 'DELETED',
      updatedAt: new Date(),
    });

    // TODO: In full implementation:
    // 1. Create audit trail entry
    // 2. Update related records
    // 3. Send notifications

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