'use client';

import SimpleInteractiveMap from './SimpleInteractiveMap';

interface LeafletMapProps {
  mapData: {
    totalEntities: number;
    totalAssessments: number;
    totalResponses: number;
    entities: any[];
    assessments: any[];
    responses: any[];
    boundingBox: {
      northEast: { latitude: number; longitude: number };
      southWest: { latitude: number; longitude: number };
    };
  } | null;
}

export default function LeafletMap({ mapData }: LeafletMapProps) {
  return <SimpleInteractiveMap mapData={mapData} />;
}