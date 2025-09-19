'use client';

import { useEffect, useState } from 'react';
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

  const handleEntityClick = (entity: MapEntityData) => {
    setSelectedEntity(entity);
    onEntitySelect?.(entity);
  };

  if (!visible) return null;

  return (
    <div className="relative h-full w-full bg-gray-50 rounded-lg border">
      {/* Simplified Entity List View - Placeholder for map */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Entity Locations</h3>
          <span className="text-sm text-gray-500">({entities.length} entities)</span>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 justify-center py-8">
            <Activity className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading entities...</span>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {entities.map((entity) => (
              <div
                key={entity.id}
                className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => handleEntityClick(entity)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {entity.type === 'CAMP' ? (
                      <Home className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Users className="h-4 w-4 text-green-600" />
                    )}
                    <div>
                      <div className="font-medium text-sm">{entity.name}</div>
                      <div className="text-xs text-gray-500">
                        {entity.latitude.toFixed(4)}, {entity.longitude.toFixed(4)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right text-xs">
                    <div className="flex gap-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {entity.assessmentCount} assessments
                      </span>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                        {entity.responseCount} responses
                      </span>
                    </div>
                    <div className="mt-1 text-gray-500">
                      Active: {entity.statusSummary.activeResponses + entity.statusSummary.pendingAssessments}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {entities.length === 0 && !isLoading && (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No entities found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Entity Details */}
      {selectedEntity && (
        <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg border shadow-lg max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">{selectedEntity.name}</h4>
            <button
              onClick={() => setSelectedEntity(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <div className="text-center p-1 bg-blue-50 rounded">
              <div className="font-semibold">{selectedEntity.statusSummary.pendingAssessments}</div>
              <div className="text-gray-600">Pending</div>
            </div>
            <div className="text-center p-1 bg-green-50 rounded">
              <div className="font-semibold">{selectedEntity.statusSummary.activeResponses}</div>
              <div className="text-gray-600">Active</div>
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            Last activity: {new Date(selectedEntity.lastActivity).toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  );
}