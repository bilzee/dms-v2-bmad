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
      const [donorsResponse, resourcesResponse, allocationsResponse] = await Promise.all([
        fetch('/api/v1/donors'),
        fetch('/api/v1/coordinator/resources/available'),
        fetch('/api/v1/coordinator/resources/allocate?coordinatorId=current-coordinator-id&status=PENDING'),
      ]);

      if (!donorsResponse.ok) {
        throw new Error(`Failed to fetch donors: ${donorsResponse.statusText}`);
      }

      if (!resourcesResponse.ok) {
        throw new Error(`Failed to fetch resources: ${resourcesResponse.statusText}`);
      }

      if (!allocationsResponse.ok) {
        throw new Error(`Failed to fetch allocations: ${allocationsResponse.statusText}`);
      }

      const donorsData: DonorListResponse = await donorsResponse.json();
      const resourcesData = await resourcesResponse.json();
      const allocationsData = await allocationsResponse.json();

      if (!donorsData.success) {
        throw new Error(donorsData.message || 'Failed to fetch donors');
      }

      if (!resourcesData.success) {
        throw new Error(resourcesData.message || 'Failed to fetch resources');
      }

      if (!allocationsData.success) {
        throw new Error(allocationsData.message || 'Failed to fetch allocations');
      }

      // Transform allocations into coordination workspace items
      const workspaceItems: CoordinationWorkspaceItem[] = allocationsData.data.allocations.map((allocation: any) => ({
        id: `ws-${allocation.id}`,
        type: 'RESOURCE_ALLOCATION',
        title: `${allocation.responseType} allocation for ${allocation.affectedEntityName}`,
        description: `Coordinate ${allocation.quantity} ${allocation.unit} delivery ${allocation.donorName ? `from ${allocation.donorName}` : '(donor TBD)'}`,
        priority: allocation.priority,
        status: allocation.status,
        assignedTo: allocation.coordinatorId,
        assignedToName: allocation.coordinatorName,
        donorId: allocation.donorCommitmentId?.split('_')[1] || undefined,
        donorName: allocation.donorName,
        affectedEntityId: allocation.affectedEntityId,
        affectedEntityName: allocation.affectedEntityName,
        responseType: allocation.responseType,
        quantity: allocation.quantity,
        unit: allocation.unit,
        dueDate: new Date(allocation.targetDate),
        createdAt: new Date(allocation.createdAt),
        updatedAt: new Date(allocation.updatedAt),
        actions: [
          {
            id: `action-${allocation.id}-1`,
            type: 'CONFIRM_WITH_DONOR',
            description: 'Confirm availability and delivery schedule',
            completed: false,
            dueDate: new Date(allocation.targetDate),
          },
          {
            id: `action-${allocation.id}-2`,
            type: 'COORDINATE_LOGISTICS',
            description: 'Arrange transportation and delivery point',
            completed: false,
            dueDate: new Date(allocation.targetDate),
          }
        ]
      }));

      setState({
        donors: donorsData.data.donors,
        resourceAvailability: resourcesData.data,
        coordinationWorkspace: workspaceItems,
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