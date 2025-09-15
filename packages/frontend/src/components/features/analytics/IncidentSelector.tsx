'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAnalyticsIncidents, useAnalyticsRefresh } from '@/stores/analytics.store';

interface IncidentSelectorProps {
  className?: string;
}

export const IncidentSelector: React.FC<IncidentSelectorProps> = ({ className = '' }) => {
  const { 
    incidents, 
    selectedIncident, 
    isLoadingIncidents, 
    fetchIncidents, 
    setSelectedIncident 
  } = useAnalyticsIncidents();
  
  const { refreshData, isLoading, error } = useAnalyticsRefresh();

  useEffect(() => {
    if (incidents.length === 0 && !isLoadingIncidents) {
      fetchIncidents();
    }
  }, [incidents.length, isLoadingIncidents, fetchIncidents]);

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'ACTIVE': 'bg-red-100 text-red-800 border-red-200',
      'CONTAINED': 'bg-orange-100 text-orange-800 border-orange-200',
      'RESOLVED': 'bg-green-100 text-green-800 border-green-200',
    };
    
    const colorClass = statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800 border-gray-200';
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
        {status}
      </span>
    );
  };

  const handleIncidentChange = (incidentId: string) => {
    const incident = incidents.find(i => i.id === incidentId);
    setSelectedIncident(incident || null);
  };

  const handleRefresh = () => {
    refreshData();
  };

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Incident Selection
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isLoadingIncidents}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Select Active Incident
          </label>
          
          <Select
            value={selectedIncident?.id || ''}
            onValueChange={handleIncidentChange}
            disabled={isLoadingIncidents || incidents.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue 
                placeholder={
                  isLoadingIncidents 
                    ? "Loading incidents..." 
                    : incidents.length === 0
                    ? "No incidents available"
                    : "Select an incident"
                } 
              />
            </SelectTrigger>
            <SelectContent>
              {incidents.map((incident) => (
                <SelectItem key={incident.id} value={incident.id}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col gap-1 flex-1 mr-3">
                      <span className="font-medium text-sm">
                        {incident.name}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{incident.type}</span>
                        <span>•</span>
                        <span>{new Date(incident.declarationDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {getStatusBadge(incident.status)}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedIncident && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm text-blue-900">
                Selected Incident
              </h4>
              {getStatusBadge(selectedIncident.status)}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-blue-800 font-medium">
                {selectedIncident.name}
              </p>
              <div className="flex items-center gap-2 text-xs text-blue-700">
                <span>{selectedIncident.type}</span>
                <span>•</span>
                <span>
                  Declared: {new Date(selectedIncident.declarationDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 mt-4">
          {incidents.length > 0 && (
            <p>Showing {incidents.length} incident{incidents.length !== 1 ? 's' : ''}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};