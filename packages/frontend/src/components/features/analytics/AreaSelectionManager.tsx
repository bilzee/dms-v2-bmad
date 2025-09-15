'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Settings, ChevronDown, ChevronUp } from 'lucide-react';

const ASSESSMENT_AREAS = ['Health', 'WASH', 'Food', 'Shelter', 'Security'] as const;

interface AreaSelectionManagerProps {
  selectedAreas: string[];
  onAreasChange: (areas: string[]) => void;
  maxDisplayAreas: number;
  isCollapsed?: boolean;
}

export function AreaSelectionManager({ 
  selectedAreas, 
  onAreasChange, 
  maxDisplayAreas,
  isCollapsed = true 
}: AreaSelectionManagerProps) {
  const [isExpanded, setIsExpanded] = useState(!isCollapsed);

  const handleAreaToggle = (area: string, checked: boolean) => {
    if (checked) {
      // Add area if not already selected and under limit
      if (!selectedAreas.includes(area) && selectedAreas.length < maxDisplayAreas) {
        onAreasChange([...selectedAreas, area]);
      }
    } else {
      // Remove area
      onAreasChange(selectedAreas.filter(a => a !== area));
    }
  };

  const handleSelectAll = () => {
    onAreasChange(ASSESSMENT_AREAS.slice(0, maxDisplayAreas));
  };

  const handleClearAll = () => {
    onAreasChange([]);
  };

  const canSelectMore = selectedAreas.length < maxDisplayAreas;
  const hasSpaceConstraint = ASSESSMENT_AREAS.length > maxDisplayAreas;

  if (!hasSpaceConstraint) {
    return null; // No space management needed
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-lg">Assessment Area Selection</CardTitle>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {selectedAreas.length}/{maxDisplayAreas} selected
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        <CardDescription>
          Limited space allows displaying {maxDisplayAreas} of {ASSESSMENT_AREAS.length} assessment areas. 
          Select which areas to show.
        </CardDescription>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={selectedAreas.length >= maxDisplayAreas}
              >
                Select Top {maxDisplayAreas}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                disabled={selectedAreas.length === 0}
              >
                Clear All
              </Button>
            </div>

            {/* Area Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ASSESSMENT_AREAS.map((area) => {
                const isSelected = selectedAreas.includes(area);
                const canSelect = isSelected || canSelectMore;

                return (
                  <div
                    key={area}
                    className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-200' 
                        : canSelect 
                          ? 'bg-gray-50 border-gray-200 hover:bg-gray-100' 
                          : 'bg-gray-25 border-gray-100 opacity-50'
                    }`}
                  >
                    <Checkbox
                      id={area}
                      checked={isSelected}
                      onCheckedChange={(checked) => handleAreaToggle(area, !!checked)}
                      disabled={!canSelect}
                    />
                    <label
                      htmlFor={area}
                      className={`text-sm font-medium cursor-pointer ${
                        canSelect ? 'text-gray-700' : 'text-gray-400'
                      }`}
                    >
                      {area}
                    </label>
                  </div>
                );
              })}
            </div>

            {/* Status Message */}
            <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
              {selectedAreas.length === 0 && (
                <p>Please select at least one assessment area to display.</p>
              )}
              {selectedAreas.length > 0 && selectedAreas.length < maxDisplayAreas && (
                <p>
                  You can select {maxDisplayAreas - selectedAreas.length} more area{maxDisplayAreas - selectedAreas.length !== 1 ? 's' : ''}.
                </p>
              )}
              {selectedAreas.length === maxDisplayAreas && (
                <p>Maximum number of areas selected. Unselect an area to choose a different one.</p>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}