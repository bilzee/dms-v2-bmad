import { NextRequest, NextResponse } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';

export const dynamic = 'force-dynamic';

const ASSESSMENT_AREAS = ['Health', 'WASH', 'Food', 'Shelter', 'Security'] as const; // Population removed - used in left panel

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const incidentId = url.searchParams.get('incidentId');
    const entityId = url.searchParams.get('entityId');
    const assessmentAreasParam = url.searchParams.get('assessmentAreas');

    if (!incidentId || !entityId) {
      return NextResponse.json({
        success: false,
        data: null,
        errors: ['incidentId and entityId are required'],
        message: 'Invalid request parameters',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Parse requested assessment areas or use all
    const requestedAreas = assessmentAreasParam 
      ? assessmentAreasParam.split(',').filter(area => ASSESSMENT_AREAS.includes(area as any))
      : [...ASSESSMENT_AREAS];

    // Verify incident exists
    const incident = await DatabaseService.getIncidentById(incidentId);
    if (!incident) {
      return NextResponse.json({
        success: false,
        data: null,
        errors: ['Incident not found'],
        message: `Incident with ID ${incidentId} does not exist`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // Get rapid assessment data using Prisma directly
    let assessments: any[] = [];
    let responses: any[] = [];

    try {
      if (entityId === 'all') {
        // Get all entities for the incident (we'll need to determine incident-entity relationships differently)
        // For now, get all rapid assessments from all entities
        assessments = await DatabaseService.prisma.rapidAssessment.findMany({
          include: {
            affectedEntity: true,
            healthAssessment: true,
            foodAssessment: true,
            washAssessment: true,
            shelterAssessment: true,
            securityAssessment: true
          }
        });

        // Get responses for all entities that have assessments
        responses = await DatabaseService.prisma.rapidResponse.findMany({
          where: {
            affectedEntityId: {
              in: assessments.map(a => a.affectedEntityId)
            }
          }
        });
      } else {
        // Get assessments for specific entity
        assessments = await DatabaseService.prisma.rapidAssessment.findMany({
          where: {
            affectedEntityId: entityId
          },
          include: {
            affectedEntity: true,
            healthAssessment: true,
            foodAssessment: true,
            washAssessment: true,
            shelterAssessment: true,
            securityAssessment: true
          }
        });

        // Get responses for this entity
        responses = await DatabaseService.prisma.rapidResponse.findMany({
          where: {
            affectedEntityId: entityId
          }
        });
      }
    } catch (dbError) {
      console.warn('Database query failed:', dbError);
      // Continue with empty arrays - graceful degradation
    }

    // Process each assessment area
    const assessmentAreas = requestedAreas.map(area => {
      // Find all assessments for this area
      const areaAssessments = assessments.filter((a: any) => 
        a.rapidAssessmentType === area
      );

      if (entityId === 'all') {
        // Aggregate all assessments for this area
        const aggregatedData = aggregateAssessmentData(areaAssessments, area);
        const latestTimestamp = areaAssessments.length > 0 
          ? areaAssessments.reduce((latest: any, current: any) => 
              new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
            ).rapidAssessmentDate || areaAssessments[0].createdAt
          : new Date().toISOString();

        return {
          area,
          latestAssessment: {
            timestamp: latestTimestamp,
            data: aggregatedData.data,
          },
          gapAnalysis: {
            responseGap: false,
            unmetNeeds: 0,
            responseTimestamp: new Date().toISOString(),
            gapSeverity: 'LOW' as const,
            gapData: aggregatedData.gapData,
          },
        };
      } else {
        // Single entity logic (existing)
        const latestAssessment = areaAssessments.length > 0 
          ? areaAssessments.reduce((latest: any, current: any) => 
              new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
            )
          : null;

        // Find latest response for this area - use responseType field
        const areaResponses = responses.filter((r: any) => 
          r.responseType === area
        );
        
        const latestResponse = areaResponses.length > 0
          ? areaResponses.reduce((latest: any, current: any) => 
              new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
            )
          : null;

        // Calculate gap analysis
        const gapAnalysis = calculateGapAnalysis(latestAssessment, latestResponse, area);
        const assessmentData = formatRapidAssessmentData(latestAssessment, area);
        
        return {
          area,
          latestAssessment: {
            timestamp: assessmentData.timestamp,
            data: assessmentData.data,
          },
          gapAnalysis: {
            ...gapAnalysis,
            gapData: assessmentData.gapData,
          },
        };
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        assessmentAreas,
        entityId,
        incidentId,
        incidentName: incident.name,
      },
      message: `Successfully retrieved assessment breakdown for ${requestedAreas.length} areas`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to fetch assessment breakdown:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to fetch assessment breakdown'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

function aggregateAssessmentData(assessments: any[], area: string) {
  if (assessments.length === 0) {
    return {
      data: [],
      gapData: [],
    };
  }

  let data: string[] = [];
  let gapData: string[] = [];

  // Aggregation logic based on assessment type
  switch (area) {
    case 'Health':
      const healthAssessments = assessments.filter(a => a.healthAssessment).map(a => a.healthAssessment);
      if (healthAssessments.length > 0) {
        const totalFacilities = healthAssessments.reduce((sum, h) => sum + (h.numberHealthFacilities || 0), 0);
        const totalWorkers = healthAssessments.reduce((sum, h) => sum + (h.qualifiedHealthWorkers || 0), 0);
        
        data = [
          `Health Facilities: ${totalFacilities}`,
          `Qualified Health Workers: ${totalWorkers}`,
        ];

        // Boolean aggregation with counts
        const medicineNotAvailable = healthAssessments.filter(h => !h.hasMedicineSupply).length;
        const medicalSuppliesNotAvailable = healthAssessments.filter(h => !h.hasMedicalSupplies).length;
        const maternalServicesNotAvailable = healthAssessments.filter(h => !h.hasMaternalChildServices).length;
        const medicineAvailable = healthAssessments.filter(h => h.hasMedicineSupply).length;
        const medicalSuppliesAvailable = healthAssessments.filter(h => h.hasMedicalSupplies).length;
        const maternalServicesAvailable = healthAssessments.filter(h => h.hasMaternalChildServices).length;

        gapData = [];
        if (medicineNotAvailable > 0) gapData.push(`Medicine Supply: Not available x${medicineNotAvailable}`);
        if (medicineAvailable > 0) gapData.push(`Medicine Supply: Available x${medicineAvailable}`);
        if (medicalSuppliesNotAvailable > 0) gapData.push(`Medical Supplies: Not available x${medicalSuppliesNotAvailable}`);
        if (medicalSuppliesAvailable > 0) gapData.push(`Medical Supplies: Available x${medicalSuppliesAvailable}`);
        if (maternalServicesNotAvailable > 0) gapData.push(`Maternal & Child Services: Not available x${maternalServicesNotAvailable}`);
        if (maternalServicesAvailable > 0) gapData.push(`Maternal & Child Services: Available x${maternalServicesAvailable}`);
      }
      break;

    case 'WASH':
      const washAssessments = assessments.filter(a => a.washAssessment).map(a => a.washAssessment);
      if (washAssessments.length > 0) {
        const totalLatrines = washAssessments.reduce((sum, w) => sum + (w.functionalLatrinesAvailable || 0), 0);
        
        data = [
          `Functional Latrines Available: ${totalLatrines}`,
        ];

        // Boolean aggregation
        const waterNotSufficient = washAssessments.filter(w => !w.isWaterSufficient).length;
        const waterSufficient = washAssessments.filter(w => w.isWaterSufficient).length;
        const latrinesNotSufficient = washAssessments.filter(w => !w.areLatrinesSufficient).length;
        const latrinesSufficient = washAssessments.filter(w => w.areLatrinesSufficient).length;
        const defecationConcernsYes = washAssessments.filter(w => w.hasOpenDefecationConcerns).length;
        const defecationConcernsNo = washAssessments.filter(w => !w.hasOpenDefecationConcerns).length;

        gapData = [];
        if (waterNotSufficient > 0) gapData.push(`Water Sufficient: No x${waterNotSufficient}`);
        if (waterSufficient > 0) gapData.push(`Water Sufficient: Yes x${waterSufficient}`);
        if (latrinesNotSufficient > 0) gapData.push(`Latrines Sufficient: No x${latrinesNotSufficient}`);
        if (latrinesSufficient > 0) gapData.push(`Latrines Sufficient: Yes x${latrinesSufficient}`);
        if (defecationConcernsYes > 0) gapData.push(`Open Defecation Concerns: Yes x${defecationConcernsYes}`);
        if (defecationConcernsNo > 0) gapData.push(`Open Defecation Concerns: No x${defecationConcernsNo}`);
      }
      break;

    case 'Shelter':
      const shelterAssessments = assessments.filter(a => a.shelterAssessment).map(a => a.shelterAssessment);
      if (shelterAssessments.length > 0) {
        const totalSheltersRequired = shelterAssessments.reduce((sum, s) => sum + (s.numberSheltersRequired || 0), 0);
        
        data = [
          `Additional Shelters Required: ${totalSheltersRequired}`,
        ];

        // Boolean aggregation
        const sheltersNotSufficient = shelterAssessments.filter(s => !s.areSheltersSufficient).length;
        const sheltersSufficient = shelterAssessments.filter(s => s.areSheltersSufficient).length;
        const overcrowdedYes = shelterAssessments.filter(s => s.areOvercrowded).length;
        const overcrowdedNo = shelterAssessments.filter(s => !s.areOvercrowded).length;
        const weatherProtectionYes = shelterAssessments.filter(s => s.provideWeatherProtection).length;
        const weatherProtectionNo = shelterAssessments.filter(s => !s.provideWeatherProtection).length;

        gapData = [];
        if (sheltersNotSufficient > 0) gapData.push(`Shelters Sufficient: No x${sheltersNotSufficient}`);
        if (sheltersSufficient > 0) gapData.push(`Shelters Sufficient: Yes x${sheltersSufficient}`);
        if (overcrowdedYes > 0) gapData.push(`Overcrowded: Yes x${overcrowdedYes}`);
        if (overcrowdedNo > 0) gapData.push(`Overcrowded: No x${overcrowdedNo}`);
        if (weatherProtectionNo > 0) gapData.push(`Weather Protection: No x${weatherProtectionNo}`);
        if (weatherProtectionYes > 0) gapData.push(`Weather Protection: Yes x${weatherProtectionYes}`);
      }
      break;

    case 'Security':
      const securityAssessments = assessments.filter(a => a.securityAssessment).map(a => a.securityAssessment);
      if (securityAssessments.length > 0) {
        const gbvCasesYes = securityAssessments.filter(s => s.gbvCasesReported).length;
        const gbvCasesNo = securityAssessments.filter(s => !s.gbvCasesReported).length;
        
        data = [];
        if (gbvCasesYes > 0) data.push(`GBV Cases Reported: Yes x${gbvCasesYes}`);
        if (gbvCasesNo > 0) data.push(`GBV Cases Reported: No x${gbvCasesNo}`);

        // Boolean aggregation
        const protectionNotAvailable = securityAssessments.filter(s => !s.hasProtectionReportingMechanism).length;
        const protectionAvailable = securityAssessments.filter(s => s.hasProtectionReportingMechanism).length;
        const accessNo = securityAssessments.filter(s => !s.vulnerableGroupsHaveAccess).length;
        const accessYes = securityAssessments.filter(s => s.vulnerableGroupsHaveAccess).length;

        gapData = [];
        if (protectionNotAvailable > 0) gapData.push(`Protection Reporting Mechanism: Not available x${protectionNotAvailable}`);
        if (protectionAvailable > 0) gapData.push(`Protection Reporting Mechanism: Available x${protectionAvailable}`);
        if (accessNo > 0) gapData.push(`Vulnerable Groups Have Access: No x${accessNo}`);
        if (accessYes > 0) gapData.push(`Vulnerable Groups Have Access: Yes x${accessYes}`);
      }
      break;

    case 'Food':
      const foodAssessments = assessments.filter(a => a.foodAssessment).map(a => a.foodAssessment);
      if (foodAssessments.length > 0) {
        const totalDurationDays = foodAssessments.reduce((sum, f) => sum + (f.availableFoodDurationDays || 0), 0);
        const avgDurationDays = Math.round(totalDurationDays / foodAssessments.length);
        
        data = [
          `Average Food Duration Available: ${avgDurationDays} days`,
        ];

        // Numerical aggregation
        const totalFoodPersons = foodAssessments.reduce((sum, f) => sum + (f.additionalFoodRequiredPersons || 0), 0);
        const totalFoodHouseholds = foodAssessments.reduce((sum, f) => sum + (f.additionalFoodRequiredHouseholds || 0), 0);

        gapData = [];
        if (totalFoodPersons > 0) gapData.push(`Additional Food Needed: ${totalFoodPersons} persons`);
        if (totalFoodHouseholds > 0) gapData.push(`Additional Food Needed: ${totalFoodHouseholds} households`);
      }
      break;
  }

  return {
    data,
    gapData,
  };
}

function formatRapidAssessmentData(assessment: any, area: string) {
  if (!assessment) {
    return {
      timestamp: new Date().toISOString(),
      data: [],
      gapData: [],
    };
  }

  let data: string[] = [];
  let gapData: string[] = [];

  // Extract specific data points based on assessment type
  switch (area) {
    case 'Health':
      if (assessment.healthAssessment) {
        const health = assessment.healthAssessment;
        data = [
          `Health Facilities: ${health.numberHealthFacilities}`,
          `Facility Type: ${health.healthFacilityType}`,
          `Qualified Health Workers: ${health.qualifiedHealthWorkers}`,
          `Common Health Issues: ${health.commonHealthIssues.join(', ')}`
        ];
        gapData = [
          `Medicine Supply: ${health.hasMedicineSupply ? 'Available' : 'Not available'}`,
          `Medical Supplies: ${health.hasMedicalSupplies ? 'Available' : 'Not available'}`,
          `Maternal & Child Services: ${health.hasMaternalChildServices ? 'Available' : 'Not available'}`
        ];
      }
      break;
    case 'WASH':
      if (assessment.washAssessment) {
        const wash = assessment.washAssessment;
        data = [
          `Water Sources: ${wash.waterSource.join(', ')}`,
          `Functional Latrines Available: ${wash.functionalLatrinesAvailable}`
        ];
        gapData = [
          `Water Sufficient: ${wash.isWaterSufficient ? 'Yes' : 'No'}`,
          `Latrines Sufficient: ${wash.areLatrinesSufficient ? 'Yes' : 'No'}`,
          `Open Defecation Concerns: ${wash.hasOpenDefecationConcerns ? 'Yes' : 'No'}`
        ];
      }
      break;
    case 'Shelter':
      if (assessment.shelterAssessment) {
        const shelter = assessment.shelterAssessment;
        data = [
          `Shelter Types: ${shelter.shelterTypes.join(', ')}`,
          `Required Shelter Types: ${shelter.requiredShelterType.join(', ')}`
        ];
        gapData = [
          `Shelters Sufficient: ${shelter.areSheltersSufficient ? 'Yes' : 'No'}`,
          `Additional Shelters Required: ${shelter.numberSheltersRequired}`,
          `Overcrowded: ${shelter.areOvercrowded ? 'Yes' : 'No'}`,
          `Weather Protection: ${shelter.provideWeatherProtection ? 'Yes' : 'No'}`
        ];
      }
      break;
    case 'Security':
      if (assessment.securityAssessment) {
        const security = assessment.securityAssessment;
        data = [
          `GBV Cases Reported: ${security.gbvCasesReported ? 'Yes' : 'No'}`
        ];
        gapData = [
          `Protection Reporting Mechanism: ${security.hasProtectionReportingMechanism ? 'Available' : 'Not available'}`,
          `Vulnerable Groups Have Access: ${security.vulnerableGroupsHaveAccess ? 'Yes' : 'No'}`
        ];
      }
      break;
    case 'Food':
      if (assessment.foodAssessment) {
        const food = assessment.foodAssessment;
        data = [
          `Food Sources: ${food.foodSource.join(', ')}`,
          `Available Food Duration: ${food.availableFoodDurationDays} days`
        ];
        gapData = [
          `Additional Food Needed: ${food.additionalFoodRequiredPersons} persons`,
          `Additional Food Needed: ${food.additionalFoodRequiredHouseholds} households`
        ];
      }
      break;
  }

  return {
    timestamp: assessment.rapidAssessmentDate || assessment.createdAt || new Date().toISOString(),
    data,
    gapData,
  };
}

function calculateGapAnalysis(assessment: any, response: any, area: string) {
  const now = new Date();
  
  // Default values for when no data is available
  if (!assessment && !response) {
    return {
      responseGap: false,
      unmetNeeds: 0,
      responseTimestamp: now.toISOString(),
      gapSeverity: 'LOW' as const,
    };
  }

  // If no assessment but there's a response, assume minimal gap
  if (!assessment && response) {
    return {
      responseGap: false,
      unmetNeeds: 0,
      responseTimestamp: response.timestamp || response.date || response.createdAt || now.toISOString(),
      gapSeverity: 'LOW' as const,
    };
  }

  // If assessment exists but no response, there's definitely a gap
  if (assessment && !response) {
    // Determine severity from the assessment area
    let assessmentSeverity = 'MEDIUM';
    if (assessment.healthAssessment && (!assessment.healthAssessment.hasFunctionalClinic || !assessment.healthAssessment.hasMedicineSupply)) {
      assessmentSeverity = 'HIGH';
    } else if (assessment.washAssessment && (!assessment.washAssessment.isWaterSufficient || assessment.washAssessment.hasOpenDefecationConcerns)) {
      assessmentSeverity = 'HIGH';
    }
    
    return {
      responseGap: true,
      unmetNeeds: 100, // 100% unmet if no response
      responseTimestamp: now.toISOString(), // No response timestamp
      gapSeverity: assessmentSeverity === 'CRITICAL' ? 'HIGH' as const :
                   assessmentSeverity === 'HIGH' ? 'HIGH' as const :
                   'MEDIUM' as const,
    };
  }

  // Both assessment and response exist - analyze the gap
  const assessmentDate = new Date(assessment.rapidAssessmentDate || assessment.createdAt);
  const responseDate = new Date(response.timestamp || response.date || response.createdAt);
  
  // Check if response is after assessment (good)
  const isResponseAfterAssessment = responseDate >= assessmentDate;
  
  // Calculate time gap (in hours)
  const timeGapHours = Math.abs(responseDate.getTime() - assessmentDate.getTime()) / (1000 * 60 * 60);
  
  // Determine if there's a response gap based on various factors
  let responseGap = false;
  let gapSeverity: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  let unmetNeeds = 0;

  // Gap analysis logic
  if (!isResponseAfterAssessment) {
    // Response predates assessment - might be outdated
    responseGap = true;
    gapSeverity = 'MEDIUM';
    unmetNeeds = 40;
  } else if (timeGapHours > 72) {
    // Response is too long after assessment
    responseGap = true;
    gapSeverity = 'HIGH';
    unmetNeeds = 60;
  } else if (timeGapHours > 24) {
    // Delayed response
    responseGap = true;
    gapSeverity = 'MEDIUM';
    unmetNeeds = 30;
  }

  // Adjust based on severity levels - extract from rapid assessment data
  let assessmentSeverity = 'MEDIUM';
  if (assessment.healthAssessment && (!assessment.healthAssessment.hasFunctionalClinic || !assessment.healthAssessment.hasMedicineSupply)) {
    assessmentSeverity = 'HIGH';
  } else if (assessment.washAssessment && (!assessment.washAssessment.isWaterSufficient || assessment.washAssessment.hasOpenDefecationConcerns)) {
    assessmentSeverity = 'HIGH';
  }
  
  const responseMagnitude = response.magnitude || response.scale || response.coverage || 'PARTIAL';

  if (assessmentSeverity === 'CRITICAL' && responseMagnitude.toUpperCase() !== 'FULL') {
    responseGap = true;
    gapSeverity = 'HIGH';
    unmetNeeds = Math.max(unmetNeeds, 50);
  }

  return {
    responseGap,
    unmetNeeds,
    responseTimestamp: response.timestamp || response.date || response.createdAt || now.toISOString(),
    gapSeverity,
  };
}