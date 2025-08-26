import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { ResponseStatus, VerificationStatus, UserRoleType } from '@dms/shared';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - session required' },
        { status: 401 }
      );
    }

    // Verify coordinator role
    if (session.user.role !== UserRoleType.COORDINATOR) {
      return NextResponse.json(
        { success: false, error: 'Access denied - coordinator role required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || 'all';
    const priority = searchParams.get('priority') || 'all';
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      status: {
        in: [ResponseStatus.DELIVERED, ResponseStatus.PARTIALLY_DELIVERED]
      }
    };

    if (status !== 'all') {
      whereClause.verificationStatus = status.toUpperCase() as VerificationStatus;
    }

    if (search) {
      whereClause.OR = [
        { responderName: { contains: search, mode: 'insensitive' } },
        { donorName: { contains: search, mode: 'insensitive' } },
        { affectedEntity: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Get responses for verification queue
    const [responses, totalCount] = await Promise.all([
      prisma.rapidResponse.findMany({
        where: whereClause,
        include: {
          affectedEntity: {
            select: {
              id: true,
              name: true,
              location: true
            }
          },
          assessment: {
            select: {
              id: true,
              type: true,
              data: true
            }
          },
          deliveryEvidence: {
            select: {
              id: true,
              url: true,
              mimeType: true,
              metadata: true
            }
          },
          verifications: {
            select: {
              id: true,
              status: true,
              verifierNotes: true,
              createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: [
          { verificationStatus: 'asc' },
          { deliveredDate: 'desc' }
        ],
        skip: offset,
        take: limit
      }),
      prisma.rapidResponse.count({
        where: whereClause
      })
    ]);

    // Calculate priority based on delivery time, photo count, and variance indicators
    const responseQueue = responses.map(response => {
      const daysSinceDelivery = response.deliveredDate 
        ? Math.floor((Date.now() - new Date(response.deliveredDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      let priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      
      if (daysSinceDelivery > 7) {
        priority = 'HIGH';
      } else if (daysSinceDelivery > 3 || response.deliveryEvidence.length === 0) {
        priority = 'MEDIUM';
      }

      return {
        id: response.id,
        responseType: response.responseType,
        status: response.status,
        deliveredDate: response.deliveredDate,
        responderName: response.responderName,
        donorName: response.donorName || 'Unknown',
        affectedEntity: response.affectedEntity.name,
        photoCount: response.deliveryEvidence.length,
        verificationStatus: response.verificationStatus,
        priority,
        daysSinceDelivery,
        lastVerification: response.verifications[0] || null
      };
    });

    const pendingCount = await prisma.rapidResponse.count({
      where: {
        ...whereClause,
        verificationStatus: VerificationStatus.PENDING
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        responses: responseQueue,
        totalCount,
        pendingCount,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: offset + limit < totalCount,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching response verification queue:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch verification queue' },
      { status: 500 }
    );
  }
}