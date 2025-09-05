import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Mock data interfaces based on the story requirements
interface DonorPerformanceMetrics {
  donorId: string;
  onTimeDeliveryRate: number; // Percentage 0-100
  quantityAccuracyRate: number; // Percentage 0-100
  performanceScore: number; // 0-100 calculated score
  totalCommitments: number;
  completedDeliveries: number;
  beneficiariesHelped: number;
  responseTypesServed: string[];
  lastUpdated: Date;
}

// Query parameters validation schema
const performanceQuerySchema = z.object({
  period: z.enum(['30', '90', '365', 'all']).optional().default('90'),
  responseType: z.string().optional(),
  location: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      period: searchParams.get('period') || '90',
      responseType: searchParams.get('responseType') || undefined,
      location: searchParams.get('location') || undefined,
    };

    // Validate query parameters
    const validatedParams = performanceQuerySchema.parse(queryParams);

    // Calculate date range for period filtering
    const periodDays = parseInt(validatedParams.period);
    const startDate = validatedParams.period === 'all' 
      ? new Date('1900-01-01') 
      : new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    // Build where clause for filtering
    const whereClause: any = {
      donorId: session.user.id,
      createdAt: {
        gte: startDate
      }
    };

    if (validatedParams.responseType) {
      whereClause.responseType = validatedParams.responseType;
    }

    // Fetch donor commitments with related data
    const commitments = await prisma.donorCommitment.findMany({
      where: whereClause,
      include: {
        rapidResponse: {
          where: { verificationStatus: 'VERIFIED' }
        }
      }
    });

    // Calculate performance metrics from real data
    const totalCommitments = commitments.length;
    const deliveredCommitments = commitments.filter(c => c.status === 'DELIVERED');
    const completedDeliveries = deliveredCommitments.length;

    // Calculate on-time delivery rate
    const onTimeDeliveries = deliveredCommitments.filter(c => 
      c.deliveredDate && c.deliveredDate <= c.targetDate
    ).length;
    const onTimeDeliveryRate = totalCommitments > 0 ? (onTimeDeliveries / totalCommitments) * 100 : 0;

    // Calculate quantity accuracy rate
    const accurateDeliveries = deliveredCommitments.filter(c => 
      c.actualQuantity && Math.abs(c.actualQuantity - c.quantity) / c.quantity <= 0.1 // Within 10%
    ).length;
    const quantityAccuracyRate = completedDeliveries > 0 ? (accurateDeliveries / completedDeliveries) * 100 : 0;

    // Calculate performance score (weighted combination)
    const performanceScore = (onTimeDeliveryRate * 0.4) + (quantityAccuracyRate * 0.6);

    // Calculate beneficiaries helped from verified responses
    const beneficiariesHelped = deliveredCommitments.reduce((total, commitment) => {
      if (commitment.rapidResponse) {
        const responseData = commitment.rapidResponse.data as any;
        // Extract beneficiaries from response data based on type
        if (responseData.personsServed) total += responseData.personsServed;
        if (responseData.householdsServed) total += responseData.householdsServed * 4; // Estimate 4 per household
      }
      return total;
    }, 0);

    // Get unique response types served
    const responseTypesServed = Array.from(new Set(commitments.map(c => c.responseType))) as string[];

    const performanceMetrics: DonorPerformanceMetrics = {
      donorId: session.user.id,
      onTimeDeliveryRate: Math.round(onTimeDeliveryRate * 10) / 10,
      quantityAccuracyRate: Math.round(quantityAccuracyRate * 10) / 10,
      performanceScore: Math.round(performanceScore * 10) / 10,
      totalCommitments,
      completedDeliveries,
      beneficiariesHelped,
      responseTypesServed,
      lastUpdated: new Date(),
    };

    return NextResponse.json({
      success: true,
      data: {
        metrics: performanceMetrics,
        period: validatedParams.period,
        filters: {
          responseType: validatedParams.responseType,
          location: validatedParams.location,
        },
      },
    });

  } catch (error) {
    console.error('Error fetching donor performance metrics:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch performance metrics',
      },
      { status: 500 }
    );
  }
}