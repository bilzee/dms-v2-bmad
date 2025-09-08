import { NextRequest, NextResponse } from 'next/server';
import {
  IncidentStatusUpdateRequest,
  IncidentStatus,
} from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Valid status transitions
const statusTransitions: Record<IncidentStatus, IncidentStatus[]> = {
  [IncidentStatus.ACTIVE]: [IncidentStatus.CONTAINED, IncidentStatus.RESOLVED],
  [IncidentStatus.CONTAINED]: [IncidentStatus.RESOLVED],
  [IncidentStatus.RESOLVED]: [], // No transitions from resolved state
};

// PUT /api/v1/incidents/[id]/status - Update incident status
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const incidentId = params.id;
    const body: IncidentStatusUpdateRequest = await request.json();

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
    if (!body.newStatus) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Missing required field'],
        message: 'newStatus is required',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Validate new status value
    if (!Object.values(IncidentStatus).includes(body.newStatus)) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Invalid status'],
        message: `Status must be one of: ${Object.values(IncidentStatus).join(', ')}`,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Mock current incident data - in real implementation, fetch from database
    const mockCurrentIncident = {
      id: incidentId,
      name: 'Sample Incident',
      status: IncidentStatus.ACTIVE, // Would come from database
    };

    // Validate status transition
    const currentStatus = mockCurrentIncident.status;
    const validTransitions = statusTransitions[currentStatus] || [];
    
    if (!validTransitions.includes(body.newStatus)) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Invalid status transition'],
        message: `Cannot transition from ${currentStatus} to ${body.newStatus}. Valid transitions: ${validTransitions.join(', ') || 'none'}`,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // In a real implementation, this would:
    // 1. Update the incident status in the database
    // 2. Create timeline event
    // 3. Update action items if provided
    // 4. Send notifications to relevant stakeholders
    // 5. Update related assessments/responses if needed
    // 6. Create audit trail

    const timelineEvent = {
      id: `timeline-${Date.now()}`,
      type: 'STATUS_CHANGE' as const,
      timestamp: new Date(),
      coordinatorId: 'current-user-id', // Would come from authentication
      coordinatorName: 'Current User', // Would come from authentication
      description: `Status updated from ${currentStatus} to ${body.newStatus}${body.milestone ? ` - ${body.milestone}` : ''}`,
      metadata: {
        previousStatus: currentStatus,
        newStatus: body.newStatus,
        milestone: body.milestone,
        notes: body.notes,
        actionItemsAdded: body.actionItems?.length || 0,
      },
    };

    // Mock updated incident
    const updatedIncident = {
      ...mockCurrentIncident,
      status: body.newStatus,
      updatedAt: new Date(),
      timeline: [timelineEvent], // In real implementation, would append to existing timeline
      actionItems: body.actionItems || [], // In real implementation, would merge with existing action items
    };

    // Calculate status change duration (mock)
    const statusDuration = {
      [IncidentStatus.ACTIVE]: '5 days 12 hours',
      [IncidentStatus.CONTAINED]: '2 days 8 hours',
      [IncidentStatus.RESOLVED]: null,
    };

    return NextResponse.json({
      success: true,
      data: {
        incident: updatedIncident,
        statusUpdate: {
          previousStatus: currentStatus,
          newStatus: body.newStatus,
          transitionTime: new Date(),
          duration: statusDuration[currentStatus],
          coordinator: {
            id: 'current-user-id',
            name: 'Current User',
          },
          milestone: body.milestone,
          notes: body.notes,
          actionItemsAdded: body.actionItems?.length || 0,
        },
        timeline: timelineEvent,
      },
      message: `Incident status updated successfully from ${currentStatus} to ${body.newStatus}`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to update incident status:', error);
    
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
      errors: ['Failed to update incident status'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// GET /api/v1/incidents/[id]/status - Get status history
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

    // Mock status history - would come from database
    const statusHistory = [
      {
        status: IncidentStatus.ACTIVE,
        changedAt: new Date('2024-08-15T08:00:00Z'),
        changedBy: 'Sarah Johnson',
        coordinatorId: 'coord-1',
        notes: 'Initial incident creation',
        milestone: null,
        duration: '5 days 12 hours',
      },
      {
        status: IncidentStatus.CONTAINED,
        changedAt: new Date('2024-08-20T20:30:00Z'),
        changedBy: 'Sarah Johnson', 
        coordinatorId: 'coord-1',
        notes: 'All evacuation procedures completed, immediate threat contained',
        milestone: 'Evacuation Complete',
        duration: '2 days 8 hours',
      },
    ];

    // Mock possible next statuses
    const currentStatus = statusHistory[statusHistory.length - 1]?.status || IncidentStatus.ACTIVE;
    const nextPossibleStatuses = statusTransitions[currentStatus] || [];

    return NextResponse.json({
      success: true,
      data: {
        incidentId,
        currentStatus,
        statusHistory,
        nextPossibleStatuses,
        canTransition: nextPossibleStatuses.length > 0,
        totalTransitions: statusHistory.length,
      },
      message: 'Status history retrieved successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to get status history:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to get status history'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
