'use client';

import { useState, useCallback, useMemo } from 'react';

interface MapEntityData {
  id: string;
  name: string;
  type: 'CAMP' | 'COMMUNITY';
  longitude: number;
  latitude: number;
  assessmentCount: number;
  responseCount: number;
  lastActivity: Date;
  statusSummary: {
    pendingAssessments: number;
    verifiedAssessments: number;
    activeResponses: number;
    completedResponses: number;
  };
}

interface MapAssessmentData {
  id: string;
  type: 'HEALTH' | 'WASH' | 'SHELTER' | 'FOOD' | 'SECURITY' | 'POPULATION';
  date: Date;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'AUTO_VERIFIED' | 'REJECTED';
  priorityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  entityName: string;
}

interface MapResponseData {
  id: string;
  responseType: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED';
  plannedDate: Date;
  deliveredDate?: Date;
  entityName: string;
}

interface MapFilters {
  entityTypes: string[];
  assessmentTypes: string[];
  assessmentStatuses: string[];
  responseStatuses: string[];
  priorityLevels: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  searchTerm: string;
  showOnlyActive: boolean;
}

interface UseMapFiltersOptions {
  defaultFilters?: Partial<MapFilters>;
}

export function useMapFilters(options: UseMapFiltersOptions = {}) {
  const { defaultFilters = {} } = options;

  const [filters, setFilters] = useState<MapFilters>({
    entityTypes: defaultFilters.entityTypes || ['CAMP', 'COMMUNITY'],
    assessmentTypes: defaultFilters.assessmentTypes || ['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION'],
    assessmentStatuses: defaultFilters.assessmentStatuses || ['PENDING', 'VERIFIED', 'AUTO_VERIFIED', 'REJECTED'],
    responseStatuses: defaultFilters.responseStatuses || ['PLANNED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED'],
    priorityLevels: defaultFilters.priorityLevels || ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    dateRange: defaultFilters.dateRange || { start: null, end: null },
    searchTerm: defaultFilters.searchTerm || '',
    showOnlyActive: defaultFilters.showOnlyActive || false,
  });

  const updateFilter = useCallback(<K extends keyof MapFilters>(
    key: K,
    value: MapFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleFilterOption = useCallback(<K extends keyof Pick<MapFilters, 'entityTypes' | 'assessmentTypes' | 'assessmentStatuses' | 'responseStatuses' | 'priorityLevels'>>(
    filterKey: K,
    option: string
  ) => {
    setFilters(prev => {
      const currentArray = prev[filterKey] as string[];
      const updatedArray = currentArray.includes(option)
        ? currentArray.filter(item => item !== option)
        : [...currentArray, option];
      
      return { ...prev, [filterKey]: updatedArray };
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({
      entityTypes: ['CAMP', 'COMMUNITY'],
      assessmentTypes: ['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION'],
      assessmentStatuses: ['PENDING', 'VERIFIED', 'AUTO_VERIFIED', 'REJECTED'],
      responseStatuses: ['PLANNED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED'],
      priorityLevels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      dateRange: { start: null, end: null },
      searchTerm: '',
      showOnlyActive: false,
    });
  }, []);

  const setActiveFilters = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      assessmentStatuses: ['PENDING', 'VERIFIED'],
      responseStatuses: ['PLANNED', 'IN_PROGRESS'],
      priorityLevels: ['HIGH', 'CRITICAL'],
      showOnlyActive: true,
    }));
  }, []);

  // Filter functions
  const filterEntities = useCallback((entities: MapEntityData[]) => {
    return entities.filter(entity => {
      // Entity type filter
      if (!filters.entityTypes.includes(entity.type)) return false;
      
      // Search term filter
      if (filters.searchTerm && !entity.name.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false;
      }
      
      // Active filter
      if (filters.showOnlyActive) {
        const hasActiveActivity = entity.statusSummary.pendingAssessments > 0 || 
                                entity.statusSummary.activeResponses > 0;
        if (!hasActiveActivity) return false;
      }
      
      // Date range filter
      if (filters.dateRange.start && entity.lastActivity < filters.dateRange.start) return false;
      if (filters.dateRange.end && entity.lastActivity > filters.dateRange.end) return false;
      
      return true;
    });
  }, [filters]);

  const filterAssessments = useCallback((assessments: MapAssessmentData[]) => {
    return assessments.filter(assessment => {
      // Assessment type filter
      if (!filters.assessmentTypes.includes(assessment.type)) return false;
      
      // Assessment status filter
      if (!filters.assessmentStatuses.includes(assessment.verificationStatus)) return false;
      
      // Priority level filter
      if (!filters.priorityLevels.includes(assessment.priorityLevel)) return false;
      
      // Search term filter
      if (filters.searchTerm) {
        const searchableText = `${assessment.entityName} ${assessment.type}`.toLowerCase();
        if (!searchableText.includes(filters.searchTerm.toLowerCase())) return false;
      }
      
      // Date range filter
      if (filters.dateRange.start && assessment.date < filters.dateRange.start) return false;
      if (filters.dateRange.end && assessment.date > filters.dateRange.end) return false;
      
      return true;
    });
  }, [filters]);

  const filterResponses = useCallback((responses: MapResponseData[]) => {
    return responses.filter(response => {
      // Response status filter
      if (!filters.responseStatuses.includes(response.status)) return false;
      
      // Search term filter
      if (filters.searchTerm) {
        const searchableText = `${response.entityName} ${response.responseType}`.toLowerCase();
        if (!searchableText.includes(filters.searchTerm.toLowerCase())) return false;
      }
      
      // Active filter
      if (filters.showOnlyActive && !['PLANNED', 'IN_PROGRESS'].includes(response.status)) {
        return false;
      }
      
      // Date range filter
      const relevantDate = response.deliveredDate || response.plannedDate;
      if (filters.dateRange.start && relevantDate < filters.dateRange.start) return false;
      if (filters.dateRange.end && relevantDate > filters.dateRange.end) return false;
      
      return true;
    });
  }, [filters]);

  // Get filter statistics
  const getFilterStats = useCallback((
    allEntities: MapEntityData[],
    allAssessments: MapAssessmentData[],
    allResponses: MapResponseData[]
  ) => {
    const filteredEntities = filterEntities(allEntities);
    const filteredAssessments = filterAssessments(allAssessments);
    const filteredResponses = filterResponses(allResponses);
    
    return {
      entities: {
        total: allEntities.length,
        filtered: filteredEntities.length,
        percentage: allEntities.length > 0 ? Math.round((filteredEntities.length / allEntities.length) * 100) : 0,
      },
      assessments: {
        total: allAssessments.length,
        filtered: filteredAssessments.length,
        percentage: allAssessments.length > 0 ? Math.round((filteredAssessments.length / allAssessments.length) * 100) : 0,
      },
      responses: {
        total: allResponses.length,
        filtered: filteredResponses.length,
        percentage: allResponses.length > 0 ? Math.round((filteredResponses.length / allResponses.length) * 100) : 0,
      },
    };
  }, [filterEntities, filterAssessments, filterResponses]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.entityTypes.length < 2 ||
      filters.assessmentTypes.length < 6 ||
      filters.assessmentStatuses.length < 4 ||
      filters.responseStatuses.length < 4 ||
      filters.priorityLevels.length < 4 ||
      filters.dateRange.start !== null ||
      filters.dateRange.end !== null ||
      filters.searchTerm.length > 0 ||
      filters.showOnlyActive
    );
  }, [filters]);

  // Get active filter count
  const getActiveFilterCount = useMemo(() => {
    let count = 0;
    
    if (filters.entityTypes.length < 2) count++;
    if (filters.assessmentTypes.length < 6) count++;
    if (filters.assessmentStatuses.length < 4) count++;
    if (filters.responseStatuses.length < 4) count++;
    if (filters.priorityLevels.length < 4) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.searchTerm.length > 0) count++;
    if (filters.showOnlyActive) count++;
    
    return count;
  }, [filters]);

  return {
    filters,
    updateFilter,
    toggleFilterOption,
    clearAllFilters,
    setActiveFilters,
    filterEntities,
    filterAssessments,
    filterResponses,
    getFilterStats,
    hasActiveFilters,
    activeFilterCount: getActiveFilterCount,
  };
}