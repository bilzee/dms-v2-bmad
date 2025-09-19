import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Extract role information from session
    const user = session.user as any;
    const activeRole = user.activeRole || null;
    const availableRoles = user.roles || [];
    const canSwitchRoles = availableRoles.length > 1;

    return NextResponse.json({
      success: true,
      data: {
        activeRole: activeRole ? {
          id: activeRole.id,
          name: activeRole.name,
          isActive: activeRole.isActive,
          permissions: user.permissions || []
        } : null,
        availableRoles: availableRoles.map((role: any) => ({
          id: role.id,
          name: role.name,
          isActive: role.isActive,
          permissions: [] // Can be populated from database if needed
        })),
        canSwitchRoles,
        permissions: user.permissions || []
      }
    });
  } catch (error) {
    console.error('Error fetching session role data:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}