import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AffectedEntitySchema, EntityManagementFormSchema } from '@dms/shared';
import DatabaseService from '@/lib/services/DatabaseService';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// GET /api/v1/entities - List entities with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'CAMP' | 'COMMUNITY' | null;
    const lga = searchParams.get('lga');
    const ward = searchParams.get('ward');
    const search = searchParams.get('search');

    // Build where clause for filtering
    const where: any = {};

    if (type) where.type = type;
    if (lga) where.lga = { contains: lga, mode: 'insensitive' };
    if (ward) where.ward = { contains: ward, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { lga: { contains: search, mode: 'insensitive' } },
        { ward: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Use DatabaseService instead of direct Prisma
    const filters = {
      type: type as 'CAMP' | 'COMMUNITY' | undefined,
      lga: lga || undefined,
      ward: ward || undefined,
    };
    const entities = await DatabaseService.getAffectedEntities(filters);

    // Transform database records to match frontend interface
    const transformedEntities = entities.map(entity => ({
      id: entity.id,
      type: entity.type as 'CAMP' | 'COMMUNITY',
      name: entity.name,
      lga: entity.lga,
      ward: entity.ward,
      longitude: entity.longitude,
      latitude: entity.latitude,
      campDetails: entity.type === 'CAMP' ? {
        campName: entity.campName!,
        campStatus: entity.campStatus as 'OPEN' | 'CLOSED',
        campCoordinatorName: entity.campCoordinatorName!,
        campCoordinatorPhone: entity.campCoordinatorPhone!,
        superviserName: entity.superviserName,
        superviserOrganization: entity.superviserOrganization,
        estimatedPopulation: entity.estimatedPopulation,
      } : undefined,
      communityDetails: entity.type === 'COMMUNITY' ? {
        communityName: entity.communityName!,
        contactPersonName: entity.contactPersonName!,
        contactPersonPhone: entity.contactPersonPhone!,
        contactPersonRole: entity.contactPersonRole!,
        estimatedHouseholds: entity.estimatedHouseholds,
      } : undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: transformedEntities,
      total: transformedEntities.length,
    });
  } catch (error) {
    console.error('Failed to fetch entities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch entities' },
      { status: 500 }
    );
  }
}

// POST /api/v1/entities - Create new entity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the request body
    const validatedData = EntityManagementFormSchema.parse(body);

    // Prepare data for database insertion
    const entityData: any = {
      type: validatedData.type,
      name: validatedData.name,
      lga: validatedData.lga,
      ward: validatedData.ward,
      longitude: validatedData.longitude,
      latitude: validatedData.latitude,
    };

    // Add type-specific fields
    if (validatedData.type === 'CAMP' && validatedData.campDetails) {
      Object.assign(entityData, {
        campName: validatedData.campDetails.campName,
        campStatus: validatedData.campDetails.campStatus,
        campCoordinatorName: validatedData.campDetails.campCoordinatorName,
        campCoordinatorPhone: validatedData.campDetails.campCoordinatorPhone,
        superviserName: validatedData.campDetails.superviserName,
        superviserOrganization: validatedData.campDetails.superviserOrganization,
        estimatedPopulation: validatedData.campDetails.estimatedPopulation,
      });
    } else if (validatedData.type === 'COMMUNITY' && validatedData.communityDetails) {
      Object.assign(entityData, {
        communityName: validatedData.communityDetails.communityName,
        contactPersonName: validatedData.communityDetails.contactPersonName,
        contactPersonPhone: validatedData.communityDetails.contactPersonPhone,
        contactPersonRole: validatedData.communityDetails.contactPersonRole,
        estimatedHouseholds: validatedData.communityDetails.estimatedHouseholds,
      });
    }

    // Create entity in database using DatabaseService
    const newEntity = await DatabaseService.createAffectedEntity(entityData);

    return NextResponse.json({
      success: true,
      data: newEntity,
      message: 'Entity created successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create entity:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create entity' },
      { status: 500 }
    );
  }
}