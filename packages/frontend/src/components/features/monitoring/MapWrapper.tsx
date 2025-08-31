'use client';

import dynamic from 'next/dynamic';
import { useState, useRef, useEffect } from 'react';

// Dynamically import the entire Map component with SSR disabled
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="h-96 rounded-lg border bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-2"></div>
        <p className="text-sm text-gray-600">Loading interactive map...</p>
      </div>
    </div>
  ),
});

interface LayerVisibility {
  entities: boolean;
  assessments: boolean;
  responses: boolean;
}

interface MapWrapperProps {
  layerVisibility: LayerVisibility;
  mapData: {
    totalEntities: number;
    boundingBox: {
      northEast: { latitude: number; longitude: number };
      southWest: { latitude: number; longitude: number };
    };
  } | null;
}

export default function MapWrapper({ layerVisibility, mapData }: MapWrapperProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Don't render on server-side or before hydration
  if (!isMounted) {
    return (
      <div className="h-96 rounded-lg border bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse rounded-full h-8 w-8 bg-gray-300 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Preparing map...</p>
        </div>
      </div>
    );
  }

  return (
    <LeafletMap 
      layerVisibility={layerVisibility}
      mapData={mapData}
    />
  );
}