import { useState, useCallback } from 'react';
import { 
  Donor,
  DonorListResponse,
  ResourceAvailability,
  CoordinationWorkspaceItem,
  DonorStats,
  ResourceAllocationRequest,
  ResponseType
} from '@dms/shared';

interface DonorCoordinationState {
  donors: Donor[];
  resourceAvailability: {
    resources: ResourceAvailability[];
    summary: {
      totalResourceTypes: number;
      resourcesWithShortfalls: number;
      resourcesFullyAllocated: number;
      totalCommitments: number;
      totalAllocations: number;
      criticalShortfalls: Array<{
        responseType: string;
        shortfall: number;
        unit: string;
        percentage: number;
      }>;
      upcomingDeadlines: Array<{
        responseType: string;
        affectedEntityName: string;
        quantity: number;
        unit: string;
        targetDate: Date;
        priority: string;
        daysUntilDeadline: number;
      }>;
    };
  } | null;
  coordinationWorkspace: CoordinationWorkspaceItem[];
  stats: DonorStats | null;
  loading: boolean;
  error: string | null;
}

export function useDonorCoordination() {
  const [state, setState] = useState<DonorCoordinationState>({
    donors: [],
    resourceAvailability: null,
    coordinationWorkspace: [],
    stats: null,
    loading: false,
    error: null,
  });

  const refreshData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Fetch all donor coordination data in parallel
      const [donorsResponse, resourcesResponse] = await Promise.all([
        fetch('/api/v1/donors'),
        fetch('/api/v1/coordinator/resources/available'),
      ]);

      if (!donorsResponse.ok) {
        throw new Error(`Failed to fetch donors: ${donorsResponse.statusText}`);
      }

      if (!resourcesResponse.ok) {
        throw new Error(`Failed to fetch resources: ${resourcesResponse.statusText}`);
      }

      const donorsData: DonorListResponse = await donorsResponse.json();
      const resourcesData = await resourcesResponse.json();

      if (!donorsData.success) {
        throw new Error(donorsData.message || 'Failed to fetch donors');
      }

      if (!resourcesData.success) {
        throw new Error(resourcesData.message || 'Failed to fetch resources');
      }

      // Mock coordination workspace items - would come from actual API
      const mockWorkspaceItems: CoordinationWorkspaceItem[] = [
        {
          id: 'ws-1',
          type: 'RESOURCE_ALLOCATION',
          title: 'Food allocation for Maiduguri IDP Camp',
          description: 'Coordinate 500kg rice delivery from ActionAid Nigeria',
          priority: 'HIGH',
          status: 'PENDING',
          assignedTo: 'current-coordinator',
          assignedToName: 'Current Coordinator',
          donorId: '1',
          donorName: 'ActionAid Nigeria',
          affectedEntityId: 'entity-1',
          affectedEntityName: 'Maiduguri IDP Camp',
          responseType: ResponseType.FOOD,
          quantity: 500,
          unit: 'kg',
          dueDate: new Date('2024-09-15'),
          createdAt: new Date('2024-08-25'),
          updatedAt: new Date('2024-08-25'),
          actions: [
            {
              id: 'action-1',
              type: 'CONFIRM_WITH_DONOR',
              description: 'Confirm availability and delivery schedule',
              completed: false,
              dueDate: new Date('2024-09-01'),
            },
            {
              id: 'action-2',
              type: 'COORDINATE_LOGISTICS',
              description: 'Arrange transportation and delivery point',
              completed: false,
              dueDate: new Date('2024-09-05'),
            }
          ]
        },
        {
          id: 'ws-2',
          type: 'CONFLICT_RESOLUTION',
          title: 'WASH resource conflict resolution',
          description: 'Resolve timing conflict between Oxfam and ActionAid deliveries',
          priority: 'MEDIUM',
          status: 'IN_PROGRESS',
          assignedTo: 'current-coordinator',
          assignedToName: 'Current Coordinator',
          conflictType: 'TIMING_CONFLICT',
          conflictDescription: 'Both donors scheduled for same delivery window',
          affectedEntityId: 'entity-1',
          affectedEntityName: 'Maiduguri IDP Camp',
          responseType: ResponseType.WASH,
          createdAt: new Date('2024-08-24'),
          updatedAt: new Date('2024-08-25'),
          actions: [
            {
              id: 'action-3',
              type: 'CONTACT_DONORS',
              description: 'Contact both donors to discuss alternative schedules',
              completed: true,
              completedAt: new Date('2024-08-24'),
            },
            {
              id: 'action-4',
              type: 'UPDATE_SCHEDULE',
              description: 'Update delivery schedule in system',
              completed: false,
              dueDate: new Date('2024-08-26'),
            }
          ]
        }
      ];

      setState({
        donors: donorsData.data.donors,
        resourceAvailability: resourcesData.data,
        coordinationWorkspace: mockWorkspaceItems,
        stats: donorsData.data.stats,
        loading: false,
        error: null,
      });

    } catch (error) {
      console.error('Failed to refresh donor coordination data:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  }, []);

  const updateDonor = useCallback(async (donorId: string, updates: Partial<Donor>) => {
    try {
      // In a real implementation, this would make a PATCH request to update the donor
      setState(prev => ({
        ...prev,
        donors: prev.donors.map(donor =>
          donor.id === donorId ? { ...donor, ...updates, updatedAt: new Date() } : donor
        ),
      }));
    } catch (error) {
      console.error('Failed to update donor:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update donor',
      }));
    }
  }, []);

  const createAllocation = useCallback(async (allocationRequest: ResourceAllocationRequest) => {
    try {
      const response = await fetch('/api/v1/coordinator/resources/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allocationRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle conflict scenarios (409 status)
        if (response.status === 409) {
          setState(prev => ({
            ...prev,
            error: `Allocation conflicts detected: ${errorData.conflicts?.map((c: any) => c.description).join(', ')}`,
          }));
          return { success: false, conflicts: errorData.conflicts };
        }
        
        throw new Error(errorData.message || 'Failed to create allocation');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to create allocation');
      }

      // Add new workspace items for the allocation
      if (result.data.workspaceEntries) {
        setState(prev => ({
          ...prev,
          coordinationWorkspace: [...prev.coordinationWorkspace, ...result.data.workspaceEntries],
        }));
      }

      // Refresh data to get updated resource availability
      await refreshData();
      
      return { success: true, data: result.data };
      
    } catch (error) {
      console.error('Failed to create allocation:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create allocation',
      }));
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [refreshData]);

  const resolveConflict = useCallback(async (workspaceItemId: string, resolution: any) => {
    try {
      // In a real implementation, this would make an API call to resolve the conflict
      setState(prev => ({
        ...prev,
        coordinationWorkspace: prev.coordinationWorkspace.map(item =>
          item.id === workspaceItemId 
            ? { 
                ...item, 
                status: 'COMPLETED', 
                updatedAt: new Date(),
                resolution 
              }
            : item
        ),
      }));

      // Refresh data to get updated state
      await refreshData();
      
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to resolve conflict',
      }));
    }
  }, [refreshData]);

  return {
    ...state,
    refreshData,
    updateDonor,
    createAllocation,
    resolveConflict,
  };
}