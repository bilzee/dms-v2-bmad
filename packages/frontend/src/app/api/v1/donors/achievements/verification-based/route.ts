import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import DatabaseService from '@/lib/services/DatabaseService';

const verificationAchievementsQuerySchema = z.object({
  responseId: z.string().optional(),
  verificationId: z.string().optional(),
  includeStamps: z.boolean().optional().default(true),
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
      responseId: searchParams.get('responseId') || undefined,
      verificationId: searchParams.get('verificationId') || undefined,
      includeStamps: searchParams.get('includeStamps') !== 'false',
    };

    const validatedParams = verificationAchievementsQuerySchema.parse(queryParams);

    // Build where clause for verification-linked achievements
    const whereClause: any = {
      donorId: session.user.id,
      verificationId: { not: null }, // Only verification-based achievements
    };

    if (validatedParams.responseId) {
      whereClause.responseId = validatedParams.responseId;
    }

    if (validatedParams.verificationId) {
      whereClause.verificationId = validatedParams.verificationId;
    }

    // Fetch verification-linked achievements using DatabaseService
    const achievements = await DatabaseService.getAchievementsByDonor(session.user.id);
    
    // Filter for verification-based achievements
    const verificationAchievements = achievements.filter(achievement => {
      let match = achievement.verificationId !== null;
      
      if (validatedParams.responseId) {
        match = match && achievement.responseId === validatedParams.responseId;
      }
      
      if (validatedParams.verificationId) {
        match = match && achievement.verificationId === validatedParams.verificationId;
      }
      
      return match;
    });

    // Get verification stamps for responses (simplified for DatabaseService pattern)
    const verificationStamps = [];

    return NextResponse.json({
      success: true,
      data: {
        achievements: verificationAchievements,
        verificationStamps,
        summary: {
          totalVerificationAchievements: verificationAchievements.length,
          verifiedResponses: verificationStamps.length,
          achievementsEarnedThisMonth: verificationAchievements.filter(a => 
            a.unlockedAt && a.unlockedAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          ).length
        }
      },
    });

  } catch (error) {
    console.error('Error fetching verification-based achievements:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch verification-based achievements',
      },
      { status: 500 }
    );
  }
}