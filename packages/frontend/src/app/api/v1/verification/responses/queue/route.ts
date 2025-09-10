import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { ResponseStatus, VerificationStatus, UserRoleType } from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized - session required'] },
        { status: 401 }
      );
    }

    // Verify coordinator role
    if (session.user.role !== UserRoleType.COORDINATOR) {
      return NextResponse.json(
        { success: false, errors: ['Access denied - coordinator role required'] },
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
        in: ['DELIVERED', 'PARTIALLY_DELIVERED']
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

    // Mock responses for verification queue (database relations not available)
    const mockResponses = [
      {
        id: 'resp-1',
        responseType: 'HEALTH',
        status: 'DELIVERED',
        deliveredDate: new Date('2024-01-15T10:30:00Z'),
        responderName: 'John Doe',
        donorName: 'Red Cross',
        verificationStatus: 'PENDING',
        affectedEntity: { id: 'entity-1', name: 'Community Center', location: 'Abuja' },
        assessment: { id: 'assess-1', type: 'HEALTH', data: {} },
        deliveryEvidence: [
          { id: 'evidence-1', url: '/api/media/photo1.jpg', mimeType: 'image/jpeg', metadata: {} }
        ],
        verifications: []
      }
    ];

    const responses = mockResponses;
    const totalCount = mockResponses.length;

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

    // Mock pending count
    const pendingCount = 1;

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
      { success: false, errors: ['Failed to fetch verification queue'] },
      { status: 500 }
    );
  }
}