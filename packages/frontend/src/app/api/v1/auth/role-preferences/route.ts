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
        { success: false, errors: ['Unauthorized'] },
        { status: 401 }
      );
    }

    const { roleId, preferences } = await request.json() as RolePreferencesRequest;

    if (!roleId || !preferences) {
      return NextResponse.json(
        { success: false, errors: ['Role ID and preferences are required'] },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { roles: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, errors: ['User not found'] },
        { status: 404 }
      );
    }

    const hasRole = user.roles.some(role => role.id === roleId);
    if (!hasRole) {
      return NextResponse.json(
        { success: false, errors: ['User does not have access to this role'] },
        { status: 403 }
      );
    }

    // TODO: Implement user role preferences when schema is available
    const savedPreferences = {
      userId: session.user.id,
      roleId: roleId,
      preferences: preferences,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return NextResponse.json({
      success: true,
      preferences: savedPreferences.preferences
    });

  } catch (error) {
    console.error('Error saving role preferences:', error);
    return NextResponse.json(
      { success: false, errors: ['Internal server error'] },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<RolePreferencesResponse>> {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized'] },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');

    if (!roleId) {
      return NextResponse.json(
        { success: false, errors: ['Role ID is required'] },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { roles: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, errors: ['User not found'] },
        { status: 404 }
      );
    }

    const hasRole = user.roles.some(role => role.id === roleId);
    if (!hasRole) {
      return NextResponse.json(
        { success: false, errors: ['User does not have access to this role'] },
        { status: 403 }
      );
    }

    // TODO: Implement user role preferences when schema is available
    return NextResponse.json({
      success: true,
      preferences: {}
    });

  } catch (error) {
    console.error('Error getting role preferences:', error);
    return NextResponse.json(
      { success: false, errors: ['Internal server error'] },
      { status: 500 }
    );
  }
}