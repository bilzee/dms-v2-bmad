import { NextRequest, NextResponse } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Helper function to build where clause for assessments
function buildAssessmentWhereClause(filters: any) {
  const where: any = {};

  if (filters.incidentIds && filters.incidentIds.length > 0) {
    where.affectedEntity = {
      incidentId: { in: filters.incidentIds }
    };
  }

  if (filters.entityIds && filters.entityIds.length > 0) {
    // Entity names are passed instead of IDs, so filter by entity name
    where.affectedEntity = {
      name: { in: filters.entityIds }
    };
  }

  // Note: assessment type filtering will be done in JavaScript after fetching data
  // since the database doesn't have a single assessmentType field

  // Note: verificationStatus filtering will be done in JavaScript after fetching data
  // since verificationStatus field might not be in the Prisma schema yet

  if (filters.timeframe) {
    where.rapidAssessmentDate = {
      gte: new Date(filters.timeframe.start),
      lte: new Date(filters.timeframe.end)
    };
  }

  return where;
}

// Helper function to extract assessment-specific data and determine types
function extractAssessmentData(assessment: any) {
  const dataDetails: any = {};
  const assessmentTypes: string[] = [];

  // Extract population assessment data
  if (assessment.populationAssessment) {
    dataDetails.population = {
      totalPopulation: assessment.populationAssessment.totalPopulation,
      totalHouseholds: assessment.populationAssessment.totalHouseholds,
      numberLivesLost: assessment.populationAssessment.numberLivesLost,
      numberInjured: assessment.populationAssessment.numberInjured,
      numberMissing: assessment.populationAssessment.numberMissing,
      numberDisplaced: assessment.populationAssessment.numberDisplaced,
      mostVulnerableGroups: assessment.populationAssessment.mostVulnerableGroups,
    };
    assessmentTypes.push('POPULATION');
  }

  // Extract shelter assessment data
  if (assessment.shelterAssessment) {
    dataDetails.shelter = {
      numberSheltersDamaged: assessment.shelterAssessment.numberSheltersDamaged,
      numberSheltersDestroyed: assessment.shelterAssessment.numberSheltersDestroyed,
      householdsAffected: assessment.shelterAssessment.householdsAffected,
      numberSheltersRequired: assessment.shelterAssessment.numberSheltersRequired,
      immediateShelterNeeds: assessment.shelterAssessment.immediateShelterNeeds,
    };
    assessmentTypes.push('SHELTER');
  }

  // Extract health assessment data
  if (assessment.healthAssessment) {
    dataDetails.health = {
      healthFacilitiesDamaged: assessment.healthAssessment.healthFacilitiesDamaged,
      healthFacilitiesOperational: assessment.healthAssessment.healthFacilitiesOperational,
      diseaseOutbreaksReported: assessment.healthAssessment.diseaseOutbreaksReported,
      medicalSupplies: assessment.healthAssessment.medicalSupplies,
      medicalStaffAvailable: assessment.healthAssessment.medicalStaffAvailable,
      immediateHealthNeeds: assessment.healthAssessment.immediateHealthNeeds,
    };
    assessmentTypes.push('HEALTH');
  }

  // Extract WASH assessment data
  if (assessment.washAssessment) {
    dataDetails.wash = {
      waterSourcesDamaged: assessment.washAssessment.waterSourcesDamaged,
      waterSourcesFunctional: assessment.washAssessment.waterSourcesFunctional,
      sanitationFacilitiesDamaged: assessment.washAssessment.sanitationFacilitiesDamaged,
      waterQuality: assessment.washAssessment.waterQuality,
      hygieneConditions: assessment.washAssessment.hygieneConditions,
      immediateWASHNeeds: assessment.washAssessment.immediateWASHNeeds,
    };
    assessmentTypes.push('WASH');
  }

  // Extract food assessment data
  if (assessment.foodAssessment) {
    dataDetails.food = {
      foodSecurityLevel: assessment.foodAssessment.foodSecurityLevel,
      householdsFoodInsecure: assessment.foodAssessment.householdsFoodInsecure,
      foodStocksAvailable: assessment.foodAssessment.foodStocksAvailable,
      marketAccess: assessment.foodAssessment.marketAccess,
      immediateFoodNeeds: assessment.foodAssessment.immediateFoodNeeds,
    };
    assessmentTypes.push('FOOD');
  }

  // Extract security assessment data
  if (assessment.securityAssessment) {
    dataDetails.security = {
      securitySituation: assessment.securityAssessment.securitySituation,
      accessConstraints: assessment.securityAssessment.accessConstraints,
      protectionRisks: assessment.securityAssessment.protectionRisks,
      incidentsReported: assessment.securityAssessment.incidentsReported,
      immediateSecurityNeeds: assessment.securityAssessment.immediateSecurityNeeds,
    };
    assessmentTypes.push('SECURITY');
  }

  // Add assessment types to the returned data
  dataDetails.assessmentTypes = assessmentTypes;
  
  return dataDetails;
}

