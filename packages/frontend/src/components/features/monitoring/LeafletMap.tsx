'use client';

import SimpleInteractiveMap from './SimpleInteractiveMap';

interface LeafletMapProps {
  mapData: {
    totalEntities: number;
    totalAssessments?: number;
    totalResponses?: number;
    entities?: any[];
    assessments?: any[];
    responses?: any[];
    boundingBox: {
      northEast: { latitude: number; longitude: number };
      southWest: { latitude: number; longitude: number };
    };
  } | null;
  layerVisibility?: any;
}

export default function LeafletMap({ mapData }: LeafletMapProps) {
  if (!mapData) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50 rounded-lg">
        <p className="text-gray-500">No map data available</p>
      </div>
    );
  }
  
  // Provide defaults for optional fields to match SimpleInteractiveMap's expected interface
  const fullMapData = {
    totalEntities: mapData.totalEntities,
    totalAssessments: mapData.totalAssessments ?? 0,
    totalResponses: mapData.totalResponses ?? 0,
    entities: mapData.entities ?? [],
    assessments: mapData.assessments ?? [],
    responses: mapData.responses ?? [],
    boundingBox: mapData.boundingBox
  };
  
  return <SimpleInteractiveMap mapData={fullMapData} />;
}