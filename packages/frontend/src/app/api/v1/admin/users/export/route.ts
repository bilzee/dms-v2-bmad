import { NextRequest, NextResponse } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';
import { requireAdminRole } from '@/lib/auth-middleware';


// GET /api/v1/admin/users/export - Export user data
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Get all users
    const result = await DatabaseService.listUsers({
      isActive: includeInactive ? undefined : true,
      limit: 10000 // Large limit to get all users
    });

    if (format === 'csv') {
      // Generate CSV content
      const headers = ['Name', 'Email', 'Phone', 'Organization', 'Roles', 'Status', 'Created At', 'Last Sync'];
      const csvRows = [headers.join(',')];

      for (const user of result.users) {
        const roles = user.roles.map(role => role.name).join(';');
        const status = user.isActive ? 'Active' : 'Inactive';
        const createdAt = user.createdAt.toISOString().split('T')[0];
        const lastSync = user.lastSync ? user.lastSync.toISOString().split('T')[0] : 'Never';

        const row = [
          `"${user.name || ''}"`,
          `"${user.email || ''}"`,
          `"${user.phone || ''}"`,
          `"${user.organization || ''}"`,
          `"${roles}"`,
          `"${status}"`,
          `"${createdAt}"`,
          `"${lastSync}"`
        ];
        
        csvRows.push(row.join(','));
      }

      const csvContent = csvRows.join('\n');
      
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="users-export-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    if (format === 'json') {
      // Return JSON export
      const exportData = {
        exportDate: new Date().toISOString(),
        totalUsers: result.total,
        filters: {
          includeInactive
        },
        users: result.users.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          organization: user.organization,
          roles: user.roles.map(role => ({
            id: role.id,
            name: role.name
          })),
          isActive: user.isActive,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
          lastSync: user.lastSync?.toISOString() || null
        }))
      };

      return NextResponse.json(exportData, {
        status: 200,
        headers: {
          'Content-Disposition': `attachment; filename="users-export-${new Date().toISOString().split('T')[0]}.json"`
        }
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid format',
      message: 'Supported formats: csv, json',
      timestamp: new Date().toISOString(),
    }, { status: 400 });

  } catch (error) {
    console.error('Failed to export users:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to export users',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}