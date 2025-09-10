import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { PriorityRule, PriorityCondition } from '@dms/shared';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Mock database for priority rules (in real implementation, use actual database)
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
  {
    id: 'rule-2',
    name: 'High Population Impact',
    entityType: 'ASSESSMENT',
    conditions: [
      {
        field: 'data.affectedPopulationEstimate',
        operator: 'GREATER_THAN',
        value: 1000,
        modifier: 15,
      },
    ],
    priorityModifier: 20,
    isActive: true,
    createdBy: 'admin',
    createdAt: new Date('2025-08-27T10:00:00Z'),
  },
];

// Validation schemas
const priorityConditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['EQUALS', 'GREATER_THAN', 'CONTAINS', 'IN_ARRAY']),
  value: z.any(),
  modifier: z.number().int().min(-100).max(100),
});

const priorityRuleSchema = z.object({
  name: z.string().min(1).max(100),
  entityType: z.enum(['ASSESSMENT', 'RESPONSE', 'MEDIA']),
  conditions: z.array(priorityConditionSchema).max(5), // Max 5 conditions per rule
  priorityModifier: z.number().int().min(-100).max(100),
  isActive: z.boolean().optional().default(true),
  createdBy: z.string().min(1),
});

/**
 * GET /api/v1/sync/priority/rules - Get all priority rules
 */
export async function GET(request: NextRequest) {
  try {
    // In real implementation, add authentication check
    // const session = await getServerSession(authOptions);
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    return NextResponse.json({
      success: true,
      data: priorityRules.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    });
  } catch (error) {
    console.error('Failed to get priority rules:', error);
    return NextResponse.json(
      { success: false, errors: ['Failed to get priority rules'] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/sync/priority/rules - Create new priority rule
 */
export async function POST(request: NextRequest) {
  try {
    // In real implementation, add authentication and authorization checks
    // const session = await getServerSession(authOptions);
    // if (!session?.user || session.user.role !== 'COORDINATOR') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await request.json();
    
    // Validate request body
    const validatedData = priorityRuleSchema.parse(body);

    // Rate limiting check (max 10 rules per user per hour)
    const userRules = priorityRules.filter(
      rule => rule.createdBy === validatedData.createdBy &&
      rule.createdAt.getTime() > Date.now() - 3600000 // 1 hour
    );
    
    if (userRules.length >= 10) {
      return NextResponse.json(
        { success: false, errors: ['Rate limit exceeded: maximum 10 rules per hour'] },
        { status: 429 }
      );
    }

    // Create new rule
    const newRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...validatedData,
      createdAt: new Date(),
    } as any;

    priorityRules.push(newRule);

    return NextResponse.json({
      success: true,
      data: newRule,
      message: 'Priority rule created successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create priority rule:', error);
    
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
      { success: false, errors: ['Failed to create priority rule'] },
      { status: 500 }
    );
  }
}