import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Historical performance data point interface
interface PerformanceHistoryPoint {
  date: string;
  onTimeDeliveryRate: number;
  quantityAccuracyRate: number;
  performanceScore: number;
  completedDeliveries: number;
  beneficiariesHelped: number;
}

// Query parameters validation schema
const historyQuerySchema = z.object({
  period: z.enum(['30', '90', '365']).optional().default('90'),
  granularity: z.enum(['daily', 'weekly', 'monthly']).optional().default('weekly'),
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
      period: searchParams.get('period') || '90',
      granularity: searchParams.get('granularity') || 'weekly',
    };

    // Validate query parameters
    const validatedParams = historyQuerySchema.parse(queryParams);
    
    const periodDays = parseInt(validatedParams.period);
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    // Fetch historical commitments
    const commitments = await prisma.donorCommitment.findMany({
      where: {
        donorId: session.user.id,
        createdAt: { gte: startDate }
      },
      include: {
        rapidResponse: {
          where: { verificationStatus: 'VERIFIED' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group data by time period
    const groupedData = new Map();

    // Group data by time period and calculate metrics
    commitments.forEach(commitment => {
      let key: string;
      const date = commitment.deliveredDate || commitment.createdAt;
      
      if (validatedParams.granularity === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (validatedParams.granularity === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          period: key,
          totalCommitments: 0,
          deliveredCommitments: 0,
          onTimeDeliveries: 0,
          accurateDeliveries: 0,
          beneficiariesHelped: 0,
        });
      }

      const group = groupedData.get(key);
      group.totalCommitments++;

      if (commitment.status === 'DELIVERED') {
        group.deliveredCommitments++;
        
        if (commitment.deliveredDate && commitment.deliveredDate <= commitment.targetDate) {
          group.onTimeDeliveries++;
        }
        
        if (commitment.actualQuantity && Math.abs(commitment.actualQuantity - commitment.quantity) / commitment.quantity <= 0.1) {
          group.accurateDeliveries++;
        }

        if (commitment.rapidResponse?.data) {
          const responseData = commitment.rapidResponse.data as any;
          if (responseData.personsServed) group.beneficiariesHelped += responseData.personsServed;
          if (responseData.householdsServed) group.beneficiariesHelped += responseData.householdsServed * 4;
        }
      }
    });

    // Convert to array and calculate rates
    const historicalData = Array.from(groupedData.values()).map(group => ({
      date: group.period,
      onTimeDeliveryRate: group.totalCommitments > 0 ? Math.round((group.onTimeDeliveries / group.totalCommitments) * 1000) / 10 : 0,
      quantityAccuracyRate: group.deliveredCommitments > 0 ? Math.round((group.accurateDeliveries / group.deliveredCommitments) * 1000) / 10 : 0,
      performanceScore: group.totalCommitments > 0 ? 
        Math.round(((group.onTimeDeliveries / group.totalCommitments) * 40 + (group.accurateDeliveries / Math.max(group.deliveredCommitments, 1)) * 60) * 10) / 10 : 0,
      completedDeliveries: group.deliveredCommitments,
      beneficiariesHelped: group.beneficiariesHelped,
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Calculate trend analysis
    const calculateTrend = (data: Array<{date: string, onTimeDeliveryRate: number, quantityAccuracyRate: number, performanceScore: number, completedDeliveries: number, beneficiariesHelped: number}>, metric: string) => {
      if (data.length < 2) return 0;
      
      const recent = data.slice(-3).map(d => (d as any)[metric] as number);
      const earlier = data.slice(0, 3).map(d => (d as any)[metric] as number);
      
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
      
      return earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0; // Percentage change
    };

    const trends = {
      onTimeDeliveryRate: calculateTrend(historicalData, 'onTimeDeliveryRate'),
      quantityAccuracyRate: calculateTrend(historicalData, 'quantityAccuracyRate'),
      performanceScore: calculateTrend(historicalData, 'performanceScore'),
      completedDeliveries: calculateTrend(historicalData, 'completedDeliveries'),
      beneficiariesHelped: calculateTrend(historicalData, 'beneficiariesHelped'),
    };

    return NextResponse.json({
      success: true,
      data: {
        history: historicalData,
        trends,
        period: validatedParams.period,
        granularity: validatedParams.granularity,
        summary: {
          totalDataPoints: historicalData.length,
          dateRange: {
            from: historicalData[0]?.date,
            to: historicalData[historicalData.length - 1]?.date,
          },
        },
      },
    });

  } catch (error) {
    console.error('Error fetching performance history:', error);
    
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
        message: 'Failed to fetch performance history',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}