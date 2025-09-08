import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import DatabaseService from '@/lib/services/DatabaseService';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// GET /api/v1/donors/achievements/rules - Get achievement rules
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get active achievement rules
    const rules = await DatabaseService.getActiveAchievementRules();

    return NextResponse.json({
      success: true,
      data: {
        rules: rules.map(rule => ({
          id: rule.id,
          type: rule.type,
          title: rule.title,
          description: rule.description,
          category: rule.category,
          triggerType: rule.triggerType,
          triggerConditions: rule.triggerConditions,
          badge: rule.badge,
          points: rule.points,
          priority: rule.priority,
          isActive: rule.isActive,
          createdAt: rule.createdAt,
          updatedAt: rule.updatedAt
        })),
        summary: {
          totalRules: rules.length,
          activeRules: rules.filter(r => r.isActive).length,
          categories: [...new Set(rules.map(r => r.category))],
          triggerTypes: [...new Set(rules.map(r => r.triggerType))]
        }
      },
      message: `Retrieved ${rules.length} achievement rules`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching achievement rules:', error);

    return NextResponse.json(
      {
        success: false,
      data: null,
        errors: ['Failed to fetch achievement rules'],
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// POST /api/v1/donors/achievements/rules - Create achievement rule (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Check admin role
    // const hasAdminRole = await checkAdminRole(session.user.id);
    // if (!hasAdminRole) {
    //   return NextResponse.json(
    //     { success: false, message: 'Admin role required' },
    //     { status: 403 }
    //   );
    // }

    const body = await request.json();

    // Validate required fields
    if (!body.type || !body.title || !body.category || !body.triggerType) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Missing required fields'],
        message: 'Type, title, category, and triggerType are required',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Create achievement rule
    const newRule = await DatabaseService.createAchievementRule({
      type: body.type,
      title: body.title,
      description: body.description || '',
      category: body.category,
      triggerType: body.triggerType,
      triggerConditions: body.triggerConditions || {},
      badge: body.badge || {},
      points: body.points || 0,
      priority: body.priority || 1
    });

    // Log the rule creation
    await DatabaseService.logUserAction({
      userId: session.user.id,
      action: 'CREATE_ACHIEVEMENT_RULE',
      resource: 'ACHIEVEMENT_RULE',
      details: { ruleId: newRule.id, type: body.type },
      timestamp: new Date()
    });

    return NextResponse.json({
      success: true,
      data: {
        rule: {
          id: newRule.id,
          type: newRule.type,
          title: newRule.title,
          description: newRule.description,
          category: newRule.category,
          triggerType: newRule.triggerType,
          triggerConditions: newRule.triggerConditions,
          badge: newRule.badge,
          points: newRule.points,
          priority: newRule.priority,
          isActive: newRule.isActive,
          createdAt: newRule.createdAt,
          updatedAt: newRule.updatedAt
        }
      },
      message: 'Achievement rule created successfully',
      timestamp: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create achievement rule:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json({
        success: false,
      data: null,
        errors: ['Invalid JSON in request body'],
        message: 'Please check your request format',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      data: null,
      errors: ['Failed to create achievement rule'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}