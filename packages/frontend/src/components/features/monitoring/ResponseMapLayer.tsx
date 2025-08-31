'use client';

import { useEffect, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Truck, Package, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  captureMethod: 'GPS' | 'MANUAL' | 'MAP_SELECT';
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

interface ResponseMapLayerProps {
  visible: boolean;
  onResponseSelect?: (response: MapResponseData) => void;
  refreshInterval?: number;
}

export function ResponseMapLayer({
  visible = true,
  onResponseSelect,
  refreshInterval = 25000
}: ResponseMapLayerProps) {
  const [responses, setResponses] = useState<MapResponseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState<MapResponseData | null>(null);

  const fetchResponses = async () => {
    try {
      const response = await fetch('/api/v1/monitoring/map/responses');
      const data = await response.json();
      
      if (data.success) {
        setResponses(data.data.map((resp: any) => ({
          ...resp,
          plannedDate: new Date(resp.plannedDate),
          deliveredDate: resp.deliveredDate ? new Date(resp.deliveredDate) : undefined,
          coordinates: {
            ...resp.coordinates,
            timestamp: new Date(resp.coordinates.timestamp),
          },
        })));
      }
    } catch (error) {
      console.error('Failed to fetch response data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchResponses();
      
      const interval = setInterval(fetchResponses, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [visible, refreshInterval]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return CheckCircle;
      case 'CANCELLED':
        return XCircle;
      case 'IN_PROGRESS':
        return Truck;
      case 'PLANNED':
        return Clock;
      default:
        return Package;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return '#22c55e'; // Green
      case 'CANCELLED':
        return '#ef4444'; // Red
      case 'IN_PROGRESS':
        return '#3b82f6'; // Blue
      case 'PLANNED':
        return '#eab308'; // Yellow
      default:
        return '#9ca3af'; // Gray
    }
  };

  const [leafletIcons, setLeafletIcons] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    const loadIcons = async () => {
      if (typeof window !== 'undefined') {
        const L = await import('leaflet');
        const iconMap = new Map();
        
        responses.forEach(response => {
          const statusColor = getStatusColor(response.status);
          const itemCount = response.deliveryItems.reduce((sum, item) => sum + item.quantity, 0);
          
          const iconHtml = `
            <div style="
              background-color: ${statusColor}; 
              width: 22px; 
              height: 22px; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              color: white; 
              font-weight: bold; 
              font-size: 10px;
              border: 2px solid white; 
              box-shadow: 0 1px 3px rgba(0,0,0,0.3);
              clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
            ">
              R
            </div>
            ${itemCount > 0 ? `<div style="position: absolute; top: -2px; right: -2px; background: #7c3aed; color: white; border-radius: 50%; width: 12px; height: 12px; font-size: 8px; display: flex; align-items: center; justify-content: center;">${itemCount}</div>` : ''}
          `;

          const icon = L.divIcon({
            html: iconHtml,
            className: 'response-marker',
            iconSize: [22, 22],
            iconAnchor: [11, 22],
          });
          
          iconMap.set(response.id, icon);
        });
        
        setLeafletIcons(iconMap);
      }
    };
    
    if (responses.length > 0) {
      loadIcons();
    }
  }, [responses]);

  const getResponseTypeIcon = (type: string) => {
    if (type.includes('MEDICAL')) return AlertCircle;
    if (type.includes('FOOD') || type.includes('WATER')) return Package;
    return Truck;
  };

  const handleResponseClick = (response: MapResponseData) => {
    setSelectedResponse(response);
    onResponseSelect?.(response);
  };

  if (!visible) return null;

  return (
    <>
      {/* Response Markers */}
      {responses.map((response) => (
        <Marker
          key={response.id}
          position={[response.coordinates.latitude, response.coordinates.longitude]}
          icon={leafletIcons.get(response.id)}
          eventHandlers={{
            click: () => handleResponseClick(response),
          }}
        >
          <Popup>
            <div className="p-3 min-w-[250px]">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="h-4 w-4 text-blue-600" />
                <h3 className="font-semibold text-sm">Response Details</h3>
              </div>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium">Type:</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {response.responseType.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-medium">Status:</span>
                  <div className="flex items-center gap-1">
                    {(() => {
                      const StatusIcon = getStatusIcon(response.status);
                      return <StatusIcon className="h-3 w-3" />;
                    })()}
                    <span className="capitalize">{response.status.toLowerCase().replace('_', ' ')}</span>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Location:</span>
                  <span className="text-right max-w-[120px] truncate">{response.entityName}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Responder:</span>
                  <span className="text-right max-w-[120px] truncate">{response.responderName}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Planned:</span>
                  <span>{response.plannedDate.toLocaleDateString()}</span>
                </div>
                
                {response.deliveredDate && (
                  <div className="flex justify-between">
                    <span className="font-medium">Delivered:</span>
                    <span>{response.deliveredDate.toLocaleDateString()}</span>
                  </div>
                )}
                
                {response.deliveryItems.length > 0 && (
                  <div className="border-t pt-2 mt-2">
                    <div className="font-medium mb-1">Items ({response.deliveryItems.reduce((sum, item) => sum + item.quantity, 0)}):</div>
                    <div className="max-h-20 overflow-y-auto space-y-1">
                      {response.deliveryItems.map((item, index) => (
                        <div key={index} className="flex justify-between text-xs bg-gray-50 p-1 rounded">
                          <span className="truncate">{item.item}</span>
                          <span className="font-medium ml-1">{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="border-t pt-2 mt-2 text-gray-600">
                  <div>GPS: ±{response.coordinates.accuracy}m</div>
                  <div>Coords: {response.coordinates.latitude.toFixed(4)}, {response.coordinates.longitude.toFixed(4)}</div>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center pointer-events-auto z-[1000]">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading responses...</span>
          </div>
        </div>
      )}
    </>
  );
}