/**
 * GET /api/v1/sync/conflicts - Get pending conflicts queue
 * 
 * Provides paginated list of pending conflicts with filtering and statistics.
 * Supports filtering by severity, entity type, and conflict type.
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncEngine } from '@/lib/sync/SyncEngine';

interface ConflictQueueFilters {
  entityType?: string[];
  severity?: string[];
  status?: string[];
}

interface ConflictQueueResponse {
  success: boolean;
  data: {
    conflicts: any[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
    filters: ConflictQueueFilters;
    stats: {
      totalPending: number;
      criticalCount: number;
      avgResolutionTime: number;
    };
  };
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<ConflictQueueResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const entityTypes = searchParams.getAll('entityType');
    const severities = searchParams.getAll('severity');
    const statuses = searchParams.getAll('status');

    // Validate pagination parameters
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return NextResponse.json({
        success: false,
        data: {
          conflicts: [],
          pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
          filters: {},
          stats: { totalPending: 0, criticalCount: 0, avgResolutionTime: 0 }
        },
        error: 'Invalid pagination parameters'
      }, { status: 400 });
    }

    // Get all pending conflicts
    let conflicts = syncEngine.getPendingConflicts();

    // Apply filters
    if (entityTypes.length > 0) {
      conflicts = conflicts.filter(conflict => 
        entityTypes.includes(conflict.entityType)
      );
    }

    if (severities.length > 0) {
      conflicts = conflicts.filter(conflict => 
        severities.includes(conflict.severity)
      );
    }

    if (statuses.length > 0) {
      conflicts = conflicts.filter(conflict => 
        statuses.includes(conflict.status)
      );
    }

    // Calculate pagination
    const total = conflicts.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedConflicts = conflicts.slice(startIndex, endIndex);

    // Get statistics
    const stats = syncEngine.getConflictStats();

    // Calculate average resolution time (mock implementation)
    const avgResolutionTime = stats.resolvedConflicts > 0 ? 
      Math.round(Math.random() * 120 + 30) : 0; // Mock: 30-150 minutes

    const response: ConflictQueueResponse = {
      success: true,
      data: {
        conflicts: paginatedConflicts.map(conflict => ({
          ...conflict,
          detectedAt: conflict.detectedAt.toISOString(),
          resolvedAt: conflict.resolvedAt?.toISOString(),
          auditTrail: conflict.auditTrail.map(entry => ({
            ...entry,
            timestamp: entry.timestamp.toISOString()
          }))
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages
        },
        filters: {
          entityType: entityTypes,
          severity: severities,
          status: statuses
        },
        stats: {
          totalPending: stats.pendingConflicts,
          criticalCount: stats.criticalConflicts,
          avgResolutionTime
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to get conflicts queue:', error);
    
    return NextResponse.json({
      success: false,
      data: {
        conflicts: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
        filters: {},
        stats: { totalPending: 0, criticalCount: 0, avgResolutionTime: 0 }
      },
      error: 'Internal server error'
    }, { status: 500 });
  }
}