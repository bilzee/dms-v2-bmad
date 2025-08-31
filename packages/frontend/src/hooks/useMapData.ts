'use client';

import { useState, useEffect, useCallback } from 'react';

interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  captureMethod: 'GPS' | 'MANUAL' | 'MAP_SELECT';
}

interface MapEntityData {
  id: string;
  name: string;
  type: 'CAMP' | 'COMMUNITY';
  longitude: number;
  latitude: number;
  coordinates: GPSCoordinates;
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
  assessorName: string;
  coordinates: GPSCoordinates;
  entityName: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'AUTO_VERIFIED' | 'REJECTED';
  priorityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface MapResponseData {
  id: string;
  responseType: string;
  plannedDate: Date;
  deliveredDate?: Date;
  responderName: string;
  coordinates: GPSCoordinates;
  entityName: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED';
  deliveryItems: { item: string; quantity: number }[];
}

interface MapDataState {
  entities: MapEntityData[];
  assessments: MapAssessmentData[];
  responses: MapResponseData[];
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  connectionStatus: 'connected' | 'degraded' | 'offline';
}

interface UseMapDataOptions {
  refreshInterval?: number;
  autoRefresh?: boolean;
}

export function useMapData(options: UseMapDataOptions = {}) {
  const { refreshInterval = 25000, autoRefresh = true } = options;
  
  const [state, setState] = useState<MapDataState>({
    entities: [],
    assessments: [],
    responses: [],
    isLoading: true,
    error: null,
    lastUpdate: null,
    connectionStatus: 'connected',
  });

  const fetchEntities = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/monitoring/map/entities');
      const data = await response.json();
      
      if (data.success) {
        return data.data.map((entity: any) => ({
          ...entity,
          coordinates: {
            ...entity.coordinates,
            timestamp: new Date(entity.coordinates.timestamp),
          },
          lastActivity: new Date(entity.lastActivity),
        }));
      }
      throw new Error(data.message || 'Failed to fetch entities');
    } catch (error) {
      console.error('Failed to fetch entities:', error);
      throw error;
    }
  }, []);

  const fetchAssessments = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/monitoring/map/assessments');
      const data = await response.json();
      
      if (data.success) {
        return data.data.map((assessment: any) => ({
          ...assessment,
          date: new Date(assessment.date),
          coordinates: {
            ...assessment.coordinates,
            timestamp: new Date(assessment.coordinates.timestamp),
          },
        }));
      }
      throw new Error(data.message || 'Failed to fetch assessments');
    } catch (error) {
      console.error('Failed to fetch assessments:', error);
      throw error;
    }
  }, []);

  const fetchResponses = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/monitoring/map/responses');
      const data = await response.json();
      
      if (data.success) {
        return data.data.map((resp: any) => ({
          ...resp,
          plannedDate: new Date(resp.plannedDate),
          deliveredDate: resp.deliveredDate ? new Date(resp.deliveredDate) : undefined,
          coordinates: {
            ...resp.coordinates,
            timestamp: new Date(resp.coordinates.timestamp),
          },
        }));
      }
      throw new Error(data.message || 'Failed to fetch responses');
    } catch (error) {
      console.error('Failed to fetch responses:', error);
      throw error;
    }
  }, []);

  const fetchAllMapData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const [entities, assessments, responses] = await Promise.all([
        fetchEntities(),
        fetchAssessments(),
        fetchResponses(),
      ]);

      setState(prev => ({
        ...prev,
        entities,
        assessments,
        responses,
        isLoading: false,
        lastUpdate: new Date(),
        connectionStatus: 'connected',
        error: null,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        connectionStatus: 'offline',
      }));
    }
  }, [fetchEntities, fetchAssessments, fetchResponses]);

  const refreshMapData = useCallback(() => {
    return fetchAllMapData();
  }, [fetchAllMapData]);

  // Auto-refresh effect
  useEffect(() => {
    fetchAllMapData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchAllMapData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchAllMapData, autoRefresh, refreshInterval]);

  // Calculate map bounds from all coordinate data
  const getMapBounds = useCallback(() => {
    const allCoordinates = [
      ...state.entities.map(e => ({ lat: e.latitude, lng: e.longitude })),
      ...state.assessments.map(a => ({ lat: a.coordinates.latitude, lng: a.coordinates.longitude })),
      ...state.responses.map(r => ({ lat: r.coordinates.latitude, lng: r.coordinates.longitude })),
    ];

    if (allCoordinates.length === 0) {
      return {
        center: { lat: 12.0, lng: 14.0 }, // Default center for Borno State
        bounds: {
          northEast: { lat: 14.0, lng: 15.0 },
          southWest: { lat: 11.5, lng: 13.0 },
        },
      };
    }

    const latitudes = allCoordinates.map(coord => coord.lat);
    const longitudes = allCoordinates.map(coord => coord.lng);
    
    const bounds = {
      northEast: { lat: Math.max(...latitudes), lng: Math.max(...longitudes) },
      southWest: { lat: Math.min(...latitudes), lng: Math.min(...longitudes) },
    };
    
    const center = {
      lat: (bounds.northEast.lat + bounds.southWest.lat) / 2,
      lng: (bounds.northEast.lng + bounds.southWest.lng) / 2,
    };

    return { center, bounds };
  }, [state.entities, state.assessments, state.responses]);

  // Get data summary for overview
  const getDataSummary = useCallback(() => {
    const totalEntities = state.entities.length;
    const totalAssessments = state.assessments.length;
    const totalResponses = state.responses.length;
    
    const pendingAssessments = state.assessments.filter(a => a.verificationStatus === 'PENDING').length;
    const verifiedAssessments = state.assessments.filter(a => 
      a.verificationStatus === 'VERIFIED' || a.verificationStatus === 'AUTO_VERIFIED'
    ).length;
    
    const activeResponses = state.responses.filter(r => r.status === 'IN_PROGRESS').length;
    const completedResponses = state.responses.filter(r => r.status === 'DELIVERED').length;
    
    return {
      totalEntities,
      totalAssessments,
      totalResponses,
      pendingAssessments,
      verifiedAssessments,
      activeResponses,
      completedResponses,
      totalDeliveryItems: state.responses.reduce((sum, response) => 
        sum + response.deliveryItems.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
      ),
    };
  }, [state.entities, state.assessments, state.responses]);

  return {
    ...state,
    refreshMapData,
    getMapBounds,
    getDataSummary,
  };
}