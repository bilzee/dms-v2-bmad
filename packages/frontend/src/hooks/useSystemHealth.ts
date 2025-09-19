import useSWR from 'swr';

interface SystemHealth {
  overall: {
    score: number;
    status: string;
    timestamp: string;
  };
  system: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
    status: string;
  };
  database: {
    connectionCount: number;
    avgQueryTime: number;
    slowQueries: number;
    status: string;
  };
  api: {
    avgResponseTime: number;
    errorRate: number;
    requestsPerMinute: number;
    status: string;
  };
  security: {
    recentEvents: number;
    activeAlerts: number;
    status: string;
  };
  users: {
    activeSessions: number;
    status: string;
  };
}

interface UseSystemHealthReturn {
  health: SystemHealth | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

export const useSystemHealth = (refreshInterval = 30000): UseSystemHealthReturn => {
  const { data, error, mutate } = useSWR(
    '/api/v1/admin/monitoring/health',
    fetcher,
    { 
      refreshInterval,
      revalidateOnFocus: false,
      dedupingInterval: 15000,
      errorRetryCount: 2
    }
  );

  return {
    health: data?.success ? data.data : null,
    loading: !error && !data,
    error: error?.message || (data?.success === false ? data.errors?.[0] : null),
    refetch: mutate
  };
};