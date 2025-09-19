import { useState, useCallback } from 'react';
import useSWR from 'swr';

interface Assignment {
  id: string;
  type: 'assessment' | 'response';
  title: string;
  entityName?: string;
  entityId?: string;
  scheduledDate: Date;
  status: string;
}

interface TeamMember {
  userId: string;
  name: string;
  email: string;
  organization?: string;
  activeRole?: string;
  roles: string[];
  availabilityStatus: 'available' | 'assigned' | 'unavailable';
  totalAssignments: number;
  activeAssignments: number;
  lastSync?: Date;
  assignments: Assignment[];
}

interface TeamAssignmentData {
  teamAssignments: TeamMember[];
  summary: {
    totalTeamMembers: number;
    availableMembers: number;
    assignedMembers: number;
    unavailableMembers: number;
    roleDistribution: Record<string, number>;
    workloadStats: {
      averageAssignments: number;
      maxAssignments: number;
      overloadedMembers: number;
    };
  };
}

interface UseTeamAssignmentsOptions {
  incidentId?: string;
  role?: string;
  availability?: 'available' | 'assigned' | 'unavailable';
  refreshInterval?: number;
}

interface UseTeamAssignmentsReturn {
  data: TeamAssignmentData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  createAssignment: (request: any) => Promise<any>;
  isCreatingAssignment: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

export const useTeamAssignments = (options: UseTeamAssignmentsOptions = {}): UseTeamAssignmentsReturn => {
  const { incidentId, role, availability, refreshInterval = 300000 } = options; // 5 minutes default
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);

  // Build URL with query parameters
  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (incidentId) params.append('incidentId', incidentId);
    if (role) params.append('role', role);
    if (availability) params.append('availability', availability);
    
    return `/api/v1/coordinator/assignments${params.toString() ? '?' + params.toString() : ''}`;
  }, [incidentId, role, availability]);

  const { data, error, mutate } = useSWR(
    buildUrl(),
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000 // Dedupe requests within 1 minute
    }
  );

  const createAssignment = useCallback(async (request: any) => {
    try {
      setIsCreatingAssignment(true);
      const response = await fetch('/api/v1/coordinator/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.errors?.[0] || 'Failed to create assignment');
      }

      // Refresh team assignment data after successful creation
      mutate();
      
      return result.data;
    } catch (error) {
      console.error('Failed to create assignment:', error);
      throw error;
    } finally {
      setIsCreatingAssignment(false);
    }
  }, [mutate]);

  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);

  return {
    data: data?.success ? data.data : null,
    loading: !error && !data,
    error: error?.message || (data?.success === false ? data.errors?.[0] : null),
    refresh,
    createAssignment,
    isCreatingAssignment
  };
};