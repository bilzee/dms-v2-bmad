import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import DatabaseService from '@/lib/services/DatabaseService';

interface EntityGap {
  entityId: string;
  entityName: string;
  assessmentAreas: {
    Health: 'red' | 'yellow' | 'green';
    WASH: 'red' | 'yellow' | 'green';
    Food: 'red' | 'yellow' | 'green';
    Shelter: 'red' | 'yellow' | 'green';
    Security: 'red' | 'yellow' | 'green';
  };
}

interface QuickStatistics {
  overallSeverity: {
    Health: 'red' | 'yellow' | 'green';
    WASH: 'red' | 'yellow' | 'green';
    Food: 'red' | 'yellow' | 'green';
    Shelter: 'red' | 'yellow' | 'green';
    Security: 'red' | 'yellow' | 'green';
  };
  totalCriticalGaps: number;
  totalModerateGaps: number;
  totalMinimalGaps: number;
}

interface GapsSummaryResponse {
  entityGaps: EntityGap[];
  quickStatistics: QuickStatistics;
}

const ASSESSMENT_AREAS = ['Health', 'WASH', 'Food', 'Shelter', 'Security'] as const;

// Helper function to check if gap analysis indicates a gap (red)
function hasResponseGap(gapAnalysis: any): boolean {
  if (!gapAnalysis) return false;
  return gapAnalysis.responseGap === true;
}

// Helper function to calculate entity area color based on gap analysis aggregation for that entity and area
async function calculateEntityAreaColor(entityId: string, area: string): Promise<'red' | 'yellow' | 'green'> {
  try {
    // Get all assessments for this entity and area to count gaps
    const assessments = await DatabaseService.prisma.rapidAssessment.findMany({
      where: {
        affectedEntityId: entityId,
        rapidAssessmentType: area,
      },
      include: {
        healthAssessment: true,
        foodAssessment: true,
        washAssessment: true,
        shelterAssessment: true,
        securityAssessment: true,
      },
    });

    // Get responses for this entity and area
    const responses = await DatabaseService.prisma.rapidResponse.findMany({
      where: {
        affectedEntityId: entityId,
        responseType: area,
      },
    });

    // Count red gaps (assessments with response gaps)
    let redGapCount = 0;
    
    for (const assessment of assessments) {
      // Find corresponding response
      const response = responses.find(r => 
        new Date(r.createdAt) >= new Date(assessment.createdAt)
      );
      
      // Calculate gap analysis
      const gapAnalysis = calculateGapAnalysis(assessment, response, area);
      
      // Count if this assessment has a response gap (red)
      if (hasResponseGap(gapAnalysis)) {
        redGapCount++;
      }
    }

    // Apply aggregation logic:
    // 1. If all gaps are green (no gaps) = green
    // 2. If only one gap is red = yellow (orange)  
    // 3. If more than one gap is red = red
    if (redGapCount === 0) {
      return 'green';
    } else if (redGapCount === 1) {
      return 'yellow'; // This represents orange in the UI
    } else {
      return 'red';
    }
  } catch (error) {
    console.error(`Failed to calculate entity area color for ${entityId}, ${area}:`, error);
    return 'green'; // Default to green on error
  }
}

// Helper function to get entities affected by an incident
async function getIncidentEntities(incidentId: string): Promise<any[]> {
  try {
    // Get entities directly affected by this specific incident
    const entities = await DatabaseService.prisma.affectedEntity.findMany({
      where: {
        incidentId: incidentId,
      },
    });

    return entities;
  } catch (error) {
    console.error('Failed to get incident entities:', error);
    return [];
  }
}


