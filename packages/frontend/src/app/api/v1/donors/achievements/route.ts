import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import DatabaseService from '@/lib/services/DatabaseService';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

const achievementsQuerySchema = z.object({
  category: z.enum(['DELIVERY', 'CONSISTENCY', 'IMPACT', 'ALL']).optional().default('ALL'),
  includeProgress: z.boolean().optional().default(true),
});

// Achievement interface based on the story requirements
interface DonorAchievement {
  id: string;
  donorId: string;
  type: string; // FIRST_DELIVERY, MILESTONE_10, PERFECT_ACCURACY, etc.
  title: string;
  description: string;
  earnedAt: Date;
  category: 'delivery' | 'accuracy' | 'impact' | 'consistency';
  badgeIcon: string;
  isRecent: boolean; // Earned within last 30 days
}

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
      category: searchParams.get('category') || 'ALL',
      includeProgress: searchParams.get('includeProgress') !== 'false',
    };

    const validatedParams = achievementsQuerySchema.parse(queryParams);

    // Build where clause
    const whereClause: any = {
      donorId: session.user.id,
    };

    if (validatedParams.category !== 'ALL') {
      whereClause.category = validatedParams.category;
    }

    // Fetch achievements
    const achievements = await DatabaseService.getAchievementsByDonor(
      session.user.id, 
      { category: validatedParams.category }
    );

    // Get donor's current stats for calculating progress
    const donorStats = await DatabaseService.getDonorCommitmentsStats(session.user.id);

    const totalDeliveries = donorStats.length;
    const totalBeneficiaries = donorStats.reduce((total, commitment) => {
      if (commitment.rapidResponse?.data) {
        const responseData = commitment.rapidResponse.data as any;
        if (responseData.personsServed) total += responseData.personsServed;
        if (responseData.householdsServed) total += responseData.householdsServed * 4;
      }
      return total;
    }, 0);

    // Calculate current week's accuracy rate
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weeklyDeliveries = donorStats.filter(c => 
      c.deliveredDate && c.deliveredDate >= weekStart
    );
    const weeklyAccuracyRate = weeklyDeliveries.length > 0 
      ? (weeklyDeliveries.filter(c => 
          c.actualQuantity && Math.abs(c.actualQuantity - c.quantity) / c.quantity <= 0.1
        ).length / weeklyDeliveries.length) * 100 
      : 0;

    // Achievement rules for progress calculation
    const achievementRules = {
      FIRST_DELIVERY: { threshold: 1, current: totalDeliveries },
      MILESTONE_10: { threshold: 10, current: totalDeliveries },
      MILESTONE_25: { threshold: 25, current: totalDeliveries },
      MILESTONE_50: { threshold: 50, current: totalDeliveries },
      MILESTONE_100: { threshold: 100, current: totalDeliveries },
      PERFECT_ACCURACY_WEEK: { threshold: 100, current: weeklyAccuracyRate },
      IMPACT_100: { threshold: 100, current: totalBeneficiaries },
      IMPACT_500: { threshold: 500, current: totalBeneficiaries },
      IMPACT_1000: { threshold: 1000, current: totalBeneficiaries },
    };

    // Update progress for existing achievements
    if (validatedParams.includeProgress) {
      for (const achievement of achievements) {
        const rule = achievementRules[achievement.type as keyof typeof achievementRules];
        if (rule) {
          const progress = Math.min(100, (rule.current / rule.threshold) * 100);
          const shouldUnlock = progress >= 100 && !achievement.isUnlocked;
          
          if (achievement.progress !== progress || shouldUnlock) {
            await DatabaseService.updateAchievementProgress(
              achievement.id,
              progress,
              shouldUnlock || achievement.isUnlocked
            );
            
            achievement.progress = progress;
            achievement.isUnlocked = shouldUnlock || achievement.isUnlocked;
            if (shouldUnlock) achievement.unlockedAt = new Date();
          }
        }
      }
    }

    // Calculate summary statistics
    const unlockedAchievements = achievements.filter(a => a.isUnlocked);
    const recentAchievements = unlockedAchievements
      .filter(a => a.unlockedAt && a.unlockedAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .sort((a, b) => (b.unlockedAt?.getTime() || 0) - (a.unlockedAt?.getTime() || 0));

    return NextResponse.json({
      success: true,
      data: {
        achievements,
        summary: {
          totalAchievements: achievements.length,
          unlockedAchievements: unlockedAchievements.length,
          progressPercentage: achievements.length > 0 
            ? (unlockedAchievements.length / achievements.length) * 100 
            : 0,
          recentUnlocks: recentAchievements.length,
          categories: {
            DELIVERY: achievements.filter(a => a.category === 'DELIVERY').length,
            CONSISTENCY: achievements.filter(a => a.category === 'CONSISTENCY').length,
            IMPACT: achievements.filter(a => a.category === 'IMPACT').length,
          }
        },
        recentAchievements: recentAchievements.slice(0, 5),
        category: validatedParams.category,
      },
    });

  } catch (error) {
    console.error('Error fetching achievements:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch achievements',
      },
      { status: 500 }
    );
  } finally {
    // DatabaseService manages connections, no need to disconnect
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const achievementData = {
      donorId: session.user.id,
      type: body.type,
      title: body.title,
      description: body.description,
      category: body.category,
      progress: body.progress || 100,
      isUnlocked: body.isUnlocked || true,
      unlockedAt: body.unlockedAt ? new Date(body.unlockedAt) : new Date(),
    };

    // Create achievement in database
    const achievement = await DatabaseService.createDonorAchievement(achievementData);

    return NextResponse.json({
      success: true,
      data: achievement,
      message: 'Achievement created successfully',
    });

  } catch (error) {
    console.error('Error creating achievement:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create achievement',
      },
      { status: 500 }
    );
  } finally {
    // DatabaseService manages connections, no need to disconnect
  }
}