import { renderHook, act } from '@testing-library/react';
import { useVerificationStore } from '@/stores/verification.store';
import { AssessmentType, VerificationStatus } from '@dms/shared';

// Mock fetch
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('VerificationStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useVerificationStore.setState({
      queue: [],
      queueStats: {
        totalPending: 0,
        highPriority: 0,
        requiresAttention: 0,
        byAssessmentType: {},
      },
      pagination: {
        page: 1,
        pageSize: 20,
        totalPages: 0,
        totalCount: 0,
      },
      isLoading: false,
      error: null,
      selectedAssessmentIds: [],
      isPreviewOpen: false,
      previewAssessment: null,
      filters: {},
      sortBy: 'priority',
      sortOrder: 'desc',
      isBatchProcessing: false,
      batchProgress: {
        processed: 0,
        total: 0,
        currentOperation: '',
      },
    });
  });

  describe('fetchQueue', () => {
    it('fetches queue data successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          queue: [],
          queueStats: {
            totalPending: 5,
            highPriority: 2,
            requiresAttention: 1,
            byAssessmentType: { [AssessmentType.HEALTH]: 3, [AssessmentType.WASH]: 2 },
          },
          pagination: {
            page: 1,
            pageSize: 20,
            totalPages: 1,
            totalCount: 5,
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { result } = renderHook(() => useVerificationStore());

      await act(async () => {
        await result.current.fetchQueue();
      });

      expect(result.current.queueStats.totalPending).toBe(5);
      expect(result.current.queueStats.highPriority).toBe(2);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('handles fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const { result } = renderHook(() => useVerificationStore());

      await act(async () => {
        await result.current.fetchQueue();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    it('sets loading state during fetch', async () => {
      mockFetch.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, data: { queue: [], queueStats: {}, pagination: {} } }),
        } as Response), 100))
      );

      const { result } = renderHook(() => useVerificationStore());

      act(() => {
        result.current.fetchQueue();
      });

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('filters and sorting', () => {
    it('updates filters and resets pagination', async () => {
      const { result } = renderHook(() => useVerificationStore());

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { queue: [], queueStats: {}, pagination: {} } }),
      } as Response);

      await act(async () => {
        result.current.setFilters({ assessmentTypes: [AssessmentType.HEALTH] });
      });

      expect(result.current.filters.assessmentTypes).toEqual([AssessmentType.HEALTH]);
      expect(result.current.pagination.page).toBe(1);
    });

    it('updates sorting', async () => {
      const { result } = renderHook(() => useVerificationStore());

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { queue: [], queueStats: {}, pagination: {} } }),
      } as Response);

      await act(async () => {
        result.current.setSorting('date', 'asc');
      });

      expect(result.current.sortBy).toBe('date');
      expect(result.current.sortOrder).toBe('asc');
    });
  });

  describe('selection management', () => {
    it('toggles assessment selection', () => {
      const { result } = renderHook(() => useVerificationStore());

      act(() => {
        result.current.toggleAssessmentSelection('assessment-1');
      });

      expect(result.current.selectedAssessmentIds).toContain('assessment-1');

      act(() => {
        result.current.toggleAssessmentSelection('assessment-1');
      });

      expect(result.current.selectedAssessmentIds).not.toContain('assessment-1');
    });

    it('selects all visible assessments', () => {
      const { result } = renderHook(() => useVerificationStore());

      // Add mock queue items
      act(() => {
        useVerificationStore.setState({
          queue: [
            { assessment: { id: '1' } },
            { assessment: { id: '2' } },
          ] as any,
        });
      });

      act(() => {
        result.current.selectAllVisible();
      });

      expect(result.current.selectedAssessmentIds).toEqual(['1', '2']);
    });

    it('clears selection', () => {
      const { result } = renderHook(() => useVerificationStore());

      // Set some selected IDs
      act(() => {
        useVerificationStore.setState({
          selectedAssessmentIds: ['1', '2', '3'],
        });
      });

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedAssessmentIds).toEqual([]);
    });

    it('gets selected count', () => {
      const { result } = renderHook(() => useVerificationStore());

      act(() => {
        useVerificationStore.setState({
          selectedAssessmentIds: ['1', '2', '3'],
        });
      });

      expect(result.current.getSelectedCount()).toBe(3);
    });
  });

  describe('preview management', () => {
    it('opens assessment preview', () => {
      const { result } = renderHook(() => useVerificationStore());
      const mockAssessment = { id: '1', type: AssessmentType.HEALTH } as any;

      act(() => {
        result.current.openPreview(mockAssessment);
      });

      expect(result.current.isPreviewOpen).toBe(true);
      expect(result.current.previewAssessment).toEqual(mockAssessment);
    });

    it('closes assessment preview', () => {
      const { result } = renderHook(() => useVerificationStore());

      // Set preview state
      act(() => {
        useVerificationStore.setState({
          isPreviewOpen: true,
          previewAssessment: { id: '1' } as any,
        });
      });

      act(() => {
        result.current.closePreview();
      });

      expect(result.current.isPreviewOpen).toBe(false);
      expect(result.current.previewAssessment).toBe(null);
    });
  });

  describe('verification actions', () => {
    it('verifies single assessment', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const { result } = renderHook(() => useVerificationStore());

      await act(async () => {
        await result.current.verifyAssessment('assessment-1', 'APPROVE');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/verification/assessments/assessment-1/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      });
    });

    it('handles verification error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      } as Response);

      const { result } = renderHook(() => useVerificationStore());

      await expect(
        act(async () => {
          await result.current.verifyAssessment('assessment-1', 'APPROVE');
        })
      ).rejects.toThrow();
    });

    it('performs batch verification', async () => {
      const mockBatchResponse = {
        success: true,
        data: {
          processed: 2,
          successful: 2,
          failed: 0,
          errors: [],
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockBatchResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { queue: [], queueStats: {}, pagination: {} } }),
        } as Response);

      const { result } = renderHook(() => useVerificationStore());

      await act(async () => {
        await result.current.batchVerify({
          assessmentIds: ['1', '2'],
          action: 'APPROVE',
        });
      });

      expect(result.current.isBatchProcessing).toBe(false);
      expect(result.current.selectedAssessmentIds).toEqual([]);
    });

    it('handles batch verification with errors', async () => {
      const mockBatchResponse = {
        success: true,
        data: {
          processed: 2,
          successful: 1,
          failed: 1,
          errors: [{ assessmentId: '2', error: 'Processing failed' }],
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockBatchResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { queue: [], queueStats: {}, pagination: {} } }),
        } as Response);

      const { result } = renderHook(() => useVerificationStore());
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await act(async () => {
        await result.current.batchVerify({
          assessmentIds: ['1', '2'],
          action: 'APPROVE',
        });
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Some assessments failed to verify:',
        [{ assessmentId: '2', error: 'Processing failed' }]
      );

      consoleSpy.mockRestore();
    });
  });

  describe('pagination', () => {
    it('updates page and refetches', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { queue: [], queueStats: {}, pagination: {} } }),
      } as Response);

      const { result } = renderHook(() => useVerificationStore());

      await act(async () => {
        result.current.setPage(2);
      });

      expect(result.current.pagination.page).toBe(2);
    });
  });

  describe('utility functions', () => {
    it('gets high priority count', () => {
      const { result } = renderHook(() => useVerificationStore());

      act(() => {
        useVerificationStore.setState({
          queueStats: {
            totalPending: 10,
            highPriority: 5,
            requiresAttention: 2,
            byAssessmentType: {},
          },
        });
      });

      expect(result.current.getHighPriorityCount()).toBe(5);
    });

    it('resets store state', () => {
      const { result } = renderHook(() => useVerificationStore());

      // Modify state
      act(() => {
        useVerificationStore.setState({
          selectedAssessmentIds: ['1', '2'],
          isPreviewOpen: true,
          filters: { assessmentTypes: [AssessmentType.HEALTH] },
        });
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.selectedAssessmentIds).toEqual([]);
      expect(result.current.isPreviewOpen).toBe(false);
      expect(result.current.filters).toEqual({});
    });
  });
});