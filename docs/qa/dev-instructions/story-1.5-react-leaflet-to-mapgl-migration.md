# Story 1.5: React-Leaflet to React-Map-GL Migration Instructions

## Background

During QA validation of Story 1.5 Interactive Map Integration, a critical compatibility issue was discovered between React-Leaflet and Next.js 14.2.5. The issue manifests as:

```
TypeError: render is not a function at updateContextConsumer
```

This error occurs when selecting incidents in the analytics dashboard, preventing the InteractiveMap component from rendering. Multiple advanced approaches were attempted:

1. ✅ **Dynamic imports with SSR disabled**
2. ✅ **Client-side wrapper patterns with window checking**
3. ✅ **Comprehensive React-Leaflet isolation with useEffect**
4. ✅ **Component factory patterns with runtime creation**

All approaches failed due to fundamental incompatibility between React-Leaflet's context provider system and Next.js 14's rendering architecture.

## Solution: Migrate to React-Map-GL

React-Map-GL provides excellent Next.js 14 compatibility, better performance, and modern API design without the context provider issues.

## Implementation Instructions

### Phase 1: Dependencies Migration

#### 1.1 Remove React-Leaflet Dependencies
```bash
cd packages/frontend
npm uninstall react-leaflet leaflet leaflet-defaulticon-compatibility leaflet-geosearch
```

#### 1.2 Install React-Map-GL Dependencies
```bash
npm install react-map-gl mapbox-gl
npm install --save-dev @types/mapbox-gl
```

#### 1.3 Environment Configuration
Add to `.env.local`:
```
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
```

**Note**: Get free Mapbox token from https://account.mapbox.com/access-tokens/

### Phase 2: Component Migration

#### 2.1 Update InteractiveMap Component
Replace `packages/frontend/src/components/features/analytics/InteractiveMap.tsx`:

```typescript
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Map, { Marker, Popup, Source, Layer } from 'react-map-gl';
import type { MapboxGeoJSONFeature } from 'mapbox-gl';
import { useAnalyticsStore } from '@/stores/analytics.store';

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
        .filter((entity: any) => entity.coordinates)
        .map((entity: any) => ({
          id: entity.id,
          name: entity.name,
          type: entity.type,
          coordinates: [entity.coordinates[0], entity.coordinates[1]], // lat, lng
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
      if (selectedEntity) {
        return { longitude: selectedEntity.coordinates[1], latitude: selectedEntity.coordinates[0] };
      }
    }

    // For "all" entities or fallback, calculate center of all entities
    const latSum = entities.reduce((sum, entity) => sum + entity.coordinates[0], 0);
    const lngSum = entities.reduce((sum, entity) => sum + entity.coordinates[1], 0);
    
    return { longitude: lngSum / entities.length, latitude: latSum / entities.length };
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
      .filter(entity => entity.assessmentData && entity.assessmentData.total > 0)
      .map(entity => {
        const assessmentData = entity.assessmentData!;
        const baseRadius = 500; // meters
        const maxRadius = 2000; // meters
        const radius = Math.min(maxRadius, baseRadius + (assessmentData.total * 100));
        
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [entity.coordinates[1], entity.coordinates[0]] // lng, lat for GeoJSON
          },
          properties: {
            radius: radius,
            entityId: entity.id,
            assessmentData: assessmentData
          }
        };
      });

    return {
      type: 'FeatureCollection',
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

  if (error) {
    return (
      <div className={`h-72 rounded-lg border border-red-300 bg-red-50 flex items-center justify-center ${className}`}>
        <div className="text-center text-red-600">
          <h4 className="font-medium mb-2">Map Error</h4>
          <p className="text-sm">{error}</p>
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
        initialViewState={{
          longitude: mapCenter.longitude,
          latitude: mapCenter.latitude,
          zoom: mapZoom
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
      >
        {/* Entity Markers */}
        {filteredEntities.map((entity) => (
          <Marker
            key={entity.id}
            longitude={entity.coordinates[1]}
            latitude={entity.coordinates[0]}
            color={getMarkerColor(entity)}
            onClick={() => setSelectedEntity(entity)}
          />
        ))}

        {/* Assessment Coverage Circles */}
        <Source id="assessment-circles" type="geojson" data={assessmentCirclesGeoJSON}>
          <Layer
            id="assessment-circles-layer"
            type="circle"
            paint={{
              'circle-radius': ['get', 'radius'],
              'circle-color': '#3b82f6',
              'circle-opacity': 0.6,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#1d4ed8'
            }}
          />
        </Source>

        {/* Entity Popup */}
        {selectedEntity && (
          <Popup
            longitude={selectedEntity.coordinates[1]}
            latitude={selectedEntity.coordinates[0]}
            onClose={() => setSelectedEntity(null)}
            closeButton={true}
            closeOnClick={false}
          >
            <div className="p-3 min-w-[250px]">
              <div className="mb-3">
                <h3 className="font-semibold text-base mb-1">{selectedEntity.name}</h3>
                <p className="text-xs text-gray-600">
                  Type: {selectedEntity.type} | Coordinates: {selectedEntity.coordinates[0].toFixed(4)}, {selectedEntity.coordinates[1].toFixed(4)}
                </p>
              </div>
              
              {/* Assessment Data */}
              <div className="mb-3">
                <h4 className="font-medium text-sm mb-2 text-blue-700">Assessment Status</h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center p-2 bg-blue-50 rounded">
                    <div className="font-semibold text-lg">{selectedEntity.assessmentData?.total || 0}</div>
                    <div className="text-gray-600">Total</div>
                  </div>
                  <div className="text-center p-2 bg-yellow-50 rounded">
                    <div className="font-semibold text-lg">{selectedEntity.assessmentData?.pending || 0}</div>
                    <div className="text-gray-600">Pending</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded">
                    <div className="font-semibold text-lg">{selectedEntity.assessmentData?.completed || 0}</div>
                    <div className="text-gray-600">Completed</div>
                  </div>
                </div>
              </div>

              {/* Response Data */}
              <div className="mb-2">
                <h4 className="font-medium text-sm mb-2 text-green-700">Response Status</h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center p-2 bg-green-50 rounded">
                    <div className="font-semibold text-lg">{selectedEntity.responseData?.total || 0}</div>
                    <div className="text-gray-600">Total</div>
                  </div>
                  <div className="text-center p-2 bg-orange-50 rounded">
                    <div className="font-semibold text-lg">{selectedEntity.responseData?.active || 0}</div>
                    <div className="text-gray-600">Active</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-semibold text-lg">{selectedEntity.responseData?.completed || 0}</div>
                    <div className="text-gray-600">Completed</div>
                  </div>
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}

export default InteractiveMap;
```

