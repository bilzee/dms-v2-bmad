import { NextRequest, NextResponse } from 'next/server';
import { 
  ApiResponse, 
  RapidResponse, 
  RapidAssessment, 
  ResponseVerificationMetrics,
  DeliveryItem,
  VarianceFlag,
  ResponseType
} from '@dms/shared';

interface DeliveryComparisonResponse extends ApiResponse<{
  responseId: string;
  assessment: {
    id: string;
    type: string;
    data: any;
    needs: DeliveryItem[];
  };
  plannedResponse: {
    items: DeliveryItem[];
    beneficiaries: number;
    plannedDate: Date;
  };
  actualResponse: {
    items: DeliveryItem[];
    beneficiaries: number;
    deliveredDate: Date | null;
  };
  variance: {
    overall: number;
    byItem: VarianceFlag[];
    recommendations: string[];
  };
  metrics: ResponseVerificationMetrics;
}> {}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<DeliveryComparisonResponse>> {
  try {
    const responseId = params.id;
    
    if (!responseId) {
      return NextResponse.json({
        success: false,
        message: 'Response ID is required',
        data: null,
        errors: ['Response ID parameter is missing'],
      } as DeliveryComparisonResponse, { status: 400 });
    }

    // TODO: Add authentication middleware to verify coordinator role
    // For now, we'll mock the database operations

    // Mock: Get response and related assessment
    const mockResponse: Partial<RapidResponse> = {
      id: responseId,
      responseType: ResponseType.HEALTH,
      verificationStatus: 'PENDING',
      plannedDate: new Date('2024-01-15T09:00:00Z'),
      deliveredDate: new Date('2024-01-15T10:30:00Z'),
      assessmentId: 'assessment-123',
    };

    const mockAssessment: Partial<RapidAssessment> = {
      id: 'assessment-123',
      type: 'HEALTH',
      date: new Date('2024-01-14T14:00:00Z'),
      data: {
        // Mock health assessment data
        hasFunctionalClinic: false,
        numberHealthFacilities: 1,
        healthFacilityType: 'Primary Health Center',
        qualifiedHealthWorkers: 2,
        hasMedicineSupply: false,
        hasMedicalSupplies: false,
        hasMaternalChildServices: true,
        commonHealthIssues: ['Malaria', 'Diarrhea', 'Malnutrition'],
        additionalDetails: 'Urgent need for medical supplies and medicines',
      },
    };

    if (!mockResponse || !mockAssessment) {
      return NextResponse.json({
        success: false,
        message: 'Response or related assessment not found',
        data: null,
        errors: ['Response or assessment data is missing'],
      } as DeliveryComparisonResponse, { status: 404 });
    }

    // Mock planned items based on assessment needs
    const plannedItems: DeliveryItem[] = [
      {
        itemType: ResponseType.HEALTH,
        plannedQuantity: 100,
        actualQuantity: 85,
        unit: 'medical kits',
        variance: -15,
        verified: false,
      },
    ];

    const actualItems: DeliveryItem[] = [
      {
        itemType: ResponseType.HEALTH,
        plannedQuantity: 100,
        actualQuantity: 85,
        unit: 'medical kits',
        variance: -15,
        verified: false,
      },
    ];

    // Calculate variance flags
    const varianceFlags: VarianceFlag[] = [];
    
    plannedItems.forEach(planned => {
      const actual = actualItems.find(a => a.itemType === planned.itemType);
      if (actual) {
        const variance = Math.abs(actual.actualQuantity - planned.plannedQuantity) / planned.plannedQuantity * 100;
        
        if (variance > 15) {
          varianceFlags.push({
            type: 'QUANTITY',
            severity: variance > 30 ? 'HIGH' : 'MEDIUM',
            description: `${planned.itemType} delivery variance: ${variance.toFixed(1)}%`,
            threshold: 15,
            actual: variance,
          });
        }
      }
    });

    // Mock beneficiary data
    const plannedBeneficiaries = 250;
    const actualBeneficiaries = 230;
    const beneficiaryVariance = Math.abs(actualBeneficiaries - plannedBeneficiaries) / plannedBeneficiaries * 100;
    
    if (beneficiaryVariance > 10) {
      varianceFlags.push({
        type: 'BENEFICIARY',
        severity: beneficiaryVariance > 25 ? 'HIGH' : 'MEDIUM',
        description: `Beneficiary count variance: ${beneficiaryVariance.toFixed(1)}%`,
        threshold: 10,
        actual: beneficiaryVariance,
      });
    }

    // Calculate overall completeness
    const overallCompleteness = plannedItems.reduce((sum, item) => {
      const actual = actualItems.find(a => a.itemType === item.itemType);
      return sum + (actual ? (actual.actualQuantity / item.plannedQuantity) * 100 : 0);
    }, 0) / plannedItems.length;

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (varianceFlags.some(f => f.type === 'QUANTITY' && f.severity === 'HIGH')) {
      recommendations.push('Review delivery planning process to reduce quantity discrepancies');
    }
    
    if (varianceFlags.some(f => f.type === 'BENEFICIARY' && f.severity === 'MEDIUM')) {
      recommendations.push('Improve beneficiary counting and verification methods');
    }
    
    if (overallCompleteness < 85) {
      recommendations.push('Investigate delivery completion issues and resource availability');
    }

    // Create verification metrics
    const metrics: ResponseVerificationMetrics = {
      responseId,
      plannedItems,
      actualItems,
      plannedBeneficiaries,
      actualBeneficiaries,
      deliveryCompleteness: overallCompleteness,
      varianceFlags,
      verificationNotes: '',
      photosVerified: false,
      locationVerified: true,
      timestampVerified: true,
    };

    const response: DeliveryComparisonResponse = {
      success: true,
      message: 'Delivery comparison data retrieved successfully',
      data: {
        responseId,
        assessment: {
          id: mockAssessment.id!,
          type: mockAssessment.type!,
          data: mockAssessment.data,
          needs: plannedItems, // Derived from assessment data
        },
        plannedResponse: {
          items: plannedItems,
          beneficiaries: plannedBeneficiaries,
          plannedDate: mockResponse.plannedDate!,
        },
        actualResponse: {
          items: actualItems,
          beneficiaries: actualBeneficiaries,
          deliveredDate: mockResponse.deliveredDate!,
        },
        variance: {
          overall: overallCompleteness,
          byItem: varianceFlags,
          recommendations,
        },
        metrics,
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error retrieving delivery comparison:', error);
    
    const errorResponse: DeliveryComparisonResponse = {
      success: false,
      message: 'Internal server error occurred while retrieving delivery comparison',
      data: null,
      errors: ['An unexpected error occurred. Please try again later.'],
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET to retrieve delivery comparison.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET to retrieve delivery comparison.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET to retrieve delivery comparison.' },
    { status: 405 }
  );
}