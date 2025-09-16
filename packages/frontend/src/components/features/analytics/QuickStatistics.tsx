'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SeverityIndicators } from './SeverityIndicators';

interface QuickStatistics {
  overallSeverity: {
    Health: 'red' | 'yellow' | 'green';
    WASH: 'red' | 'yellow' | 'green';
    Food: 'red' | 'yellow' | 'green';
    Shelter: 'red' | 'yellow' | 'green';
    Security: 'red' | 'yellow' | 'green';
  };
  totalCriticalGaps: number;
  totalModerateGaps: number;
  totalMinimalGaps: number;
}

interface QuickStatisticsProps {
  statistics: QuickStatistics;
  isLoading?: boolean;
}

export function QuickStatistics({ statistics, isLoading }: QuickStatisticsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 rounded w-12"></div>
                </div>
              ))}
            </div>
            <hr className="animate-pulse bg-gray-200" />
            <div className="animate-pulse">
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="text-center">
                    <div className="h-6 bg-gray-200 rounded mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-green-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-gray-800">Quick Statistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <h4 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Assessment Areas</h4>
          <SeverityIndicators overallSeverity={statistics.overallSeverity} />
        </div>
        
        <hr className="border-gray-300" />
        
        <div>
          <h4 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Gap Summary</h4>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-red-50 rounded-lg border border-red-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xl font-bold text-red-600">
                {statistics.totalCriticalGaps}
              </div>
              <div className="text-xs text-red-700 font-medium">Critical</div>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xl font-bold text-yellow-600">
                {statistics.totalModerateGaps}
              </div>
              <div className="text-xs text-yellow-700 font-medium">Moderate</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xl font-bold text-green-600">
                {statistics.totalMinimalGaps}
              </div>
              <div className="text-xs text-green-700 font-medium">Minimal</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}