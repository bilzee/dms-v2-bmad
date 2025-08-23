import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Query parameters schema for filtering response plans
const ResponsePlansQuerySchema = z.object({
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED']).optional(),
  responseType: z.enum(['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION']).optional(),
  responderId: z.string().uuid().optional(),
  affectedEntityId: z.string().uuid().optional(),
  assessmentId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
  sortBy: z.enum(['plannedDate', 'createdAt', 'updatedAt']).optional().default('plannedDate'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const ResponsePlansResponseSchema = z.object({
  data: z.array(z.any()), // Array of response plans
  meta: z.object({
    totalCount: z.number(),
    plannedCount: z.number(),
    inProgressCount: z.number(),
    deliveredCount: z.number(),
    cancelledCount: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Validate query parameters
    const validationResult = ResponsePlansQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const {
      status,
      responseType,
      responderId,
      affectedEntityId,
      assessmentId,
      dateFrom,
      dateTo,
      page,
      limit,
      sortBy,
      sortOrder,
    } = validationResult.data;

    // TODO: Implement database query with filters
    // const whereClause = {
    //   ...(status && { status }),
    //   ...(responseType && { responseType }),
    //   ...(responderId && { responderId }),
    //   ...(affectedEntityId && { affectedEntityId }),
    //   ...(assessmentId && { assessmentId }),
    //   ...(dateFrom && dateTo && {
    //     plannedDate: {
    //       gte: new Date(dateFrom),
    //       lte: new Date(dateTo),
    //     },
    //   }),
    // };

    // const [responsePlans, totalCount, statusCounts] = await Promise.all([
    //   prisma.rapidResponse.findMany({
    //     where: whereClause,
    //     orderBy: { [sortBy]: sortOrder },
    //     skip: (page - 1) * limit,
    //     take: limit,
    //     include: {
    //       affectedEntity: true,
    //       assessment: true,
    //       responder: true,
    //       donor: true,
    //     },
    //   }),
    //   prisma.rapidResponse.count({ where: whereClause }),
    //   prisma.rapidResponse.groupBy({
    //     by: ['status'],
    //     _count: true,
    //   }),
    // ]);

    // Mock data for now
    const mockResponsePlans = [
      {
        id: 'response-1',
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
          medicinesDelivered: [],
          medicalSuppliesDelivered: [],
          healthWorkersDeployed: 2,
          patientsTreated: 0,
        },
        otherItemsDelivered: [
          { item: 'Paracetamol', quantity: 100, unit: 'tablets' },
          { item: 'Bandages', quantity: 20, unit: 'rolls' },
        ],
        deliveryEvidence: [],
        createdAt: '2025-08-23T10:00:00Z',
        updatedAt: '2025-08-23T10:00:00Z',
      },
      {
        id: 'response-2',
        responseType: 'WASH',
        status: 'PLANNED',
        plannedDate: '2025-08-25T09:00:00Z',
        affectedEntityId: 'entity-2',
        responderId: 'responder-2',
        responderName: 'Jane Smith',
        verificationStatus: 'PENDING',
        syncStatus: 'SYNCED',
        data: {
          waterDeliveredLiters: 1000,
          waterContainersDistributed: 50,
          toiletsConstructed: 2,
          hygieneKitsDistributed: 25,
        },
        otherItemsDelivered: [],
        deliveryEvidence: [],
        createdAt: '2025-08-23T11:00:00Z',
        updatedAt: '2025-08-23T11:00:00Z',
      },
    ];

    // Apply filters to mock data
    let filteredPlans = mockResponsePlans;
    
    if (status) {
      filteredPlans = filteredPlans.filter(plan => plan.status === status);
    }
    
    if (responseType) {
      filteredPlans = filteredPlans.filter(plan => plan.responseType === responseType);
    }
    
    if (responderId) {
      filteredPlans = filteredPlans.filter(plan => plan.responderId === responderId);
    }
    
    if (affectedEntityId) {
      filteredPlans = filteredPlans.filter(plan => plan.affectedEntityId === affectedEntityId);
    }

    // Calculate pagination
    const totalCount = filteredPlans.length;
    const totalPages = Math.ceil(totalCount / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPlans = filteredPlans.slice(startIndex, endIndex);

    // Calculate status counts
    const statusCounts = filteredPlans.reduce(
      (acc, plan) => {
        acc[`${plan.status.toLowerCase()}Count`] = (acc[`${plan.status.toLowerCase()}Count`] || 0) + 1;
        return acc;
      },
      {
        plannedCount: 0,
        inProgressCount: 0,
        deliveredCount: 0,
        cancelledCount: 0,
      }
    );

    const response = {
      data: paginatedPlans,
      meta: {
        totalCount,
        ...statusCounts,
        page,
        limit,
        totalPages,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching response plans:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}