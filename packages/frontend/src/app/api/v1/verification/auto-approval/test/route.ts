import { NextRequest, NextResponse } from 'next/server';
import { 
  AutoApprovalRule,
  ApiResponse,
  AssessmentType,
  ResponseType,
  RapidAssessment,
  RapidResponse
} from '@dms/shared';

interface AutoApprovalTestRequest {
  rules: AutoApprovalRule[];
  sampleSize?: number;
  targetType?: 'ASSESSMENT' | 'RESPONSE' | 'BOTH';
  useHistoricalData?: boolean;
}

interface AutoApprovalTestResponse extends ApiResponse<{
  testId: string;
  totalSamples: number;
  rulesExecuted: number;
  results: Array<{
    ruleId: string;
    ruleName: string;
    matched: number;
    qualified: number;
    matchRate: number;
    qualificationRate: number;
    averageScore: number;
    sampleMatches: Array<{
      itemId: string;
      itemType: string;
      matched: boolean;
      qualified: boolean;
      score: number;
      reasons: string[];
    }>;
  }>;
  overallStats: {
    totalMatched: number;
    totalQualified: number;
    averageMatchRate: number;
    averageQualificationRate: number;
  };
  recommendations: string[];
}> {}

// POST /api/v1/verification/auto-approval/test - Test auto-approval rules
export async function POST(request: NextRequest): Promise<NextResponse<AutoApprovalTestResponse>> {
  try {
    const body: AutoApprovalTestRequest = await request.json();

    // Validate request body
    if (!body.rules || !Array.isArray(body.rules) || body.rules.length === 0) {
      return NextResponse.json<AutoApprovalTestResponse>(
        {
          success: false,
          error: 'Rules array is required and cannot be empty',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
        },
        { status: 400 }
      );
    }

    const sampleSize = body.sampleSize || 50;
    const targetType = body.targetType || 'BOTH';
    const useHistoricalData = body.useHistoricalData !== false;

    if (sampleSize < 1 || sampleSize > 1000) {
      return NextResponse.json<AutoApprovalTestResponse>(
        {
          success: false,
          error: 'Sample size must be between 1 and 1000',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
        },
        { status: 400 }
      );
    }

    // TODO: Replace with actual data fetching
    // In a real implementation, this would:
    // 1. Fetch sample data from database
    // 2. Apply each rule to the sample data
    // 3. Calculate match and qualification rates
    // 4. Generate recommendations based on results

    // Generate mock sample data
    const generateMockAssessment = (id: string): Partial<RapidAssessment> => ({
      id,
      type: Object.values(AssessmentType)[Math.floor(Math.random() * Object.values(AssessmentType).length)],
      assessorName: `Assessor ${Math.floor(Math.random() * 100)}`,
      data: {
        // Mock assessment data - would be more complete in real implementation
        hasFunctionalClinic: Math.random() > 0.3,
        qualifiedHealthWorkers: Math.floor(Math.random() * 10),
        completeness: Math.random() * 100,
      } as any,
      mediaAttachments: Math.random() > 0.5 ? [{ id: 'photo1', url: 'mock.jpg' }] : [],
    });

    const generateMockResponse = (id: string): Partial<RapidResponse> => ({
      id,
      responseType: Object.values(ResponseType)[Math.floor(Math.random() * Object.values(ResponseType).length)],
      responderName: `Responder ${Math.floor(Math.random() * 100)}`,
      data: {
        // Mock response data - would be more complete in real implementation
        completeness: Math.random() * 100,
        verified: Math.random() > 0.2,
      } as any,
      deliveryEvidence: Math.random() > 0.4 ? [{ id: 'evidence1', url: 'mock.jpg' }] : [],
    });

    // Generate sample data
    const samples: Array<{ item: Partial<RapidAssessment> | Partial<RapidResponse>, type: 'ASSESSMENT' | 'RESPONSE' }> = [];
    
    for (let i = 0; i < sampleSize; i++) {
      if (targetType === 'BOTH') {
        const type = Math.random() > 0.5 ? 'ASSESSMENT' : 'RESPONSE';
        samples.push({
          item: type === 'ASSESSMENT' ? generateMockAssessment(`sample-${i}`) : generateMockResponse(`sample-${i}`),
          type,
        });
      } else {
        samples.push({
          item: targetType === 'ASSESSMENT' ? generateMockAssessment(`sample-${i}`) : generateMockResponse(`sample-${i}`),
          type: targetType,
        });
      }
    }

    // Test each rule against the sample data
    const ruleResults = body.rules.map(rule => {
      const applicableSamples = samples.filter(sample => 
        (rule.type === 'ASSESSMENT' && sample.type === 'ASSESSMENT') ||
        (rule.type === 'RESPONSE' && sample.type === 'RESPONSE')
      );

      const sampleMatches = applicableSamples.map(sample => {
        // Mock rule evaluation - in real implementation, this would evaluate actual rule conditions
        const matched = Math.random() > 0.3; // 70% match rate
        const qualified = matched && Math.random() > 0.2; // 80% of matches qualify
        const score = matched ? 60 + Math.random() * 40 : Math.random() * 60; // Score 0-100
        
        const reasons = [];
        if (!matched) {
          reasons.push('Does not match rule criteria');
        } else {
          if (qualified) {
            reasons.push('Meets all quality thresholds');
          } else {
            reasons.push('Below quality threshold');
          }
        }

        return {
          itemId: sample.item.id!,
          itemType: sample.type,
          matched,
          qualified,
          score: Math.round(score * 10) / 10,
          reasons,
        };
      });

      const matchedCount = sampleMatches.filter(m => m.matched).length;
      const qualifiedCount = sampleMatches.filter(m => m.qualified).length;
      const averageScore = sampleMatches.reduce((sum, m) => sum + m.score, 0) / sampleMatches.length;

      return {
        ruleId: rule.id,
        ruleName: `${rule.type} ${rule.assessmentType || rule.responseType} Rule`,
        matched: matchedCount,
        qualified: qualifiedCount,
        matchRate: applicableSamples.length > 0 ? (matchedCount / applicableSamples.length) * 100 : 0,
        qualificationRate: applicableSamples.length > 0 ? (qualifiedCount / applicableSamples.length) * 100 : 0,
        averageScore: Math.round(averageScore * 10) / 10,
        sampleMatches: sampleMatches.slice(0, 10), // Return first 10 samples for preview
      };
    });

    // Calculate overall stats
    const totalMatched = ruleResults.reduce((sum, r) => sum + r.matched, 0);
    const totalQualified = ruleResults.reduce((sum, r) => sum + r.qualified, 0);
    const averageMatchRate = ruleResults.length > 0 
      ? ruleResults.reduce((sum, r) => sum + r.matchRate, 0) / ruleResults.length
      : 0;
    const averageQualificationRate = ruleResults.length > 0
      ? ruleResults.reduce((sum, r) => sum + r.qualificationRate, 0) / ruleResults.length
      : 0;

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (averageMatchRate < 50) {
      recommendations.push('Consider relaxing rule criteria to increase match rate');
    }
    if (averageQualificationRate < 70) {
      recommendations.push('Quality thresholds may be too strict - consider adjusting');
    }
    if (ruleResults.some(r => r.averageScore < 60)) {
      recommendations.push('Some rules consistently produce low scores - review rule logic');
    }
    if (ruleResults.length > 5) {
      recommendations.push('Consider consolidating rules to reduce complexity');
    }

    if (recommendations.length === 0) {
      recommendations.push('Rules appear to be well-configured for your data');
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return NextResponse.json<AutoApprovalTestResponse>({
      success: true,
      data: {
        testId,
        totalSamples: sampleSize,
        rulesExecuted: body.rules.length,
        results: ruleResults,
        overallStats: {
          totalMatched,
          totalQualified,
          averageMatchRate: Math.round(averageMatchRate * 10) / 10,
          averageQualificationRate: Math.round(averageQualificationRate * 10) / 10,
        },
        recommendations,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        testParameters: {
          sampleSize,
          targetType,
          useHistoricalData,
        },
      },
    });

  } catch (error) {
    console.error('Failed to test auto-approval rules:', error);
    return NextResponse.json<AutoApprovalTestResponse>(
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