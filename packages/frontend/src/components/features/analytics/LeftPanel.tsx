'use client';

import React from 'react';
import { IncidentSelector } from './IncidentSelector';
import { IncidentTimeline } from './IncidentTimeline';
import { PopulationImpactSummary } from './PopulationImpactSummary';

interface LeftPanelProps {}

export function LeftPanel({}: LeftPanelProps) {
  return (
    <div className="h-full flex flex-col space-y-4 overflow-y-auto">
      <IncidentSelector className="flex-shrink-0" />
      <IncidentTimeline className="flex-shrink-0" />
      <PopulationImpactSummary className="flex-1 min-h-0" />
    </div>
  );
}