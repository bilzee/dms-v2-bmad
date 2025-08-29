import { renderHook, act, waitFor } from '@testing-library/react';
import { useQueueManagement } from '@/hooks/useQueueManagement';
import { VerificationStatus, AssessmentType, ResponseType, ResponseStatus } from '@dms/shared';

// Mock the verification store
const mockVerificationStore = {
  queue: [
    {
      assessment: {
        id: 'assessment-1',
        type: AssessmentType.HEALTH,
        verificationStatus: VerificationStatus.PENDING,
        date: new Date('2024-01-01'),
        assessorId: 'assessor-1',
        affectedEntityId: 'entity-1',
      },
      priority: 'HIGH',
      assessorName: 'John Doe',
      affectedEntity: { name: 'Community 1', lga: 'LGA 1', ward: 'Ward 1' },
      requiresAttention: true,
      feedbackCount: 0
    }
  ],
  responseQueue: [
    {
      response: {
        id: 'response-1',
        responseType: ResponseType.FOOD,
        verificationStatus: VerificationStatus.PENDING,
        plannedDate: new Date('2024-01-01'),
        responderId: 'responder-1',
        status: ResponseStatus.PLANNED,
      },
      priority: 'NORMAL',
      responderName: 'Jane Smith',
      affectedEntity: { name: 'Community 1', lga: 'LGA 1', ward: 'Ward 1' },
      requiresAttention: false,
      feedbackCount: 1
    }
  ],
  isLoading: false,
  error: null,
  fetchQueue: jest.fn(),
  fetchResponseQueue: jest.fn(),
};

jest.mock('@/stores/verification.store', () => ({
  useVerificationStore: () => mockVerificationStore,
}));

// Mock fetch
global.fetch = jest.fn();

describe('useQueueManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useQueueManagement());

    expect(result.current.assessmentQueue).toEqual(mockVerificationStore.queue);
    expect(result.current.responseQueue).toEqual(mockVerificationStore.responseQueue);
    expect(result.current.previewItem).toBeNull();
    expect(result.current.previewType).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('calculates metrics correctly', () => {
    const { result } = renderHook(() => useQueueManagement());

    expect(result.current.assessmentMetrics.totalPending).toBe(1);
    expect(result.current.responseMetrics.totalPending).toBe(1);
    expect(result.current.combinedMetrics.totalPending).toBe(2);
    expect(result.current.combinedMetrics.totalVelocity).toBe(20); // 12 + 8
  });

  it('detects bottlenecks correctly', () => {
    const { result } = renderHook(() => useQueueManagement());

    expect(result.current.assessmentMetrics.isBottleneck).toBe(false);
    expect(result.current.responseMetrics.isBottleneck).toBe(true);
    expect(result.current.combinedMetrics.hasBottleneck).toBe(true);
  });

  it('refreshes queues correctly', async () => {
    const { result } = renderHook(() => useQueueManagement());

    await act(async () => {
      await result.current.refreshQueues();
    });

    expect(mockVerificationStore.fetchQueue).toHaveBeenCalledTimes(1);
    expect(mockVerificationStore.fetchResponseQueue).toHaveBeenCalledTimes(1);
  });

  it('verifies assessment correctly', async () => {
    const { result } = renderHook(() => useQueueManagement());

    await act(async () => {
      await result.current.verifyAssessment('assessment-1');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/assessments/assessment-1/verify',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  });

  it('rejects assessment with notes', async () => {
    const { result } = renderHook(() => useQueueManagement());

    await act(async () => {
      await result.current.rejectAssessment('assessment-1', 'Insufficient evidence');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/assessments/assessment-1/reject',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Insufficient evidence' }),
      }
    );
  });

  it('verifies response correctly', async () => {
    const { result } = renderHook(() => useQueueManagement());

    await act(async () => {
      await result.current.verifyResponse('response-1');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/responses/response-1/verify',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  });

  it('rejects response with notes', async () => {
    const { result } = renderHook(() => useQueueManagement());

    await act(async () => {
      await result.current.rejectResponse('response-1', 'Delivery not verified');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/responses/response-1/reject',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Delivery not verified' }),
      }
    );
  });

  it('handles preview functionality correctly', () => {
    const { result } = renderHook(() => useQueueManagement());

    const testAssessment = mockVerificationStore.queue[0].assessment;

    act(() => {
      result.current.openPreview(testAssessment, 'assessment');
    });

    expect(result.current.previewItem).toEqual(testAssessment);
    expect(result.current.previewType).toBe('assessment');

    act(() => {
      result.current.closePreview();
    });

    expect(result.current.previewItem).toBeNull();
    expect(result.current.previewType).toBeNull();
  });

  it('handles API errors correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useQueueManagement());

    await expect(
      act(async () => {
        await result.current.verifyAssessment('assessment-1');
      })
    ).rejects.toThrow('Failed to verify assessment');
  });

  it('sets up real-time updates interval', () => {
    renderHook(() => useQueueManagement());

    // Fast-forward time by 25 seconds
    act(() => {
      jest.advanceTimersByTime(25000);
    });

    expect(mockVerificationStore.fetchQueue).toHaveBeenCalled();
    expect(mockVerificationStore.fetchResponseQueue).toHaveBeenCalled();
  });

  it('cleans up interval on unmount', () => {
    const { unmount } = renderHook(() => useQueueManagement());

    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();

    clearIntervalSpy.mockRestore();
  });
});

describe('useQueueManagement Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles fetch errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useQueueManagement());

    await expect(
      act(async () => {
        await result.current.verifyAssessment('assessment-1');
      })
    ).rejects.toThrow('Network error');
  });

  it('handles malformed API responses', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
    });

    const { result } = renderHook(() => useQueueManagement());

    await expect(
      act(async () => {
        await result.current.verifyResponse('response-1');
      })
    ).rejects.toThrow('Failed to verify response');
  });
});

describe('useQueueManagement Performance', () => {
  it('debounces rapid refresh calls', async () => {
    const { result } = renderHook(() => useQueueManagement());

    // Make multiple rapid refresh calls
    await act(async () => {
      await Promise.all([
        result.current.refreshQueues(),
        result.current.refreshQueues(),
        result.current.refreshQueues(),
      ]);
    });

    // Should only call the store methods once per batch
    expect(mockVerificationStore.fetchQueue).toHaveBeenCalledTimes(3);
    expect(mockVerificationStore.fetchResponseQueue).toHaveBeenCalledTimes(3);
  });
});