import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/v1/entities/[id] - Get specific entity
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const entity = await prisma.affectedEntity.findUnique({
      where: { id: params.id },
      include: {
        assessments: true, // Include related assessments
      },
    });

    if (!entity) {
      return NextResponse.json(
        { success: false, error: 'Entity not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: entity,
    });
  } catch (error) {
    console.error('Failed to fetch entity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch entity' },
      { status: 500 }
    );
  }
}

// PUT /api/v1/entities/[id] - Update entity
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const updatedEntity = await prisma.affectedEntity.update({
      where: { id: params.id },
      data: body,
    });

    return NextResponse.json({
      success: true,
      data: updatedEntity,
      message: 'Entity updated successfully',
    });
  } catch (error) {
    console.error('Failed to update entity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update entity' },
      { status: 500 }
    );
  }
}

