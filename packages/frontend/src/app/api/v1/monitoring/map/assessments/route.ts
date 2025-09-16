import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Get real assessment data from database
const getMapAssessments = async () => {
  // Query assessments with affected entity data
  const assessments = await prisma.rapidAssessment.findMany({
    include: {
      affectedEntity: {
        select: {
          id: true,
          name: true,
          type: true,
          latitude: true,
          longitude: true,
        },
      },
    },
  });

  // Transform assessments to match the expected interface
  const transformedAssessments = assessments.map(assessment => {
    // Determine verification status based on date
    const isPending = new Date(assessment.rapidAssessmentDate) > new Date();
    const verificationStatus = isPending ? 'PENDING' : 'VERIFIED';
    
    // Determine priority level based on assessment type
    const getPriorityLevel = (type: string) => {
      switch (type) {
        case 'HEALTH':
        case 'SECURITY':
          return 'CRITICAL';
        case 'FOOD':
        case 'WASH':
          return 'HIGH';
        case 'SHELTER':
          return 'MEDIUM';
        default:
          return 'LOW';
      }
    };

    // Generate coordinates data from affected entity
    const coordinates = {
      latitude: assessment.affectedEntity.latitude,
      longitude: assessment.affectedEntity.longitude,
      accuracy: 10, // Default accuracy
      timestamp: assessment.updatedAt ?? new Date(),
      captureMethod: 'GPS' as const,
    };

    return {
      id: assessment.id,
      type: assessment.rapidAssessmentType,
      date: assessment.rapidAssessmentDate,
      assessorName: assessment.assessorName,
      coordinates,
      entityName: assessment.affectedEntity.name || `${assessment.affectedEntity.type} Entity`,
      verificationStatus,
      priorityLevel: getPriorityLevel(assessment.rapidAssessmentType),
    };
  });

  // Calculate status and type breakdowns
  const statusBreakdown = {
    pending: transformedAssessments.filter(a => a.verificationStatus === 'PENDING').length,
    verified: transformedAssessments.filter(a => a.verificationStatus === 'VERIFIED').length,
    rejected: 0, // No rejected assessments in current data model
  };

  const typeBreakdown = transformedAssessments.reduce((acc, assessment) => {
    acc[assessment.type] = (acc[assessment.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    assessments: transformedAssessments,
    statusBreakdown,
    typeBreakdown,
  };
};

// GET /api/v1/monitoring/map/assessments - Get assessment locations with status indicators
export async function GET(request: NextRequest) {
  try {
    const { assessments, statusBreakdown, typeBreakdown } = await getMapAssessments();
    
    const connectionStatus = 'connected'; // Since we're using real data

    const response = {
      success: true,
      data: assessments,
      meta: {
        statusBreakdown,
        typeBreakdown,
        lastUpdate: new Date(),
        refreshInterval: 25, // 25 seconds - consistent with Story 6.1
        connectionStatus,
        dataSource: 'database',
      },
      message: 'Map assessments retrieved successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch map assessments:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch map assessments',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}