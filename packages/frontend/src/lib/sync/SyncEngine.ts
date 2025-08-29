/**
 * SyncEngine - Comprehensive Conflict Detection and Resolution
 * 
 * Enhanced sync engine that provides sophisticated conflict detection,
 * field-level comparison, severity classification, and audit trail management.
 * Integrates with existing BackgroundSyncManager and priority-based sync infrastructure.
 */

import type { OfflineQueueItem, PriorityQueueItem } from '@dms/shared';

// Conflict Detection Types
export interface ConflictDetailed {
  id: string; // UUID
  entityType: 'ASSESSMENT' | 'RESPONSE' | 'ENTITY' | 'INCIDENT';
  entityId: string;
  conflictType: 'TIMESTAMP' | 'FIELD_LEVEL' | 'CONCURRENT_EDIT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  localVersion: any;
  serverVersion: any;
  conflictFields?: string[]; // Field-level conflict identification
  detectedAt: Date;
  detectedBy: string; // User ID
  status: 'PENDING' | 'RESOLVED' | 'ESCALATED';
  resolutionStrategy?: 'LOCAL_WINS' | 'SERVER_WINS' | 'MERGE' | 'MANUAL';
  resolvedBy?: string; // Coordinator ID
  resolvedAt?: Date;
  resolutionJustification?: string;
  auditTrail: ConflictAuditEntry[];
}

export interface ConflictAuditEntry {
  timestamp: Date;
  action: string;
  performedBy: string;
  details: any;
}

export interface ConflictResolutionRequest {
  conflictId: string;
  resolutionStrategy: ConflictResolution;
  mergedData?: any; // For MERGE strategy
  justification: string;
  coordinatorId: string;
}

export type ConflictResolution = 'LOCAL_WINS' | 'SERVER_WINS' | 'MERGE' | 'MANUAL';

export interface SyncResult {
  successful: any[];
  conflicts: ConflictDetailed[];
  failed: any[];
  processedCount: number;
  conflictCount: number;
  failureCount: number;
}

/**
 * Enhanced SyncEngine with comprehensive conflict detection
 */
export class SyncEngine {
  private conflictStore: Map<string, ConflictDetailed> = new Map();
  
