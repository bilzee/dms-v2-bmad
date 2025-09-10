import { NextRequest, NextResponse } from 'next/server';
import { AutoApprovalStatsResponse } from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// GET /api/v1/verification/auto-approval/stats - Get auto-approval statistics
export async function GET(request: NextRequest): Promise<NextResponse<AutoApprovalStatsResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Validate time range parameter
    const validTimeRanges = ['1h', '24h', '7d', '30d', 'custom'];
    if (!validTimeRanges.includes(timeRange)) {
      return NextResponse.json(
        {
          success: false,
          errors: [`Invalid time range. Must be one of: ${validTimeRanges.join(', ')}`],
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
        } as any,
        { status: 400 }
      );
    }

    // For custom time range, validate dates
    if (timeRange === 'custom') {
      if (!startDate || !endDate) {
        return NextResponse.json(
          {
            success: false,
            errors: ['Start date and end date are required for custom time range'],
            meta: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
            },
          } as any,
          { status: 400 }
        );
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json(
          {
            success: false,
            errors: ['Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)'],
            meta: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
            },
          } as any,
          { status: 400 }
        );
      }

      if (start >= end) {
        return NextResponse.json(
          {
            success: false,
            errors: ['Start date must be before end date'],
            meta: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
            },
          } as any,
          { status: 400 }
        );
      }
    }

    // TODO: Replace with actual database queries
    // This would typically:
    // 1. Query verification records within the time range
    // 2. Calculate auto-approval statistics
    // 3. Analyze rule performance
    // 4. Count overrides and their reasons
    // 5. Calculate processing time metrics

    // Mock data generation based on time range
    const getStatsByTimeRange = (range: string) => {
      switch (range) {
        case '1h':
          return {
            totalAutoApproved: 23,
            totalItems: 31,
            averageProcessingTime: 2.3,
            overridesCount: 1,
          };
        case '24h':
          return {
            totalAutoApproved: 156,
            totalItems: 203,
            averageProcessingTime: 3.7,
            overridesCount: 7,
          };
        case '7d':
          return {
            totalAutoApproved: 892,
            totalItems: 1134,
            averageProcessingTime: 4.2,
            overridesCount: 23,
          };
        case '30d':
          return {
            totalAutoApproved: 3421,
            totalItems: 4567,
            averageProcessingTime: 5.1,
            overridesCount: 89,
          };
        default:
          return {
            totalAutoApproved: 45,
            totalItems: 62,
            averageProcessingTime: 3.2,
            overridesCount: 3,
          };
      }
    };

    const baseStats = getStatsByTimeRange(timeRange);
    const autoApprovalRate = (baseStats.totalAutoApproved / baseStats.totalItems) * 100;

    // Mock rule performance data
    const mockRulePerformance = [
      {
        ruleId: 'rule-health-basic',
        applicationsCount: Math.floor(baseStats.totalAutoApproved * 0.4),
        successRate: 92.5,
      },
      {
        ruleId: 'rule-wash-standard',
        applicationsCount: Math.floor(baseStats.totalAutoApproved * 0.3),
        successRate: 87.8,
      },
      {
        ruleId: 'rule-shelter-emergency',
        applicationsCount: Math.floor(baseStats.totalAutoApproved * 0.2),
        successRate: 94.2,
      },
      {
        ruleId: 'rule-food-distribution',
        applicationsCount: Math.floor(baseStats.totalAutoApproved * 0.1),
        successRate: 89.1,
      },
    ];

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 50));

    const displayTimeRange = timeRange === 'custom' 
      ? `${startDate} to ${endDate}`
      : `Last ${timeRange}`;

    return NextResponse.json<AutoApprovalStatsResponse>({
      success: true,
      data: {
        totalAutoApproved: baseStats.totalAutoApproved,
        autoApprovalRate: Math.round(autoApprovalRate * 10) / 10, // Round to 1 decimal
        averageProcessingTime: baseStats.averageProcessingTime,
        rulePerformance: mockRulePerformance,
        overridesCount: baseStats.overridesCount,
        timeRange: displayTimeRange,
      },
    } as any);

  } catch (error) {
    console.error('Failed to fetch auto-approval statistics:', error);
    return NextResponse.json(
      {
        success: false,
        errors: [error instanceof Error ? error.message : 'Internal server error'],
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      } as any,
      { status: 500 }
    );
  }
}