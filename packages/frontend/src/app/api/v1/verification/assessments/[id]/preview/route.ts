import { NextRequest, NextResponse } from 'next/server';
import { RapidAssessment, AssessmentType, VerificationStatus } from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Mock assessment data for development
const mockAssessments: Record<string, RapidAssessment> = {
  '1': {
    id: '1',
    type: AssessmentType.HEALTH,
    date: new Date('2025-01-20T10:30:00Z'),
    affectedEntityId: 'entity-1',
    assessorName: 'Dr. Sarah Johnson',
    assessorId: 'assessor-1',
    verificationStatus: VerificationStatus.PENDING,
    syncStatus: 'SYNCED' as any,
    data: {
      hasFunctionalClinic: true,
      numberHealthFacilities: 2,
      healthFacilityType: 'Primary Health Center',
      qualifiedHealthWorkers: 5,
      hasMedicineSupply: false,
      hasMedicalSupplies: true,
      hasMaternalChildServices: true,
      commonHealthIssues: ['Malaria', 'Diarrhea', 'Respiratory infections'],
      additionalDetails: 'Urgent need for antimalarial drugs. The clinic is operational but lacks essential medicines.'
    } as any,
    mediaAttachments: [
      {
        id: 'media-1',
        url: '/api/placeholder-image-1.jpg',
        thumbnailUrl: '/api/placeholder-thumb-1.jpg',
        mimeType: 'image/jpeg',
        size: 245760,
        metadata: {
          timestamp: new Date('2025-01-20T10:35:00Z'),
          gpsCoordinates: {
            latitude: 11.8333,
            longitude: 13.1606,
            accuracy: 5,
            timestamp: new Date('2025-01-20T10:35:00Z'),
            captureMethod: 'GPS',
          }
        }
      },
      {
        id: 'media-2',
        url: '/api/placeholder-image-2.jpg',
        thumbnailUrl: '/api/placeholder-thumb-2.jpg',
        mimeType: 'image/jpeg',
        size: 189440,
        metadata: {
          timestamp: new Date('2025-01-20T10:40:00Z'),
          gpsCoordinates: {
            latitude: 11.8333,
            longitude: 13.1606,
            accuracy: 5,
            timestamp: new Date('2025-01-20T10:40:00Z'),
            captureMethod: 'GPS',
          }
        }
      }
    ],
    createdAt: new Date('2025-01-20T10:30:00Z'),
    updatedAt: new Date('2025-01-20T10:30:00Z'),
  },
  '2': {
    id: '2',
    type: AssessmentType.WASH,
    date: new Date('2025-01-20T14:15:00Z'),
    affectedEntityId: 'entity-2',
    assessorName: 'Ibrahim Mohammed',
    assessorId: 'assessor-2',
    verificationStatus: VerificationStatus.PENDING,
    syncStatus: 'SYNCED' as any,
    data: {
      isWaterSufficient: false,
      waterSource: ['Borehole', 'Trucked water'],
      waterQuality: 'Safe',
      hasToilets: true,
      numberToilets: 15,
      toiletType: 'Pit latrine',
      hasSolidWasteDisposal: false,
      hasHandwashingFacilities: true,
      additionalDetails: 'Water supply is insufficient for the population. Need additional water trucking twice daily.'
    } as any,
    mediaAttachments: [
      {
        id: 'media-3',
        url: '/api/placeholder-image-3.jpg',
        thumbnailUrl: '/api/placeholder-thumb-3.jpg',
        mimeType: 'image/jpeg',
        size: 198720,
        metadata: {
          timestamp: new Date('2025-01-20T14:20:00Z'),
        }
      }
    ],
    createdAt: new Date('2025-01-20T14:15:00Z'),
    updatedAt: new Date('2025-01-20T14:15:00Z'),
  },
  '3': {
    id: '3',
    type: AssessmentType.FOOD,
    date: new Date('2025-01-19T09:00:00Z'),
    affectedEntityId: 'entity-3',
    assessorName: 'Fatima Abubakar',
    assessorId: 'assessor-3',
    verificationStatus: VerificationStatus.PENDING,
    syncStatus: 'SYNCED' as any,
    data: {
      foodSource: ['WFP distribution', 'Local market'],
      availableFoodDurationDays: 3,
      additionalFoodRequiredPersons: 150,
      additionalFoodRequiredHouseholds: 25,
      malnutritionCases: 8,
      feedingProgramExists: false,
      additionalDetails: 'Critical food shortage. Several children showing signs of malnutrition. Immediate intervention required.'
    } as any,
    mediaAttachments: [],
    createdAt: new Date('2025-01-19T09:00:00Z'),
    updatedAt: new Date('2025-01-19T09:00:00Z'),
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assessmentId = params.id;
    
    if (!assessmentId) {
      return NextResponse.json(
        { success: false, error: 'Assessment ID is required' },
        { status: 400 }
      );
    }

    // In a real implementation, this would fetch from database
    const assessment = mockAssessments[assessmentId];
    
    if (!assessment) {
      return NextResponse.json(
        { success: false, error: 'Assessment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: assessment,
    });

  } catch (error) {
    console.error('Assessment preview API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}