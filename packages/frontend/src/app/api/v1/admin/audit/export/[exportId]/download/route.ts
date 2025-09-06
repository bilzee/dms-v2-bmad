// app/api/v1/admin/audit/export/[exportId]/download/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { auditExportService } from '@/lib/audit-export';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

/**
 * Check if user has admin role
 */
async function requireAdminRole(request: NextRequest) {
  try {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      }, { status: 401 });
    }

    // Check if user has admin role
    if (!token.roles || !Array.isArray(token.roles) || !token.roles.includes('ADMIN')) {
      return NextResponse.json({
        success: false,
        error: 'Access denied',
        message: 'Admin role required to download audit data'
      }, { status: 403 });
    }

    return null; // Access granted
  } catch (error) {
    console.error('Admin role check failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Authentication error',
      message: 'Failed to verify user permissions'
    }, { status: 500 });
  }
}

/**
 * GET /api/v1/admin/audit/export/[exportId]/download
 * Download the export file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { exportId: string } }
) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const { exportId } = params;

    if (!exportId) {
      return NextResponse.json({
        success: false,
        error: 'Missing export ID',
        message: 'Export ID is required'
      }, { status: 400 });
    }

    // Get export status to verify it exists and is completed
    const exportData = await auditExportService.getExportStatus(exportId);

    if (!exportData) {
      return NextResponse.json({
        success: false,
        error: 'Export not found',
        message: 'The specified export ID does not exist'
      }, { status: 404 });
    }

    if (exportData.status !== 'COMPLETED') {
      return NextResponse.json({
        success: false,
        error: 'Export not ready',
        message: `Export status is ${exportData.status}. Only completed exports can be downloaded.`
      }, { status: 400 });
    }

    // Check if export has expired
    if (exportData.expiresAt && new Date() > new Date(exportData.expiresAt)) {
      return NextResponse.json({
        success: false,
        error: 'Export expired',
        message: 'This export has expired and is no longer available for download'
      }, { status: 410 });
    }

    // Get the export format from database to determine file stream
    const exportRecord = await auditExportService.getExportStatus(exportId);
    if (!exportRecord) {
      return NextResponse.json({
        success: false,
        error: 'Export details not found',
        message: 'Unable to retrieve export details'
      }, { status: 404 });
    }

    // Get file stream - we need to determine format from the export record
    // For now, we'll assume we can get format from URL or default to JSON
    const format = request.nextUrl.searchParams.get('format') || 'JSON';
    const fileStream = auditExportService.getExportFileStream(exportId, format);

    if (!fileStream) {
      return NextResponse.json({
        success: false,
        error: 'Export file not found',
        message: 'The export file is not available. It may have been deleted or corrupted.'
      }, { status: 404 });
    }

    // Determine content type and filename based on format
    let contentType = 'application/octet-stream';
    let filename = `audit-export-${exportId}`;

    switch (format.toUpperCase()) {
      case 'JSON':
        contentType = 'application/json';
        filename += '.json';
        break;
      case 'CSV':
        contentType = 'text/csv';
        filename += '.csv';
        break;
      case 'PDF':
        contentType = 'application/pdf';
        filename += '.pdf';
        break;
    }

    // Create response with file stream
    const response = new NextResponse(fileStream as any);
    
    response.headers.set('Content-Type', contentType);
    response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    if (exportData.fileSize) {
      response.headers.set('Content-Length', exportData.fileSize.toString());
    }

    return response;

  } catch (error) {
    console.error('Failed to download export file:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to download export',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}