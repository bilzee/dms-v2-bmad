'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAnalyticsStore } from '@/stores/analytics.store';
import { Map, Marker, Popup, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapEntity {
  id: string;
  name: string;
  type: 'LGA' | 'Ward' | 'Community' | 'Camp';
  coordinates: [number, number]; // [latitude, longitude]
  assessmentData?: {
    total: number;
    pending: number;
    completed: number;
  };
  responseData?: {
    total: number;
    active: number;
    completed: number;
  };
}

interface InteractiveMapProps {
  selectedEntityId: string | null;
  className?: string;
}

function InteractiveMap({ selectedEntityId, className = "" }: InteractiveMapProps) {
  const { selectedIncident } = useAnalyticsStore();
  const [entities, setEntities] = useState<MapEntity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<MapEntity | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Default center for Borno State
  const defaultCenter = { longitude: 13.1511, latitude: 11.8311 };
  const defaultZoom = 8;

  const fetchEntities = useCallback(async (incidentId: string) => {
    if (!incidentId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const url = `/api/v1/monitoring/analytics/entities/by-incident/${incidentId}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch entities');
      }

      // Transform API response to MapEntity format
      const mapEntities: MapEntity[] = data.data.entities
        .filter((entity: any) => {
          // Ensure coordinates exist and are valid
          return entity.coordinates && 
                 Array.isArray(entity.coordinates) && 
                 entity.coordinates.length >= 2 &&
                 typeof entity.coordinates[0] === 'number' &&
                 typeof entity.coordinates[1] === 'number' &&
                 !isNaN(entity.coordinates[0]) &&
                 !isNaN(entity.coordinates[1]) &&
                 Math.abs(entity.coordinates[0]) <= 90 && // Valid latitude range
                 Math.abs(entity.coordinates[1]) <= 180; // Valid longitude range
        })
        .map((entity: any) => ({
          id: entity.id,
          name: entity.name,
          type: entity.type,
          coordinates: [Number(entity.coordinates[0]), Number(entity.coordinates[1])], // lat, lng
          assessmentData: entity.assessmentData || { total: 0, pending: 0, completed: 0 },
          responseData: entity.responseData || { total: 0, active: 0, completed: 0 }
        }));

      setEntities(mapEntities);
    } catch (error) {
      console.error('Failed to fetch entities for map:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch entities when incident changes
  useEffect(() => {
    if (selectedIncident?.id) {
      fetchEntities(selectedIncident.id);
    } else {
      setEntities([]);
    }
  }, [selectedIncident?.id, fetchEntities]);

  // Memoized calculations for performance
  const mapCenter = useMemo(() => {
    if (entities.length === 0) {
      return defaultCenter;
    }

    // If specific entity is selected, center on that entity
    if (selectedEntityId && selectedEntityId !== 'all') {
      const selectedEntity = entities.find(e => e.id === selectedEntityId);
      if (selectedEntity && selectedEntity.coordinates && selectedEntity.coordinates.length >= 2) {
        const lat = Number(selectedEntity.coordinates[0]);
        const lng = Number(selectedEntity.coordinates[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { longitude: lng, latitude: lat };
        }
      }
    }

    // For "all" entities or fallback, calculate center of all entities
    const validEntities = entities.filter(entity => 
      entity.coordinates && 
      entity.coordinates.length >= 2 && 
      !isNaN(Number(entity.coordinates[0])) && 
      !isNaN(Number(entity.coordinates[1]))
    );
    
    if (validEntities.length === 0) {
      return defaultCenter;
    }
    
    const latSum = validEntities.reduce((sum, entity) => sum + Number(entity.coordinates[0]), 0);
    const lngSum = validEntities.reduce((sum, entity) => sum + Number(entity.coordinates[1]), 0);
    
    const centerLat = latSum / validEntities.length;
    const centerLng = lngSum / validEntities.length;
    
    // Validate calculated center
    if (isNaN(centerLat) || isNaN(centerLng)) {
      return defaultCenter;
    }
    
    return { longitude: centerLng, latitude: centerLat };
  }, [entities, selectedEntityId]);

  const filteredEntities = useMemo(() => {
    if (!selectedEntityId || selectedEntityId === 'all') {
      return entities;
    }
    
    return entities.filter(entity => entity.id === selectedEntityId);
  }, [entities, selectedEntityId]);

  const mapZoom = useMemo(() => {
    return selectedEntityId && selectedEntityId !== 'all' ? 12 : defaultZoom;
  }, [selectedEntityId]);

  // Get marker color based on activity level
  const getMarkerColor = (entity: MapEntity) => {
    const assessmentTotal = entity.assessmentData?.total || 0;
    const responseTotal = entity.responseData?.total || 0;
    const pendingAssessments = entity.assessmentData?.pending || 0;
    const activeResponses = entity.responseData?.active || 0;
    
    const activeActivity = pendingAssessments + activeResponses;
    
    if (selectedEntityId === entity.id) return '#3b82f6'; // Blue for selected
    if (activeActivity > 5) return '#ef4444'; // Red for high activity
    if (activeActivity > 2) return '#eab308'; // Yellow for medium activity
    if (assessmentTotal + responseTotal > 0) return '#22c55e'; // Green for low activity
    return '#64748b'; // Slate for no activity
  };

  // Create assessment coverage circles as GeoJSON
  const assessmentCirclesGeoJSON = useMemo(() => {
    const features = filteredEntities
      .filter(entity => 
        entity.assessmentData && 
        entity.assessmentData.total > 0 &&
        entity.coordinates && 
        entity.coordinates.length >= 2 && 
        !isNaN(Number(entity.coordinates[0])) && 
        !isNaN(Number(entity.coordinates[1]))
      )
      .map(entity => {
        const assessmentData = entity.assessmentData!;
        const baseRadius = 500; // meters
        const maxRadius = 2000; // meters
        const radius = Math.min(maxRadius, baseRadius + (assessmentData.total * 100));
        
        const lat = Number(entity.coordinates[0]);
        const lng = Number(entity.coordinates[1]);
        
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [lng, lat] // lng, lat for GeoJSON
          },
          properties: {
            radius: radius,
            entityId: entity.id,
            assessmentData: assessmentData
          }
        };
      });

    return {
      type: 'FeatureCollection' as const,
      features
    };
  }, [filteredEntities]);

  if (!selectedIncident) {
    return (
      <div className={`h-72 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-500">
          <h4 className="font-medium mb-2">Interactive Map</h4>
          <p className="text-sm">
            Select an incident to view entity locations and assessment data
          </p>
        </div>
      </div>
    );
  }

  // Check for MapBox access token
  const mapboxAccessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!mapboxAccessToken || mapboxAccessToken === 'your-mapbox-access-token-here') {
    return (
      <div className={`h-72 rounded-lg border border-yellow-300 bg-yellow-50 flex items-center justify-center ${className}`}>
        <div className="text-center text-yellow-800">
          <h4 className="font-medium mb-2">MapBox Configuration Required</h4>
          <p className="text-sm mb-2">
            To display the interactive map, please configure a valid MapBox access token.
          </p>
          <p className="text-xs text-yellow-600">
            Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in your environment file.
          </p>
        </div>
      </div>
    );
  }

  if (error || mapError) {
    return (
      <div className={`h-72 rounded-lg border border-red-300 bg-red-50 flex items-center justify-center ${className}`}>
        <div className="text-center text-red-600">
          <h4 className="font-medium mb-2">Map Error</h4>
          <p className="text-sm">{error || mapError}</p>
          {mapError && (
            <button 
              onClick={() => setMapError(null)} 
              className="mt-2 text-xs underline hover:no-underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`h-72 rounded-lg border overflow-hidden relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-[1000]">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm">Loading map data...</span>
          </div>
        </div>
      )}
      
      <Map
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        initialViewState={{
          longitude: mapCenter.longitude,
          latitude: mapCenter.latitude,
          zoom: mapZoom
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v10"
        onError={(event) => {
          console.error('MapBox GL error:', event);
          setMapError('Map rendering error occurred');
          // Prevent error propagation
          event.preventDefault?.();
        }}
        interactiveLayerIds={[]}
      >
        {/* Assessment coverage circles */}
        {assessmentCirclesGeoJSON.features.length > 0 && (
          <Source id="assessment-circles" type="geojson" data={assessmentCirclesGeoJSON}>
            <Layer
              id="assessment-circles-layer"
              type="circle"
              paint={{
                'circle-radius': ['get', 'radius'],
                'circle-color': '#3b82f6',
                'circle-opacity': 0.2,
                'circle-stroke-color': '#1d4ed8',
                'circle-stroke-width': 1,
                'circle-stroke-opacity': 0.4
              }}
            />
          </Source>
        )}

        {/* Entity markers */}
        {filteredEntities
          .filter(entity => 
            entity.coordinates && 
            entity.coordinates.length >= 2 && 
            !isNaN(Number(entity.coordinates[0])) && 
            !isNaN(Number(entity.coordinates[1]))
          )
          .map((entity) => {
            const lat = Number(entity.coordinates[0]);
            const lng = Number(entity.coordinates[1]);
            
            return (
              <Marker
                key={entity.id}
                longitude={lng}
                latitude={lat}
                onClick={() => setSelectedEntity(entity)}
              >
                <div
                  className="w-6 h-6 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: getMarkerColor(entity) }}
                />
              </Marker>
            );
          })}

        {/* Popup for selected entity */}
        {selectedEntity && 
         selectedEntity.coordinates && 
         selectedEntity.coordinates.length >= 2 && 
         !isNaN(Number(selectedEntity.coordinates[0])) && 
         !isNaN(Number(selectedEntity.coordinates[1])) && (
          <Popup
            longitude={Number(selectedEntity.coordinates[1])}
            latitude={Number(selectedEntity.coordinates[0])}
            onClose={() => setSelectedEntity(null)}
            closeButton={true}
            closeOnClick={false}
            anchor="bottom"
          >
            <div className="p-2 min-w-48">
              <h4 className="font-semibold text-sm mb-1">{selectedEntity.name}</h4>
              <p className="text-xs text-gray-600 mb-2">{selectedEntity.type}</p>
              
              {selectedEntity.assessmentData && (
                <div className="mb-2">
                  <p className="text-xs font-medium">Assessments:</p>
                  <p className="text-xs">
                    Total: {selectedEntity.assessmentData.total}, 
                    Pending: {selectedEntity.assessmentData.pending}
                  </p>
                </div>
              )}
              
              {selectedEntity.responseData && (
                <div>
                  <p className="text-xs font-medium">Responses:</p>
                  <p className="text-xs">
                    Total: {selectedEntity.responseData.total}, 
                    Active: {selectedEntity.responseData.active}
                  </p>
                </div>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}

export default InteractiveMap;