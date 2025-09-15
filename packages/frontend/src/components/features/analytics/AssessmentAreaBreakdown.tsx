'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GapAnalysisView } from './GapAnalysisView';
import { useAnalyticsStore } from '@/stores/analytics.store';

interface AssessmentData {
  timestamp: string;
  data: string[];
}

interface GapAnalysis {
  responseGap: boolean;
  unmetNeeds: number;
  responseTimestamp: string;
  gapSeverity: 'HIGH' | 'MEDIUM' | 'LOW';
  gapData: string[];
}

interface AssessmentArea {
  area: 'Health' | 'WASH' | 'Food' | 'Shelter' | 'Security';
  latestAssessment: AssessmentData;
  gapAnalysis: GapAnalysis;
}

interface AssessmentAreaBreakdownProps {
  selectedEntityId: string | null;
  selectedAreas?: string[];
  maxDisplayAreas?: number;
}

export function AssessmentAreaBreakdown({ 
  selectedEntityId, 
  selectedAreas,
  maxDisplayAreas 
}: AssessmentAreaBreakdownProps) {
  const { selectedIncident } = useAnalyticsStore();
  const [assessmentAreas, setAssessmentAreas] = useState<AssessmentArea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedIncident && selectedEntityId) {
      fetchAssessmentBreakdown();
    } else {
      setAssessmentAreas([]);
    }
  }, [selectedIncident, selectedEntityId, selectedAreas]);

  const fetchAssessmentBreakdown = async () => {
    if (!selectedIncident || !selectedEntityId) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        incidentId: selectedIncident.id,
        entityId: selectedEntityId,
      });

      if (selectedAreas && selectedAreas.length > 0) {
        params.append('assessmentAreas', selectedAreas.join(','));
      }

      const response = await fetch(`/api/v1/monitoring/analytics/assessments/breakdown?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch assessment breakdown');
      }

      let areas = data.data.assessmentAreas;
      
      // Apply max display limit if specified
      if (maxDisplayAreas && areas.length > maxDisplayAreas) {
        areas = areas.slice(0, maxDisplayAreas);
      }

      setAssessmentAreas(areas);
      
    } catch (error) {
      console.error('Failed to fetch assessment breakdown:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      setAssessmentAreas([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!selectedIncident || !selectedEntityId) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>Select an incident and entity to view assessment breakdown</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 py-8">
        <p>Error loading assessment data: {error}</p>
        <button 
          onClick={fetchAssessmentBreakdown}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-6 bg-gray-200 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-28"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (assessmentAreas.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>No assessment data available for the selected entity</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 mb-4">
        Showing {assessmentAreas.length} assessment area{assessmentAreas.length !== 1 ? 's' : ''}
        {maxDisplayAreas && assessmentAreas.length >= maxDisplayAreas && 
          ` (limited to ${maxDisplayAreas})`
        }
      </div>
      
      {assessmentAreas.map((area) => (
        <Card key={area.area} className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-800">
              {area.area}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Latest Assessment Column */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700 border-b pb-1">
                  Latest Assessment
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(area.latestAssessment.timestamp)}
                    </span>
                  </div>
                  {area.latestAssessment.data.length > 0 ? (
                    <ul className="text-sm text-gray-600 space-y-1">
                      {area.latestAssessment.data.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-gray-400 mt-1.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No assessment data available</p>
                  )}
                </div>
              </div>

              {/* Gap Analysis Column */}
              <div className="space-y-3 border-l border-gray-200 pl-4 lg:pl-6">
                <h4 className="font-medium text-gray-700 border-b pb-1">
                  Gap Analysis
                </h4>
                <GapAnalysisView gapAnalysis={area.gapAnalysis} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}