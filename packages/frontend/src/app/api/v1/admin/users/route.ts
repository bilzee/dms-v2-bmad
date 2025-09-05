import { NextRequest, NextResponse } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';
import { z } from 'zod';
import { requireAdminRole, getCurrentUser } from '@/lib/auth-middleware';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';







// Validation schemas
const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  organization: z.string().optional(),
  roleIds: z.array(z.string()).min(1, 'At least one role is required'),
  isActive: z.boolean().optional().default(true)
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  organization: z.string().optional(),
  roleIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional()
});


// GET /api/v1/admin/users - List users with filtering/pagination
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    
    const filters: UserListFilters = {
      search: searchParams.get('search') || undefined,
      role: searchParams.get('role') || undefined,
      isActive: searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined,
      organization: searchParams.get('organization') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
      sortBy: (searchParams.get('sortBy') as any) || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
    };

    const result = await DatabaseService.listUsers({
      search: filters.search,
      role: filters.role,
      isActive: filters.isActive,
      limit: filters.limit,
      offset: filters.offset
    });

    // Get user statistics
    const stats = await DatabaseService.getUserStats();

    const usersByRole = await Promise.all([
      DatabaseService.listUsers({ role: 'ASSESSOR', limit: 0 }),
      DatabaseService.listUsers({ role: 'RESPONDER', limit: 0 }),
      DatabaseService.listUsers({ role: 'COORDINATOR', limit: 0 }),
      DatabaseService.listUsers({ role: 'DONOR', limit: 0 }),
      DatabaseService.listUsers({ role: 'VERIFIER', limit: 0 }),
      DatabaseService.listUsers({ role: 'ADMIN', limit: 0 })
    ]);

    const response = {
      success: true,
      data: {
        users: result.users.map(user => ({
          ...user,
          accountStatus: user.isActive ? 'ACTIVE' : 'INACTIVE',
          lastLogin: null // TODO: Implement last login tracking
        })),
        totalCount: result.total,
        pagination: {
          page: Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1,
          pageSize: filters.limit || 50,
          totalPages: Math.ceil(result.total / (filters.limit || 50)),
          totalCount: result.total
        },
        stats: {
          totalUsers: stats.totalUsers,
          activeUsers: stats.activeUsers,
          inactiveUsers: stats.inactiveUsers,
          recentUsers: stats.recentUsers,
          usersByRole: {
            'ASSESSOR': usersByRole[0].total,
            'RESPONDER': usersByRole[1].total,
            'COORDINATOR': usersByRole[2].total,
            'DONOR': usersByRole[3].total,
            'VERIFIER': usersByRole[4].total,
            'ADMIN': usersByRole[5].total
          }
        }
      },
      message: 'Users retrieved successfully',
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

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

// POST /api/v1/admin/users - Create single user account
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const body = await request.json();
    
    // Validate request data
    const validationResult = createUserSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid request data',
        details: validationResult.error.errors,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    const userData = validationResult.data;

    // Check if email already exists
    const existingUser = await DatabaseService.listUsers({ search: userData.email });
    if (existingUser.users.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Email already exists',
        message: 'A user with this email address already exists',
        timestamp: new Date().toISOString(),
      }, { status: 409 });
    }

    // Get current user info from session for audit trail
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        message: 'Unable to identify current user',
        timestamp: new Date().toISOString(),
      }, { status: 401 });
    }

    const currentUserId = currentUser.id;
    const currentUserName = currentUser.name;

    const newUser = await DatabaseService.createUserWithAdmin({
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      organization: userData.organization,
      roleIds: userData.roleIds,
      isActive: userData.isActive,
      createdBy: currentUserId,
      createdByName: currentUserName
    });

    // Generate temporary credentials and send welcome email
    try {
      // Generate temporary credentials
      const credentials = PasswordService.generateTemporaryCredentials();
      
      // Update user with reset token information
      await DatabaseService.updateUser(newUser.id, {
        resetToken: credentials.resetToken,
        resetTokenExpiry: credentials.expiresAt,
        requirePasswordReset: true
      });
      
      // Send welcome email with temporary credentials
      await EmailService.sendWelcomeEmail({
        name: userData.name,
        email: userData.email,
        temporaryPassword: credentials.password,
        resetToken: credentials.resetToken,
        organizationName: userData.organization
      });
      
      console.log(`User created successfully with welcome email sent: ${userData.email}`);
      
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the user creation, but log the error
      // The user was created successfully, but they'll need manual credential setup
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          ...newUser,
          accountStatus: newUser.isActive ? 'ACTIVE' : 'INACTIVE',
          lastLogin: null,
          hasTemporaryPassword: true // Indicate temporary credentials were generated
        }
      },
      message: 'User created successfully. Welcome email sent with temporary credentials.',
      timestamp: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create user:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create user',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
