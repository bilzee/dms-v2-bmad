import useSWR from 'swr';

interface VerificationQueueCounts {
  assessmentQueue: number;
  responseQueue: number;
  totalPending: number;
}

interface UseVerificationQueueReturn {
  counts: VerificationQueueCounts | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

export const useVerificationQueue = (refreshInterval = 10000): UseVerificationQueueReturn => {
  const { data, error, mutate } = useSWR(
    '/api/v1/verification/queue/count',
    fetcher,
    { 
      refreshInterval,
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  );

  return {
    counts: data?.success ? data.data : null,
    loading: !error && !data,
    error: error?.message || (data?.success === false ? data.errors?.[0] : null),
    refetch: mutate
  };
};