#### 2.2 Update CenterPanel Component
Replace the dynamic import in `packages/frontend/src/components/features/analytics/CenterPanel.tsx`:

```typescript
// Replace the existing dynamic import with:
const InteractiveMap = useMemo(() => dynamic(
  () => import('./InteractiveMap'),
  {
    loading: () => (
      <div className="h-72 rounded-lg border border-gray-300 bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm">Loading interactive map...</p>
        </div>
      </div>
    ),
    ssr: false
  }
), []);
```

### Phase 3: Cleanup

#### 3.1 Remove Obsolete Components
Delete the following files:
```bash
rm packages/frontend/src/components/features/analytics/MapComponent.tsx
rm packages/frontend/src/components/features/analytics/EntityMarker.tsx
rm packages/frontend/src/components/features/analytics/AssessmentOverlay.tsx
rm packages/frontend/src/components/features/analytics/ResponseOverlay.tsx
rm packages/frontend/src/components/features/analytics/GapAnalysisOverlay.tsx
```

#### 3.2 Update CSS Imports
Remove any Leaflet CSS imports from:
- `packages/frontend/src/components/features/analytics/InteractiveMap.tsx`
- Any other components that imported Leaflet CSS

### Phase 4: Advanced Features (Optional)

#### 4.1 Enhanced Visualization Layers
Add more sophisticated visualization by implementing:

1. **Heatmaps for Assessment Density**:
```typescript
<Source id="assessment-heatmap" type="geojson" data={heatmapData}>
  <Layer
    id="assessment-heatmap-layer"
    type="heatmap"
    paint={{
      'heatmap-weight': ['get', 'weight'],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(33,102,172,0)',
        0.2, 'rgb(103,169,207)',
        0.4, 'rgb(209,229,240)',
        0.6, 'rgb(253,219,199)',
        0.8, 'rgb(239,138,98)',
        1, 'rgb(178,24,43)'
      ]
    }}
  />
</Source>
```

2. **Gap Analysis Polygons**:
```typescript
const gapPolygonsGeoJSON = useMemo(() => {
  // Implementation for gap analysis visualization
}, [filteredEntities]);
```

#### 4.2 Performance Optimization
Add clustering for large datasets:
```bash
npm install supercluster
```

### Phase 5: Testing

#### 5.1 Manual Testing Steps
1. Start the development server: `npm run dev`
2. Navigate to `/analytics-dashboard`
3. Select an incident from the dropdown
4. Verify the map loads without errors
5. Click on markers to test popup functionality
6. Test entity filtering by selecting specific entities

#### 5.2 Integration Testing
Ensure the following APIs work correctly:
- `/api/v1/monitoring/analytics/entities/by-incident/[id]`
- Entity data transformation and display
- Popup interaction and data display

### Phase 6: Production Considerations

#### 6.1 Environment Variables
Set production Mapbox token in deployment environment:
```
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_production_token
```

#### 6.2 Performance Monitoring
Monitor Mapbox API usage in production to stay within free tier limits or adjust billing accordingly.

## Expected Results

After implementing this migration:

1. ✅ **No more "TypeError: render is not a function"** errors
2. ✅ **Incident selection works correctly** without crashes
3. ✅ **Interactive map displays** with entity markers
4. ✅ **Entity popups show assessment/response data** correctly
5. ✅ **Map centers and zooms** based on selected entities
6. ✅ **Assessment coverage circles** display properly
7. ✅ **Better performance** and smoother interactions

## Rollback Plan

If issues arise, temporarily restore the placeholder map:
```typescript
// Simple placeholder until migration is complete
<div className="h-72 rounded-lg border p-4">
  <h4 className="font-medium mb-4">Entity Locations</h4>
  <div className="space-y-2">
    {entities.map(entity => (
      <div key={entity.id} className="p-2 border rounded">
        <span className="font-medium">{entity.name}</span>
        <span className="text-sm text-gray-600 ml-2">
          ({entity.coordinates.join(', ')})
        </span>
      </div>
    ))}
  </div>
</div>
```

## References

- [React-Map-GL Documentation](https://visgl.github.io/react-map-gl/)
- [Mapbox GL JS API](https://docs.mapbox.com/mapbox-gl-js/api/)
- [Next.js Dynamic Imports](https://nextjs.org/docs/advanced-features/dynamic-import)
- [GeoJSON Specification](https://geojson.org/)

## Support

For implementation questions or issues:
1. Check React-Map-GL GitHub issues
2. Refer to Mapbox documentation
3. Test with Mapbox example applications
4. Validate GeoJSON data format compliance