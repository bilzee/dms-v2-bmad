'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EntityGapsGrid } from './EntityGapsGrid';
import { QuickStatistics } from './QuickStatistics';
import { UpdateIndicator } from './UpdateIndicator';
import { useAnalyticsEntityGaps, useAnalyticsIncidents } from '@/stores/analytics.store';

interface RightPanelProps {}

export function RightPanel({}: RightPanelProps) {
  const { entityGapsSummary, isLoadingEntityGaps } = useAnalyticsEntityGaps();
  const { selectedIncident } = useAnalyticsIncidents();

  if (!selectedIncident) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">Entity Gaps & Statistics</CardTitle>
          <CardDescription>
            Select an incident to view entity gaps and statistics
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[calc(100%-120px)]">
          <p className="text-sm text-gray-500 text-center">
            No incident selected.<br />
            Choose an incident from the left panel to see detailed gap analysis.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Entity Gaps & Statistics</CardTitle>
            <CardDescription>
              Gap analysis and key metrics for {selectedIncident.name}
            </CardDescription>
          </div>
          <UpdateIndicator showDetails={false} />
        </div>
      </CardHeader>
      <CardContent className="h-[calc(100%-120px)] overflow-y-auto">
        <div className="space-y-4">
          <EntityGapsGrid
            entityGaps={entityGapsSummary?.entityGaps || []}
            isLoading={isLoadingEntityGaps}
          />
          
          {entityGapsSummary?.quickStatistics && (
            <QuickStatistics
              statistics={entityGapsSummary.quickStatistics}
              isLoading={isLoadingEntityGaps}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}