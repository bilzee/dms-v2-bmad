import useSWR from 'swr';

interface UserActivity {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  eventType: string;
  description: string;
  timestamp: string;
}

interface SystemMetrics {
  id: string;
  timestamp: string;
  metricType: string;
  memoryUsage?: number;
  cpuUsage?: number;
  avgResponseTime?: number;
  errorRate?: number;
}

interface UseAdminDataReturn {
  userActivity: UserActivity[] | null;
  systemMetrics: SystemMetrics | null;
  loading: boolean;
  error: string | null;
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

export const useAdminData = (): UseAdminDataReturn => {
  const { data: activityData, error: activityError } = useSWR(
    '/api/v1/admin/activity/recent',
    fetcher,
    { 
      refreshInterval: 30000, // 30 seconds
      revalidateOnFocus: false,
      dedupingInterval: 15000
    }
  );

  const { data: metricsData, error: metricsError } = useSWR(
    '/api/v1/admin/monitoring/metrics',
    fetcher,
    { 
      refreshInterval: 60000, // 1 minute
      revalidateOnFocus: false,
      dedupingInterval: 30000
    }
  );

  const loading = !activityData && !activityError && !metricsData && !metricsError;
  const error = activityError?.message || metricsError?.message || null;

  return {
    userActivity: activityData?.success ? activityData.data : null,
    systemMetrics: metricsData?.success ? metricsData.data : null,
    loading,
    error
  };
};