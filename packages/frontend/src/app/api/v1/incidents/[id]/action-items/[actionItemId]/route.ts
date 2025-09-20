import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';
import { IncidentActionItem } from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// PATCH /api/v1/incidents/[id]/action-items/[actionItemId] - Update action item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; actionItemId: string }> }
) {
  try {
    const { id: incidentId, actionItemId } = await params;
    const session = await auth();

    // Authentication check
    if (!session?.user) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized'] },
        { status: 401 }
      );
    }

    // Validate IDs
    if (!incidentId || !actionItemId || typeof incidentId !== 'string' || typeof actionItemId !== 'string') {
      return NextResponse.json({
        success: false,
        errors: ['Invalid incident ID or action item ID'],
        message: 'Both IDs are required and must be strings',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Check if action item exists and belongs to the incident
    const existingActionItem = await prisma.incidentActionItem.findFirst({
      where: { 
        id: actionItemId,
        incidentId 
      }
    });

    if (!existingActionItem) {
      return NextResponse.json({
        success: false,
        errors: ['Action item not found'],
        message: `No action item found with ID: ${actionItemId} for incident: ${incidentId}`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { description, assignedTo, dueDate, priority, status } = body;

    // Validate that at least one field is being updated
    if (!description && !assignedTo && !dueDate && !priority && !status) {
      return NextResponse.json({
        success: false,
        errors: ['No update fields provided'],
        message: 'Please provide at least one field to update',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Validate status if provided
    if (status && !['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
      return NextResponse.json({
        success: false,
        errors: ['Invalid status value'],
        message: 'Status must be PENDING, IN_PROGRESS, or COMPLETED',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Validate priority if provided
    if (priority && !['LOW', 'MEDIUM', 'HIGH'].includes(priority)) {
      return NextResponse.json({
        success: false,
        errors: ['Invalid priority value'],
        message: 'Priority must be LOW, MEDIUM, or HIGH',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Update the action item
    const updatedActionItem = await prisma.incidentActionItem.update({
      where: { id: actionItemId },
      data: {
        ...(description && { description }),
        ...(assignedTo !== undefined && { assignedTo: assignedTo || null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(priority && { priority: priority as 'LOW' | 'MEDIUM' | 'HIGH' }),
        ...(status && { status: status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' }),
        updatedAt: new Date(),
      },
    });

    // Transform to match expected interface
    const actionItemResponse: IncidentActionItem = {
      id: updatedActionItem.id,
      description: updatedActionItem.description,
      assignedTo: updatedActionItem.assignedTo || undefined,
      dueDate: updatedActionItem.dueDate?.toISOString() || undefined,
      status: updatedActionItem.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED',
      priority: updatedActionItem.priority as 'LOW' | 'MEDIUM' | 'HIGH',
      createdAt: updatedActionItem.createdAt.toISOString(),
      updatedAt: updatedActionItem.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: {
        actionItem: actionItemResponse,
      },
      message: 'Action item updated successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to update action item:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json({
        success: false,
        errors: ['Invalid JSON in request body'],
        message: 'Please check your request format',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      errors: ['Failed to update action item'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// DELETE /api/v1/incidents/[id]/action-items/[actionItemId] - Delete action item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; actionItemId: string }> }
) {
  try {
    const { id: incidentId, actionItemId } = await params;
    const session = await auth();

    // Authentication check
    if (!session?.user) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized'] },
        { status: 401 }
      );
    }

    // Validate IDs
    if (!incidentId || !actionItemId || typeof incidentId !== 'string' || typeof actionItemId !== 'string') {
      return NextResponse.json({
        success: false,
        errors: ['Invalid incident ID or action item ID'],
        message: 'Both IDs are required and must be strings',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Check if action item exists and belongs to the incident
    const existingActionItem = await prisma.incidentActionItem.findFirst({
      where: { 
        id: actionItemId,
        incidentId 
      }
    });

    if (!existingActionItem) {
      return NextResponse.json({
        success: false,
        errors: ['Action item not found'],
        message: `No action item found with ID: ${actionItemId} for incident: ${incidentId}`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // Delete the action item
    await prisma.incidentActionItem.delete({
      where: { id: actionItemId },
    });

    return NextResponse.json({
      success: true,
      data: {
        actionItemId,
        deletedAt: new Date(),
      },
      message: 'Action item deleted successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to delete action item:', error);
    
    return NextResponse.json({
      success: false,
      errors: ['Failed to delete action item'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}