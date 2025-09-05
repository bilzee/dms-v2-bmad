import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

interface RolePreferencesRequest {
  roleId: string;
  preferences: Record<string, any>;
}

interface RolePreferencesResponse {
  success: boolean;
  preferences?: Record<string, any>;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<RolePreferencesResponse>> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { roleId, preferences } = await request.json() as RolePreferencesRequest;

    if (!roleId || !preferences) {
      return NextResponse.json(
        { success: false, error: 'Role ID and preferences are required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { roles: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const hasRole = user.roles.some(role => role.id === roleId);
    if (!hasRole) {
      return NextResponse.json(
        { success: false, error: 'User does not have access to this role' },
        { status: 403 }
      );
    }

    const savedPreferences = await prisma.userRolePreferences.upsert({
      where: {
        userId_roleId: {
          userId: session.user.id,
          roleId: roleId
        }
      },
      update: {
        preferences: preferences,
        updatedAt: new Date()
      },
      create: {
        userId: session.user.id,
        roleId: roleId,
        preferences: preferences
      }
    });

    return NextResponse.json({
      success: true,
      preferences: savedPreferences.preferences
    });

  } catch (error) {
    console.error('Error saving role preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<RolePreferencesResponse>> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');

    if (!roleId) {
      return NextResponse.json(
        { success: false, error: 'Role ID is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { roles: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const hasRole = user.roles.some(role => role.id === roleId);
    if (!hasRole) {
      return NextResponse.json(
        { success: false, error: 'User does not have access to this role' },
        { status: 403 }
      );
    }

    const rolePreferences = await prisma.userRolePreferences.findUnique({
      where: {
        userId_roleId: {
          userId: session.user.id,
          roleId: roleId
        }
      }
    });

    return NextResponse.json({
      success: true,
      preferences: rolePreferences?.preferences || {}
    });

  } catch (error) {
    console.error('Error getting role preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}