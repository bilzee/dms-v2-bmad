'use client';

import React from 'react';

interface InteractiveMapProps {
  className?: string;
}

export function InteractiveMap({ className }: InteractiveMapProps) {
  return (
    <div className={`bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center ${className}`}>
      <div className="text-center text-gray-500">
        <p>Interactive Map</p>
        <p className="text-sm">(Mapbox dependencies not installed)</p>
      </div>
    </div>
  );
}