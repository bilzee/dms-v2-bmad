import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/authOptions';
import DatabaseService from '@/lib/services/DatabaseService';
import { IncidentActionItem } from '@dms/shared';

// Use the DatabaseService's prisma instance
const prisma = DatabaseService.prisma;
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// POST /api/v1/incidents/[id]/action-items - Create new action item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: incidentId } = await params;
    let session = await auth();

    // Check for mock authentication in development
    if (!session?.user) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        // Handle mock authentication tokens for development
        if (token.startsWith('mock-token-')) {
          // Extract role from token (format: mock-token-rolename-timestamp)
          const tokenParts = token.split('-');
          const role = tokenParts[2]?.toUpperCase() || 'COORDINATOR';
          
          // Create mock session for development
          session = {
            user: {
              id: `mock-user-${role.toLowerCase()}`,
              name: `Mock ${role} User`,
              email: `${role.toLowerCase()}@test.com`,
              role: role,
              roles: [{ id: `${role.toLowerCase()}-role`, name: role, isActive: true }],
              activeRole: { id: `${role.toLowerCase()}-role`, name: role, isActive: true },
              permissions: []
            }
          } as any;
        }
      }
    }

    // Authentication check
    if (!session?.user) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized'] },
        { status: 401 }
      );
    }

    // Validate incident ID
    if (!incidentId || typeof incidentId !== 'string') {
      return NextResponse.json({
        success: false,
        errors: ['Invalid incident ID'],
        message: 'Incident ID is required and must be a string',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Check if incident exists
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId }
    });

    if (!incident) {
      return NextResponse.json({
        success: false,
        errors: ['Incident not found'],
        message: `No incident found with ID: ${incidentId}`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { description, assignedTo, dueDate, priority } = body;

    // Validate required fields
    if (!description || !priority) {
      return NextResponse.json({
        success: false,
        errors: ['Description and priority are required'],
        message: 'Please provide all required fields',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Validate priority value
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
    if (!validPriorities.includes(priority)) {
      return NextResponse.json({
        success: false,
        errors: ['Invalid priority value'],
        message: 'Priority must be LOW, MEDIUM, or HIGH',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Handle mock user ID for development
    let createdById = session.user.id;
    
    // If this is a mock user, use an existing real user ID or create one
    if (session.user.id.startsWith('mock-user-')) {
      // Try to find the coordinator test user
      const testUser = await prisma.user.findFirst({
        where: { 
          OR: [
            { email: 'coordinator@test.com' },
            { id: 'coordinator-user-id' }
          ]
        }
      });
      
      if (testUser) {
        createdById = testUser.id;
      } else {
        // Fallback to first available user
        const anyUser = await prisma.user.findFirst();
        if (anyUser) {
          createdById = anyUser.id;
        } else {
          // If no users exist, create a basic coordinator user
          const newUser = await prisma.user.create({
            data: {
              id: 'coordinator-user-id',
              name: 'Test Coordinator',
              email: 'coordinator@test.com',
              isActive: true
            }
          });
          createdById = newUser.id;
        }
      }
    }

    // Debug: Check if prisma.incidentActionItem is available
    console.log('=== PRISMA DEBUG INFO ===');
    console.log('Prisma client constructor:', prisma.constructor.name);
    console.log('Prisma client available models:', Object.keys(prisma).filter(key => !key.startsWith('_')));
    console.log('prisma.incidentActionItem available:', !!prisma.incidentActionItem);
    console.log('prisma.incidentActionItem type:', typeof prisma.incidentActionItem);
    console.log('prisma.incident available:', !!prisma.incident);
    console.log('prisma.incident type:', typeof prisma.incident);
    
    if (!prisma.incidentActionItem) {
      console.log('ERROR: incidentActionItem model not available!');
      return NextResponse.json({
        success: false,
        errors: ['IncidentActionItem model not available in Prisma client'],
        message: 'Prisma client not properly initialized',
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }

    // Create the action item
    const newActionItem = await prisma.incidentActionItem.create({
      data: {
        incidentId,
        description,
        assignedTo: assignedTo || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority as 'LOW' | 'MEDIUM' | 'HIGH',
        status: 'PENDING',
        createdById,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Transform to match expected interface
    const actionItemResponse: IncidentActionItem = {
      id: newActionItem.id,
      description: newActionItem.description,
      assignedTo: newActionItem.assignedTo || undefined,
      dueDate: newActionItem.dueDate?.toISOString() || undefined,
      status: newActionItem.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED',
      priority: newActionItem.priority as 'LOW' | 'MEDIUM' | 'HIGH',
      createdAt: newActionItem.createdAt.toISOString(),
      updatedAt: newActionItem.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: {
        actionItem: actionItemResponse,
      },
      message: 'Action item created successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to create action item:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json({
        success: false,
        errors: ['Invalid JSON in request body'],
        message: 'Please check your request format',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      errors: ['Failed to create action item'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// GET /api/v1/incidents/[id]/action-items - Get all action items for incident
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: incidentId } = await params;
    let session = await auth();

    // Check for mock authentication in development
    if (!session?.user) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        // Handle mock authentication tokens for development
        if (token.startsWith('mock-token-')) {
          // Extract role from token (format: mock-token-rolename-timestamp)
          const tokenParts = token.split('-');
          const role = tokenParts[2]?.toUpperCase() || 'COORDINATOR';
          
          // Create mock session for development
          session = {
            user: {
              id: `mock-user-${role.toLowerCase()}`,
              name: `Mock ${role} User`,
              email: `${role.toLowerCase()}@test.com`,
              role: role,
              roles: [{ id: `${role.toLowerCase()}-role`, name: role, isActive: true }],
              activeRole: { id: `${role.toLowerCase()}-role`, name: role, isActive: true },
              permissions: []
            }
          } as any;
        }
      }
    }

    // Authentication check
    if (!session?.user) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized'] },
        { status: 401 }
      );
    }

    // Validate incident ID
    if (!incidentId || typeof incidentId !== 'string') {
      return NextResponse.json({
        success: false,
        errors: ['Invalid incident ID'],
        message: 'Incident ID is required and must be a string',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Check if incident exists
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId }
    });

    if (!incident) {
      return NextResponse.json({
        success: false,
        errors: ['Incident not found'],
        message: `No incident found with ID: ${incidentId}`,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // Get all action items for the incident
    const actionItems = await prisma.incidentActionItem.findMany({
      where: { incidentId },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to match expected interface
    const transformedActionItems: IncidentActionItem[] = actionItems.map(item => ({
      id: item.id,
      description: item.description,
      assignedTo: item.assignedTo || undefined,
      dueDate: item.dueDate?.toISOString() || undefined,
      status: item.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED',
      priority: item.priority as 'LOW' | 'MEDIUM' | 'HIGH',
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        actionItems: transformedActionItems,
      },
      message: 'Action items retrieved successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to fetch action items:', error);
    
    return NextResponse.json({
      success: false,
      errors: ['Failed to fetch action items'],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}