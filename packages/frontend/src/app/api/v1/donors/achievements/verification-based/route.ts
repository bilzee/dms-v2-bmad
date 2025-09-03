import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

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

    // Fetch verification-linked achievements
    const achievements = await prisma.donorAchievement.findMany({
      where: whereClause,
      include: {
        ...(validatedParams.includeStamps && {
          rapidResponse: {
            select: {
              id: true,
              verificationStatus: true,
              verifiedAt: true,
              verifiedBy: true,
              verificationNotes: true,
              donorName: true
            }
          }
        })
      },
      orderBy: { unlockedAt: 'desc' }
    });

    // Get verification stamps for responses
    const verificationStamps = validatedParams.includeStamps ? 
      await prisma.rapidResponse.findMany({
        where: {
          verificationStatus: 'VERIFIED',
          donorCommitments: {
            some: { donorId: session.user.id }
          }
        },
        select: {
          id: true,
          verificationStatus: true,
          verifiedAt: true,
          verifiedBy: true,
          verificationNotes: true,
          donorName: true,
          donorCommitments: {
            where: { donorId: session.user.id },
            select: {
              id: true,
              donorAchievements: {
                where: { verificationId: { not: null } },
                select: {
                  id: true,
                  title: true,
                  badgeIcon: true
                }
              }
            }
          }
        }
      }) : [];

    return NextResponse.json({
      success: true,
      data: {
        achievements,
        verificationStamps,
        summary: {
          totalVerificationAchievements: achievements.length,
          verifiedResponses: verificationStamps.length,
          achievementsEarnedThisMonth: achievements.filter(a => 
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
  } finally {
    await prisma.$disconnect();
  }
}