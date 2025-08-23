import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ResponsePlanFormSchema,
  ResponseStatus,
  VerificationStatus,
} from '@dms/shared';

// Path parameters schema
const ParamsSchema = z.object({
  id: z.string().uuid(),
});

// Update response plan schema
const UpdateResponsePlanSchema = ResponsePlanFormSchema.partial().extend({
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED']).optional(),
  deliveredDate: z.string().datetime().optional(),
  verificationStatus: z.enum(['PENDING', 'VERIFIED', 'AUTO_VERIFIED', 'REJECTED']).optional(),
  deliveryEvidence: z.array(z.any()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate path parameters
    const validationResult = ParamsSchema.safeParse(params);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid response plan ID',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { id } = validationResult.data;

    // TODO: Fetch from database
    // const responsePlan = await prisma.rapidResponse.findUnique({
    //   where: { id },
    //   include: {
    //     affectedEntity: true,
    //     assessment: true,
    //     responder: true,
    //     donor: true,
    //     deliveryEvidence: true,
    //   },
    // });

    // if (!responsePlan) {
    //   return NextResponse.json(
    //     { error: 'Response plan not found' },
    //     { status: 404 }
    //   );
    // }

    // Mock response plan data
    const mockResponsePlan = {
      id: id,
      responseType: 'HEALTH',
      status: 'PLANNED',
      plannedDate: '2025-08-24T08:00:00Z',
      affectedEntityId: 'entity-1',
      assessmentId: 'assessment-1',
      responderId: 'responder-1',
      responderName: 'John Doe',
      verificationStatus: 'PENDING',
      syncStatus: 'SYNCED',
      data: {
        medicinesDelivered: [
          { name: 'Paracetamol', quantity: 100, unit: 'tablets' },
          { name: 'Ibuprofen', quantity: 50, unit: 'tablets' },
        ],
        medicalSuppliesDelivered: [
          { name: 'Bandages', quantity: 20 },
          { name: 'Antiseptic', quantity: 5 },
        ],
        healthWorkersDeployed: 2,
        patientsTreated: 0,
        additionalDetails: 'Mobile clinic deployment planned',
      },
      otherItemsDelivered: [
        { item: 'First Aid Kit', quantity: 10, unit: 'kits' },
        { item: 'Hand Sanitizer', quantity: 20, unit: 'bottles' },
      ],
      deliveryEvidence: [],
      createdAt: '2025-08-23T10:00:00Z',
      updatedAt: '2025-08-23T10:00:00Z',
    };

    return NextResponse.json(mockResponsePlan);

  } catch (error) {
    console.error('Error fetching response plan:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate path parameters
    const paramsValidation = ParamsSchema.safeParse(params);
    if (!paramsValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid response plan ID',
          details: paramsValidation.error.issues,
        },
        { status: 400 }
      );
    }

    const { id } = paramsValidation.data;

    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validationResult = UpdateResponsePlanSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // TODO: Check if response plan exists and update
    // const existingPlan = await prisma.rapidResponse.findUnique({
    //   where: { id },
    // });

    // if (!existingPlan) {
    //   return NextResponse.json(
    //     { error: 'Response plan not found' },
    //     { status: 404 }
    //   );
    // }

    // // Update response plan
    // const updatedPlan = await prisma.rapidResponse.update({
    //   where: { id },
    //   data: {
    //     ...updateData,
    //     ...(updateData.plannedDate && { plannedDate: new Date(updateData.plannedDate) }),
    //     ...(updateData.deliveredDate && { deliveredDate: new Date(updateData.deliveredDate) }),
    //     updatedAt: new Date(),
    //   },
    //   include: {
    //     affectedEntity: true,
    //     assessment: true,
    //     responder: true,
    //     donor: true,
    //     deliveryEvidence: true,
    //   },
    // });

    // Mock update response
    const updatedPlan = {
      id: id,
      responseType: updateData.responseType || 'HEALTH',
      status: updateData.status || 'PLANNED',
      plannedDate: updateData.plannedDate || '2025-08-24T08:00:00Z',
      deliveredDate: updateData.deliveredDate,
      affectedEntityId: updateData.affectedEntityId || 'entity-1',
      assessmentId: updateData.assessmentId || 'assessment-1',
      responderId: 'responder-1',
      responderName: 'John Doe',
      verificationStatus: updateData.verificationStatus || 'PENDING',
      syncStatus: 'SYNCED',
      data: updateData.data || {
        medicinesDelivered: [],
        medicalSuppliesDelivered: [],
        healthWorkersDeployed: 2,
        patientsTreated: 0,
      },
      otherItemsDelivered: updateData.otherItemsDelivered || [],
      deliveryEvidence: updateData.deliveryEvidence || [],
      createdAt: '2025-08-23T10:00:00Z',
      updatedAt: new Date().toISOString(),
    };

    console.log('Response plan updated:', updatedPlan);

    return NextResponse.json(updatedPlan);

  } catch (error) {
    console.error('Error updating response plan:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate path parameters
    const validationResult = ParamsSchema.safeParse(params);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid response plan ID',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { id } = validationResult.data;

    // TODO: Check if response plan exists and can be deleted
    // const existingPlan = await prisma.rapidResponse.findUnique({
    //   where: { id },
    // });

    // if (!existingPlan) {
    //   return NextResponse.json(
    //     { error: 'Response plan not found' },
    //     { status: 404 }
    //   );
    // }

    // // Check if plan can be deleted (only PLANNED status typically)
    // if (existingPlan.status !== 'PLANNED') {
    //   return NextResponse.json(
    //     { error: 'Cannot delete response plan that is not in PLANNED status' },
    //     { status: 400 }
    //   );
    // }

    // // Soft delete or hard delete based on business rules
    // await prisma.rapidResponse.delete({
    //   where: { id },
    // });

    console.log('Response plan deleted:', id);

    return NextResponse.json(
      { message: 'Response plan deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error deleting response plan:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}