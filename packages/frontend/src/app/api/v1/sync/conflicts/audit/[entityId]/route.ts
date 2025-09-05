/**
 * GET /api/v1/sync/conflicts/audit/[entityId] - Get conflict resolution audit trail
 * 
 * Returns complete audit trail for all conflicts related to a specific entity,
 * providing comprehensive history for accountability and compliance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncEngine } from '@/lib/sync/SyncEngine';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

interface ConflictAuditResponse {
  success: boolean;
  data?: {
    entityId: string;
    entityType?: string;
    conflicts: Array<{
      conflictId: string;
      severity: string;
      conflictType: string;
      status: string;
      detectedAt: string;
      resolvedAt?: string;
      resolutionStrategy?: string;
      resolvedBy?: string;
      auditTrail: Array<{
        timestamp: string;
        action: string;
        performedBy: string;
        details: any;
      }>;
    }>;
    summary: {
      totalConflicts: number;
      resolvedConflicts: number;
      pendingConflicts: number;
      averageResolutionTime?: number;
      lastConflictDate?: string;
    };
  };
  error?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { entityId: string } }
): Promise<NextResponse<ConflictAuditResponse>> {
  try {
    const entityId = params.entityId;
    
    if (!entityId) {
      return NextResponse.json({
        success: false,
        error: 'Entity ID is required'
      }, { status: 400 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const includeResolved = searchParams.get('includeResolved') !== 'false';
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortOrder = searchParams.get('sortOrder') || 'desc'; // 'asc' or 'desc'

    // Get conflicts for this entity
    let entityConflicts = syncEngine.getConflictsForEntity(entityId);
    
    // Filter by resolved status if requested
    if (!includeResolved) {
      entityConflicts = entityConflicts.filter(conflict => conflict.status === 'PENDING');
    }

    // Sort conflicts
    entityConflicts.sort((a, b) => {
      const dateA = a.detectedAt.getTime();
      const dateB = b.detectedAt.getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    // Apply limit
    if (limit > 0) {
      entityConflicts = entityConflicts.slice(0, limit);
    }

    // Calculate summary statistics
    const allEntityConflicts = syncEngine.getConflictsForEntity(entityId);
    const resolvedConflicts = allEntityConflicts.filter(c => c.status === 'RESOLVED');
    const pendingConflicts = allEntityConflicts.filter(c => c.status === 'PENDING');
    
    // Calculate average resolution time for resolved conflicts
    let averageResolutionTime: number | undefined;
    if (resolvedConflicts.length > 0) {
      const totalResolutionTime = resolvedConflicts.reduce((total, conflict) => {
        if (conflict.resolvedAt) {
          const resolutionTime = conflict.resolvedAt.getTime() - conflict.detectedAt.getTime();
          return total + resolutionTime;
        }
        return total;
      }, 0);
      averageResolutionTime = Math.round(totalResolutionTime / resolvedConflicts.length / 60000); // Convert to minutes
    }

    // Find the entity type from any conflict (they should all be the same)
    const entityType = entityConflicts.length > 0 ? entityConflicts[0].entityType : undefined;

    // Get last conflict date
    const lastConflictDate = allEntityConflicts.length > 0 
      ? allEntityConflicts[0].detectedAt.toISOString() 
      : undefined;

    const response: ConflictAuditResponse = {
      success: true,
      data: {
        entityId,
        entityType,
        conflicts: entityConflicts.map(conflict => ({
          conflictId: conflict.id,
          severity: conflict.severity,
          conflictType: conflict.conflictType,
          status: conflict.status,
          detectedAt: conflict.detectedAt.toISOString(),
          resolvedAt: conflict.resolvedAt?.toISOString(),
          resolutionStrategy: conflict.resolutionStrategy,
          resolvedBy: conflict.resolvedBy,
          auditTrail: conflict.auditTrail.map(entry => ({
            timestamp: entry.timestamp.toISOString(),
            action: entry.action,
            performedBy: entry.performedBy,
            details: entry.details
          }))
        })),
        summary: {
          totalConflicts: allEntityConflicts.length,
          resolvedConflicts: resolvedConflicts.length,
          pendingConflicts: pendingConflicts.length,
          averageResolutionTime,
          lastConflictDate
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to get conflict audit trail:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}