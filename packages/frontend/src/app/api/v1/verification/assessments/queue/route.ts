import { NextRequest, NextResponse } from 'next/server';
import { 
  VerificationQueueRequest, 
  VerificationQueueResponse, 
  AssessmentVerificationQueueItem,
  AssessmentType,
  VerificationStatus
} from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Mock data for development
const mockQueueItems: AssessmentVerificationQueueItem[] = [
  {
    assessment: {
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
        additionalDetails: 'Urgent need for antimalarial drugs'
      } as any,
      mediaAttachments: [],
      createdAt: new Date('2025-01-20T10:30:00Z'),
      updatedAt: new Date('2025-01-20T10:30:00Z'),
    },
    affectedEntity: {
      id: 'entity-1',
      type: 'CAMP',
      name: 'Maiduguri IDP Camp',
      lga: 'Maiduguri',
      ward: 'Bulumkuttu',
      longitude: 13.1606,
      latitude: 11.8333,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    assessorName: 'Dr. Sarah Johnson',
    feedbackCount: 0,
    requiresAttention: false,
    priority: 'HIGH',
  },
  {
    assessment: {
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
      } as any,
      mediaAttachments: [],
      createdAt: new Date('2025-01-20T14:15:00Z'),
      updatedAt: new Date('2025-01-20T14:15:00Z'),
    },
    affectedEntity: {
      id: 'entity-2',
      type: 'COMMUNITY',
      name: 'Konduga Village',
      lga: 'Konduga',
      ward: 'Konduga',
      longitude: 13.5000,
      latitude: 11.9167,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    assessorName: 'Ibrahim Mohammed',
    feedbackCount: 2,
    lastFeedbackAt: new Date('2025-01-20T16:30:00Z'),
    requiresAttention: true,
    priority: 'MEDIUM',
  },
  {
    assessment: {
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
      } as any,
      mediaAttachments: [],
      createdAt: new Date('2025-01-19T09:00:00Z'),
      updatedAt: new Date('2025-01-19T09:00:00Z'),
    },
    affectedEntity: {
      id: 'entity-3',
      type: 'CAMP',
      name: 'Dalori IDP Camp',
      lga: 'Maiduguri',
      ward: 'Dalori',
      longitude: 13.2000,
      latitude: 11.7500,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    assessorName: 'Fatima Abubakar',
    feedbackCount: 1,
    lastFeedbackAt: new Date('2025-01-19T15:45:00Z'),
    requiresAttention: true,
    priority: 'HIGH',
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const requestData: VerificationQueueRequest = {
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      sortBy: (searchParams.get('sortBy') as any) || 'priority',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
      filters: searchParams.get('filters') ? JSON.parse(searchParams.get('filters')!) : {},
    };

    // Apply filters
    let filteredQueue = [...mockQueueItems];
    
    if (requestData.filters?.assessmentTypes?.length) {
      filteredQueue = filteredQueue.filter(item => 
        requestData.filters!.assessmentTypes!.includes(item.assessment.type)
      );
    }
    
    if (requestData.filters?.verificationStatus?.length) {
      filteredQueue = filteredQueue.filter(item => 
        requestData.filters!.verificationStatus!.includes(item.assessment.verificationStatus)
      );
    }
    
    if (requestData.filters?.priority?.length) {
      filteredQueue = filteredQueue.filter(item => 
        requestData.filters!.priority!.includes(item.priority)
      );
    }

    // Apply sorting
    filteredQueue.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (requestData.sortBy) {
        case 'priority':
          const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder];
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder];
          break;
        case 'date':
          aValue = new Date(a.assessment.date).getTime();
          bValue = new Date(b.assessment.date).getTime();
          break;
        case 'type':
          aValue = a.assessment.type;
          bValue = b.assessment.type;
          break;
        case 'assessor':
          aValue = a.assessorName;
          bValue = b.assessorName;
          break;
        default:
          aValue = a.assessment.date;
          bValue = b.assessment.date;
      }
      
      if (requestData.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Apply pagination
    const totalCount = filteredQueue.length;
    const totalPages = Math.ceil(totalCount / requestData.pageSize);
    const start = (requestData.page - 1) * requestData.pageSize;
    const end = start + requestData.pageSize;
    const paginatedQueue = filteredQueue.slice(start, end);

    // Calculate stats
    const queueStats = {
      totalPending: filteredQueue.filter(item => item.assessment.verificationStatus === VerificationStatus.PENDING).length,
      highPriority: filteredQueue.filter(item => item.priority === 'HIGH').length,
      requiresAttention: filteredQueue.filter(item => item.requiresAttention).length,
      byAssessmentType: filteredQueue.reduce((acc, item) => {
        acc[item.assessment.type] = (acc[item.assessment.type] || 0) + 1;
        return acc;
      }, {} as Record<AssessmentType, number>),
    };

    const response: VerificationQueueResponse = {
      success: true,
      data: {
        queue: paginatedQueue,
        queueStats,
        pagination: {
          page: requestData.page,
          pageSize: requestData.pageSize,
          totalPages,
          totalCount,
        },
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Verification queue API error:', error);
    
    const errorResponse: VerificationQueueResponse = {
      success: false,
      data: {
        queue: [],
        queueStats: {
          totalPending: 0,
          highPriority: 0,
          requiresAttention: 0,
          byAssessmentType: {} as Record<AssessmentType, number>,
        },
        pagination: {
          page: 1,
          pageSize: 20,
          totalPages: 0,
          totalCount: 0,
        },
      },
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
