import { act, renderHook, waitFor } from '@testing-library/react';
import { useSyncStore } from '../sync.store';
import type { OfflineQueueItem } from '@dms/shared';

// Mock fetch
global.fetch = jest.fn();

// Mock queue items
const mockQueueItems: OfflineQueueItem[] = [
  {
    id: 'queue_1',
    type: 'ASSESSMENT',
    action: 'CREATE',
    data: { assessmentType: 'HEALTH', priority: 'HIGH' },
    retryCount: 0,
    priority: 'HIGH',
    createdAt: new Date('2025-08-22T10:00:00Z'),
    error: 'Network timeout',
  },
  {
    id: 'queue_2', 
    type: 'ASSESSMENT',
    action: 'CREATE',
    data: { assessmentType: 'WASH', priority: 'NORMAL' },
    retryCount: 1,
    priority: 'NORMAL',
    createdAt: new Date('2025-08-22T09:30:00Z'),
  },
  {
    id: 'queue_3',
    type: 'MEDIA',
    action: 'CREATE',
    data: { fileName: 'emergency-photo.jpg' },
    retryCount: 0,
    priority: 'HIGH',
    createdAt: new Date('2025-08-22T09:00:00Z'),
  },
];

const mockSummaryData = {
  totalItems: 3,
  pendingItems: 1,
  failedItems: 1,
  syncingItems: 1,
  highPriorityItems: 2,
  lastUpdated: new Date('2025-08-22T12:00:00Z'),
  oldestPendingItem: {
    id: 'queue_3',
    type: 'MEDIA',
    createdAt: new Date('2025-08-22T09:00:00Z'),
    priority: 'HIGH',
  },
};

