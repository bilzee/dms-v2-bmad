'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EntityGap {
  entityId: string;
  entityName: string;
  assessmentAreas: {
    Health: 'red' | 'yellow' | 'green';
    WASH: 'red' | 'yellow' | 'green';
    Food: 'red' | 'yellow' | 'green';
    Shelter: 'red' | 'yellow' | 'green';
    Security: 'red' | 'yellow' | 'green';
  };
}

interface EntityGapsGridProps {
  entityGaps: EntityGap[];
  isLoading?: boolean;
}

const ASSESSMENT_AREAS = ['Health', 'WASH', 'Food', 'Shelter', 'Security'] as const;

const getSeverityColor = (severity: 'red' | 'yellow' | 'green') => {
  switch (severity) {
    case 'red':
      return 'bg-red-500 text-white';
    case 'yellow':
      return 'bg-yellow-500 text-black';
    case 'green':
      return 'bg-green-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

const getSeverityIcon = (area: string) => {
  switch (area) {
    case 'Health':
      return '🏥';
    case 'WASH':
      return '💧';
    case 'Food':
      return '🍽️';
    case 'Shelter':
      return '🏠';
    case 'Security':
      return '🛡️';
    default:
      return '📊';
  }
};

export function EntityGapsGrid({ entityGaps, isLoading }: EntityGapsGridProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Entity Gaps Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <div key={j} className="h-6 w-12 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!entityGaps.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Entity Gaps Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 text-center py-4">
            No entity data available for selected incident
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-gray-800">Entity Gaps Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entityGaps.map((entity) => (
          <div key={entity.entityId} className="space-y-2 p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
            <div className="text-xs font-semibold text-gray-800 truncate" title={entity.entityName}>
              {entity.entityName}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {ASSESSMENT_AREAS.map((area) => (
                <Badge
                  key={area}
                  variant="outline"
                  className={`text-xs px-2 py-1 min-w-0 font-medium shadow-sm ${getSeverityColor(entity.assessmentAreas[area])}`}
                  title={`${area}: ${entity.assessmentAreas[area]} severity`}
                >
                  <span className="mr-1" style={{ fontSize: '10px' }}>
                    {getSeverityIcon(area)}
                  </span>
                  <span className="hidden sm:inline text-xs">
                    {area}
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}