import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

const verificationStampSchema = z.object({
  verificationNotes: z.string().optional(),
  donorId: z.string().optional(),
  generateAchievements: z.boolean().optional().default(true),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only coordinators can generate verification stamps
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (user?.role !== 'COORDINATOR') {
      return NextResponse.json(
        { success: false, message: 'Only coordinators can generate verification stamps' },
        { status: 403 }
      );
    }

    const responseId = params.id;
    const body = await request.json();
    const validatedData = verificationStampSchema.parse(body);

    // Get the response that needs verification stamp
    const response = await prisma.rapidResponse.findUnique({
      where: { id: responseId },
      include: {
        donorCommitments: {
          include: { donor: true }
        }
      }
    });

    if (!response) {
      return NextResponse.json(
        { success: false, message: 'Response not found' },
        { status: 404 }
      );
    }

    if (response.verificationStatus !== 'VERIFIED') {
      return NextResponse.json(
        { success: false, message: 'Response must be verified before generating stamp' },
        { status: 400 }
      );
    }

    // Update response with verification stamp data
    const updatedResponse = await prisma.rapidResponse.update({
      where: { id: responseId },
      data: {
        verificationStampGenerated: true,
        verificationStampGeneratedAt: new Date(),
        verificationStampGeneratedBy: session.user.id,
        ...(validatedData.verificationNotes && {
          verificationNotes: validatedData.verificationNotes
        })
      }
    });

    // Generate achievements for linked donors if requested
    const achievementResults = [];
    if (validatedData.generateAchievements) {
      for (const commitment of response.donorCommitments) {
        if (commitment.donorId) {
          try {
            const { VerificationAchievementEngine } = await import('@/lib/achievements/achievementEngine');
            const achievements = await VerificationAchievementEngine.triggerAchievementCalculation(
              commitment.donorId,
              responseId,
              response.verificationId || 'manual-verification'
            );
            achievementResults.push({
              donorId: commitment.donorId,
              donorName: commitment.donor?.name,
              newAchievements: achievements.newAchievements
            });
          } catch (error) {
            console.error(`Failed to calculate achievements for donor ${commitment.donorId}:`, error);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        response: updatedResponse,
        stamp: {
          responseId,
          verificationId: response.verificationId,
          stampGeneratedAt: updatedResponse.verificationStampGeneratedAt,
          stampGeneratedBy: session.user.id,
          verificationNotes: validatedData.verificationNotes
        },
        achievementResults,
        donorsAffected: response.donorCommitments.length
      },
      message: `Verification stamp generated for response ${responseId}${achievementResults.length > 0 ? ` and achievements calculated for ${achievementResults.length} donor(s)` : ''}`
    });

  } catch (error) {
    console.error('Error generating verification stamp:', error);
    
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
        message: 'Failed to generate verification stamp',
      },
      { status: 500 }
    );
  }
}