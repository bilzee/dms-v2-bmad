import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { VerificationAchievementEngine } from '@/lib/achievements/achievementEngine';
import prisma from '@/lib/prisma';

const calculateAchievementSchema = z.object({
  responseId: z.string(),
  verificationId: z.string(),
  donorId: z.string().optional(), // Optional since we can get from session
});

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
    const validatedData = calculateAchievementSchema.parse(body);
    
    // Use session user ID, but allow override for coordinator-triggered calculations
    const donorId = validatedData.donorId || session.user.id;
    
    // Verify the donor exists and user has permission to calculate achievements
    if (donorId !== session.user.id) {
      // Check if user is a coordinator who can trigger achievement calculations
      const user = await prisma.user.findUnique({
        where: { id: session.user.id }
      });
      
      if (user?.role !== 'COORDINATOR') {
        return NextResponse.json(
          { success: false, message: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    // Trigger achievement calculation
    const result = await VerificationAchievementEngine.triggerAchievementCalculation(
      donorId,
      validatedData.responseId,
      validatedData.verificationId
    );

    // If new achievements were earned, trigger notification events
    if (result.newAchievements.length > 0) {
      // Browser event for real-time notifications
      const achievementEvent = new CustomEvent('donor-achievement-earned', {
        detail: {
          donorId,
          achievements: result.newAchievements,
          responseId: validatedData.responseId,
          verificationId: validatedData.verificationId
        }
      });

      // In a real implementation, this would use Server-Sent Events or WebSockets
      // For now, we'll return the achievements and let the frontend handle notifications
    }

    return NextResponse.json({
      success: true,
      data: {
        newAchievements: result.newAchievements,
        totalAchievements: result.totalAchievements,
        achievementsEarned: result.newAchievements.length,
        responseId: validatedData.responseId,
        verificationId: validatedData.verificationId
      },
      message: result.newAchievements.length > 0 
        ? `Congratulations! You earned ${result.newAchievements.length} new achievement${result.newAchievements.length > 1 ? 's' : ''}!`
        : 'Achievement calculation completed - no new achievements earned'
    });

  } catch (error) {
    console.error('Error calculating achievements:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request parameters',
          errors: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to calculate achievements',
      },
      { status: 500 }
    );
  }
}