'use client';

import React from 'react';
import { Clock, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAnalyticsSummary } from '@/stores/analytics.store';

interface IncidentTimelineProps {
  className?: string;
}

export const IncidentTimeline: React.FC<IncidentTimelineProps> = ({ className = '' }) => {
  const { incidentSummary, isLoadingSummary } = useAnalyticsSummary();

  if (isLoadingSummary) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!incidentSummary) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-4 text-center text-gray-500">
          <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">Select an incident to view timeline</p>
        </CardContent>
      </Card>
    );
  }

  const { incident } = incidentSummary;
  const declarationDate = new Date(incident.declarationDate);
  const currentDate = new Date(incident.currentDate);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'CONTAINED':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'RESOLVED':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card className={`${className}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <Clock className="w-4 h-4" />
          <span>Incident Timeline</span>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-600">Declaration Date</span>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(declarationDate)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-600">Current Date</span>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(currentDate)}
              </p>
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600 uppercase tracking-wide">Status</span>
              <span className={`px-2 py-1 text-xs font-medium rounded-md border ${getStatusColor(incident.status)}`}>
                {incident.status}
              </span>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">Duration</div>
              <div className="text-lg font-bold text-gray-900">
                {incident.duration.formatted}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {incident.status.toLowerCase() === 'active' ? 'Active for' : 
                 incident.status.toLowerCase() === 'contained' ? 'Contained for' : 
                 'Resolved after'}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};