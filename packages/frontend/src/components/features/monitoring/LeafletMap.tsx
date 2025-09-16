'use client';

import { useRef, useEffect } from 'react';

interface LayerVisibility {
  entities: boolean;
  assessments: boolean;
  responses: boolean;
}

interface LeafletMapProps {
  layerVisibility: LayerVisibility;
  mapData: {
    totalEntities: number;
    boundingBox: {
      northEast: { latitude: number; longitude: number };
      southWest: { latitude: number; longitude: number };
    };
  } | null;
}

export default function LeafletMap({ layerVisibility, mapData }: LeafletMapProps) {
  const getMapCenter = (): [number, number] => {
    if (!mapData) {
      return [12.0, 14.0]; // Default center for Borno State
    }
    
    const { boundingBox } = mapData;
    const centerLat = (boundingBox.northEast.latitude + boundingBox.southWest.latitude) / 2;
    const centerLng = (boundingBox.northEast.longitude + boundingBox.southWest.longitude) / 2;
    
    return [centerLat, centerLng];
  };

  return (
    <div className="h-96 rounded-lg border overflow-hidden bg-gray-100 flex items-center justify-center">
      <div className="text-center text-gray-600">
        <h4 className="font-medium mb-2">Monitoring Map</h4>
        <p className="text-sm">
          Map functionality temporarily disabled during analytics dashboard migration.
        </p>
        <p className="text-xs mt-2">
          Center: {getMapCenter()[0].toFixed(2)}, {getMapCenter()[1].toFixed(2)}
        </p>
        <div className="mt-2 text-xs">
          <div>Entities: {layerVisibility.entities ? 'visible' : 'hidden'}</div>
          <div>Assessments: {layerVisibility.assessments ? 'visible' : 'hidden'}</div>
          <div>Responses: {layerVisibility.responses ? 'visible' : 'hidden'}</div>
        </div>
      </div>
    </div>
  );
}