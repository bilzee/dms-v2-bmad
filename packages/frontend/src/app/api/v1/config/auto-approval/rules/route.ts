import { NextRequest, NextResponse } from 'next/server';
import { 
  AutoApprovalRulesRequest, 
  AutoApprovalRulesResponse,
  AutoApprovalConfig,
  AutoApprovalRule 
} from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// GET /api/v1/config/auto-approval/rules - Get current auto-approval configuration
export async function GET(request: NextRequest): Promise<NextResponse<AutoApprovalRulesResponse>> {
  try {
    // TODO: Replace with actual database query
    // This would typically fetch from a database or configuration store
    const mockConfig: AutoApprovalConfig = {
      enabled: true,
      rules: [
        {
          id: 'rule-health-basic',
          type: 'ASSESSMENT',
          assessmentType: 'HEALTH',
          enabled: true,
          qualityThresholds: {
            dataCompletenessPercentage: 85,
            requiredFieldsComplete: true,
            hasMediaAttachments: false,
            gpsAccuracyMeters: 10,
          },
          conditions: [
            {
              field: 'hasFunctionalClinic',
              operator: 'exists',
              value: true,
              weight: 8,
            },
            {
              field: 'qualifiedHealthWorkers',
              operator: 'greater_than',
              value: 0,
              weight: 6,
            }
          ],
          priority: 1,
          createdBy: 'system',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date(),
        }
      ],
      globalSettings: {
        maxAutoApprovalsPerHour: 50,
        requireCoordinatorOnline: true,
        emergencyOverrideEnabled: true,
        auditLogRetentionDays: 30,
      },
      coordinatorId: 'coordinator-1',
      lastUpdated: new Date(),
    };

    return NextResponse.json<AutoApprovalRulesResponse>({
      success: true,
      data: {
        rulesCreated: 0,
        rulesUpdated: 0,
        configId: 'config-1',
        config: mockConfig,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });

  } catch (error) {
    console.error('Failed to fetch auto-approval rules:', error);
    return NextResponse.json<AutoApprovalRulesResponse>(
      {
        success: false,
        error: 'Failed to fetch auto-approval configuration',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      },
      { status: 500 }
    );
  }
}

// POST /api/v1/config/auto-approval/rules - Create/update auto-approval rules
export async function POST(request: NextRequest): Promise<NextResponse<AutoApprovalRulesResponse>> {
  try {
    const body: AutoApprovalRulesRequest = await request.json();

    // Validate request body
    if (!body.rules || !Array.isArray(body.rules)) {
      return NextResponse.json<AutoApprovalRulesResponse>(
        {
          success: false,
          error: 'Invalid request body: rules array is required',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
        },
        { status: 400 }
      );
    }

    // Validate individual rules
    const validationErrors: string[] = [];
    body.rules.forEach((rule, index) => {
      if (!rule.type || !['ASSESSMENT', 'RESPONSE'].includes(rule.type)) {
        validationErrors.push(`Rule ${index}: Invalid type`);
      }
      if (!rule.qualityThresholds) {
        validationErrors.push(`Rule ${index}: Quality thresholds are required`);
      }
      if (rule.qualityThresholds?.dataCompletenessPercentage < 0 || 
          rule.qualityThresholds?.dataCompletenessPercentage > 100) {
        validationErrors.push(`Rule ${index}: Data completeness percentage must be between 0-100`);
      }
    });

    if (validationErrors.length > 0) {
      return NextResponse.json<AutoApprovalRulesResponse>(
        {
          success: false,
          error: 'Validation failed',
          data: {
            rulesCreated: 0,
            rulesUpdated: 0,
            configId: '',
            validationErrors,
          },
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
        },
        { status: 400 }
      );
    }

    // TODO: Replace with actual database operations
    // This would typically:
    // 1. Validate coordinator permissions
    // 2. Save rules to database
    // 3. Update configuration cache
    // 4. Notify auto-approval engine of changes

    // Mock response simulating successful creation/update
    const rulesCreated = body.rules.filter(rule => !rule.id).length;
    const rulesUpdated = body.rules.filter(rule => rule.id).length;

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return NextResponse.json<AutoApprovalRulesResponse>({
      success: true,
      data: {
        rulesCreated,
        rulesUpdated,
        configId: `config-${Date.now()}`,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });

  } catch (error) {
    console.error('Failed to create/update auto-approval rules:', error);
    return NextResponse.json<AutoApprovalRulesResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      },
      { status: 500 }
    );
  }
}

// PUT /api/v1/config/auto-approval/rules - Update existing auto-approval rules
export async function PUT(request: NextRequest): Promise<NextResponse<AutoApprovalRulesResponse>> {
  // For this implementation, PUT is handled the same as POST
  // In a real implementation, you might want different behavior
  return POST(request);
}
