// app/api/v1/admin/audit/export/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { auditExportService } from '@/lib/audit-export';
import { 
  AuditDataExportRequest, 
  AuditDataExportResponse 
} from '@dms/shared/types/admin';

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
        message: 'Admin role required to export audit data'
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
 * POST /api/v1/admin/audit/export
 * Create a new audit data export
 */
export async function POST(request: NextRequest): Promise<NextResponse<AuditDataExportResponse>> {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    // Get user info for audit trail
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    const requestedBy = token?.sub || 'unknown';
    const requestedByName = token?.name || 'Unknown User';

    // Parse request body
    const body: AuditDataExportRequest = await request.json();

    // Validate request
    const validationError = validateExportRequest(body);
    if (validationError) {
      const response: AuditDataExportResponse = {
        success: false,
        error: 'Invalid export request',
        message: validationError,
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Create export
    const result = await auditExportService.createExport(
      body,
      requestedBy,
      requestedByName
    );

    const response: AuditDataExportResponse = {
      success: true,
      data: result,
      message: 'Export request created successfully. Processing will begin shortly.',
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to create audit export:', error);
    
    const response: AuditDataExportResponse = {
      success: false,
      error: 'Failed to create export',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * GET /api/v1/admin/audit/export?exportId={id}
 * Get export status
 */
export async function GET(request: NextRequest): Promise<NextResponse<AuditDataExportResponse>> {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const exportId = searchParams.get('exportId');

    if (!exportId) {
      const response: AuditDataExportResponse = {
        success: false,
        error: 'Missing export ID',
        message: 'Export ID parameter is required',
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Get export status
    const exportData = await auditExportService.getExportStatus(exportId);

    if (!exportData) {
      const response: AuditDataExportResponse = {
        success: false,
        error: 'Export not found',
        message: 'The specified export ID does not exist',
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: AuditDataExportResponse = {
      success: true,
      data: exportData,
      message: 'Export status retrieved successfully',
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to get export status:', error);
    
    const response: AuditDataExportResponse = {
      success: false,
      error: 'Failed to get export status',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * Validate export request
 */
function validateExportRequest(request: AuditDataExportRequest): string | null {
  // Check required fields
  if (!request.format) {
    return 'Export format is required';
  }

  if (!['CSV', 'JSON', 'PDF'].includes(request.format)) {
    return 'Export format must be CSV, JSON, or PDF';
  }

  if (!request.dateRange || !request.dateRange.start || !request.dateRange.end) {
    return 'Date range with start and end dates is required';
  }

  if (!request.dataTypes || request.dataTypes.length === 0) {
    return 'At least one data type must be specified';
  }

  const validDataTypes = ['USER_ACTIVITY', 'SECURITY_EVENTS', 'PERFORMANCE_METRICS'];
  for (const dataType of request.dataTypes) {
    if (!validDataTypes.includes(dataType)) {
      return `Invalid data type: ${dataType}. Valid types are: ${validDataTypes.join(', ')}`;
    }
  }

  // Validate date range
  const startDate = new Date(request.dateRange.start);
  const endDate = new Date(request.dateRange.end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return 'Invalid date format in date range';
  }

  if (startDate >= endDate) {
    return 'Start date must be before end date';
  }

  // Check if date range is not too large (max 1 year)
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  if (endDate.getTime() - startDate.getTime() > oneYearMs) {
    return 'Date range cannot exceed one year';
  }

  // Check if date range is not in the future
  const now = new Date();
  if (startDate > now) {
    return 'Start date cannot be in the future';
  }

  return null; // Valid request
}