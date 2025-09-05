/**
 * POST /api/v1/sync/conflicts/resolve - Resolve conflict with specified strategy
 * 
 * Resolves a conflict using one of the available resolution strategies:
 * - LOCAL_WINS: Accept local version
 * - SERVER_WINS: Accept server version  
 * - MERGE: Merge both versions automatically
 * - MANUAL: Use custom merged data provided
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncEngine } from '@/lib/sync/SyncEngine';
import { z } from 'zod';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Request validation schema
const ConflictResolutionRequestSchema = z.object({
  conflictId: z.string().min(1, 'Conflict ID is required'),
  resolutionStrategy: z.enum(['LOCAL_WINS', 'SERVER_WINS', 'MERGE', 'MANUAL']),
  mergedData: z.any().optional(),
  justification: z.string().min(10, 'Justification must be at least 10 characters'),
  coordinatorId: z.string().min(1, 'Coordinator ID is required')
});

interface ConflictResolutionResponse {
  success: boolean;
  data?: {
    conflictId: string;
    resolvedEntityId: string;
    finalVersion: any;
    auditEntryId: string;
    notificationsSent: string[];
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ConflictResolutionResponse>> {
  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = ConflictResolutionRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: `Validation error: ${validationResult.error.issues.map(i => i.message).join(', ')}`
      }, { status: 400 });
    }

    const { conflictId, resolutionStrategy, mergedData, justification, coordinatorId } = validationResult.data;

    // Validate that conflict exists
    const conflict = syncEngine.getConflict(conflictId);
    if (!conflict) {
      return NextResponse.json({
        success: false,
        error: 'Conflict not found'
      }, { status: 404 });
    }

    // Validate that conflict is still pending
    if (conflict.status !== 'PENDING') {
      return NextResponse.json({
        success: false,
        error: `Conflict is already ${conflict.status.toLowerCase()}`
      }, { status: 409 });
    }

    // Validate merged data for MANUAL resolution
    if (resolutionStrategy === 'MANUAL' && !mergedData) {
      return NextResponse.json({
        success: false,
        error: 'Merged data is required for MANUAL resolution strategy'
      }, { status: 400 });
    }

    // Perform conflict resolution
    await syncEngine.resolveConflict(
      conflictId,
      resolutionStrategy,
      mergedData,
      coordinatorId,
      justification
    );

    // Get updated conflict to get final version
    const resolvedConflict = syncEngine.getConflict(conflictId);
    if (!resolvedConflict) {
      throw new Error('Failed to retrieve resolved conflict');
    }

    // Determine final version based on resolution strategy
    let finalVersion: any;
    switch (resolutionStrategy) {
      case 'LOCAL_WINS':
        finalVersion = resolvedConflict.localVersion;
        break;
      case 'SERVER_WINS':
        finalVersion = resolvedConflict.serverVersion;
        break;
      case 'MERGE':
        // For MERGE, we'll use the server version as base with local changes
        finalVersion = { ...resolvedConflict.serverVersion, ...resolvedConflict.localVersion };
        break;
      case 'MANUAL':
        finalVersion = mergedData;
        break;
    }

    // Generate audit entry ID (last entry in the trail)
    const auditEntryId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Mock notification system (in real implementation, this would send notifications)
    const notificationsSent: string[] = [
      conflict.detectedBy, // Original user who created the conflicting change
      coordinatorId        // Coordinator who resolved it
    ].filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates

    const response: ConflictResolutionResponse = {
      success: true,
      data: {
        conflictId,
        resolvedEntityId: conflict.entityId,
        finalVersion,
        auditEntryId,
        notificationsSent
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to resolve conflict:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}