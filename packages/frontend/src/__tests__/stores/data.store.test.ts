import { renderHook, act, waitFor } from '@testing-library/react';
import { useDataStore } from '@/stores/data.store';
import { Incident, Assessment, Response } from '@/hooks/useRealData';

describe('Data Store Integration Tests', () => {
  beforeEach(() => {
    useDataStore.getState().reset();
  });

  describe('Data Management', () => {
    it('should update recent incidents', () => {
      const mockIncidents: Incident[] = [
        {
          id: '1',
          name: 'Test Incident 1',
          type: 'FLOOD',
          severity: 'SEVERE',
          status: 'ACTIVE',
          date: new Date(),
          affectedEntityCount: 5,
          assessmentCount: 2,
          responseCount: 1,
          lastUpdated: new Date(),
        },
        {
          id: '2',
          name: 'Test Incident 2',
          type: 'FIRE',
          severity: 'MODERATE',
          status: 'CONTAINED',
          date: new Date(),
          affectedEntityCount: 3,
          assessmentCount: 1,
          responseCount: 0,
          lastUpdated: new Date(),
        },
      ];

      const { result } = renderHook(() => useDataStore());

      act(() => {
        result.current.updateRecentIncidents(mockIncidents);
      });

      expect(result.current.recentIncidents).toHaveLength(2);
      expect(result.current.recentIncidents[0].name).toBe('Test Incident 1');
      expect(result.current.recentIncidents[1].name).toBe('Test Incident 2');
    });

    it('should limit recent incidents to 50 items', () => {
      const mockIncidents: Incident[] = Array.from({ length: 60 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Test Incident ${i + 1}`,
        type: 'FLOOD' as const,
        severity: 'SEVERE' as const,
        status: 'ACTIVE' as const,
        date: new Date(),
        affectedEntityCount: 5,
        assessmentCount: 2,
        responseCount: 1,
        lastUpdated: new Date(),
      }));

      const { result } = renderHook(() => useDataStore());

      act(() => {
        result.current.updateRecentIncidents(mockIncidents);
      });

      expect(result.current.recentIncidents).toHaveLength(50);
      expect(result.current.recentIncidents[0].name).toBe('Test Incident 1');
    });

    it('should update user preferences', () => {
      const { result } = renderHook(() => useDataStore());

      act(() => {
        result.current.updateUserPreferences({
          autoRefresh: false,
          refreshIntervals: {
            incidents: 60000,
            assessments: 90000,
            responses: 120000,
            stats: 15000,
          },
        });
      });

      expect(result.current.userPreferences.autoRefresh).toBe(false);
      expect(result.current.userPreferences.refreshIntervals.incidents).toBe(60000);
    });

    it('should merge user preferences correctly', () => {
      const { result } = renderHook(() => useDataStore());

      act(() => {
        result.current.updateUserPreferences({
          refreshIntervals: {
            incidents: 45000,
          },
        });
      });

      // Check that only incidents interval was updated
      expect(result.current.userPreferences.refreshIntervals.incidents).toBe(45000);
      expect(result.current.userPreferences.refreshIntervals.assessments).toBe(45000); // default
      expect(result.current.userPreferences.refreshIntervals.responses).toBe(60000); // default
      expect(result.current.userPreferences.autoRefresh).toBe(true); // default
    });
  });

  describe('Offline Data Management', () => {
    it('should add data to offline storage', () => {
      const { result } = renderHook(() => useDataStore());

      const mockIncidents: Incident[] = [
        {
          id: '1',
          name: 'Offline Incident',
          type: 'FLOOD',
          severity: 'SEVERE',
          status: 'ACTIVE',
          date: new Date(),
          affectedEntityCount: 5,
          assessmentCount: 2,
          responseCount: 1,
          lastUpdated: new Date(),
        },
      ];

      act(() => {
        result.current.addToOfflineData('incidents', mockIncidents);
      });

      expect(result.current.offlineData.incidents).toHaveLength(1);
      expect(result.current.offlineData.incidents[0].name).toBe('Offline Incident');
    });

    it('should update offline data items', () => {
      const { result } = renderHook(() => useDataStore());

      // Add initial data
      const mockIncidents: Incident[] = [
        {
          id: '1',
          name: 'Original Incident',
          type: 'FLOOD',
          severity: 'SEVERE',
          status: 'ACTIVE',
          date: new Date(),
          affectedEntityCount: 5,
          assessmentCount: 2,
          responseCount: 1,
          lastUpdated: new Date(),
        },
      ];

      act(() => {
        result.current.addToOfflineData('incidents', mockIncidents);
      });

      // Update the data
      act(() => {
        result.current.updateOfflineData('incidents', '1', {
          name: 'Updated Incident',
          status: 'RESOLVED',
        });
      });

      expect(result.current.offlineData.incidents[0].name).toBe('Updated Incident');
      expect(result.current.offlineData.incidents[0].status).toBe('RESOLVED');
    });

    it('should remove data from offline storage', () => {
      const { result } = renderHook(() => useDataStore());

      const mockIncidents: Incident[] = [
        {
          id: '1',
          name: 'Incident to Remove',
          type: 'FLOOD',
          severity: 'SEVERE',
          status: 'ACTIVE',
          date: new Date(),
          affectedEntityCount: 5,
          assessmentCount: 2,
          responseCount: 1,
          lastUpdated: new Date(),
        },
        {
          id: '2',
          name: 'Keep This Incident',
          type: 'FIRE',
          severity: 'MODERATE',
          status: 'ACTIVE',
          date: new Date(),
          affectedEntityCount: 3,
          assessmentCount: 1,
          responseCount: 0,
          lastUpdated: new Date(),
        },
      ];

      act(() => {
        result.current.addToOfflineData('incidents', mockIncidents);
      });

      act(() => {
        result.current.removeFromOfflineData('incidents', '1');
      });

      expect(result.current.offlineData.incidents).toHaveLength(1);
      expect(result.current.offlineData.incidents[0].id).toBe('2');
    });

    it('should manage pending changes', () => {
      const { result } = renderHook(() => useDataStore());

      const pendingChange = {
        type: 'update' as const,
        entityType: 'incident' as const,
        data: { id: '1', name: 'Updated Incident' },
        timestamp: new Date(),
      };

      act(() => {
        result.current.addPendingChange(pendingChange);
      });

      expect(result.current.offlineData.pendingChanges).toHaveLength(1);
      expect(result.current.getPendingChangesCount()).toBe(1);

      act(() => {
        result.current.removePendingChange(0);
      });

      expect(result.current.offlineData.pendingChanges).toHaveLength(0);
      expect(result.current.getPendingChangesCount()).toBe(0);
    });

    it('should clear all pending changes', () => {
      const { result } = renderHook(() => useDataStore());

      const pendingChanges = [
        {
          type: 'update' as const,
          entityType: 'incident' as const,
          data: { id: '1', name: 'Updated Incident 1' },
          timestamp: new Date(),
        },
        {
          type: 'create' as const,
          entityType: 'assessment' as const,
          data: { id: '2', type: 'RAPID' },
          timestamp: new Date(),
        },
      ];

      act(() => {
        pendingChanges.forEach(change => result.current.addPendingChange(change));
      });

      expect(result.current.getPendingChangesCount()).toBe(2);

      act(() => {
        result.current.clearPendingChanges();
      });

      expect(result.current.getPendingChangesCount()).toBe(0);
    });

    it('should track last sync time', () => {
      const { result } = renderHook(() => useDataStore());

      const syncTime = new Date('2024-01-01T12:00:00');

      act(() => {
        result.current.setLastSync(syncTime);
      });

      expect(result.current.offlineData.lastSync).toEqual(syncTime);
    });
  });

  describe('Real-time Updates', () => {
    it('should add real-time updates to queue', () => {
      const { result } = renderHook(() => useDataStore());

      const update = {
        id: '1',
        type: 'incident' as const,
        action: 'updated' as const,
        data: { id: '1', name: 'Updated Incident' },
        timestamp: new Date(),
      };

      act(() => {
        result.current.addRealTimeUpdate(update);
      });

      expect(result.current.realTimeUpdates.updateQueue).toHaveLength(1);
      expect(result.current.realTimeUpdates.updateQueue[0].id).toBe('1');
      expect(result.current.realTimeUpdates.lastUpdate).toBeDefined();
    });

    it('should clear update queue', () => {
      const { result } = renderHook(() => useDataStore());

      const updates = [
        {
          id: '1',
          type: 'incident' as const,
          action: 'updated' as const,
          data: { id: '1', name: 'Updated Incident 1' },
          timestamp: new Date(),
        },
        {
          id: '2',
          type: 'assessment' as const,
          action: 'created' as const,
          data: { id: '2', type: 'RAPID' },
          timestamp: new Date(),
        },
      ];

      act(() => {
        updates.forEach(update => result.current.addRealTimeUpdate(update));
      });

      expect(result.current.realTimeUpdates.updateQueue).toHaveLength(2);

      act(() => {
        result.current.clearUpdateQueue();
      });

      expect(result.current.realTimeUpdates.updateQueue).toHaveLength(0);
    });
  });

  describe('Loading and Error States', () => {
    it('should manage loading states', () => {
      const { result } = renderHook(() => useDataStore());

      act(() => {
        result.current.setLoadingState('incidents', true);
      });

      expect(result.current.loadingStates.incidents).toBe(true);

      act(() => {
        result.current.setLoadingState('incidents', false);
      });

      expect(result.current.loadingStates.incidents).toBe(false);
    });

    it('should manage error states', () => {
      const { result } = renderHook(() => useDataStore());

      act(() => {
        result.current.setError('incidents', 'Incident loading failed');
      });

      expect(result.current.errors.incidents).toBe('Incident loading failed');

      act(() => {
        result.current.clearAllErrors();
      });

      expect(result.current.errors.incidents).toBeNull();
    });
  });

  describe('Utility Functions', () => {
    it('should get incidents by ID', () => {
      const { result } = renderHook(() => useDataStore());

      const mockIncidents: Incident[] = [
        {
          id: '1',
          name: 'Test Incident 1',
          type: 'FLOOD',
          severity: 'SEVERE',
          status: 'ACTIVE',
          date: new Date(),
          affectedEntityCount: 5,
          assessmentCount: 2,
          responseCount: 1,
          lastUpdated: new Date(),
        },
        {
          id: '2',
          name: 'Test Incident 2',
          type: 'FIRE',
          severity: 'MODERATE',
          status: 'CONTAINED',
          date: new Date(),
          affectedEntityCount: 3,
          assessmentCount: 1,
          responseCount: 0,
          lastUpdated: new Date(),
        },
      ];

      act(() => {
        result.current.updateRecentIncidents(mockIncidents);
      });

      const incident = result.current.getIncidentById('1');
      expect(incident).toBeDefined();
      expect(incident?.name).toBe('Test Incident 1');

      const nonExistent = result.current.getIncidentById('999');
      expect(nonExistent).toBeUndefined();
    });

    it('should get assessments by ID', () => {
      const { result } = renderHook(() => useDataStore());

      const mockAssessments: Assessment[] = [
        {
          id: '1',
          type: 'RAPID',
          status: 'SUBMITTED',
          verificationStatus: 'PENDING',
          assessorId: 'user1',
          assessorName: 'John Doe',
          affectedEntityId: 'entity1',
          affectedEntityName: 'Test Entity',
          assessmentDate: new Date(),
          lastUpdated: new Date(),
          syncStatus: 'SYNCED',
        },
      ];

      act(() => {
        result.current.updateRecentAssessments(mockAssessments);
      });

      const assessment = result.current.getAssessmentById('1');
      expect(assessment).toBeDefined();
      expect(assessment?.assessorName).toBe('John Doe');
    });

    it('should get responses by ID', () => {
      const { result } = renderHook(() => useDataStore());

      const mockResponses: Response[] = [
        {
          id: '1',
          responseType: 'IMMEDIATE',
          status: 'ACTIVE',
          assessmentId: 'assessment1',
          assessmentType: 'RAPID',
          affectedEntityId: 'entity1',
          affectedEntityName: 'Test Entity',
          targetDate: new Date(),
          estimatedBudget: 10000,
          lastUpdated: new Date(),
          syncStatus: 'SYNCED',
        },
      ];

      act(() => {
        result.current.updateRecentResponses(mockResponses);
      });

      const response = result.current.getResponseById('1');
      expect(response).toBeDefined();
      expect(response?.responseType).toBe('IMMEDIATE');
    });

    it('should get offline data counts', () => {
      const { result } = renderHook(() => useDataStore());

      const mockIncidents: Incident[] = Array.from({ length: 5 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Incident ${i + 1}`,
        type: 'FLOOD' as const,
        severity: 'SEVERE' as const,
        status: 'ACTIVE' as const,
        date: new Date(),
        affectedEntityCount: 5,
        assessmentCount: 2,
        responseCount: 1,
        lastUpdated: new Date(),
      }));

      const mockAssessments: Assessment[] = Array.from({ length: 3 }, (_, i) => ({
        id: `${i + 1}`,
        type: 'RAPID' as const,
        status: 'SUBMITTED' as const,
        verificationStatus: 'PENDING' as const,
        assessorId: 'user1',
        assessorName: 'John Doe',
        affectedEntityId: 'entity1',
        affectedEntityName: 'Test Entity',
        assessmentDate: new Date(),
        lastUpdated: new Date(),
        syncStatus: 'SYNCED',
      }));

      const mockResponses: Response[] = Array.from({ length: 2 }, (_, i) => ({
        id: `${i + 1}`,
        responseType: 'IMMEDIATE' as const,
        status: 'ACTIVE' as const,
        assessmentId: 'assessment1',
        assessmentType: 'RAPID',
        affectedEntityId: 'entity1',
        affectedEntityName: 'Test Entity',
        targetDate: new Date(),
        estimatedBudget: 10000,
        lastUpdated: new Date(),
        syncStatus: 'SYNCED',
      }));

      act(() => {
        result.current.addToOfflineData('incidents', mockIncidents);
        result.current.addToOfflineData('assessments', mockAssessments);
        result.current.addToOfflineData('responses', mockResponses);
      });

      const counts = result.current.getOfflineDataCount();
      expect(counts.incidents).toBe(5);
      expect(counts.assessments).toBe(3);
      expect(counts.responses).toBe(2);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset store to initial state', () => {
      const { result } = renderHook(() => useDataStore());

      // Add some data
      const mockIncidents: Incident[] = [
        {
          id: '1',
          name: 'Test Incident',
          type: 'FLOOD',
          severity: 'SEVERE',
          status: 'ACTIVE',
          date: new Date(),
          affectedEntityCount: 5,
          assessmentCount: 2,
          responseCount: 1,
          lastUpdated: new Date(),
        },
      ];

      act(() => {
        result.current.updateRecentIncidents(mockIncidents);
        result.current.setError('incidents', 'Test error');
        result.current.setLoadingState('incidents', true);
      });

      expect(result.current.recentIncidents).toHaveLength(1);
      expect(result.current.errors.incidents).toBe('Test error');
      expect(result.current.loadingStates.incidents).toBe(true);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.recentIncidents).toHaveLength(0);
      expect(result.current.errors.incidents).toBeNull();
      expect(result.current.loadingStates.incidents).toBe(false);
    });
  });
});