// Gap analysis calculation function (reused from breakdown API)
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
    let assessmentSeverity = 'MEDIUM';
    if (assessment.healthAssessment && (!assessment.healthAssessment.hasFunctionalClinic || !assessment.healthAssessment.hasMedicineSupply)) {
      assessmentSeverity = 'HIGH';
    } else if (assessment.washAssessment && (!assessment.washAssessment.isWaterSufficient || assessment.washAssessment.hasOpenDefecationConcerns)) {
      assessmentSeverity = 'HIGH';
    }
    
    return {
      responseGap: true,
      unmetNeeds: 100,
      responseTimestamp: now.toISOString(),
      gapSeverity: assessmentSeverity === 'HIGH' ? 'HIGH' as const : 'MEDIUM' as const,
    };
  }

  // Both assessment and response exist - analyze the gap
  const assessmentDate = new Date(assessment.rapidAssessmentDate || assessment.createdAt);
  const responseDate = new Date(response.timestamp || response.date || response.createdAt);
  
  const isResponseAfterAssessment = responseDate >= assessmentDate;
  const timeGapHours = Math.abs(responseDate.getTime() - assessmentDate.getTime()) / (1000 * 60 * 60);
  
  let responseGap = false;
  let gapSeverity: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  let unmetNeeds = 0;

  if (!isResponseAfterAssessment) {
    responseGap = true;
    gapSeverity = 'MEDIUM';
    unmetNeeds = 40;
  } else if (timeGapHours > 72) {
    responseGap = true;
    gapSeverity = 'HIGH';
    unmetNeeds = 60;
  } else if (timeGapHours > 24) {
    responseGap = true;
    gapSeverity = 'MEDIUM';
    unmetNeeds = 30;
  }

  return {
    responseGap,
    unmetNeeds,
    responseTimestamp: response.timestamp || response.date || response.createdAt || now.toISOString(),
    gapSeverity,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const incidentId = searchParams.get('incidentId');
    const entityIdsParam = searchParams.get('entityIds')?.split(',');

    if (!incidentId) {
      return NextResponse.json(
        { success: false, message: 'incidentId is required' },
        { status: 400 }
      );
    }

    // Verify incident exists
    const incident = await DatabaseService.getIncidentById(incidentId);
    if (!incident) {
      return NextResponse.json(
        { success: false, message: 'Incident not found' },
        { status: 404 }
      );
    }

    // Get entities affected by this incident
    let entities = await getIncidentEntities(incidentId);
    
    // Filter by specific entity IDs if provided
    if (entityIdsParam && entityIdsParam.length > 0) {
      entities = entities.filter(entity => entityIdsParam.includes(entity.id));
    }

    // Calculate gap analysis for each entity and assessment area using new aggregation logic
    const entityGaps: EntityGap[] = [];
    
    for (const entity of entities) {
      const assessmentAreas: EntityGap['assessmentAreas'] = {} as any;
      
      // Calculate color for each assessment area based on gap analysis aggregation
      for (const area of ASSESSMENT_AREAS) {
        assessmentAreas[area] = await calculateEntityAreaColor(entity.id, area);
      }
      
      entityGaps.push({
        entityId: entity.id,
        entityName: entity.name,
        assessmentAreas,
      });
    }

    // Calculate overall severity for Quick Statistics based on ALL entities' gap analysis aggregation
    const overallSeverity: QuickStatistics['overallSeverity'] = {} as any;
    
    for (const area of ASSESSMENT_AREAS) {
      // Count red gaps across ALL entities for this assessment area
      let totalRedGaps = 0;
      
      for (const entity of entities) {
        // Count gaps for this entity and area
        const assessments = await DatabaseService.prisma.rapidAssessment.findMany({
          where: {
            affectedEntityId: entity.id,
            rapidAssessmentType: area,
          },
          include: {
            healthAssessment: true,
            foodAssessment: true,
            washAssessment: true,
            shelterAssessment: true,
            securityAssessment: true,
          },
        });

        const responses = await DatabaseService.prisma.rapidResponse.findMany({
          where: {
            affectedEntityId: entity.id,
            responseType: area,
          },
        });

        // Count red gaps for this entity and area
        for (const assessment of assessments) {
          const response = responses.find(r => 
            new Date(r.createdAt) >= new Date(assessment.createdAt)
          );
          
          const gapAnalysis = calculateGapAnalysis(assessment, response, area);
          
          if (hasResponseGap(gapAnalysis)) {
            totalRedGaps++;
          }
        }
      }
      
      // Apply aggregation logic for overall severity:
      // 1. If all gaps are green (no gaps) = green
      // 2. If only one gap is red = yellow (orange)  
      // 3. If more than one gap is red = red
      if (totalRedGaps === 0) {
        overallSeverity[area] = 'green';
      } else if (totalRedGaps === 1) {
        overallSeverity[area] = 'yellow'; // This represents orange in the UI
      } else {
        overallSeverity[area] = 'red';
      }
    }

    // Count gaps by severity
    let totalCriticalGaps = 0;
    let totalModerateGaps = 0;
    let totalMinimalGaps = 0;

    entityGaps.forEach(entity => {
      ASSESSMENT_AREAS.forEach(area => {
        const severity = entity.assessmentAreas[area];
        if (severity === 'red') totalCriticalGaps++;
        else if (severity === 'yellow') totalModerateGaps++;
        else totalMinimalGaps++;
      });
    });

    const data: GapsSummaryResponse = {
      entityGaps,
      quickStatistics: {
        overallSeverity,
        totalCriticalGaps,
        totalModerateGaps,
        totalMinimalGaps,
      },
    };

    return NextResponse.json({
      success: true,
      data,
    });

  } catch (error) {
    console.error('Failed to fetch entity gaps summary:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}