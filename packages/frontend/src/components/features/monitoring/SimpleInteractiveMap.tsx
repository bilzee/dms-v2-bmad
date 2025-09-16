'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapEntityData {
  id: string;
  name: string;
  type: 'CAMP' | 'COMMUNITY';
  longitude: number;
  latitude: number;
  coordinates: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Date;
    captureMethod: 'GPS' | 'MANUAL' | 'MAP_SELECT';
  };
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
  type: string;
  date: Date;
  assessorName: string;
  coordinates: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Date;
    captureMethod: 'GPS' | 'MANUAL' | 'MAP_SELECT';
  };
  entityName: string;
  verificationStatus: string;
  priorityLevel: string;
}

interface MapResponseData {
  id: string;
  responseType: string;
  plannedDate: Date;
  deliveredDate?: Date;
  responderName: string;
  coordinates: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Date;
    captureMethod: 'GPS' | 'MANUAL' | 'MAP_SELECT';
  };
  entityName: string;
  status: string;
  deliveryItems: Array<{
    item: string;
    quantity: number;
  }>;
}

interface MapOverview {
  entities: MapEntityData[];
  assessments: MapAssessmentData[];
  responses: MapResponseData[];
  totalEntities: number;
  totalAssessments: number;
  totalResponses: number;
  boundingBox: {
    northEast: { latitude: number; longitude: number };
    southWest: { latitude: number; longitude: number };
  };
}

interface LayerVisibility {
  entities: boolean;
  assessments: boolean;
  responses: boolean;
}

interface SimpleInteractiveMapProps {
  mapData: MapOverview;
  layerVisibility: LayerVisibility;
}

