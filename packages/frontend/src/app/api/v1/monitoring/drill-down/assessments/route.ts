import { NextRequest, NextResponse } from 'next/server';

const assessmentTypes = ['GENERAL', 'SHELTER', 'HEALTHCARE', 'EDUCATION', 'WASH', 'LIVELIHOOD'] as const;
const verificationStatuses = ['PENDING', 'VERIFIED', 'AUTO_VERIFIED', 'REJECTED'] as const;
const entityTypes = ['CAMP', 'COMMUNITY'] as const;

// Mock detailed assessment data generator
const generateDetailedAssessments = (filters: any = {}) => {
  const assessments = [];
  const count = Math.floor(Math.random() * 50) + 20; // 20-70 assessments
  
  for (let i = 0; i < count; i++) {
    const type = assessmentTypes[Math.floor(Math.random() * assessmentTypes.length)];
    const verificationStatus = verificationStatuses[Math.floor(Math.random() * verificationStatuses.length)];
    const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)];
    
    const assessment = {
      id: `ASSESS-${String(i + 1).padStart(4, '0')}`,
      type,
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
      assessorName: `Assessor ${Math.floor(Math.random() * 10) + 1}`,
      verificationStatus,
      entityName: `${entityType === 'CAMP' ? 'Camp' : 'Community'} ${Math.floor(Math.random() * 100) + 1}`,
      entityType,
      coordinates: {
        latitude: 9.0 + Math.random() * 2, // Nigeria latitude range
        longitude: 7.0 + Math.random() * 7, // Nigeria longitude range
      },
      incidentName: Math.random() > 0.3 ? `Incident ${Math.floor(Math.random() * 5) + 1}` : undefined,
      dataDetails: {
        // Polymorphic assessment data based on type
        ...(type === 'SHELTER' && {
          shelterCount: Math.floor(Math.random() * 100) + 10,
          shelterCondition: ['GOOD', 'FAIR', 'POOR'][Math.floor(Math.random() * 3)],
          occupancyRate: Math.random() * 100,
        }),
        ...(type === 'HEALTHCARE' && {
          facilitiesOperational: Math.floor(Math.random() * 5) + 1,
          medicalSupplies: ['ADEQUATE', 'LOW', 'CRITICAL'][Math.floor(Math.random() * 3)],
          staffPresent: Math.floor(Math.random() * 20) + 5,
        }),
        ...(type === 'WASH' && {
          waterSources: Math.floor(Math.random() * 10) + 2,
          sanitationFacilities: Math.floor(Math.random() * 15) + 5,
          hygieneSupplies: ['ADEQUATE', 'LOW', 'CRITICAL'][Math.floor(Math.random() * 3)],
        }),
      },
      mediaCount: Math.floor(Math.random() * 8),
      syncStatus: ['PENDING', 'SYNCING', 'SYNCED', 'CONFLICT', 'FAILED'][Math.floor(Math.random() * 5)],
    };
    
    // Apply filters
    if (filters.incidentIds && filters.incidentIds.length > 0) {
      if (!assessment.incidentName || !filters.incidentIds.some((id: string) => assessment.incidentName?.includes(id))) {
        continue;
      }
    }
    
    if (filters.entityIds && filters.entityIds.length > 0) {
      if (!filters.entityIds.some((id: string) => assessment.entityName.includes(id))) {
        continue;
      }
    }
    
    if (filters.assessmentTypes && filters.assessmentTypes.length > 0) {
      if (!filters.assessmentTypes.includes(assessment.type)) {
        continue;
      }
    }
    
    if (filters.verificationStatus && filters.verificationStatus.length > 0) {
      if (!filters.verificationStatus.includes(assessment.verificationStatus)) {
        continue;
      }
    }
    
    if (filters.timeframe) {
      const assessmentDate = new Date(assessment.date);
      if (assessmentDate < new Date(filters.timeframe.start) || assessmentDate > new Date(filters.timeframe.end)) {
        continue;
      }
    }
    
    assessments.push(assessment);
  }
  
  return assessments;
};

// GET /api/v1/monitoring/drill-down/assessments - Get detailed assessment data with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filter parameters
    const incidentIds = searchParams.get('incidentIds')?.split(',').filter(Boolean);
    const entityIds = searchParams.get('entityIds')?.split(',').filter(Boolean);
    const filterAssessmentTypes = searchParams.get('assessmentTypes')?.split(',').filter(Boolean);
    const filterVerificationStatus = searchParams.get('verificationStatus')?.split(',').filter(Boolean);
    const timeframeStart = searchParams.get('timeframeStart');
    const timeframeEnd = searchParams.get('timeframeEnd');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const filters = {
      incidentIds,
      entityIds,
      assessmentTypes: filterAssessmentTypes,
      verificationStatus: filterVerificationStatus,
      timeframe: timeframeStart && timeframeEnd ? {
        start: timeframeStart,
        end: timeframeEnd,
      } : undefined,
    };
    
    const allAssessments = generateDetailedAssessments(filters);
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAssessments = allAssessments.slice(startIndex, endIndex);
    
    // Generate aggregations with defensive programming
    const aggregations = (() => {
      try {
        // Use the constant arrays, not the parsed query parameters
        const types = assessmentTypes || [];
        const statuses = verificationStatuses || [];
        
        return {
          byType: types.reduce((acc, type) => {
            acc[type] = allAssessments.filter(a => a.type === type).length;
            return acc;
          }, {} as Record<string, number>),
          byStatus: statuses.reduce((acc, status) => {
            acc[status] = allAssessments.filter(a => a.verificationStatus === status).length;
            return acc;
          }, {} as Record<string, number>),
          byEntity: allAssessments.reduce((acc, assessment) => {
            const entityName = assessment.entityName || 'Unknown';
            acc[entityName] = (acc[entityName] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        };
      } catch (error) {
        console.error('Aggregation calculation failed:', error);
        return {
          byType: {},
          byStatus: {},
          byEntity: {},
        };
      }
    })();
    
    const response = {
      success: true,
      data: paginatedAssessments,
      meta: {
        filters,
        totalRecords: allAssessments.length,
        page,
        limit,
        totalPages: Math.ceil(allAssessments.length / limit),
        aggregations,
        exportToken: `export-assessments-${Date.now()}`, // For export capability
        lastUpdate: new Date().toISOString(),
      },
      message: 'Detailed assessment data retrieved successfully',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch detailed assessments:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch detailed assessments',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}