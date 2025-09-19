import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/v1/coordinator/assignments - Get team assignments and availability
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized'] },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const incidentId = searchParams.get('incidentId');
    const role = searchParams.get('role');
    const availability = searchParams.get('availability'); // available, assigned, unavailable

    // Get users with their roles and current assignments
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        ...(role && {
          roles: {
            some: {
              name: role
            }
          }
        })
      },
      include: {
        roles: true,
        activeRole: true
      }
    });

    // Get current assignments from rapid responses and assessments
    const assessmentAssignments = await prisma.rapidAssessment.findMany({
      where: incidentId ? {
        affectedEntity: {
          incidentId
        }
      } : {},
      select: {
        id: true,
        assessorName: true,
        rapidAssessmentType: true,
        rapidAssessmentDate: true,
        affectedEntity: {
          select: {
            id: true,
            name: true,
            incidentId: true
          }
        }
      }
    });

    const responseAssignments = await prisma.rapidResponse.findMany({
      where: incidentId ? {
        donorCommitments: {
          some: { incidentId }
        }
      } : {},
      select: {
        id: true,
        responderId: true,
        responderName: true,
        responseType: true,
        status: true,
        plannedDate: true,
        affectedEntityId: true
      }
    });

    // Build team assignments data
    const teamAssignments = users.map(user => {
      // Find assignments for this user
      const userAssessments = assessmentAssignments.filter(a => 
        a.assessorName.toLowerCase().includes(user.name?.toLowerCase() || '')
      );
      
      const userResponses = responseAssignments.filter(r => 
        r.responderId === user.id || r.responderName.toLowerCase().includes(user.name?.toLowerCase() || '')
      );

      const totalAssignments = userAssessments.length + userResponses.length;
      const activeAssignments = userResponses.filter(r => r.status === 'IN_PROGRESS').length;
      
      // Determine availability status
      let availabilityStatus = 'available';
      if (activeAssignments > 0) {
        availabilityStatus = 'assigned';
      }
      if (totalAssignments >= 5) { // Arbitrary threshold for overloaded
        availabilityStatus = 'unavailable';
      }

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        organization: user.organization,
        activeRole: user.activeRole?.name,
        roles: user.roles.map(r => r.name),
        availabilityStatus,
        totalAssignments,
        activeAssignments,
        lastSync: user.lastSync,
        assignments: [
          ...userAssessments.map(a => ({
            id: a.id,
            type: 'assessment',
            title: `${a.rapidAssessmentType} Assessment`,
            entityName: a.affectedEntity.name,
            scheduledDate: a.rapidAssessmentDate,
            status: 'assigned'
          })),
          ...userResponses.map(r => ({
            id: r.id,
            type: 'response',
            title: `${r.responseType} Response`,
            entityId: r.affectedEntityId,
            scheduledDate: r.plannedDate,
            status: r.status
          }))
        ]
      };
    });

    // Apply availability filter if specified
    let filteredAssignments = teamAssignments;
    if (availability) {
      filteredAssignments = teamAssignments.filter(ta => ta.availabilityStatus === availability);
    }

    // Calculate summary statistics
    const totalTeamMembers = teamAssignments.length;
    const availableMembers = teamAssignments.filter(ta => ta.availabilityStatus === 'available').length;
    const assignedMembers = teamAssignments.filter(ta => ta.availabilityStatus === 'assigned').length;
    const unavailableMembers = teamAssignments.filter(ta => ta.availabilityStatus === 'unavailable').length;

    const roleDistribution = teamAssignments.reduce((acc, ta) => {
      const role = ta.activeRole || 'unassigned';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const workloadStats = {
      averageAssignments: Math.round((teamAssignments.reduce((sum, ta) => sum + ta.totalAssignments, 0) / totalTeamMembers) * 10) / 10,
      maxAssignments: Math.max(...teamAssignments.map(ta => ta.totalAssignments)),
      overloadedMembers: teamAssignments.filter(ta => ta.totalAssignments >= 5).length
    };

    return NextResponse.json({
      success: true,
      data: {
        teamAssignments: filteredAssignments,
        summary: {
          totalTeamMembers,
          availableMembers,
          assignedMembers,
          unavailableMembers,
          roleDistribution,
          workloadStats
        }
      },
      message: `Found ${filteredAssignments.length} team members`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to fetch team assignments:', error);
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to fetch team assignments'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// POST /api/v1/coordinator/assignments - Create new assignment
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized'] },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, assignmentType, entityId, responseType, assessmentType, scheduledDate, notes } = body;

    // Validate required fields
    if (!userId || !assignmentType || !entityId) {
      return NextResponse.json({
        success: false,
        errors: ['Missing required fields: userId, assignmentType, entityId'],
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { activeRole: true }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        errors: ['User not found'],
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    let assignment;

    if (assignmentType === 'assessment') {
      // Create assessment assignment
      assignment = await prisma.rapidAssessment.create({
        data: {
          rapidAssessmentType: assessmentType || 'Other',
          rapidAssessmentDate: scheduledDate ? new Date(scheduledDate) : new Date(),
          affectedEntityId: entityId,
          assessorName: user.name || 'Unknown Assessor'
        }
      });
    } else if (assignmentType === 'response') {
      // Create response assignment
      assignment = await prisma.rapidResponse.create({
        data: {
          responseType: responseType || 'Other',
          status: 'PLANNED',
          plannedDate: scheduledDate ? new Date(scheduledDate) : new Date(),
          affectedEntityId: entityId,
          responderId: userId,
          responderName: user.name || 'Unknown Responder',
          verificationStatus: 'PENDING',
          data: {
            notes: notes || '',
            assignedBy: session.user.id,
            assignedAt: new Date().toISOString()
          }
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        errors: ['Invalid assignment type. Must be "assessment" or "response"'],
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        assignment: {
          id: assignment.id,
          type: assignmentType,
          userId,
          userName: user.name,
          entityId,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
          status: 'assigned',
          createdAt: assignment.createdAt
        }
      },
      message: 'Assignment created successfully',
      timestamp: new Date().toISOString()
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create assignment:', error);
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to create assignment'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}