import useSWR from 'swr';
import { useRoleContext } from '@/components/providers/RoleContextProvider';

interface BadgeData {
  [key: string]: number;
}

interface UseDashboardBadgesReturn {
  badges: BadgeData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

export const useDashboardBadges = (refreshInterval = 300000): UseDashboardBadgesReturn => {
  // 5 minutes instead of 15 seconds - reduces API calls by 95%
  const { activeRole } = useRoleContext();
  const roleName = activeRole?.name?.toLowerCase();

  const { data, error, mutate } = useSWR(
    roleName ? `/api/v1/dashboard/badges/${roleName}` : null,
    fetcher,
    { 
      refreshInterval,
      revalidateOnFocus: false,        // Don't refresh on tab focus
      revalidateOnReconnect: true,     // Only refresh on reconnect
      dedupingInterval: 60000          // Dedupe requests within 1 minute
    }
  );

  return {
    badges: data?.success ? data.data : null,
    loading: !error && !data,
    error: error?.message || (data?.success === false ? data.errors?.[0] : null),
    refetch: mutate
  };
};