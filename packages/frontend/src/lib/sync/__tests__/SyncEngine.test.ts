/**
 * SyncEngine Tests - Comprehensive Conflict Detection and Resolution Testing
 * 
 * Tests cover all conflict detection scenarios, resolution strategies,
 * field-level comparison, severity classification, and audit trail functionality.
 */

import { SyncEngine, type ConflictDetailed, type ConflictResolution } from '../SyncEngine';

describe('SyncEngine', () => {
  let syncEngine: SyncEngine;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  
  beforeEach(() => {
    syncEngine = new SyncEngine();
    // Clear all previous mocks
    jest.clearAllMocks();
    
    // Setup comprehensive global fetch mock using Jest best practices
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;
    
    // Configure default successful responses for different endpoints
    mockFetch.mockImplementation((url: string | URL | Request) => {
      const urlString = typeof url === 'string' ? url : url.toString();
      
      // Mock responses for assessment entity endpoints
      if (urlString.includes('/api/v1/assessments/entity-1')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            id: 'entity-1',
            name: 'Server Updated Name',
            status: 'SERVER_STATUS',
            notes: 'Server updated notes',
            updatedAt: new Date(Date.now() + 60000).toISOString(), // 1 minute in future
            version: 2
          })
        } as Response);
      }
      
      // Mock responses for response entity endpoints
      if (urlString.includes('/api/v1/responses/entity-2')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            id: 'entity-2',
            priority: 'MEDIUM',
            updatedAt: new Date(Date.now() + 30000).toISOString(), // 30 seconds in future
            version: 2
          })
        } as Response);
      }
      
      // Mock conflict resolution API
      if (urlString.includes('/api/v1/sync/conflicts/resolve')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            success: true,
            data: { conflictId: 'conflict-1', resolved: true }
          })
        } as Response);
      }
      
      // Mock entity creation APIs
      if (urlString.includes('/api/v1/assessments') && !urlString.includes('/api/v1/assessments/')) {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ id: 'new-entity-1', created: true })
        } as Response);
      }
      
      if (urlString.includes('/api/v1/responses') && !urlString.includes('/api/v1/responses/')) {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ id: 'new-entity-2', created: true })
        } as Response);
      }
      
      // Default 404 response for unknown entities
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ success: false, error: 'Not found' })
      } as Response);
    });
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Conflict Detection', () => {
    test('should detect timestamp conflicts', async () => {
      const changes = [
        {
          id: 'change-1',
          entityType: 'ASSESSMENT',
          entityId: 'entity-1',
          name: 'Local Updated Name',
          status: 'LOCAL_STATUS',
          updatedAt: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago (older than server)
          timestamp: Date.now() - 30000,
          userId: 'user-1'
        }
      ];
      
      const result = await syncEngine.performSync('device-1', 'user-1', changes);
      
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].conflictType).toBe('TIMESTAMP');
      expect(result.conflicts[0].severity).toBe('MEDIUM');
      expect(result.conflicts[0].entityId).toBe('entity-1');
    });

    test('should detect field-level conflicts', async () => {
      // Mock server response with different field values
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            success: true,
            data: {
              id: 'entity-1',
              name: 'Same Name', // No conflict
              status: 'SERVER_STATUS', // Conflict
              notes: 'Different server notes', // Conflict
              updatedAt: new Date().toISOString()
            }
          })
        } as Response)
      );
      
      const changes = [
        {
          id: 'change-1',
          entityType: 'ASSESSMENT', 
          entityId: 'entity-1',
          name: 'Same Name', // No conflict
          status: 'LOCAL_STATUS', // Conflict with server
          notes: 'Different local notes', // Conflict with server
          updatedAt: new Date().toISOString(),
          timestamp: Date.now(),
          userId: 'user-1'
        }
      ];
      
      const result = await syncEngine.performSync('device-1', 'user-1', changes);
      
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].conflictType).toBe('FIELD_LEVEL');
      expect(result.conflicts[0].conflictFields).toContain('status');
      expect(result.conflicts[0].conflictFields).toContain('notes');
    });

    test('should classify conflict severity correctly', async () => {
      const testCases = [
        {
          conflictFields: ['entityId'], 
          expectedSeverity: 'CRITICAL'
        },
        {
          conflictFields: ['status', 'priority'],
          expectedSeverity: 'HIGH'
        },
        {
          conflictFields: ['score'],
          expectedSeverity: 'MEDIUM'
        },
        {
          conflictFields: ['notes'],
          expectedSeverity: 'LOW'
        }
      ];

      for (const testCase of testCases) {
        const changes = [{
          id: 'test-1',
          entityId: 'entity-1',
          entityType: 'ASSESSMENT',
          updatedAt: '2023-01-01T10:00:00Z',
          ...Object.fromEntries(testCase.conflictFields.map(field => [field, 'local_value']))
        }];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'entity-1',
            updatedAt: '2023-01-01T10:05:00Z',
            ...Object.fromEntries(testCase.conflictFields.map(field => [field, 'server_value']))
          })
        } as Response);

        const result = await syncEngine.performSync('device-1', 'user-1', changes);
        
        expect(result.conflicts[0].severity).toBe(testCase.expectedSeverity);
        
        mockFetch.mockClear();
      }
    });

    test('should handle concurrent edit detection', async () => {
      const changes = [{
        id: 'test-1',
        entityId: 'entity-1',
        entityType: 'ASSESSMENT',
        updatedAt: '2023-01-01T10:00:00Z',
        status: 'DRAFT'
      }];

      // Server version within concurrent edit threshold (5 minutes)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'entity-1',
          updatedAt: '2023-01-01T10:03:00Z', // 3 minutes later
          status: 'APPROVED'
        })
      } as Response);

      const result = await syncEngine.performSync('device-1', 'user-1', changes);
      
      expect(result.conflicts[0].conflictType).toBe('CONCURRENT_EDIT');
    });
  });

  describe('Conflict Resolution', () => {
    let testConflict: ConflictDetailed;

    beforeEach(() => {
      testConflict = {
        id: 'conflict-1',
        entityId: 'entity-1',
        entityType: 'ASSESSMENT',
        conflictType: 'FIELD_LEVEL',
        severity: 'MEDIUM',
        localVersion: { id: 'entity-1', status: 'DRAFT', score: 85 },
        serverVersion: { id: 'entity-1', status: 'APPROVED', score: 90 },
        conflictFields: ['status', 'score'],
        detectedAt: new Date(),
        detectedBy: 'user-1',
        status: 'PENDING',
        auditTrail: [{
          timestamp: new Date(),
          action: 'CONFLICT_DETECTED',
          performedBy: 'user-1',
          details: { conflictType: 'FIELD_LEVEL' }
        }]
      };

      // Add conflict to engine
      (syncEngine as any).conflictStore.set('conflict-1', testConflict);
    });

    test('should resolve with LOCAL_WINS strategy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      await syncEngine.resolveConflict('conflict-1', 'LOCAL_WINS', undefined, 'coordinator-1', 'Local version is more accurate');

      const resolvedConflict = syncEngine.getConflict('conflict-1');
      expect(resolvedConflict?.status).toBe('RESOLVED');
      expect(resolvedConflict?.resolutionStrategy).toBe('LOCAL_WINS');
      expect(resolvedConflict?.resolvedBy).toBe('coordinator-1');
      expect(resolvedConflict?.resolutionJustification).toBe('Local version is more accurate');
    });

    test('should resolve with SERVER_WINS strategy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      await syncEngine.resolveConflict('conflict-1', 'SERVER_WINS', undefined, 'coordinator-1', 'Server version is authoritative');

      const resolvedConflict = syncEngine.getConflict('conflict-1');
      expect(resolvedConflict?.status).toBe('RESOLVED');
      expect(resolvedConflict?.resolutionStrategy).toBe('SERVER_WINS');
    });

    test('should resolve with MERGE strategy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      await syncEngine.resolveConflict('conflict-1', 'MERGE', undefined, 'coordinator-1', 'Merge both versions');

      const resolvedConflict = syncEngine.getConflict('conflict-1');
      expect(resolvedConflict?.status).toBe('RESOLVED');
      expect(resolvedConflict?.resolutionStrategy).toBe('MERGE');
    });

    test('should resolve with MANUAL strategy and custom data', async () => {
      const mergedData = { id: 'entity-1', status: 'REVIEWED', score: 88 };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      await syncEngine.resolveConflict('conflict-1', 'MANUAL', mergedData, 'coordinator-1', 'Custom resolution applied');

      const resolvedConflict = syncEngine.getConflict('conflict-1');
      expect(resolvedConflict?.status).toBe('RESOLVED');
      expect(resolvedConflict?.resolutionStrategy).toBe('MANUAL');
    });

    test('should fail resolution without justification', async () => {
      await expect(
        syncEngine.resolveConflict('conflict-1', 'LOCAL_WINS', undefined, 'coordinator-1')
      ).rejects.toThrow();
    });

    test('should fail MANUAL resolution without merged data', async () => {
      await expect(
        syncEngine.resolveConflict('conflict-1', 'MANUAL', undefined, 'coordinator-1', 'Manual resolution')
      ).rejects.toThrow('Manual resolution requires merged data');
    });
  });

  describe('Audit Trail', () => {
    test('should create proper audit trail entries', async () => {
      const changes = [{
        id: 'test-1',
        entityId: 'entity-1',
        entityType: 'ASSESSMENT',
        updatedAt: '2023-01-01T10:00:00Z',
        status: 'DRAFT'
      }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'entity-1',
          updatedAt: '2023-01-01T11:00:00Z',
          status: 'APPROVED'
        })
      } as Response);

      const result = await syncEngine.performSync('device-1', 'user-1', changes);
      const conflict = result.conflicts[0];
      
      expect(conflict.auditTrail).toHaveLength(1);
      expect(conflict.auditTrail[0].action).toBe('CONFLICT_DETECTED');
      expect(conflict.auditTrail[0].performedBy).toBe('user-1');
      expect(conflict.auditTrail[0].details).toMatchObject({
        conflictType: expect.any(String),
        severity: expect.any(String),
        fieldsAffected: expect.any(Array)
      });
    });

    test('should add resolution audit entry', async () => {
      const testConflict: ConflictDetailed = {
        id: 'conflict-1',
        entityId: 'entity-1',
        entityType: 'ASSESSMENT',
        conflictType: 'FIELD_LEVEL',
        severity: 'MEDIUM',
        localVersion: { status: 'DRAFT' },
        serverVersion: { status: 'APPROVED' },
        detectedAt: new Date(),
        detectedBy: 'user-1',
        status: 'PENDING',
        auditTrail: []
      };

      (syncEngine as any).conflictStore.set('conflict-1', testConflict);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      await syncEngine.resolveConflict('conflict-1', 'LOCAL_WINS', undefined, 'coordinator-1', 'Resolution applied');

      const resolvedConflict = syncEngine.getConflict('conflict-1');
      const resolutionEntry = resolvedConflict?.auditTrail.find(entry => entry.action === 'CONFLICT_RESOLVED');
      
      expect(resolutionEntry).toBeDefined();
      expect(resolutionEntry?.performedBy).toBe('coordinator-1');
      expect(resolutionEntry?.details.strategy).toBe('LOCAL_WINS');
      expect(resolutionEntry?.details.justification).toBe('Resolution applied');
    });
  });

  describe('Statistics and Management', () => {
    beforeEach(() => {
      // Add test conflicts
      const conflicts = [
        { id: 'c1', severity: 'CRITICAL', conflictType: 'TIMESTAMP', status: 'PENDING' },
        { id: 'c2', severity: 'HIGH', conflictType: 'FIELD_LEVEL', status: 'PENDING' },
        { id: 'c3', severity: 'MEDIUM', conflictType: 'CONCURRENT_EDIT', status: 'RESOLVED' },
        { id: 'c4', severity: 'LOW', conflictType: 'TIMESTAMP', status: 'RESOLVED' }
      ];

      conflicts.forEach(conflict => {
        (syncEngine as any).conflictStore.set(conflict.id, {
          ...conflict,
          entityId: 'entity-1',
          entityType: 'ASSESSMENT',
          localVersion: {},
          serverVersion: {},
          detectedAt: new Date(),
          detectedBy: 'user-1',
          auditTrail: []
        });
      });
    });

    test('should return correct conflict statistics', () => {
      const stats = syncEngine.getConflictStats();
      
      expect(stats.totalConflicts).toBe(4);
      expect(stats.pendingConflicts).toBe(2);
      expect(stats.resolvedConflicts).toBe(2);
      expect(stats.criticalConflicts).toBe(1);
      expect(stats.conflictsByType.TIMESTAMP).toBe(2);
      expect(stats.conflictsByType.FIELD_LEVEL).toBe(1);
      expect(stats.conflictsBySeverity.CRITICAL).toBe(1);
      expect(stats.conflictsBySeverity.HIGH).toBe(1);
    });

    test('should get pending conflicts sorted by severity', () => {
      const pending = syncEngine.getPendingConflicts();
      
      expect(pending).toHaveLength(2);
      expect(pending[0].severity).toBe('CRITICAL'); // Highest severity first
      expect(pending[1].severity).toBe('HIGH');
    });

    test('should get conflicts for specific entity', () => {
      const entityConflicts = syncEngine.getConflictsForEntity('entity-1');
      
      expect(entityConflicts).toHaveLength(4);
      // Should be sorted by detection time (newest first)
    });

    test('should clear old resolved conflicts', () => {
      const cleared = syncEngine.clearOldConflicts(0); // Clear all
      
      expect(cleared).toBe(2); // Only resolved conflicts should be cleared
      expect(syncEngine.getConflictStats().totalConflicts).toBe(2); // Only pending remain
    });
  });

  describe('Error Handling', () => {
    test('should handle server fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const changes = [{
        id: 'test-1',
        entityId: 'entity-1',
        entityType: 'ASSESSMENT',
        updatedAt: '2023-01-01T10:00:00Z'
      }];

      const result = await syncEngine.performSync('device-1', 'user-1', changes);
      
      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.conflicts).toHaveLength(0);
    });

    test('should handle 404 responses for new entities', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 404
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'entity-1', created: true })
        } as Response);

      const changes = [{
        id: 'test-1',
        entityId: 'entity-1',
        entityType: 'ASSESSMENT',
        updatedAt: '2023-01-01T10:00:00Z'
      }];

      const result = await syncEngine.performSync('device-1', 'user-1', changes);
      
      expect(result.successful).toHaveLength(1);
      expect(result.conflicts).toHaveLength(0);
    });

    test('should handle resolution API failures', async () => {
      const testConflict: ConflictDetailed = {
        id: 'conflict-1',
        entityId: 'entity-1',
        entityType: 'ASSESSMENT',
        conflictType: 'FIELD_LEVEL',
        severity: 'MEDIUM',
        localVersion: {},
        serverVersion: {},
        detectedAt: new Date(),
        detectedBy: 'user-1',
        status: 'PENDING',
        auditTrail: []
      };

      (syncEngine as any).conflictStore.set('conflict-1', testConflict);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      } as Response);

      await expect(
        syncEngine.resolveConflict('conflict-1', 'LOCAL_WINS', undefined, 'coordinator-1', 'Test resolution')
      ).rejects.toThrow('Failed to apply resolution');
    });
  });
});