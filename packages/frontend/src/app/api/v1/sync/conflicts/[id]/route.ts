/**
 * GET /api/v1/sync/conflicts/[id] - Get detailed conflict information
 * 
 * Returns detailed conflict information including version comparison data,
 * audit trail, and resolution options for a specific conflict.
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncEngine } from '@/lib/sync/SyncEngine';

interface ConflictDetailResponse {
  success: boolean;
  data?: {
    conflict: any;
    versionComparison: {
      localVersion: any;
      serverVersion: any;
      conflictFields: string[];
      suggestedResolution: 'LOCAL_WINS' | 'SERVER_WINS' | 'MERGE' | 'MANUAL';
    };
  };
  error?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ConflictDetailResponse>> {
  try {
    const conflictId = params.id;
    
    if (!conflictId) {
      return NextResponse.json({
        success: false,
        error: 'Conflict ID is required'
      }, { status: 400 });
    }

    // Get conflict from sync engine
    const conflict = syncEngine.getConflict(conflictId);
    
    if (!conflict) {
      return NextResponse.json({
        success: false,
        error: 'Conflict not found'
      }, { status: 404 });
    }

    // Determine suggested resolution based on conflict characteristics
    let suggestedResolution: 'LOCAL_WINS' | 'SERVER_WINS' | 'MERGE' | 'MANUAL';
    
    switch (conflict.severity) {
      case 'CRITICAL':
        suggestedResolution = 'MANUAL'; // Critical conflicts need manual review
        break;
      case 'HIGH':
        suggestedResolution = conflict.conflictType === 'CONCURRENT_EDIT' ? 'MERGE' : 'SERVER_WINS';
        break;
      case 'MEDIUM':
        suggestedResolution = 'MERGE';
        break;
      case 'LOW':
      default:
        suggestedResolution = 'SERVER_WINS';
        break;
    }

    // Override suggestion for specific scenarios
    if (conflict.conflictType === 'TIMESTAMP' && conflict.severity === 'LOW') {
      suggestedResolution = 'SERVER_WINS';
    } else if (conflict.conflictFields && conflict.conflictFields.length > 5) {
      suggestedResolution = 'MANUAL'; // Too many fields for automatic resolution
    }

    const response: ConflictDetailResponse = {
      success: true,
      data: {
        conflict: {
          ...conflict,
          detectedAt: conflict.detectedAt.toISOString(),
          resolvedAt: conflict.resolvedAt?.toISOString(),
          auditTrail: conflict.auditTrail.map(entry => ({
            ...entry,
            timestamp: entry.timestamp.toISOString()
          }))
        },
        versionComparison: {
          localVersion: conflict.localVersion,
          serverVersion: conflict.serverVersion,
          conflictFields: conflict.conflictFields || [],
          suggestedResolution
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to get conflict details:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}