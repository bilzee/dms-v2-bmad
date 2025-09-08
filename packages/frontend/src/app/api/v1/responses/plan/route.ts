import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ResponsePlanFormSchema,
  ResponseType,
  ResponseStatus,
  VerificationStatus,
  SyncStatus,
  generateUUID,
  generateOfflineId,
} from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// API Request/Response schemas
const CreateResponsePlanSchema = ResponsePlanFormSchema.extend({
  responderId: z.string().uuid(),
  responderName: z.string().min(1),
  donorId: z.string().uuid().optional(),
  donorName: z.string().optional(),
});

const ResponsePlanResponse = z.object({
  id: z.string().uuid(),
  responseType: z.enum(['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION']),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED']),
  plannedDate: z.string().datetime(),
  deliveredDate: z.string().datetime().optional(),
  affectedEntityId: z.string().uuid(),
  assessmentId: z.string().uuid().optional(),
  responderId: z.string().uuid(),
  responderName: z.string(),
  donorId: z.string().uuid().optional(),
  donorName: z.string().optional(),
  verificationStatus: z.enum(['PENDING', 'VERIFIED', 'AUTO_VERIFIED', 'REJECTED']),
  syncStatus: z.enum(['PENDING', 'SYNCING', 'SYNCED', 'CONFLICT', 'FAILED']),
  offlineId: z.string().optional(),
  data: z.any(), // Response-specific data
  otherItemsDelivered: z.array(z.object({
    item: z.string(),
    quantity: z.number(),
    unit: z.string(),
  })),
  deliveryEvidence: z.array(z.any()).default([]), // Media attachments
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validationResult = CreateResponsePlanSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          errors: ['Invalid request data'],
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const {
      responseType,
      affectedEntityId,
      assessmentId,
      plannedDate,
      data,
      otherItemsDelivered,
      notes,
      responderId,
      responderName,
      donorId,
      donorName,
    } = validationResult.data;

    // Create response plan object
    const responsePlan = {
      id: generateUUID(),
      responseType: responseType as ResponseType,
      status: ResponseStatus.PLANNED,
      plannedDate: new Date(plannedDate),
      affectedEntityId,
      assessmentId,
      responderId,
      responderName,
      donorId,
      donorName,
      verificationStatus: VerificationStatus.PENDING,
      syncStatus: SyncStatus.SYNCED,
      data,
      otherItemsDelivered,
      deliveryEvidence: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // TODO: Save to database
    // await prisma.rapidResponse.create({ data: responsePlan });

    // For now, simulate successful creation
    console.log('Response plan created:', responsePlan);

    // Return created response plan
    const response = {
      ...responsePlan,
      plannedDate: responsePlan.plannedDate.toISOString(),
      createdAt: responsePlan.createdAt.toISOString(),
      updatedAt: responsePlan.updatedAt.toISOString(),
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Error creating response plan:', error);
    return NextResponse.json(
      {
        errors: ['Internal server error'],
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