describe('useSyncStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useSyncStore.getState().queue = [];
    useSyncStore.getState().filteredQueue = [];
    useSyncStore.getState().error = null;
    useSyncStore.getState().isLoading = false;
  });

  describe('loadQueue', () => {
    it('loads queue successfully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockQueueItems }),
      });

      const { result } = renderHook(() => useSyncStore());

      await act(async () => {
        await result.current.loadQueue();
      });

      expect(fetch).toHaveBeenCalledWith('/api/v1/queue?');
      expect(result.current.queue).toHaveLength(3);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.lastRefresh).toBeDefined();
    });

    it('loads queue with filters', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockQueueItems }),
      });

      const { result } = renderHook(() => useSyncStore());

      await act(async () => {
        await result.current.loadQueue({ status: 'FAILED', priority: 'HIGH' });
      });

      expect(fetch).toHaveBeenCalledWith('/api/v1/queue?status=FAILED&priority=HIGH');
      expect(result.current.currentFilters).toEqual({ status: 'FAILED', priority: 'HIGH' });
    });

    it('sorts queue items by priority and creation date', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockQueueItems }),
      });

      const { result } = renderHook(() => useSyncStore());

      await act(async () => {
        await result.current.loadQueue();
      });

      const queue = result.current.queue;
      
      // Should be sorted by priority (HIGH first), then by creation date (newest first)
      expect(queue[0].priority).toBe('HIGH');
      expect(queue[0].id).toBe('queue_1'); // Newest HIGH priority
      expect(queue[1].priority).toBe('HIGH');
      expect(queue[1].id).toBe('queue_3'); // Older HIGH priority
      expect(queue[2].priority).toBe('NORMAL');
    });

    it('handles load queue error', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Failed to load' }),
      });

      const { result } = renderHook(() => useSyncStore());

      await act(async () => {
        await result.current.loadQueue();
      });

      expect(result.current.error).toBe('Failed to load');
      expect(result.current.isLoading).toBe(false);
    });

    it('handles network error', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useSyncStore());

      await act(async () => {
        await result.current.loadQueue();
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('refreshQueue', () => {
    it('refreshes queue with current filters', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockQueueItems }),
      });

      const { result } = renderHook(() => useSyncStore());

      // Set current filters
      act(() => {
        result.current.updateFilters({ status: 'PENDING' });
      });

      await act(async () => {
        await result.current.refreshQueue();
      });

      expect(fetch).toHaveBeenCalledWith('/api/v1/queue?status=PENDING');
      expect(result.current.isRefreshing).toBe(false);
    });
  });

  describe('retryQueueItem', () => {
    it('retries queue item successfully', async () => {
      // Mock successful retry response
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true }),
        })
        // Mock successful queue refresh
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true, data: mockQueueItems }),
        });

      const { result } = renderHook(() => useSyncStore());

      await act(async () => {
        await result.current.retryQueueItem('queue_1');
      });

      expect(fetch).toHaveBeenCalledWith('/api/v1/queue/queue_1/retry', {
        method: 'PUT',
      });
      expect(result.current.error).toBe(null);
    });

    it('handles retry error', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Retry failed' }),
      });

      const { result } = renderHook(() => useSyncStore());

      await act(async () => {
        await result.current.retryQueueItem('queue_1');
      });

      expect(result.current.error).toBe('Retry failed');
    });
  });

  describe('removeQueueItem', () => {
    it('removes queue item successfully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

      const { result } = renderHook(() => useSyncStore());

      // Set initial queue
      act(() => {
        result.current.queue = mockQueueItems;
        result.current.filteredQueue = mockQueueItems;
      });

      await act(async () => {
        await result.current.removeQueueItem('queue_1');
      });

      expect(fetch).toHaveBeenCalledWith('/api/v1/queue/queue_1/retry', {
        method: 'DELETE',
      });

      // Item should be removed from local state
      expect(result.current.queue).toHaveLength(2);
      expect(result.current.queue.find(item => item.id === 'queue_1')).toBeUndefined();
    });

    it('handles remove error', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Remove failed' }),
      });

      const { result } = renderHook(() => useSyncStore());

      await act(async () => {
        await result.current.removeQueueItem('queue_1');
      });

      expect(result.current.error).toBe('Remove failed');
    });
  });

  describe('updateFilters', () => {
    it('updates filters and applies them to queue', () => {
      const { result } = renderHook(() => useSyncStore());

      // Set initial queue
      act(() => {
        result.current.queue = mockQueueItems;
      });

      // Update filters
      act(() => {
        result.current.updateFilters({ priority: 'HIGH' });
      });

      expect(result.current.currentFilters).toEqual({ priority: 'HIGH' });
      
      // Should filter to only HIGH priority items
      expect(result.current.filteredQueue).toHaveLength(2);
      expect(result.current.filteredQueue.every(item => item.priority === 'HIGH')).toBe(true);
    });

    it('filters by status correctly', () => {
      const { result } = renderHook(() => useSyncStore());

      // Set initial queue
      act(() => {
        result.current.queue = mockQueueItems;
      });

      // Filter for failed items (items with error and retryCount > 0)
      act(() => {
        result.current.updateFilters({ status: 'FAILED' });
      });

      expect(result.current.filteredQueue).toHaveLength(1);
      expect(result.current.filteredQueue[0].id).toBe('queue_1'); // Has error
    });

    it('filters by type correctly', () => {
      const { result } = renderHook(() => useSyncStore());

      // Set initial queue
      act(() => {
        result.current.queue = mockQueueItems;
      });

      // Filter for assessment items
      act(() => {
        result.current.updateFilters({ type: 'ASSESSMENT' });
      });

      expect(result.current.filteredQueue).toHaveLength(2);
      expect(result.current.filteredQueue.every(item => item.type === 'ASSESSMENT')).toBe(true);
    });
  });

  describe('loadQueueSummary', () => {
    it('loads queue summary successfully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockSummaryData }),
      });

      const { result } = renderHook(() => useSyncStore());

      await act(async () => {
        await result.current.loadQueueSummary();
      });

      expect(fetch).toHaveBeenCalledWith('/api/v1/queue/summary');
      expect(result.current.queueSummary).toEqual(mockSummaryData);
    });

    it('handles summary load error gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Summary failed'));

      const { result } = renderHook(() => useSyncStore());

      await act(async () => {
        await result.current.loadQueueSummary();
      });

      // Should not set error for summary failures (they're not critical)
      expect(result.current.error).toBe(null);
      expect(result.current.queueSummary).toBe(null);
    });
  });

  describe('auto-refresh settings', () => {
    it('enables and disables auto-refresh', () => {
      const { result } = renderHook(() => useSyncStore());

      act(() => {
        result.current.setAutoRefresh(false);
      });

      expect(result.current.autoRefreshEnabled).toBe(false);

      act(() => {
        result.current.setAutoRefresh(true);
      });

      expect(result.current.autoRefreshEnabled).toBe(true);
    });

    it('sets refresh interval', () => {
      const { result } = renderHook(() => useSyncStore());

      act(() => {
        result.current.setRefreshInterval(60000);
      });

      expect(result.current.refreshInterval).toBe(60000);
    });
  });

  describe('error handling', () => {
    it('clears error state', () => {
      const { result } = renderHook(() => useSyncStore());

      // Set an error
      act(() => {
        result.current.error = 'Test error';
      });

      expect(result.current.error).toBe('Test error');

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('loading states', () => {
    it('sets loading state during loadQueue', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => { resolvePromise = resolve; });

      (fetch as jest.Mock).mockReturnValueOnce({
        json: () => promise,
      });

      const { result } = renderHook(() => useSyncStore());

      // Start loading
      const loadPromise = act(async () => {
        await result.current.loadQueue();
      });

      // Should be in loading state
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      resolvePromise!({ success: true, data: [] });
      await loadPromise;

      // Should not be loading anymore
      expect(result.current.isLoading).toBe(false);
    });

    it('sets refreshing state during refreshQueue', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: [] }),
      });

      const { result } = renderHook(() => useSyncStore());

      await act(async () => {
        const refreshPromise = result.current.refreshQueue();
        // Should be refreshing immediately
        expect(result.current.isRefreshing).toBe(true);
        await refreshPromise;
      });

      // Should not be refreshing anymore
      expect(result.current.isRefreshing).toBe(false);
    });
  });
});