  /**
   * Main sync orchestration method with enhanced conflict detection
   */
  async performSync(deviceId: string, userId: string, changes: any[]): Promise<SyncResult> {
    const results: SyncResult = { 
      successful: [], 
      conflicts: [], 
      failed: [],
      processedCount: 0,
      conflictCount: 0,
      failureCount: 0
    };
    
    for (const change of changes) {
      try {
        const result = await this.processChange(change, deviceId, userId);
        results.processedCount++;
        
        if (result.status === 'CONFLICT') {
          const conflict = result as ConflictDetailed;
          this.conflictStore.set(conflict.id, conflict);
          results.conflicts.push(conflict);
          results.conflictCount++;
        } else if (result.status === 'SUCCESS') {
          results.successful.push(result);
        } else {
          results.failed.push(result);
          results.failureCount++;
        }
      } catch (error) {
        results.failed.push({ change, error: error instanceof Error ? error.message : 'Unknown error' });
        results.failureCount++;
        console.error(`Sync failed for change ${change.id}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Enhanced change processing with comprehensive conflict detection
   */
  private async processChange(change: any, deviceId: string, userId: string): Promise<any> {
    try {
      // Fetch current server version
      const serverVersion = await this.fetchServerVersion(change.entityId, change.entityType);
      
      if (!serverVersion) {
        // No server version exists, create new entity
        return await this.createEntity(change);
      }
      
      // Enhanced conflict detection
      const conflictResult = await this.detectConflicts(change, serverVersion, userId);
      
      if (conflictResult.hasConflict) {
        return this.createConflictRecord(change, serverVersion, conflictResult, userId);
      }
      
      // No conflict, proceed with update
      return await this.updateEntity(change, serverVersion);
      
    } catch (error) {
      console.error('Error processing change:', error);
      return {
        status: 'FAILED',
        entityId: change.entityId,
        error: error instanceof Error ? error.message : 'Unknown processing error'
      };
    }
  }

  /**
   * Comprehensive conflict detection with field-level analysis
   */
  private async detectConflicts(localVersion: any, serverVersion: any, userId: string): Promise<{
    hasConflict: boolean;
    conflictType: ConflictDetailed['conflictType'];
    conflictFields: string[];
    severity: ConflictDetailed['severity'];
  }> {
    const conflictFields: string[] = [];
    let conflictType: ConflictDetailed['conflictType'] = 'TIMESTAMP';
    
    // 1. Timestamp-based conflict detection
    const localTimestamp = new Date(localVersion.updatedAt);
    const serverTimestamp = new Date(serverVersion.updatedAt);
    
    // Check for concurrent edits (within 5 minutes)
    const timeDiff = Math.abs(serverTimestamp.getTime() - localTimestamp.getTime());
    const concurrentEditThreshold = 5 * 60 * 1000; // 5 minutes
    
    if (timeDiff <= concurrentEditThreshold && serverTimestamp > localTimestamp) {
      conflictType = 'CONCURRENT_EDIT';
    } else if (serverTimestamp > localTimestamp) {
      conflictType = 'TIMESTAMP';
    }
    
    // 2. Field-level conflict detection
    const fieldConflicts = this.detectFieldLevelConflicts(localVersion, serverVersion);
    if (fieldConflicts.length > 0) {
      conflictFields.push(...fieldConflicts);
      conflictType = 'FIELD_LEVEL';
    }
    
    // 3. Determine conflict severity
    const severity = this.classifyConflictSeverity(localVersion, serverVersion, conflictFields, conflictType);
    
    const hasConflict = conflictType !== 'TIMESTAMP' || serverTimestamp > localTimestamp;
    
    return {
      hasConflict,
      conflictType,
      conflictFields,
      severity
    };
  }

  /**
   * Field-level conflict detection
   */
  private detectFieldLevelConflicts(localVersion: any, serverVersion: any): string[] {
    const conflicts: string[] = [];
    const fieldsToCheck = this.getCriticalFields(localVersion);
    
    for (const field of fieldsToCheck) {
      if (this.hasFieldConflict(localVersion[field], serverVersion[field])) {
        conflicts.push(field);
      }
    }
    
    return conflicts;
  }

  /**
   * Get critical fields that need conflict checking based on entity type
   */
  private getCriticalFields(entity: any): string[] {
    const commonFields = ['status', 'priority', 'assignedTo', 'notes'];
    
    switch (entity.entityType || entity.type) {
      case 'ASSESSMENT':
        return [...commonFields, 'score', 'riskLevel', 'recommendations', 'checklist'];
      case 'RESPONSE':
        return [...commonFields, 'responseType', 'resources', 'timeline', 'approvalStatus'];
      case 'INCIDENT':
        return [...commonFields, 'severity', 'location', 'casualties', 'resources'];
      case 'ENTITY':
        return [...commonFields, 'entityData', 'metadata'];
      default:
        return commonFields;
    }
  }

  /**
   * Check if two field values conflict
   */
  private hasFieldConflict(localValue: any, serverValue: any): boolean {
    // Handle null/undefined values
    if (localValue === null || localValue === undefined || serverValue === null || serverValue === undefined) {
      return localValue !== serverValue;
    }
    
    // Deep comparison for objects and arrays
    if (typeof localValue === 'object') {
      return JSON.stringify(localValue) !== JSON.stringify(serverValue);
    }
    
    // Direct comparison for primitives
    return localValue !== serverValue;
  }

  /**
   * Classify conflict severity based on multiple factors
   */
  private classifyConflictSeverity(
    localVersion: any, 
    serverVersion: any, 
    conflictFields: string[], 
    conflictType: ConflictDetailed['conflictType']
  ): ConflictDetailed['severity'] {
    // CRITICAL: System integrity conflicts
    const criticalFields = ['entityId', 'entityType', 'id', 'userId'];
    if (conflictFields.some(field => criticalFields.includes(field))) {
      return 'CRITICAL';
    }
    
    // HIGH: Important workflow fields
    const highPriorityFields = ['status', 'priority', 'assignedTo', 'approvalStatus', 'severity'];
    if (conflictFields.some(field => highPriorityFields.includes(field))) {
      return 'HIGH';
    }
    
    // MEDIUM: Important data fields
    const mediumPriorityFields = ['score', 'riskLevel', 'responseType', 'resources', 'timeline'];
    if (conflictFields.some(field => mediumPriorityFields.includes(field))) {
      return 'MEDIUM';
    }
    
    // Consider concurrent edits as higher severity
    if (conflictType === 'CONCURRENT_EDIT') {
      return conflictFields.length > 3 ? 'HIGH' : 'MEDIUM';
    }
    
    // LOW: Minor fields or single field conflicts
    return 'LOW';
  }

  /**
   * Create detailed conflict record
   */
  private createConflictRecord(
    localVersion: any, 
    serverVersion: any, 
    conflictResult: any, 
    userId: string
  ): ConflictDetailed {
    const conflictId = this.generateConflictId();
    
    const conflict: ConflictDetailed = {
      id: conflictId,
      entityType: localVersion.entityType || localVersion.type || 'ENTITY',
      entityId: localVersion.entityId || localVersion.id,
      conflictType: conflictResult.conflictType,
      severity: conflictResult.severity,
      localVersion,
      serverVersion,
      conflictFields: conflictResult.conflictFields,
      detectedAt: new Date(),
      detectedBy: userId,
      status: 'PENDING',
      auditTrail: [{
        timestamp: new Date(),
        action: 'CONFLICT_DETECTED',
        performedBy: userId,
        details: {
          conflictType: conflictResult.conflictType,
          severity: conflictResult.severity,
          fieldsAffected: conflictResult.conflictFields
        }
      }]
    };
    
    return conflict;
  }

  /**
   * Resolve conflict with specified strategy
   */
  async resolveConflict(
    conflictId: string, 
    resolution: ConflictResolution, 
    data?: any,
    coordinatorId?: string,
    justification?: string
  ): Promise<void> {
    const conflict = this.conflictStore.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }
    
    let resolvedData: any;
    
    switch (resolution) {
      case 'LOCAL_WINS':
        resolvedData = conflict.localVersion;
        break;
      case 'SERVER_WINS':
        resolvedData = conflict.serverVersion;
        break;
      case 'MERGE':
        resolvedData = this.mergeVersions(conflict.localVersion, conflict.serverVersion, data);
        break;
      case 'MANUAL':
        if (!data) {
          throw new Error('Manual resolution requires merged data');
        }
        resolvedData = data;
        break;
      default:
        throw new Error(`Unknown resolution strategy: ${resolution}`);
    }
    
    // Update conflict record
    conflict.status = 'RESOLVED';
    conflict.resolutionStrategy = resolution;
    conflict.resolvedBy = coordinatorId;
    conflict.resolvedAt = new Date();
    conflict.resolutionJustification = justification;
    
    // Add audit entry
    conflict.auditTrail.push({
      timestamp: new Date(),
      action: 'CONFLICT_RESOLVED',
      performedBy: coordinatorId || 'system',
      details: {
        strategy: resolution,
        justification,
        finalVersion: resolvedData
      }
    });
    
    // Apply resolution
    await this.applyResolution(conflict.entityId, resolvedData, conflict.entityType);
    
    // Update conflict store
    this.conflictStore.set(conflictId, conflict);
  }

  /**
   * Merge two versions with optional custom merge data
   */
  private mergeVersions(localVersion: any, serverVersion: any, customData?: any): any {
    if (customData) {
      return { ...serverVersion, ...customData };
    }
    
    // Default merge strategy: server wins for metadata, local wins for user data
    const merged = {
      ...serverVersion, // Server version as base
      ...localVersion,  // Local changes override
      
      // Keep server metadata
      id: serverVersion.id,
      createdAt: serverVersion.createdAt,
      updatedAt: new Date().toISOString(),
      version: (serverVersion.version || 0) + 1,
      
      // Merge arrays and objects
      tags: [...(serverVersion.tags || []), ...(localVersion.tags || [])].filter((tag, index, arr) => arr.indexOf(tag) === index),
    };
    
    return merged;
  }

  /**
   * Apply conflict resolution to server
   */
  private async applyResolution(entityId: string, resolvedData: any, entityType: string): Promise<void> {
    const endpoint = this.getEntityEndpoint(entityType);
    
    const response = await fetch(`${endpoint}/${entityId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resolvedData)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to apply resolution: ${response.statusText}`);
    }
  }

  /**
   * Fetch current server version of entity
   */
  private async fetchServerVersion(entityId: string, entityType: string): Promise<any | null> {
    try {
      const endpoint = this.getEntityEndpoint(entityType);
      const response = await fetch(`${endpoint}/${entityId}`);
      
      if (response.status === 404) {
        return null; // Entity doesn't exist on server
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch server version: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching server version:', error);
      return null;
    }
  }

  /**
   * Create new entity on server
   */
  private async createEntity(change: any): Promise<any> {
    const endpoint = this.getEntityEndpoint(change.entityType || change.type);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(change)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create entity: ${response.statusText}`);
    }
    
    return {
      status: 'SUCCESS',
      entityId: change.entityId || change.id,
      result: await response.json()
    };
  }

  /**
   * Update existing entity on server
   */
  private async updateEntity(change: any, serverVersion: any): Promise<any> {
    const endpoint = this.getEntityEndpoint(change.entityType || change.type);
    
    const response = await fetch(`${endpoint}/${change.entityId || change.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...serverVersion,
        ...change,
        updatedAt: new Date().toISOString(),
        version: (serverVersion.version || 0) + 1
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update entity: ${response.statusText}`);
    }
    
    return {
      status: 'SUCCESS',
      entityId: change.entityId || change.id,
      result: await response.json()
    };
  }

