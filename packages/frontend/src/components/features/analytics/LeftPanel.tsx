'use client';

import React from 'react';
import { IncidentSelector } from './IncidentSelector';
import { IncidentTimeline } from './IncidentTimeline';
import { PopulationImpactSummary } from './PopulationImpactSummary';
import { UpdateIndicator } from './UpdateIndicator';

interface LeftPanelProps {}

export function LeftPanel({}: LeftPanelProps) {
  return (
    <div className="h-full flex flex-col space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between flex-shrink-0 px-2">
        <h3 className="text-sm font-medium text-gray-700">Incident Overview</h3>
        <UpdateIndicator showDetails={false} />
      </div>
      <IncidentSelector className="flex-shrink-0" />
      <IncidentTimeline className="flex-shrink-0" />
      <PopulationImpactSummary className="flex-1 min-h-0" />
    </div>
  );
}