/**
 * PUT /api/v1/sync/conflicts/[id]/override - Coordinator override for complex conflicts
 * 
 * Provides coordinators with override capability for complex conflicts that require
 * special handling or override of normal resolution rules.
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncEngine } from '@/lib/sync/SyncEngine';
import { z } from 'zod';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Request validation schema
const ConflictOverrideRequestSchema = z.object({
  resolutionStrategy: z.enum(['LOCAL_WINS', 'SERVER_WINS', 'MERGE', 'MANUAL']),
  overrideData: z.any().optional(),
  overrideReason: z.string().min(20, 'Override reason must be at least 20 characters'),
  coordinatorId: z.string().min(1, 'Coordinator ID is required'),
  coordinatorRole: z.enum(['coordinator', 'admin', 'supervisor']).default('coordinator'),
  emergencyOverride: z.boolean().default(false)
});

interface ConflictOverrideResponse {
  success: boolean;
  data?: {
    conflictId: string;
    resolvedEntityId: string;
    finalVersion: any;
    overrideApplied: boolean;
    auditEntryId: string;
    escalationLevel: 'standard' | 'elevated' | 'emergency';
  };
  error?: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ConflictOverrideResponse>> {
  try {
    const conflictId = params.id;
    
    if (!conflictId) {
      return NextResponse.json({
        success: false,
        error: 'Conflict ID is required'
      }, { status: 400 });
    }

    const body = await request.json();
    
    // Validate request body
    const validationResult = ConflictOverrideRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: `Validation error: ${validationResult.error.issues.map(i => i.message).join(', ')}`
      }, { status: 400 });
    }

    const {
      resolutionStrategy,
      overrideData,
      overrideReason,
      coordinatorId,
      coordinatorRole,
      emergencyOverride
    } = validationResult.data;

    // Get conflict
    const conflict = syncEngine.getConflict(conflictId);
    if (!conflict) {
      return NextResponse.json({
        success: false,
        error: 'Conflict not found'
      }, { status: 404 });
    }

    // Check if conflict can be overridden
    if (conflict.status === 'RESOLVED') {
      return NextResponse.json({
        success: false,
        error: 'Cannot override a resolved conflict'
      }, { status: 409 });
    }

    // Determine escalation level based on conflict severity and coordinator role
    let escalationLevel: 'standard' | 'elevated' | 'emergency';
    
    if (emergencyOverride) {
      escalationLevel = 'emergency';
    } else if (conflict.severity === 'CRITICAL' || coordinatorRole === 'admin') {
      escalationLevel = 'elevated';
    } else {
      escalationLevel = 'standard';
    }

    // Validate authorization based on escalation level
    if (escalationLevel === 'emergency' && coordinatorRole !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Emergency override requires admin privileges'
      }, { status: 403 });
    }

    if (conflict.severity === 'CRITICAL' && coordinatorRole === 'coordinator' && !emergencyOverride) {
      return NextResponse.json({
        success: false,
        error: 'Critical conflicts require supervisor or admin privileges'
      }, { status: 403 });
    }

    // Prepare override justification
    const overrideJustification = `COORDINATOR OVERRIDE (${escalationLevel.toUpperCase()}): ${overrideReason}`;

    // Perform conflict resolution with override
    await syncEngine.resolveConflict(
      conflictId,
      resolutionStrategy,
      overrideData,
      coordinatorId,
      overrideJustification
    );

    // Get updated conflict
    const resolvedConflict = syncEngine.getConflict(conflictId);
    if (!resolvedConflict) {
      throw new Error('Failed to retrieve resolved conflict');
    }

    // Determine final version
    let finalVersion: any;
    switch (resolutionStrategy) {
      case 'LOCAL_WINS':
        finalVersion = resolvedConflict.localVersion;
        break;
      case 'SERVER_WINS':
        finalVersion = resolvedConflict.serverVersion;
        break;
      case 'MERGE':
        finalVersion = { ...resolvedConflict.serverVersion, ...resolvedConflict.localVersion };
        break;
      case 'MANUAL':
        finalVersion = overrideData || resolvedConflict.serverVersion;
        break;
    }

    // Add additional audit trail entry for override
    if (resolvedConflict.auditTrail) {
      resolvedConflict.auditTrail.push({
        timestamp: new Date(),
        action: 'COORDINATOR_OVERRIDE',
        performedBy: coordinatorId,
        details: {
          escalationLevel,
          coordinatorRole,
          emergencyOverride,
          originalStrategy: resolutionStrategy,
          overrideReason
        }
      });
    }

    // Generate audit entry ID
    const auditEntryId = `override-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Log override event (in real implementation, this would be logged to audit system)
    console.warn(`Conflict override applied by ${coordinatorId} (${coordinatorRole}) for conflict ${conflictId} at ${escalationLevel} level`);

    const response: ConflictOverrideResponse = {
      success: true,
      data: {
        conflictId,
        resolvedEntityId: conflict.entityId,
        finalVersion,
        overrideApplied: true,
        auditEntryId,
        escalationLevel
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to override conflict:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}