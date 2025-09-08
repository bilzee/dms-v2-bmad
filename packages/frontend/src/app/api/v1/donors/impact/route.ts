import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Impact metrics interface
interface ImpactMetrics {
  donorId: string;
  totalBeneficiariesHelped: number;
  beneficiariesByResponseType: Record<string, number>;
  geographicImpact: {
    locationsServed: number;
    coverageAreaKm2: number;
    regions: Array<{
      name: string;
      beneficiaries: number;
      deliveries: number;
      responseTypes: string[];
    }>;
  };
  impactOverTime: Array<{
    date: string;
    cumulativeBeneficiaries: number;
    newBeneficiaries: number;
    deliveries: number;
  }>;
  effectivenessMetrics: {
    needFulfillmentRate: number; // Percentage of assessed needs met
    responseTimeHours: number; // Average time from commitment to delivery
    verificationRate: number; // Percentage of deliveries verified
  };
}

// Query parameters validation schema
const impactQuerySchema = z.object({
  period: z.enum(['30', '90', '365', 'all']).optional().default('all'),
  responseType: z.string().optional(),
  region: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      period: searchParams.get('period') || 'all',
      responseType: searchParams.get('responseType') || undefined,
      region: searchParams.get('region') || undefined,
    };

    // Validate query parameters
    const validatedParams = impactQuerySchema.parse(queryParams);

    // Calculate date range for period filtering
    const periodDays = validatedParams.period === 'all' ? 365 : parseInt(validatedParams.period);
    const startDate = validatedParams.period === 'all' 
      ? new Date('1900-01-01') 
      : new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    // Build where clause for filtering
    const whereClause: any = {
      donorId: session.user.id,
      status: 'DELIVERED',
      deliveredDate: {
        gte: startDate
      }
    };

    if (validatedParams.responseType) {
      whereClause.responseType = validatedParams.responseType;
    }

    // Fetch verified commitments with location data
    const commitments = await prisma.donorCommitment.findMany({
      where: whereClause,
      include: {
        rapidResponse: {
          where: { verificationStatus: 'VERIFIED' },
          include: {
            affectedEntity: true
          }
        }
      },
      orderBy: { deliveredDate: 'asc' }
    });

    // Calculate impact metrics from real data
    let totalBeneficiariesHelped = 0;
    const beneficiariesByResponseType: Record<string, number> = {};
    const locationsServed = new Set<string>();
    const regionData: Record<string, {beneficiaries: number, deliveries: number, responseTypes: Set<string>}> = {};

    commitments.forEach(commitment => {
      if (commitment.rapidResponse?.data) {
        const responseData = commitment.rapidResponse.data as any;
        let beneficiaries = 0;

        // Extract beneficiaries from response data
        if (responseData.personsServed) beneficiaries += responseData.personsServed;
        if (responseData.householdsServed) beneficiaries += responseData.householdsServed * 4;

        totalBeneficiariesHelped += beneficiaries;

        // Track by response type
        if (!beneficiariesByResponseType[commitment.responseType]) {
          beneficiariesByResponseType[commitment.responseType] = 0;
        }
        beneficiariesByResponseType[commitment.responseType] += beneficiaries;

        // Track geographic impact
        if (commitment.rapidResponse.affectedEntity) {
          const location = `${commitment.rapidResponse.affectedEntity.lga}-${commitment.rapidResponse.affectedEntity.ward}`;
          locationsServed.add(location);

          const region = commitment.rapidResponse.affectedEntity.lga;
          if (!regionData[region]) {
            regionData[region] = { beneficiaries: 0, deliveries: 0, responseTypes: new Set() };
          }
          regionData[region].beneficiaries += beneficiaries;
          regionData[region].deliveries++;
          regionData[region].responseTypes.add(commitment.responseType);
        }
      }
    });

    // Build impact timeline
    const impactTimeline: any[] = [];
    const groupedByMonth = new Map<string, {newBeneficiaries: number, deliveries: number}>();
    
    commitments.forEach(commitment => {
      if (commitment.deliveredDate && commitment.rapidResponse?.data) {
        const monthKey = `${commitment.deliveredDate.getFullYear()}-${String(commitment.deliveredDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!groupedByMonth.has(monthKey)) {
          groupedByMonth.set(monthKey, { newBeneficiaries: 0, deliveries: 0 });
        }
        
        const responseData = commitment.rapidResponse.data as any;
        let beneficiaries = 0;
        if (responseData.personsServed) beneficiaries += responseData.personsServed;
        if (responseData.householdsServed) beneficiaries += responseData.householdsServed * 4;
        
        const group = groupedByMonth.get(monthKey)!;
        group.newBeneficiaries += beneficiaries;
        group.deliveries++;
      }
    });

    let cumulativeBeneficiaries = 0;
    Array.from(groupedByMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, data]) => {
        cumulativeBeneficiaries += data.newBeneficiaries;
        impactTimeline.push({
          date,
          cumulativeBeneficiaries,
          newBeneficiaries: data.newBeneficiaries,
          deliveries: data.deliveries,
        });
      });

    // Convert region data to array format
    const regions = Object.entries(regionData).map(([name, data]) => ({
      name,
      beneficiaries: data.beneficiaries,
      deliveries: data.deliveries,
      responseTypes: Array.from(data.responseTypes),
    }));

    // Calculate effectiveness metrics
    const totalCommitments = commitments.length;
    const verifiedDeliveries = commitments.filter(c => c.rapidResponse?.verificationStatus === 'VERIFIED').length;
    const verificationRate = totalCommitments > 0 ? (verifiedDeliveries / totalCommitments) * 100 : 0;

    // Calculate average response time
    const responseTimes = commitments
      .filter(c => c.deliveredDate)
      .map(c => {
        const responseTime = c.deliveredDate!.getTime() - c.createdAt.getTime();
        return responseTime / (1000 * 60 * 60); // Convert to hours
      });
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    const impactMetrics: ImpactMetrics = {
      donorId: session.user.id,
      totalBeneficiariesHelped,
      beneficiariesByResponseType,
      geographicImpact: {
        locationsServed: locationsServed.size,
        coverageAreaKm2: regions.length * 300, // Estimate based on typical coverage
        regions,
      },
      impactOverTime: impactTimeline,
      effectivenessMetrics: {
        needFulfillmentRate: 0, // Would need assessment needs data to calculate
        responseTimeHours: Math.round(averageResponseTime * 10) / 10,
        verificationRate: Math.round(verificationRate * 10) / 10,
      },
    };

    // Calculate impact insights
    const insights = {
      mostImpactfulResponseType: Object.entries(beneficiariesByResponseType)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A',
      averageBeneficiariesPerDelivery: totalCommitments > 0 
        ? Math.round(totalBeneficiariesHelped / totalCommitments) 
        : 0,
      impactGrowthRate: impactTimeline.length > 1 ? 
        ((impactTimeline[impactTimeline.length - 1]?.cumulativeBeneficiaries || 0) - 
         (impactTimeline[0]?.cumulativeBeneficiaries || 0)) / Math.max(impactTimeline[0]?.cumulativeBeneficiaries || 1, 1) * 100 : 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        impact: impactMetrics,
        insights,
        filters: {
          period: validatedParams.period,
          responseType: validatedParams.responseType,
          region: validatedParams.region,
        },
        lastUpdated: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Error fetching impact metrics:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
      data: null,
          message: 'Invalid query parameters',
          errors: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
      data: null,
        message: 'Failed to fetch impact metrics',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}