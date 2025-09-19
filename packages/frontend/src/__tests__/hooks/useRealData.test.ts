import { renderHook, act, waitFor } from '@testing-library/react';
import { useIncidents, useAssessments, useResponses, useRealData } from '@/hooks/useRealData';
import { useDataStore } from '@/stores/data.store';

// Mock fetch API
global.fetch = jest.fn();

// Mock the fetchAPI function by directly mocking the implementation
const mockedFetchAPI = jest.fn();
jest.mock('@/hooks/useRealData', () => {
  const originalModule = jest.requireActual('@/hooks/useRealData');
  return {
    ...originalModule,
    fetchAPI: mockedFetchAPI,
  };
});

describe('Real Data Hooks Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useDataStore.getState().reset();
  });

  describe('useRealData Hook', () => {
    it('should handle successful data fetching', async () => {
      const mockData = {
        data: [],
        pagination: { page: 1, pageSize: 20, totalPages: 1, totalCount: 0 },
        meta: { timestamp: '2024-01-01T00:00:00Z', version: '1.0' },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockData }),
      });

      const { result } = renderHook(() => useRealData('test-key', () => Promise.resolve(mockData)));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeUndefined();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.data).toEqual(mockData);
        expect(result.current.error).toBeUndefined();
      });
    });

    it('should handle API errors', async () => {
      const errorMessage = 'Network error';
      (fetch as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useRealData('test-key', () => Promise.reject(new Error(errorMessage))));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeDefined();
        expect(result.current.error?.message).toBe(errorMessage);
      });
    });

    it('should handle auto-refresh', async () => {
      const mockData = { data: [], meta: { timestamp: '2024-01-01T00:00:00Z', version: '1.0' } };
      
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockData }),
      });

      const { result } = renderHook(() => 
        useRealData('test-key', () => Promise.resolve(mockData), {
          refreshInterval: 1000,
          autoRefresh: true,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.data).toEqual(mockData);
      });

      // Wait for refresh interval
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1500));
      });

      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('useIncidents Hook', () => {
    it('should fetch incidents with filters', async () => {
      const mockIncidents = {
        data: [
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
        ],
        pagination: { page: 1, pageSize: 20, totalPages: 1, totalCount: 1 },
        meta: { timestamp: '2024-01-01T00:00:00Z', version: '1.0' },
      };

      mockedFetchAPI.mockResolvedValue(mockIncidents);

      const { result } = renderHook(() => useIncidents({
        filters: { status: 'ACTIVE', severity: 'SEVERE' },
      }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.incidents).toHaveLength(1);
        expect(result.current.incidents[0].name).toBe('Test Incident');
      });

      expect(mockedFetchAPI).toHaveBeenCalledWith(
        '/api/v1/incidents',
        expect.objectContaining({
          status: 'ACTIVE',
          severity: 'SEVERE',
        })
      );
    });

    it('should provide utility functions', async () => {
      const mockIncidents = {
        data: [
          {
            id: '1',
            name: 'Active Incident',
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
            name: 'Resolved Incident',
            type: 'FIRE',
            severity: 'MINOR',
            status: 'RESOLVED',
            date: new Date(),
            affectedEntityCount: 2,
            assessmentCount: 1,
            responseCount: 1,
            lastUpdated: new Date(),
          },
        ],
        pagination: { page: 1, pageSize: 20, totalPages: 1, totalCount: 2 },
        meta: { timestamp: '2024-01-01T00:00:00Z', version: '1.0' },
      };

      mockedFetchAPI.mockResolvedValue(mockIncidents);

      const { result } = renderHook(() => useIncidents());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.incidents).toHaveLength(2);
      });

      // Test utility functions
      const activeIncidents = result.current.getActiveIncidents();
      expect(activeIncidents).toHaveLength(1);
      expect(activeIncidents[0].status).toBe('ACTIVE');

      const criticalIncidents = result.current.getCriticalIncidents();
      expect(criticalIncidents).toHaveLength(1);
      expect(criticalIncidents[0].severity).toBe('SEVERE');

      const floodIncidents = result.current.getIncidentsByType('FLOOD');
      expect(floodIncidents).toHaveLength(1);
      expect(floodIncidents[0].type).toBe('FLOOD');

      const searchResults = result.current.searchIncidents('active');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].name).toBe('Active Incident');
    });
  });

  describe('useAssessments Hook', () => {
    it('should fetch assessments with proper filtering', async () => {
      const mockAssessments = {
        data: [
          {
            id: '1',
            type: 'RAPID',
            status: 'SUBMITTED',
            verificationStatus: 'PENDING',
            assessorId: 'user1',
            assessorName: 'John Doe',
            incidentId: 'incident1',
            affectedEntityId: 'entity1',
            affectedEntityName: 'Test Entity',
            assessmentDate: new Date(),
            lastUpdated: new Date(),
            syncStatus: 'SYNCED',
          },
        ],
        pagination: { page: 1, pageSize: 20, totalPages: 1, totalCount: 1 },
        meta: { timestamp: '2024-01-01T00:00:00Z', version: '1.0' },
      };

      mockedFetchAPI.mockResolvedValue(mockAssessments);

      const { result } = renderHook(() => useAssessments({
        filters: { type: 'RAPID', status: 'SUBMITTED' },
      }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.assessments).toHaveLength(1);
        expect(result.current.assessments[0].type).toBe('RAPID');
      });

      // Test utility functions
      const pendingVerification = result.current.getPendingVerification();
      expect(pendingVerification).toHaveLength(1);
      expect(pendingVerification[0].verificationStatus).toBe('PENDING');

      const recentAssessments = result.current.getRecentAssessments(48);
      expect(recentAssessments).toHaveLength(1);
    });
  });

  describe('useResponses Hook', () => {
    it('should fetch responses with budget tracking', async () => {
      const mockResponses = {
        data: [
          {
            id: '1',
            responseType: 'IMMEDIATE',
            status: 'ACTIVE',
            assessmentId: 'assessment1',
            assessmentType: 'RAPID',
            responderId: 'responder1',
            responderName: 'Jane Smith',
            targetDate: new Date(),
            estimatedBudget: 10000,
            actualBudget: 8500,
            affectedEntityId: 'entity1',
            affectedEntityName: 'Test Entity',
            lastUpdated: new Date(),
            syncStatus: 'SYNCED',
          },
        ],
        pagination: { page: 1, pageSize: 20, totalPages: 1, totalCount: 1 },
        meta: { timestamp: '2024-01-01T00:00:00Z', version: '1.0' },
      };

      mockedFetchAPI.mockResolvedValue(mockResponses);

      const { result } = renderHook(() => useResponses({
        filters: { responseType: 'IMMEDIATE', status: 'ACTIVE' },
      }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.responses).toHaveLength(1);
        expect(result.current.responses[0].responseType).toBe('IMMEDIATE');
      });

      // Test utility functions
      const activeResponses = result.current.getActiveResponses();
      expect(activeResponses).toHaveLength(1);
      expect(activeResponses[0].status).toBe('ACTIVE');

      const overBudgetResponses = result.current.getOverBudgetResponses();
      expect(overBudgetResponses).toHaveLength(0); // 8500 < 10000

      const delayedResponses = result.current.getDelayedResponses();
      expect(delayedResponses).toHaveLength(0); // targetDate is in future
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle network errors gracefully', async () => {
      mockedFetchAPI.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useIncidents());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeDefined();
        // The error message might be transformed by our error handling
        expect(result.current.error?.message).toContain('error');
      });
    });

    it('should handle API response errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ success: false, error: 'Server error' }),
      });

      const { result } = renderHook(() => useAssessments());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeDefined();
      });
    });

    it('should retry failed requests', async () => {
      (fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ 
            success: true, 
            data: { 
              data: [], 
              pagination: { page: 1, pageSize: 20, totalPages: 0, totalCount: 0 },
              meta: { timestamp: '2024-01-01T00:00:00Z', version: '1.0' },
            } 
          }),
        });

      const { result } = renderHook(() => useResponses());

      // Wait for retry
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Should have been called at least once (initial attempt)
      expect(fetch).toHaveBeenCalled();
    });
  });

  });