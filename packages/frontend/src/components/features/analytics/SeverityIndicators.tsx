'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';

interface SeverityIndicatorsProps {
  overallSeverity: {
    Health: 'red' | 'yellow' | 'green';
    WASH: 'red' | 'yellow' | 'green';
    Food: 'red' | 'yellow' | 'green';
    Shelter: 'red' | 'yellow' | 'green';
    Security: 'red' | 'yellow' | 'green';
  };
  className?: string;
}

const ASSESSMENT_AREAS = ['Health', 'WASH', 'Food', 'Shelter', 'Security'] as const;

const getSeverityColor = (severity: 'red' | 'yellow' | 'green') => {
  switch (severity) {
    case 'red':
      return 'bg-red-500 text-white border-red-600';
    case 'yellow':
      return 'bg-yellow-500 text-black border-yellow-600';
    case 'green':
      return 'bg-green-500 text-white border-green-600';
    default:
      return 'bg-gray-500 text-white border-gray-600';
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

const getSeverityText = (severity: 'red' | 'yellow' | 'green') => {
  switch (severity) {
    case 'red':
      return 'Critical';
    case 'yellow':
      return 'Moderate';
    case 'green':
      return 'Minimal';
    default:
      return 'Unknown';
  }
};

export function SeverityIndicators({ overallSeverity, className = '' }: SeverityIndicatorsProps) {
  return (
    <div className={`grid grid-cols-1 gap-2.5 ${className}`}>
      {ASSESSMENT_AREAS.map((area) => (
        <div key={area} className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm">{getSeverityIcon(area)}</span>
            <span className="text-xs font-medium truncate text-gray-700">{area}</span>
          </div>
          <Badge
            variant="outline"
            className={`text-xs px-2 py-1 font-medium shadow-sm ${getSeverityColor(overallSeverity[area])}`}
            title={`${area}: ${getSeverityText(overallSeverity[area])} gaps`}
          >
            {getSeverityText(overallSeverity[area])}
          </Badge>
        </div>
      ))}
    </div>
  );
}