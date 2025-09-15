import { renderHook } from '@testing-library/react';
import { useAssessmentStats } from '../useAssessmentStats';

// Mock SWR to avoid actual API calls in tests
jest.mock('swr', () => {
  return {
    __esModule: true,
    default: jest.fn(() => ({
      data: {
        success: true,
        data: {
          totalAssessments: 15,
          activeAssessments: 8,
          pendingReview: 3,
          completedToday: 2
        }
      },
      error: null,
      mutate: jest.fn(),
    })),
  };
});

describe('useAssessmentStats', () => {
  it('should return assessment stats when data is available', () => {
    const { result } = renderHook(() => useAssessmentStats());
    
    expect(result.current.stats).toEqual({
      totalAssessments: 15,
      activeAssessments: 8,
      pendingReview: 3,
      completedToday: 2
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should provide a refetch function', () => {
    const { result } = renderHook(() => useAssessmentStats());
    
    expect(typeof result.current.refetch).toBe('function');
  });
});