  /**
   * Get API endpoint for entity type
   */
  private getEntityEndpoint(entityType: string): string {
    const baseUrl = '/api/v1';
    
    switch (entityType?.toLowerCase()) {
      case 'assessment':
        return `${baseUrl}/assessments`;
      case 'response':
        return `${baseUrl}/responses`;
      case 'incident':
        return `${baseUrl}/incidents`;
      case 'entity':
      default:
        return `${baseUrl}/entities`;
    }
  }

  /**
   * Generate unique conflict ID
   */
  private generateConflictId(): string {
    return `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API methods for conflict management

  /**
   * Get all pending conflicts
   */
  getPendingConflicts(): ConflictDetailed[] {
    return Array.from(this.conflictStore.values())
      .filter(conflict => conflict.status === 'PENDING')
      .sort((a, b) => {
        // Sort by severity (CRITICAL > HIGH > MEDIUM > LOW) then by detection time
        const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.detectedAt.getTime() - a.detectedAt.getTime();
      });
  }

  /**
   * Get conflict by ID
   */
  getConflict(conflictId: string): ConflictDetailed | undefined {
    return this.conflictStore.get(conflictId);
  }

  /**
   * Get conflicts for specific entity
   */
  getConflictsForEntity(entityId: string): ConflictDetailed[] {
    return Array.from(this.conflictStore.values())
      .filter(conflict => conflict.entityId === entityId)
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  }

  /**
   * Get conflict statistics
   */
  getConflictStats(): {
    totalConflicts: number;
    pendingConflicts: number;
    resolvedConflicts: number;
    criticalConflicts: number;
    conflictsByType: Record<string, number>;
    conflictsBySeverity: Record<string, number>;
  } {
    const conflicts = Array.from(this.conflictStore.values());
    
    return {
      totalConflicts: conflicts.length,
      pendingConflicts: conflicts.filter(c => c.status === 'PENDING').length,
      resolvedConflicts: conflicts.filter(c => c.status === 'RESOLVED').length,
      criticalConflicts: conflicts.filter(c => c.severity === 'CRITICAL').length,
      conflictsByType: conflicts.reduce((acc, c) => {
        acc[c.conflictType] = (acc[c.conflictType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      conflictsBySeverity: conflicts.reduce((acc, c) => {
        acc[c.severity] = (acc[c.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * Clear resolved conflicts older than specified days
   */
  clearOldConflicts(daysOld: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    let clearedCount = 0;
    for (const [id, conflict] of Array.from(this.conflictStore.entries())) {
      if (conflict.status === 'RESOLVED' && 
          conflict.resolvedAt && 
          conflict.resolvedAt < cutoffDate) {
        this.conflictStore.delete(id);
        clearedCount++;
      }
    }
    
    return clearedCount;
  }
}

// Export singleton instance for app-wide usage
export const syncEngine = new SyncEngine();