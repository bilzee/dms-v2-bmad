import { NextRequest, NextResponse } from 'next/server';
import { VerificationStatus, SyncStatus, type RapidAssessment } from '@dms/shared';

// Mock data for demonstration - replace with actual database queries
const generateMockAssessments = (userId?: string): RapidAssessment[] => {
  const now = new Date();
  const mockAssessments: RapidAssessment[] = [
    {
      id: 'assessment-1',
      type: 'HEALTH',
      date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      affectedEntityId: 'entity-1',
      assessorName: 'Dr. Jane Smith',
      assessorId: userId || 'assessor-1',
      verificationStatus: VerificationStatus.REJECTED,
      syncStatus: SyncStatus.SYNCED,
      data: {
        hasFunctionalClinic: true,
        numberHealthFacilities: 2,
        healthFacilityType: 'Basic Health Unit',
        qualifiedHealthWorkers: 5,
        hasMedicineSupply: false,
        hasMedicalSupplies: true,
        hasMaternalChildServices: true,
        commonHealthIssues: ['Malaria', 'Diarrhea', 'Malnutrition'],
        additionalDetails: 'Urgent need for medical supplies'
      },
      mediaAttachments: [
        {
          id: 'media-1',
          mimeType: 'image/jpeg',
          size: 1024000,
          metadata: {
            timestamp: new Date(),
            gpsCoordinates: {
              latitude: 9.0579,
              longitude: 7.4951,
              accuracy: 5,
              timestamp: new Date(),
              captureMethod: 'GPS'
            }
          }
        }
      ],
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'assessment-2',
      type: 'WASH',
      date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      affectedEntityId: 'entity-2',
      assessorName: 'John Doe',
      assessorId: userId || 'assessor-1',
      verificationStatus: VerificationStatus.PENDING,
      syncStatus: SyncStatus.SYNCED,
      data: {
        isWaterSufficient: false,
        waterSource: ['Borehole', 'River'],
        waterQuality: 'Contaminated',
        hasToilets: true,
        numberToilets: 4,
        toiletType: 'Pit latrine',
        hasSolidWasteDisposal: false,
        hasHandwashingFacilities: true,
        additionalDetails: 'Water treatment needed urgently'
      },
      mediaAttachments: [],
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'assessment-3',
      type: 'SHELTER',
      date: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
      affectedEntityId: 'entity-3',
      assessorName: 'Sarah Johnson',
      assessorId: userId || 'assessor-2',
      verificationStatus: VerificationStatus.VERIFIED,
      syncStatus: SyncStatus.SYNCED,
      data: {
        areSheltersSufficient: true,
        shelterTypes: ['Tarpaulin', 'Mud house'],
        numberShelters: 150,
        shelterCondition: 'Fair',
        needsRepair: true,
        needsTarpaulin: false,
        needsBedding: true,
        additionalDetails: 'Overall condition is acceptable'
      },
      mediaAttachments: [
        {
          id: 'media-2',
          mimeType: 'image/jpeg',
          size: 2048000,
          metadata: {
            timestamp: new Date(),
            gpsCoordinates: {
              latitude: 9.0579,
              longitude: 7.4951,
              accuracy: 3,
              timestamp: new Date(),
              captureMethod: 'GPS'
            }
          }
        },
        {
          id: 'media-3',
          mimeType: 'image/jpeg',
          size: 1536000,
          metadata: {
            timestamp: new Date(),
          }
        }
      ],
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000)
    },
    {
      id: 'assessment-4',
      type: 'PRELIMINARY',
      date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      affectedEntityId: 'entity-4',
      assessorName: 'Michael Chen',
      assessorId: userId || 'assessor-1',
      verificationStatus: VerificationStatus.AUTO_VERIFIED,
      syncStatus: SyncStatus.SYNCED,
      data: {
        incidentType: 'FLOOD',
        incidentSubType: 'Flash Flood',
        severity: 'SEVERE',
        affectedPopulationEstimate: 2500,
        affectedHouseholdsEstimate: 500,
        immediateNeedsDescription: 'Emergency shelter, clean water, and medical supplies',
        accessibilityStatus: 'PARTIALLY_ACCESSIBLE',
        priorityLevel: 'HIGH',
        additionalDetails: 'Bridge destroyed, helicopter access only'
      },
      mediaAttachments: [],
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)
    }
  ];

  return mockAssessments;
};

interface StatusResponse {
  data: RapidAssessment[];
  meta: {
    totalCount: number;
    pendingCount: number;
    rejectedCount: number;
    verifiedCount: number;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as VerificationStatus | 'ALL' | null;
    const userId = searchParams.get('userId') || 'current-user';

    // Get all assessments for the user
    const allAssessments = generateMockAssessments(userId);

    // Filter by status if specified
    let filteredAssessments = allAssessments;
    if (status && status !== 'ALL') {
      filteredAssessments = allAssessments.filter(assessment => 
        assessment.verificationStatus === status
      );
    }

    // Calculate counts
    const totalCount = allAssessments.length;
    const pendingCount = allAssessments.filter(a => a.verificationStatus === VerificationStatus.PENDING).length;
    const rejectedCount = allAssessments.filter(a => a.verificationStatus === VerificationStatus.REJECTED).length;
    const verifiedCount = allAssessments.filter(a => 
      a.verificationStatus === VerificationStatus.VERIFIED || 
      a.verificationStatus === VerificationStatus.AUTO_VERIFIED
    ).length;

    const response: StatusResponse = {
      data: filteredAssessments,
      meta: {
        totalCount,
        pendingCount,
        rejectedCount,
        verifiedCount,
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching assessment status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessment status' },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}