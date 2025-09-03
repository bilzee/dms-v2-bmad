import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface FilterState {
  incidentIds: string[];
  entityIds: string[];
  timeframe?: { start: string; end: string };
  dataTypes: string[];
  statusFilters: string[];
}

export function useDrillDownFilters(initialFilters: Partial<FilterState> = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [filters, setFilters] = useState<FilterState>(() => {
    // Initialize filters from URL params or defaults
    const urlFilters: FilterState = {
      incidentIds: searchParams.get('incidents')?.split(',').filter(Boolean) || initialFilters.incidentIds || [],
      entityIds: searchParams.get('entities')?.split(',').filter(Boolean) || initialFilters.entityIds || [],
      dataTypes: searchParams.get('types')?.split(',').filter(Boolean) || initialFilters.dataTypes || [],
      statusFilters: searchParams.get('status')?.split(',').filter(Boolean) || initialFilters.statusFilters || [],
    };
    
    // Parse timeframe from URL
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate && endDate) {
      urlFilters.timeframe = { start: startDate, end: endDate };
    } else if (initialFilters.timeframe) {
      urlFilters.timeframe = initialFilters.timeframe;
    }
    
    return urlFilters;
  });

  // Update URL when filters change
  const updateUrl = useCallback((newFilters: FilterState) => {
    const params = new URLSearchParams();
    
    if (newFilters.incidentIds.length > 0) {
      params.set('incidents', newFilters.incidentIds.join(','));
    }
    if (newFilters.entityIds.length > 0) {
      params.set('entities', newFilters.entityIds.join(','));
    }
    if (newFilters.dataTypes.length > 0) {
      params.set('types', newFilters.dataTypes.join(','));
    }
    if (newFilters.statusFilters.length > 0) {
      params.set('status', newFilters.statusFilters.join(','));
    }
    if (newFilters.timeframe) {
      params.set('startDate', newFilters.timeframe.start);
      params.set('endDate', newFilters.timeframe.end);
    }
    
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : window.location.pathname;
    
    // Update URL without causing a page reload
    window.history.replaceState({}, '', newUrl);
  }, []);

  const updateFilters = useCallback((newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    updateUrl(updatedFilters);
  }, [filters, updateUrl]);

  const clearFilters = useCallback(() => {
    const emptyFilters: FilterState = {
      incidentIds: [],
      entityIds: [],
      timeframe: undefined,
      dataTypes: [],
      statusFilters: [],
    };
    setFilters(emptyFilters);
    updateUrl(emptyFilters);
  }, [updateUrl]);

  const addIncidentFilter = useCallback((incidentId: string) => {
    if (!filters.incidentIds.includes(incidentId)) {
      updateFilters({ incidentIds: [...filters.incidentIds, incidentId] });
    }
  }, [filters.incidentIds, updateFilters]);

  const removeIncidentFilter = useCallback((incidentId: string) => {
    updateFilters({ incidentIds: filters.incidentIds.filter(id => id !== incidentId) });
  }, [filters.incidentIds, updateFilters]);

  const addEntityFilter = useCallback((entityId: string) => {
    if (!filters.entityIds.includes(entityId)) {
      updateFilters({ entityIds: [...filters.entityIds, entityId] });
    }
  }, [filters.entityIds, updateFilters]);

  const removeEntityFilter = useCallback((entityId: string) => {
    updateFilters({ entityIds: filters.entityIds.filter(id => id !== entityId) });
  }, [filters.entityIds, updateFilters]);

  const setTimeframe = useCallback((start: Date, end: Date) => {
    updateFilters({ 
      timeframe: { 
        start: start.toISOString(), 
        end: end.toISOString() 
      } 
    });
  }, [updateFilters]);

  const clearTimeframe = useCallback(() => {
    updateFilters({ timeframe: undefined });
  }, [updateFilters]);

  const toggleDataType = useCallback((dataType: string) => {
    const isSelected = filters.dataTypes.includes(dataType);
    if (isSelected) {
      updateFilters({ dataTypes: filters.dataTypes.filter(type => type !== dataType) });
    } else {
      updateFilters({ dataTypes: [...filters.dataTypes, dataType] });
    }
  }, [filters.dataTypes, updateFilters]);

  const toggleStatusFilter = useCallback((status: string) => {
    const isSelected = filters.statusFilters.includes(status);
    if (isSelected) {
      updateFilters({ statusFilters: filters.statusFilters.filter(s => s !== status) });
    } else {
      updateFilters({ statusFilters: [...filters.statusFilters, status] });
    }
  }, [filters.statusFilters, updateFilters]);

  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (filters.incidentIds.length > 0) count++;
    if (filters.entityIds.length > 0) count++;
    if (filters.timeframe) count++;
    if (filters.dataTypes.length > 0) count++;
    if (filters.statusFilters.length > 0) count++;
    return count;
  }, [filters]);

  const hasActiveFilters = useCallback(() => {
    return getActiveFilterCount() > 0;
  }, [getActiveFilterCount]);

  // Get shareable URL for current filter state
  const getShareableUrl = useCallback(() => {
    const currentUrl = new URL(window.location.href);
    updateUrl(filters); // Ensure URL is up to date
    return currentUrl.toString();
  }, [filters, updateUrl]);

  // Apply predefined filter presets
  const applyPreset = useCallback((preset: 'last7days' | 'last30days' | 'pending' | 'verified' | 'critical') => {
    const now = new Date();
    
    switch (preset) {
      case 'last7days':
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        setTimeframe(last7Days, now);
        break;
      case 'last30days':
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        setTimeframe(last30Days, now);
        break;
      case 'pending':
        updateFilters({ statusFilters: ['PENDING'] });
        break;
      case 'verified':
        updateFilters({ statusFilters: ['VERIFIED', 'AUTO_VERIFIED'] });
        break;
      case 'critical':
        updateFilters({ 
          dataTypes: ['SEVERE', 'CATASTROPHIC'], 
          statusFilters: ['ACTIVE'] 
        });
        break;
    }
  }, [setTimeframe, updateFilters]);

  return {
    filters,
    updateFilters,
    clearFilters,
    addIncidentFilter,
    removeIncidentFilter,
    addEntityFilter,
    removeEntityFilter,
    setTimeframe,
    clearTimeframe,
    toggleDataType,
    toggleStatusFilter,
    getActiveFilterCount,
    hasActiveFilters,
    getShareableUrl,
    applyPreset,
  };
}