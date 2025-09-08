import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

interface PreferencesRequest {
  roleId: string;
  preferences: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { errors: ['Unauthorized'] },
        { status: 401 }
      );
    }

    const body: PreferencesRequest = await request.json();
    const { roleId, preferences } = body;

    if (!roleId || !preferences) {
      return NextResponse.json(
        { errors: ['Role ID and preferences are required'] },
        { status: 400 }
      );
    }

    // Verify user has access to this role
    const userRoles = session.user.roles || [];
    const hasRoleAccess = userRoles.some((role: any) => 
      role.id === roleId || role.name === roleId.split('_')[0]
    );

    if (!hasRoleAccess) {
      return NextResponse.json(
        { errors: ['Access denied for this role'] },
        { status: 403 }
      );
    }

    // Validate preferences structure
    const allowedPreferenceKeys = [
      'dashboardLayout',
      'pinnedWidgets',
      'hiddenWidgets',
      'navigationOrder',
      'hiddenNavSections',
      'quickActions',
      'refreshInterval',
      'formDefaults',
      'fieldVisibility',
      'theme',
      'notifications',
    ];

    const invalidKeys = Object.keys(preferences).filter(
      key => !allowedPreferenceKeys.includes(key)
    );

    if (invalidKeys.length > 0) {
      return NextResponse.json(
        { errors: [`Invalid preference keys: ${invalidKeys.join(', ')}`] },
        { status: 400 }
      );
    }

    // Validate specific preference values
    if (preferences.dashboardLayout && 
        !['single-column', 'two-column', 'three-column', 'grid'].includes(preferences.dashboardLayout)) {
      return NextResponse.json(
        { errors: ['Invalid dashboard layout value'] },
        { status: 400 }
      );
    }

    if (preferences.refreshInterval && 
        (typeof preferences.refreshInterval !== 'number' || preferences.refreshInterval < 5000)) {
      return NextResponse.json(
        { errors: ['Refresh interval must be a number >= 5000ms'] },
        { status: 400 }
      );
    }

    // In production, save to database
    // await saveUserRolePreferences(session.user.id, roleId, preferences);

    // For now, simulate successful save
    console.log(`Saving preferences for user ${session.user.id}, role ${roleId}:`, preferences);

    return NextResponse.json({ 
      success: true, 
      message: 'Preferences saved successfully',
      roleId,
      preferences,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error saving role preferences:', error);
    return NextResponse.json(
      { errors: ['Internal server error'] },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { errors: ['Unauthorized'] },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');

    if (!roleId) {
      return NextResponse.json(
        { errors: ['Role ID is required'] },
        { status: 400 }
      );
    }

    // Verify user has access to this role
    const userRoles = session.user.roles || [];
    const hasRoleAccess = userRoles.some((role: any) => 
      role.id === roleId || role.name === roleId.split('_')[0]
    );

    if (!hasRoleAccess) {
      return NextResponse.json(
        { errors: ['Access denied for this role'] },
        { status: 403 }
      );
    }

    // In production, fetch from database
    // const preferences = await getUserRolePreferences(session.user.id, roleId);

    // For now, return empty preferences
    const preferences = {};

    return NextResponse.json({ 
      success: true,
      roleId,
      preferences,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching role preferences:', error);
    return NextResponse.json(
      { errors: ['Internal server error'] },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { errors: ['Unauthorized'] },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');

    if (!roleId) {
      return NextResponse.json(
        { errors: ['Role ID is required'] },
        { status: 400 }
      );
    }

    // Verify user has access to this role
    const userRoles = session.user.roles || [];
    const hasRoleAccess = userRoles.some((role: any) => 
      role.id === roleId || role.name === roleId.split('_')[0]
    );

    if (!hasRoleAccess) {
      return NextResponse.json(
        { errors: ['Access denied for this role'] },
        { status: 403 }
      );
    }

    // In production, delete from database
    // await deleteUserRolePreferences(session.user.id, roleId);

    console.log(`Resetting preferences for user ${session.user.id}, role ${roleId}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Preferences reset successfully',
      roleId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error resetting role preferences:', error);
    return NextResponse.json(
      { errors: ['Internal server error'] },
      { status: 500 }
    );
  }
}