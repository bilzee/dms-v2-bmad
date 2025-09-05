import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

interface SaveAnnotationsRequest {
  notes: string;
  timestamp: string;
  responseId: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const photoId = params.id;
    const body: SaveAnnotationsRequest = await request.json();
    
    if (!body.notes || !body.timestamp || !body.responseId) {
      return NextResponse.json(
        { error: 'Missing required fields: notes, timestamp, responseId' }, 
        { status: 400 }
      );
    }

    // In a real implementation, this would save to database
    // For now, we'll simulate a successful save
    const savedAnnotation = {
      photoId,
      notes: body.notes,
      timestamp: body.timestamp,
      responseId: body.responseId,
      verifierId: session.user.id,
      persistedAt: new Date().toISOString(),
    };

    // TODO: Implement actual database save
    // Example Prisma query:
    // await prisma.photoAnnotation.upsert({
    //   where: { photoId },
    //   update: {
    //     notes: body.notes,
    //     updatedAt: new Date(body.timestamp),
    //   },
    //   create: {
    //     photoId,
    //     notes: body.notes,
    //     responseId: body.responseId,
    //     verifierId: session.user.id,
    //     createdAt: new Date(body.timestamp),
    //   },
    // });

    return NextResponse.json({
      success: true,
      data: savedAnnotation,
      message: 'Photo annotations saved successfully'
    });

  } catch (error) {
    console.error('Error saving photo annotations:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const photoId = params.id;

    // TODO: Implement actual database retrieval
    // Example Prisma query:
    // const annotation = await prisma.photoAnnotation.findUnique({
    //   where: { photoId },
    // });

    // For now, return mock data
    const mockAnnotation = {
      photoId,
      notes: '',
      persistedAt: null,
      verifierId: session.user.id,
    };

    return NextResponse.json({
      success: true,
      data: mockAnnotation
    });

  } catch (error) {
    console.error('Error retrieving photo annotations:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}