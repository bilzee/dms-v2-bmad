'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EntitySelector } from './EntitySelector';
import { AssessmentAreaBreakdown } from './AssessmentAreaBreakdown';
import { AreaSelectionManager } from './AreaSelectionManager';
import dynamic from 'next/dynamic';
import { useAnalyticsStore } from '@/stores/analytics.store';

interface CenterPanelProps {}

const DEFAULT_MAX_AREAS = 3; // Default constraint for space management
const ALL_ASSESSMENT_AREAS = ['Health', 'WASH', 'Food', 'Shelter', 'Security']; // Population removed - used in left panel instead

export function CenterPanel({}: CenterPanelProps) {
  const { selectedIncident } = useAnalyticsStore();
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<string[]>(ALL_ASSESSMENT_AREAS.slice(0, DEFAULT_MAX_AREAS));
  const [maxDisplayAreas, setMaxDisplayAreas] = useState(DEFAULT_MAX_AREAS);

  // Dynamic import InteractiveMap with proper component reference
  const InteractiveMap = useMemo(() => dynamic(
    () => import('./InteractiveMap'),
    {
      loading: () => (
        <div className="h-72 rounded-lg border border-gray-300 bg-gray-50 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm">Loading interactive map...</p>
          </div>
        </div>
      ),
      ssr: false
    }
  ), []);

  // Calculate space constraints based on available viewport height
  useEffect(() => {
    const calculateMaxAreas = () => {
      const viewportHeight = window.innerHeight;
      const headerHeight = 180; // Approximate header space
      const entitySelectorHeight = 100; // Entity selector space
      const spaceManagementHeight = 60; // Space for area selection if needed
      const interactiveMapHeight = 300; // Space reserved for interactive map below
      const areaCardHeight = 200; // Approximate height per assessment area card
      
      const availableHeight = viewportHeight - headerHeight - entitySelectorHeight - spaceManagementHeight - interactiveMapHeight;
      const calculatedMaxAreas = Math.max(2, Math.floor(availableHeight / areaCardHeight));
      
      // Limit to available areas but allow at least 2, max 5
      return Math.min(ALL_ASSESSMENT_AREAS.length, Math.max(2, calculatedMaxAreas));
    };

    const handleResize = () => {
      const newMaxAreas = calculateMaxAreas();
      setMaxDisplayAreas(newMaxAreas);
      
      // Adjust selected areas if they exceed new limit
      if (selectedAreas.length > newMaxAreas) {
        setSelectedAreas(selectedAreas.slice(0, newMaxAreas));
      }
    };

    // Initial calculation
    handleResize();

    // Add resize listener
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedAreas]);

  // Reset selected entity when incident changes and set to "all" as default
  useEffect(() => {
    if (selectedIncident) {
      // Set to "all" immediately to show aggregated data by default
      setSelectedEntityId('all');
    } else {
      setSelectedEntityId(null);
    }
  }, [selectedIncident]);

  const handleEntityChange = (entityId: string | null) => {
    setSelectedEntityId(entityId);
  };

  const handleAreasChange = (areas: string[]) => {
    setSelectedAreas(areas);
  };

  const hasSpaceConstraint = ALL_ASSESSMENT_AREAS.length > maxDisplayAreas;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Assessment Area Breakdown</CardTitle>
        <CardDescription>
          Assessment areas with latest data and gap analysis for selected entities
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[calc(100%-120px)] overflow-y-auto">
        <div className="space-y-4">
          {/* Entity Selection */}
          <EntitySelector 
            onEntityChange={handleEntityChange}
            selectedEntityId={selectedEntityId}
          />

          {/* Space Management - only show if there are space constraints */}
          {hasSpaceConstraint && selectedEntityId && (
            <AreaSelectionManager
              selectedAreas={selectedAreas}
              onAreasChange={handleAreasChange}
              maxDisplayAreas={maxDisplayAreas}
              isCollapsed={true}
            />
          )}

          {/* Assessment Area Breakdown */}
          <div className="flex-1">
            {selectedEntityId ? (
              <AssessmentAreaBreakdown
                selectedEntityId={selectedEntityId}
                selectedAreas={hasSpaceConstraint ? selectedAreas : undefined}
                maxDisplayAreas={hasSpaceConstraint ? maxDisplayAreas : undefined}
              />
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500">
                  <h4 className="font-medium mb-2">Assessment Area Analysis</h4>
                  <p className="text-sm">
                    {!selectedIncident 
                      ? "Select an incident from the left panel to begin"
                      : "Select an affected entity to view assessment breakdown"
                    }
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Map */}
          <div className="mt-8">
            <InteractiveMap 
              selectedEntityId={selectedEntityId}
              className="w-full"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}