export default function SimpleInteractiveMap({ mapData, layerVisibility }: SimpleInteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapData || !mapRef.current) return;

    // Fix Leaflet default icon issue
    if (typeof window !== 'undefined') {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
    }

    // Calculate map center from bounding box
    const centerLat = (mapData.boundingBox.northEast.latitude + mapData.boundingBox.southWest.latitude) / 2;
    const centerLng = (mapData.boundingBox.northEast.longitude + mapData.boundingBox.southWest.longitude) / 2;

    // Clear existing map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    // Create new map instance
    const map = L.map(mapRef.current).setView([centerLat, centerLng], 10);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add entity markers if visible
    if (layerVisibility.entities) {
      mapData.entities.forEach(entity => {
        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            background-color: ${entity.type === 'CAMP' ? '#3b82f6' : '#10b981'}; 
            width: 30px; 
            height: 30px; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: white; 
            font-weight: bold; 
            border: 2px solid white; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ">
            ${entity.type === 'CAMP' ? 'C' : 'H'}
          </div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        const marker = L.marker([entity.latitude, entity.longitude], { icon: customIcon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width: 200px; padding: 8px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold;">${entity.name}</h3>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">
                Type: ${entity.type} | Coordinates: ${entity.latitude.toFixed(4)}, ${entity.longitude.toFixed(4)}
              </p>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                <div style="text-align: center; padding: 4px; background: #f0f9ff; border-radius: 4px;">
                  <div style="font-weight: bold;">${entity.assessmentCount}</div>
                  <div style="font-size: 11px; color: #666;">Assessments</div>
                </div>
                <div style="text-align: center; padding: 4px; background: #f0fdf4; border-radius: 4px;">
                  <div style="font-weight: bold;">${entity.responseCount}</div>
                  <div style="font-size: 11px; color: #666;">Responses</div>
                </div>
              </div>
              <div style="border-top: 1px solid #eee; padding-top: 8px; font-size: 11px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span>Pending Assessments:</span>
                  <span style="font-weight: bold;">${entity.statusSummary.pendingAssessments}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span>Active Responses:</span>
                  <span style="font-weight: bold;">${entity.statusSummary.activeResponses}</span>
                </div>
                <div style="color: #666; margin-top: 4px;">
                  Last activity: ${new Date(entity.lastActivity).toLocaleDateString()}
                </div>
              </div>
            </div>
          `);
      });
    }

    // Add assessment markers if visible
    if (layerVisibility.assessments && mapData.assessments) {
      mapData.assessments.forEach(assessment => {
        const getColorByType = (type: string) => {
          switch (type) {
            case 'HEALTH': return '#ef4444';
            case 'WASH': return '#3b82f6';
            case 'SHELTER': return '#8b5cf6';
            case 'FOOD': return '#f59e0b';
            case 'SECURITY': return '#dc2626';
            case 'POPULATION': return '#10b981';
            default: return '#6b7280';
          }
        };

        const color = getColorByType(assessment.type);
        const customIcon = L.divIcon({
          className: 'assessment-marker',
          html: `<div style="
            background-color: ${color}; 
            width: 25px; 
            height: 25px; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: white; 
            font-size: 12px; 
            font-weight: bold; 
            border: 2px solid white; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ">A</div>`,
          iconSize: [25, 25],
          iconAnchor: [12.5, 12.5]
        });

        const marker = L.marker([assessment.coordinates.latitude, assessment.coordinates.longitude], { icon: customIcon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width: 200px; padding: 8px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold;">Assessment</h3>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">
                Type: ${assessment.type} | By: ${assessment.assessorName}
              </p>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">
                Date: ${new Date(assessment.date).toLocaleDateString()}
              </p>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">
                Entity: ${assessment.entityName}
              </p>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px;">Status:</span>
                <span style="font-size: 12px; font-weight: bold; color: ${
                  assessment.verificationStatus === 'VERIFIED' ? '#10b981' :
                  assessment.verificationStatus === 'PENDING' ? '#f59e0b' :
                  assessment.verificationStatus === 'REJECTED' ? '#ef4444' : '#6b7280'
                }">${assessment.verificationStatus}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                <span style="font-size: 12px;">Priority:</span>
                <span style="font-size: 12px; font-weight: bold; color: ${
                  assessment.priorityLevel === 'CRITICAL' ? '#dc2626' :
                  assessment.priorityLevel === 'HIGH' ? '#ef4444' :
                  assessment.priorityLevel === 'MEDIUM' ? '#f59e0b' : '#10b981'
                }">${assessment.priorityLevel}</span>
              </div>
            </div>
          `);
      });
    }

    // Add response markers if visible
    if (layerVisibility.responses && mapData.responses) {
      mapData.responses.forEach(response => {
        const getStatusColor = (status: string) => {
          switch (status) {
            case 'PLANNED': return '#6b7280';
            case 'IN_PROGRESS': return '#f59e0b';
            case 'DELIVERED': return '#10b981';
            case 'CANCELLED': return '#ef4444';
            default: return '#6b7280';
          }
        };

        const color = getStatusColor(response.status);
        const customIcon = L.divIcon({
          className: 'response-marker',
          html: `<div style="
            background-color: ${color}; 
            width: 25px; 
            height: 25px; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: white; 
            font-size: 12px; 
            font-weight: bold; 
            border: 2px solid white; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ">R</div>`,
          iconSize: [25, 25],
          iconAnchor: [12.5, 12.5]
        });

        const marker = L.marker([response.coordinates.latitude, response.coordinates.longitude], { icon: customIcon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width: 200px; padding: 8px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold;">Response</h3>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">
                Type: ${response.responseType} | By: ${response.responderName}
              </p>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">
                Entity: ${response.entityName}
              </p>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px;">Status:</span>
                <span style="font-size: 12px; font-weight: bold; color: ${color}">${response.status}</span>
              </div>
              ${response.plannedDate ? `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                  <span style="font-size: 12px;">Planned:</span>
                  <span style="font-size: 12px;">${new Date(response.plannedDate).toLocaleDateString()}</span>
                </div>
              ` : ''}
              ${response.deliveredDate ? `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                  <span style="font-size: 12px;">Delivered:</span>
                  <span style="font-size: 12px;">${new Date(response.deliveredDate).toLocaleDateString()}</span>
                </div>
              ` : ''}
              ${response.deliveryItems && response.deliveryItems.length > 0 ? `
                <div style="margin-top: 8px; border-top: 1px solid #eee; padding-top: 8px;">
                  <div style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">Delivery Items:</div>
                  ${response.deliveryItems.map(item => `
                    <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
                      <span>${item.item}:</span>
                      <span>${item.quantity}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `);
      });
    }

    mapInstanceRef.current = map;

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapData, layerVisibility]);

  if (!mapData || !mapData.entities || mapData.entities.length === 0) {
    return (
      <div className="h-96 rounded-lg border overflow-hidden bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-gray-600">No map data available</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapRef}
      className="h-96 rounded-lg border overflow-hidden bg-gray-50"
      style={{ minHeight: '384px' }}
    />
  );
}