// GET /api/v1/monitoring/drill-down/assessments - Get detailed assessment data with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filter parameters
    const incidentIds = searchParams.get('incidentIds')?.split(',').filter(Boolean);
    const entityIds = searchParams.get('entityIds')?.split(',').filter(Boolean);
    const filterAssessmentTypes = searchParams.get('assessmentTypes')?.split(',').filter(Boolean);
    const verificationStatus = searchParams.get('verificationStatus')?.split(',').filter(Boolean);
    const timeframeStart = searchParams.get('timeframeStart');
    const timeframeEnd = searchParams.get('timeframeEnd');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const filters = {
      incidentIds,
      entityIds,
      assessmentTypes: filterAssessmentTypes,
      verificationStatus,
      timeframe: timeframeStart && timeframeEnd ? {
        start: timeframeStart,
        end: timeframeEnd,
      } : undefined,
    };
    
    const where = buildAssessmentWhereClause(filters);
    
    // Get assessments with related data from database
    const assessments = await DatabaseService.prisma.rapidAssessment.findMany({
      where,
      include: {
        affectedEntity: {
          include: {
            incident: true
          }
        },
        populationAssessment: true,
        shelterAssessment: true,
        healthAssessment: true,
        washAssessment: true,
        foodAssessment: true,
        securityAssessment: true,
      },
      orderBy: {
        rapidAssessmentDate: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    // Get total count for pagination
    const totalRecords = await DatabaseService.prisma.rapidAssessment.count({ where });
    
    // Transform assessments to expected format and apply assessment type filtering
    let transformedAssessments = assessments.map(assessment => {
      const assessmentData = extractAssessmentData(assessment);
      return {
        id: assessment.id,
        type: assessmentData.assessmentTypes?.[0] || 'UNKNOWN', // Use first assessment type
        types: assessmentData.assessmentTypes || [], // Include all types
        date: assessment.rapidAssessmentDate,
        assessorName: assessment.assessorName || 'Unknown',
        verificationStatus: 'VERIFIED', // Default status since field doesn't exist in database
        entityName: assessment.affectedEntity?.name || 'Unknown Entity',
        entityType: assessment.affectedEntity?.type || 'COMMUNITY',
        coordinates: assessment.affectedEntity ? {
          latitude: assessment.affectedEntity.latitude,
          longitude: assessment.affectedEntity.longitude,
        } : { latitude: 0, longitude: 0 },
        incidentName: assessment.affectedEntity?.incident?.name,
        dataDetails: assessmentData,
        mediaCount: 0, // Media count not available in current schema
        syncStatus: 'SYNCED', // Sync status not available in current schema
      };
    });

    // Apply assessment type filtering if specified
    if (filters.assessmentTypes && filters.assessmentTypes.length > 0) {
      transformedAssessments = transformedAssessments.filter(assessment => 
        assessment.types && assessment.types.some((type: string) => 
          filters.assessmentTypes!.includes(type)
        )
      );
    }

    // Apply verification status filtering if specified
    if (filters.verificationStatus && filters.verificationStatus.length > 0) {
      transformedAssessments = transformedAssessments.filter(assessment => 
        assessment.verificationStatus && filters.verificationStatus!.includes(assessment.verificationStatus)
      );
    }

    // Generate aggregations
    const aggregations = await DatabaseService.getAssessmentAggregations(where);
    
    const response = {
      success: true,
      data: transformedAssessments,
      meta: {
        filters,
        totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
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
      data: null,
      errors: ['Failed to fetch detailed assessments'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}