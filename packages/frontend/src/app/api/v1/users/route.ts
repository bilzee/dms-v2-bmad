import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import DatabaseService from '@/lib/services/DatabaseService';

// Middleware function to check admin access
async function requireAdminRole(request: NextRequest) {
  // For now, return null (allow access) - would need proper auth integration
  // TODO: Implement proper admin role checking with NextAuth
  return null;
}

// GET /api/v1/users - List users with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const isActive = searchParams.get('isActive') === 'true' ? true : 
                    searchParams.get('isActive') === 'false' ? false : undefined;

    // Get users from database
    const result = await DatabaseService.listUsers({
      search: search || undefined,
      role: role || undefined,
      isActive,
      limit: pageSize,
      offset: (page - 1) * pageSize
    });

    return NextResponse.json({
      success: true,
      data: {
        users: result.users.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          isActive: user.isActive,
          roles: user.roles.map(role => ({
            id: role.id,
            name: role.name,
            isActive: role.isActive
          })),
          activeRole: user.activeRole ? {
            id: user.activeRole.id,
            name: user.activeRole.name
          } : null,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        })),
        pagination: {
          page,
          pageSize,
          totalPages: result.pagination.totalPages,
          totalCount: result.total,
        }
      },
      message: `Found ${result.total} users`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to fetch users:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch users',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// POST /api/v1/users - Create new user
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.email || !body.password) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        message: 'Name, email, and password are required',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email format',
        message: 'Please provide a valid email address',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Validate roles array
    if (!Array.isArray(body.roles) || body.roles.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid roles',
        message: 'At least one role must be assigned',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Create user in database
    const newUser = await DatabaseService.createUser({
      name: body.name,
      email: body.email,
      password: body.password,
      roles: body.roles
    });

    // Log the user creation
    await DatabaseService.logUserAction({
      userId: newUser.id,
      action: 'CREATE_USER',
      resource: 'USER',
      details: { newUserId: newUser.id, roles: body.roles },
      timestamp: new Date()
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          isActive: newUser.isActive,
          roles: newUser.roles.map(role => ({
            id: role.id,
            name: role.name,
            isActive: role.isActive
          })),
          activeRole: newUser.activeRole ? {
            id: newUser.activeRole.id,
            name: newUser.activeRole.name
          } : null,
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt
        }
      },
      message: 'User created successfully',
      timestamp: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create user:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body',
        message: 'Please check your request format',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Check for unique constraint violation (duplicate email)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({
        success: false,
        error: 'Email already exists',
        message: 'A user with this email address already exists',
        timestamp: new Date().toISOString(),
      }, { status: 409 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create user',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}