import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

const leaderboardQuerySchema = z.object({
  category: z.enum(['VERIFICATION', 'DELIVERY', 'IMPACT', 'OVERALL']).optional().default('OVERALL'),
  timeframe: z.enum(['30', '90', 'year', 'all']).optional().default('90'),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  includePrivate: z.boolean().optional().default(false),
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
      category: searchParams.get('category') || 'OVERALL',
      timeframe: searchParams.get('timeframe') || '90',
      limit: parseInt(searchParams.get('limit') || '20'),
      includePrivate: searchParams.get('includePrivate') === 'true',
    };

    const validatedParams = leaderboardQuerySchema.parse(queryParams);

    // Calculate date filter based on timeframe
    let dateFilter: Date | undefined;
    if (validatedParams.timeframe !== 'all') {
      const days = validatedParams.timeframe === 'year' ? 365 : parseInt(validatedParams.timeframe);
      dateFilter = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }

    // Get donors with their achievement counts and verification stats
    const donorLeaderboard = await prisma.donor.findMany({
      where: {
        // Only include donors who have opted into leaderboard visibility
        leaderboardVisible: validatedParams.includePrivate ? undefined : true,
      },
      include: {
        donorAchievements: {
          where: {
            isUnlocked: true,
            ...(dateFilter && { unlockedAt: { gte: dateFilter } }),
            ...(validatedParams.category !== 'OVERALL' && {
              category: validatedParams.category
            })
          }
        },
        donorCommitments: {
          where: {
            status: 'DELIVERED',
            ...(dateFilter && { deliveredDate: { gte: dateFilter } })
          },
          include: {
            rapidResponse: {
              where: { verificationStatus: 'VERIFIED' }
            }
          }
        }
      }
    });

    // Calculate leaderboard metrics for each donor
    const leaderboardData = donorLeaderboard.map(donor => {
      const achievements = donor.donorAchievements;
      const verifiedDeliveries = donor.donorCommitments.filter(c => c.rapidResponse);
      const totalDeliveries = donor.donorCommitments.length;

      // Calculate verification rate
      const verificationRate = totalDeliveries > 0 
        ? (verifiedDeliveries.length / totalDeliveries) * 100 
        : 0;

      // Calculate total beneficiaries helped through verified responses
      const totalBeneficiaries = verifiedDeliveries.reduce((total, commitment) => {
        if (commitment.rapidResponse?.data) {
          const responseData = commitment.rapidResponse.data as any;
          if (responseData.personsServed) total += responseData.personsServed;
          if (responseData.householdsServed) total += responseData.householdsServed * 4;
        }
        return total;
      }, 0);

      // Calculate category-specific scores
      const categoryScores = {
        VERIFICATION: verificationRate,
        DELIVERY: verifiedDeliveries.length,
        IMPACT: totalBeneficiaries,
        OVERALL: (verificationRate * 0.3) + (verifiedDeliveries.length * 0.4) + (achievements.length * 0.3)
      };

      return {
        donorId: donor.id,
        donorName: donor.name,
        donorOrganization: donor.organization,
        achievements: achievements.length,
        verifiedDeliveries: verifiedDeliveries.length,
        verificationRate: Math.round(verificationRate),
        totalBeneficiaries,
        score: Math.round(categoryScores[validatedParams.category] || categoryScores.OVERALL),
        recentAchievements: achievements
          .filter(a => a.unlockedAt && a.unlockedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
          .map(a => ({
            title: a.title,
            icon: a.badgeIcon,
            earnedAt: a.unlockedAt
          })),
        isCurrentUser: donor.id === session.user.id
      };
    })
    .filter(donor => donor.score > 0) // Only include donors with activity
    .sort((a, b) => b.score - a.score) // Sort by score descending
    .slice(0, validatedParams.limit);

    // Get current user's rank
    const currentUserRank = leaderboardData.findIndex(d => d.isCurrentUser) + 1;

    return NextResponse.json({
      success: true,
      data: {
        leaderboard: leaderboardData,
        currentUserRank: currentUserRank > 0 ? currentUserRank : null,
        metadata: {
          category: validatedParams.category,
          timeframe: validatedParams.timeframe,
          totalParticipants: leaderboardData.length,
          generatedAt: new Date().toISOString()
        }
      },
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch leaderboard',
      },
      { status: 500 }
    );
  }
}