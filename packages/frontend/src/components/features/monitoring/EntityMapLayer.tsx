'use client';

import { useEffect, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { MapPin, Users, Home, Activity, BarChart3 } from 'lucide-react';

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

interface EntityMapLayerProps {
  visible: boolean;
  onEntitySelect?: (entity: MapEntityData) => void;
  refreshInterval?: number;
}

export function EntityMapLayer({
  visible = true,
  onEntitySelect,
  refreshInterval = 25000
}: EntityMapLayerProps) {
  const [entities, setEntities] = useState<MapEntityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<MapEntityData | null>(null);

  const fetchEntities = async () => {
    try {
      const response = await fetch('/api/v1/monitoring/map/entities');
      const data = await response.json();
      
      if (data.success) {
        setEntities(data.data.map((entity: any) => ({
          ...entity,
          coordinates: {
            ...entity.coordinates,
            timestamp: new Date(entity.coordinates.timestamp),
          },
          lastActivity: new Date(entity.lastActivity),
        })));
      }
    } catch (error) {
      console.error('Failed to fetch entity data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchEntities();
      
      const interval = setInterval(fetchEntities, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [visible, refreshInterval]);

  const [leafletIcons, setLeafletIcons] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    const loadIcons = async () => {
      if (typeof window !== 'undefined') {
        const L = await import('leaflet');
        const iconMap = new Map();
        
        entities.forEach(entity => {
          const totalActivity = entity.assessmentCount + entity.responseCount;
          const activeActivity = entity.statusSummary.pendingAssessments + entity.statusSummary.activeResponses;
          
          const getMarkerColor = () => {
            if (activeActivity > 5) return '#ef4444';
            if (activeActivity > 2) return '#eab308';
            if (totalActivity > 0) return '#22c55e';
            return '#9ca3af';
          };

          const iconHtml = entity.type === 'CAMP' 
            ? `<div style="background-color: ${getMarkerColor()}; width: 25px; height: 25px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">C</div>`
            : `<div style="background-color: ${getMarkerColor()}; width: 25px; height: 25px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">H</div>`;

          const icon = L.divIcon({
            html: iconHtml,
            className: 'custom-div-icon',
            iconSize: [25, 25],
            iconAnchor: [12, 12],
          });
          
          iconMap.set(entity.id, icon);
        });
        
        setLeafletIcons(iconMap);
      }
    };
    
    if (entities.length > 0) {
      loadIcons();
    }
  }, [entities]);

  const handleEntityClick = (entity: MapEntityData) => {
    setSelectedEntity(entity);
    onEntitySelect?.(entity);
  };

  if (!visible) return null;

  return (
    <>
      {/* Entity Markers */}
      {entities.map((entity) => (
        <Marker
          key={entity.id}
          position={[entity.latitude, entity.longitude]}
          icon={leafletIcons.get(entity.id)}
          eventHandlers={{
            click: () => handleEntityClick(entity),
          }}
        >
          <Popup>
            <div className="p-2 min-w-[200px]">
              <h3 className="font-semibold text-sm mb-2">{entity.name}</h3>
              <p className="text-xs text-gray-600 mb-2">
                Type: {entity.type} | Coordinates: {entity.latitude.toFixed(4)}, {entity.longitude.toFixed(4)}
              </p>
              
              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                <div className="text-center p-1 bg-blue-50 rounded">
                  <div className="font-semibold">{entity.assessmentCount}</div>
                  <div className="text-gray-600">Assessments</div>
                </div>
                <div className="text-center p-1 bg-green-50 rounded">
                  <div className="font-semibold">{entity.responseCount}</div>
                  <div className="text-gray-600">Responses</div>
                </div>
              </div>
              
              <div className="border-t pt-2 text-xs">
                <div className="flex justify-between">
                  <span>Pending Assessments:</span>
                  <span className="font-medium">{entity.statusSummary.pendingAssessments}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Responses:</span>
                  <span className="font-medium">{entity.statusSummary.activeResponses}</span>
                </div>
                <div className="mt-1 text-gray-500">
                  Last activity: {new Date(entity.lastActivity).toLocaleDateString()}
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
      
      {/* Loading Overlay - only shows when loading */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center pointer-events-auto z-[1000]">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading entities...</span>
          </div>
        </div>
      )}
    </>
  );
}