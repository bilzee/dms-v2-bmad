import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { PriorityRule } from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Import from parent route file (in real implementation, use shared storage/database)
// For this demo, we'll use the same mock data structure
let priorityRules: PriorityRule[] = [
  {
    id: 'rule-1',
    name: 'Health Emergency Priority',
    entityType: 'ASSESSMENT',
    conditions: [
      {
        field: 'data.assessmentType',
        operator: 'EQUALS',
        value: 'HEALTH',
        modifier: 20,
      },
    ],
    priorityModifier: 25,
    isActive: true,
    createdBy: 'admin',
    createdAt: new Date('2025-08-27T10:00:00Z'),
  },
];

const updateRuleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  entityType: z.enum(['ASSESSMENT', 'RESPONSE', 'MEDIA']).optional(),
  conditions: z.array(z.object({
    field: z.string().min(1),
    operator: z.enum(['EQUALS', 'GREATER_THAN', 'CONTAINS', 'IN_ARRAY']),
    value: z.any(),
    modifier: z.number().int().min(-100).max(100),
  })).max(5).optional(),
  priorityModifier: z.number().int().min(-100).max(100).optional(),
  isActive: z.boolean().optional(),
});

/**
 * PUT /api/v1/sync/priority/rules/[id] - Update priority rule
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // In real implementation, add authentication and authorization checks
    // const session = await getServerSession(authOptions);
    // if (!session?.user || session.user.role !== 'COORDINATOR') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const ruleId = params.id;
    const body = await request.json();

    // Validate request body
    const validatedData = updateRuleSchema.parse(body);

    // Find the rule
    const ruleIndex = priorityRules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex === -1) {
      return NextResponse.json(
        { success: false, errors: ['Priority rule not found'] },
        { status: 404 }
      );
    }

    // Update the rule
    const updatedRule = {
      ...priorityRules[ruleIndex],
      ...validatedData,
    };

    priorityRules[ruleIndex] = updatedRule;

    return NextResponse.json({
      success: true,
      data: updatedRule,
      message: 'Priority rule updated successfully',
    });

  } catch (error) {
    console.error('Failed to update priority rule:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          errors: ['Invalid request data'],
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, errors: ['Failed to update priority rule'] },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/sync/priority/rules/[id] - Delete priority rule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // In real implementation, add authentication and authorization checks
    // const session = await getServerSession(authOptions);
    // if (!session?.user || session.user.role !== 'COORDINATOR') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const ruleId = params.id;

    // Find the rule
    const ruleIndex = priorityRules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex === -1) {
      return NextResponse.json(
        { success: false, errors: ['Priority rule not found'] },
        { status: 404 }
      );
    }

    // Remove the rule
    const deletedRule = priorityRules.splice(ruleIndex, 1)[0];

    return NextResponse.json({
      success: true,
      data: { id: deletedRule.id },
      message: 'Priority rule deleted successfully',
    });

  } catch (error) {
    console.error('Failed to delete priority rule:', error);
    return NextResponse.json(
      { success: false, errors: ['Failed to delete priority rule'] },
      { status: 500 }
    );
  }
}