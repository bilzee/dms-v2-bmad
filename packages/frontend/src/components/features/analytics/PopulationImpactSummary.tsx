'use client';

import React from 'react';
import { Users, Heart, Home, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAnalyticsSummary } from '@/stores/analytics.store';

interface PopulationImpactSummaryProps {
  className?: string;
}

interface ImpactMetricProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

const ImpactMetric: React.FC<ImpactMetricProps> = ({ icon, label, value, color }) => (
  <div className={`rounded-lg p-3 ${color}`}>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-xs font-medium text-gray-700">{label}</span>
    </div>
    <div className="text-lg font-bold text-gray-900">
      {value.toLocaleString()}
    </div>
  </div>
);

export const PopulationImpactSummary: React.FC<PopulationImpactSummaryProps> = ({ 
  className = '' 
}) => {
  const { incidentSummary, isLoadingSummary } = useAnalyticsSummary();

  if (isLoadingSummary) {
    return (
      <Card className={`${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Population Impact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="animate-pulse">
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-200 rounded-lg h-16"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!incidentSummary) {
    return (
      <Card className={`${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Population Impact</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">Select an incident to view impact data</p>
        </CardContent>
      </Card>
    );
  }

  const { populationImpact, aggregates } = incidentSummary;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Population Impact Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Population Impact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <ImpactMetric
              icon={<Heart className="w-4 h-4 text-red-600" />}
              label="Lives Lost"
              value={populationImpact.livesLost}
              color="bg-red-50 border border-red-100"
            />
            <ImpactMetric
              icon={<Heart className="w-4 h-4 text-orange-600" />}
              label="Injured"
              value={populationImpact.injured}
              color="bg-orange-50 border border-orange-100"
            />
            <ImpactMetric
              icon={<Users className="w-4 h-4 text-blue-600" />}
              label="Displaced"
              value={populationImpact.displaced}
              color="bg-blue-50 border border-blue-100"
            />
            <ImpactMetric
              icon={<Home className="w-4 h-4 text-purple-600" />}
              label="Houses Affected"
              value={populationImpact.housesAffected}
              color="bg-purple-50 border border-purple-100"
            />
          </div>
        </CardContent>
      </Card>

      {/* Aggregate Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Aggregate Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Affected Entities</span>
              <span className="font-semibold text-gray-900">{aggregates.affectedEntities}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Total Population</span>
              <span className="font-semibold text-gray-900">
                {aggregates.totalAffectedPopulation.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">Total Households</span>
              <span className="font-semibold text-gray-900">
                {aggregates.totalAffectedHouseholds.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-600 uppercase tracking-wide mb-2">
              Impact Summary
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-gray-600">Casualty Rate</div>
                <div className="font-medium text-gray-900">
                  {aggregates.totalAffectedPopulation > 0 
                    ? `${((populationImpact.livesLost + populationImpact.injured) / aggregates.totalAffectedPopulation * 100).toFixed(1)}%`
                    : '0%'
                  }
                </div>
              </div>
              <div>
                <div className="text-gray-600">Displacement Rate</div>
                <div className="font-medium text-gray-900">
                  {aggregates.totalAffectedPopulation > 0 
                    ? `${(populationImpact.displaced / aggregates.totalAffectedPopulation * 100).toFixed(1)}%`
                    : '0%'
                  }
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};