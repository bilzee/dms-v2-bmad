'use client';

import { useEffect, useState } from 'react';
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
        return 'text-green-600 bg-green-100';
      case 'CANCELLED':
        return 'text-red-600 bg-red-100';
      case 'IN_PROGRESS':
        return 'text-blue-600 bg-blue-100';
      case 'PLANNED':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const handleResponseClick = (response: MapResponseData) => {
    setSelectedResponse(response);
    onResponseSelect?.(response);
  };

  if (!visible) return null;

  return (
    <div className="relative h-full w-full bg-gray-50 rounded-lg border">
      {/* Simplified Response List View - Placeholder for map */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Truck className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Response Locations</h3>
          <span className="text-sm text-gray-500">({responses.length} responses)</span>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 justify-center py-8">
            <Truck className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading responses...</span>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {responses.map((response) => {
              const StatusIcon = getStatusIcon(response.status);
              const statusColors = getStatusColor(response.status);
              
              return (
                <div
                  key={response.id}
                  className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleResponseClick(response)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon className="h-4 w-4 text-blue-600" />
                      <div>
                        <div className="font-medium text-sm">{response.responseType.replace('_', ' ')}</div>
                        <div className="text-xs text-gray-500">
                          {response.entityName} • {response.responderName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {response.coordinates.latitude.toFixed(4)}, {response.coordinates.longitude.toFixed(4)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right text-xs">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${statusColors}`}>
                        {response.status.replace('_', ' ')}
                      </div>
                      <div className="mt-1 text-gray-500">
                        {response.deliveryItems.reduce((sum, item) => sum + item.quantity, 0)} items
                      </div>
                      <div className="text-gray-500">
                        {response.plannedDate.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {responses.length === 0 && !isLoading && (
              <div className="text-center py-8 text-gray-500">
                <Truck className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No responses found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Response Details */}
      {selectedResponse && (
        <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg border shadow-lg max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">{selectedResponse.responseType.replace('_', ' ')}</h4>
            <button
              onClick={() => setSelectedResponse(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-medium">{selectedResponse.status.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span>Location:</span>
              <span className="font-medium">{selectedResponse.entityName}</span>
            </div>
            <div className="flex justify-between">
              <span>Responder:</span>
              <span className="font-medium">{selectedResponse.responderName}</span>
            </div>
            <div className="flex justify-between">
              <span>Items:</span>
              <span className="font-medium">
                {selectedResponse.deliveryItems.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </div>
            {selectedResponse.deliveredDate && (
              <div className="flex justify-between">
                <span>Delivered:</span>
                <span className="font-medium">{selectedResponse.deliveredDate.toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}