// hooks/useAuditData.ts

import { useEffect, useCallback } from 'react';
import { useAuditStore } from '@/stores/audit.store';
import { useToast } from '@/components/ui/use-toast';

/**
 * Hook for managing activity logs data
 */
export function useActivityLogs() {
  const { toast } = useToast();
  
  const {
    activities,
    activityFilters,
    activityPagination,
    isLoadingActivities,
    lastActivityRefresh,
    setActivityFilters,
    setActivityPagination,
    loadActivities,
    refreshActivities,
  } = useAuditStore();

  // Load activities when filters change
  useEffect(() => {
    const loadData = async () => {
      try {
        await loadActivities(true); // Reset pagination when filters change
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load activity logs',
          variant: 'destructive'
        });
      }
    };

    loadData();
  }, [activityFilters, loadActivities, toast]);

  // Update filters and reload data
  const updateFilters = useCallback((newFilters: Partial<typeof activityFilters>) => {
    setActivityFilters(newFilters);
  }, [setActivityFilters]);

  // Update pagination
  const updatePagination = useCallback((newPagination: Partial<typeof activityPagination>) => {
    setActivityPagination(newPagination);
    // Load data with new pagination
    loadActivities(false);
  }, [setActivityPagination, loadActivities]);

  // Manual refresh
  const refresh = useCallback(async () => {
    try {
      await refreshActivities();
      toast({
        title: 'Refreshed',
        description: 'Activity logs have been refreshed',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh activity logs',
        variant: 'destructive'
      });
    }
  }, [refreshActivities, toast]);

  // Reset filters
  const resetFilters = useCallback(() => {
    setActivityFilters({
      sortBy: 'timestamp',
      sortOrder: 'desc',
      timeRange: '24h'
    });
  }, [setActivityFilters]);

  return {
    // Data
    activities,
    filters: activityFilters,
    pagination: activityPagination,
    isLoading: isLoadingActivities,
    lastRefresh: lastActivityRefresh,
    
    // Actions
    updateFilters,
    updatePagination,
    refresh,
    resetFilters,
  };
}

/**
 * Hook for managing security events data
 */
export function useSecurityEvents() {
  const { toast } = useToast();
  
  const {
    securityEvents,
    securityFilters,
    securityPagination,
    isLoadingSecurityEvents,
    lastSecurityRefresh,
    setSecurityFilters,
    setSecurityPagination,
    loadSecurityEvents,
    refreshSecurityEvents,
    updateSecurityEventStatus,
  } = useAuditStore();

  // Load security events when filters change
  useEffect(() => {
    const loadData = async () => {
      try {
        await loadSecurityEvents(true); // Reset pagination when filters change
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load security events',
          variant: 'destructive'
        });
      }
    };

    loadData();
  }, [securityFilters, loadSecurityEvents, toast]);

  // Update filters and reload data
  const updateFilters = useCallback((newFilters: Partial<typeof securityFilters>) => {
    setSecurityFilters(newFilters);
  }, [setSecurityFilters]);

  // Update pagination
  const updatePagination = useCallback((newPagination: Partial<typeof securityPagination>) => {
    setSecurityPagination(newPagination);
    // Load data with new pagination
    loadSecurityEvents(false);
  }, [setSecurityPagination, loadSecurityEvents]);

  // Manual refresh
  const refresh = useCallback(async () => {
    try {
      await refreshSecurityEvents();
      toast({
        title: 'Refreshed',
        description: 'Security events have been refreshed',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh security events',
        variant: 'destructive'
      });
    }
  }, [refreshSecurityEvents, toast]);

  // Update investigation status
  const updateStatus = useCallback(async (eventId: string, status: string, notes?: string) => {
    try {
      const success = await updateSecurityEventStatus(eventId, status, notes);
      if (success) {
        toast({
          title: 'Status Updated',
          description: 'Security event investigation status updated successfully',
        });
        return true;
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update investigation status',
        variant: 'destructive'
      });
      return false;
    }
  }, [updateSecurityEventStatus, toast]);

  // Reset filters
  const resetFilters = useCallback(() => {
    setSecurityFilters({
      sortBy: 'detectedAt',
      sortOrder: 'desc',
      timeRange: '24h'
    });
  }, [setSecurityFilters]);

  return {
    // Data
    securityEvents,
    filters: securityFilters,
    pagination: securityPagination,
    isLoading: isLoadingSecurityEvents,
    lastRefresh: lastSecurityRefresh,
    
    // Actions
    updateFilters,
    updatePagination,
    refresh,
    resetFilters,
    updateStatus,
  };
}

/**
 * Hook for managing export operations
 */
export function useAuditExports() {
  const { toast } = useToast();
  
  const {
    exports,
    isLoadingExports,
    lastExportRefresh,
    loadExports,
    refreshExports,
    createExport,
    downloadExport,
    deleteExport,
  } = useAuditStore();

  // Load exports on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await loadExports();
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load exports',
          variant: 'destructive'
        });
      }
    };

    loadData();
  }, [loadExports, toast]);

  // Create new export
  const startExport = useCallback(async (exportRequest: any) => {
    try {
      const exportId = await createExport(exportRequest);
      if (exportId) {
        toast({
          title: 'Export Started',
          description: `Export ${exportId} has been queued for processing`,
        });
        return exportId;
      } else {
        throw new Error('Failed to create export');
      }
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to start export',
        variant: 'destructive'
      });
      return null;
    }
  }, [createExport, toast]);

  // Download export
  const download = useCallback(async (exportId: string, format: string) => {
    try {
      const success = await downloadExport(exportId, format);
      if (success) {
        toast({
          title: 'Download Started',
          description: 'Your export file is being downloaded',
        });
        return true;
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Failed to download export file',
        variant: 'destructive'
      });
      return false;
    }
  }, [downloadExport, toast]);

  // Delete export
  const deleteExportItem = useCallback(async (exportId: string) => {
    try {
      const success = await deleteExport(exportId);
      if (success) {
        toast({
          title: 'Export Deleted',
          description: 'Export has been removed from the system',
        });
        return true;
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete export',
        variant: 'destructive'
      });
      return false;
    }
  }, [deleteExport, toast]);

  // Manual refresh
  const refresh = useCallback(async () => {
    try {
      await refreshExports();
      toast({
        title: 'Refreshed',
        description: 'Export list has been refreshed',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh exports',
        variant: 'destructive'
      });
    }
  }, [refreshExports, toast]);

  // Get exports by status
  const getActiveExports = useCallback(() => {
    return exports.filter(exp => exp.status === 'PENDING' || exp.status === 'PROCESSING');
  }, [exports]);

  const getCompletedExports = useCallback(() => {
    return exports.filter(exp => exp.status === 'COMPLETED' || exp.status === 'FAILED' || exp.status === 'EXPIRED');
  }, [exports]);

  return {
    // Data
    exports,
    activeExports: getActiveExports(),
    completedExports: getCompletedExports(),
    isLoading: isLoadingExports,
    lastRefresh: lastExportRefresh,
    
    // Actions
    startExport,
    download,
    deleteExport: deleteExportItem,
    refresh,
  };
}

/**
 * Combined hook for all audit functionality
 */
export function useAuditData() {
  const activityLogs = useActivityLogs();
  const securityEvents = useSecurityEvents();
  const exports = useAuditExports();

  return {
    activityLogs,
    securityEvents,
    exports,
  };
}