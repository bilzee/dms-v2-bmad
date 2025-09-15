import { useState, useEffect } from 'react';
import useSWR from 'swr';

interface AssessmentStats {
  totalAssessments: number;
  activeAssessments: number;
  pendingReview: number;
  completedToday: number;
}

interface UseAssessmentStatsReturn {
  stats: AssessmentStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

export const useAssessmentStats = (refreshInterval = 30000): UseAssessmentStatsReturn => {
  const { data, error, mutate } = useSWR(
    '/api/v1/assessments/stats',
    fetcher,
    { 
      refreshInterval,
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  );

  return {
    stats: data?.success ? data.data : null,
    loading: !error && !data,
    error: error?.message || (data?.success === false ? data.errors?.[0] : null),
    refetch: mutate
  };
};