'use client';

import { useRef, useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { EntityMapLayer } from './EntityMapLayer';
import { AssessmentMapLayer } from './AssessmentMapLayer';
import { ResponseMapLayer } from './ResponseMapLayer';

// Import Leaflet CSS and compatibility
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';

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
  const mapRef = useRef<any>(null);

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
    <div className="h-96 rounded-lg border overflow-hidden">
      <MapContainer
        center={getMapCenter()}
        zoom={10}
        className="h-full w-full"
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Map Layers */}
        <EntityMapLayer visible={layerVisibility.entities} />
        <AssessmentMapLayer visible={layerVisibility.assessments} />
        <ResponseMapLayer visible={layerVisibility.responses} />
      </MapContainer>
    </div>
  );
}