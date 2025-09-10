'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Incident {
  id: string;
  name: string;
  type: string;
  severity: 'MINOR' | 'MODERATE' | 'SEVERE' | 'CATASTROPHIC';
  status: 'ACTIVE' | 'CONTAINED' | 'RESOLVED';
  date: string;
  preliminaryAssessmentIds: string[];
  source?: string;
  createdAt: string;
  updatedAt: string;
}

interface IncidentReviewQueueProps {
  coordinatorId: string;
  coordinatorName: string;
}

const SeverityBadge: React.FC<{ severity: Incident['severity'] }> = ({ severity }) => {
  const variants = {
    MINOR: 'bg-green-100 text-green-800 border-green-200',
    MODERATE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    SEVERE: 'bg-orange-100 text-orange-800 border-orange-200',
    CATASTROPHIC: 'bg-red-100 text-red-800 border-red-200'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[severity]}`}>
      {severity}
    </span>
  );
};

const StatusBadge: React.FC<{ status: Incident['status'] }> = ({ status }) => {
  const variants = {
    ACTIVE: 'bg-red-100 text-red-800 border-red-200',
    CONTAINED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    RESOLVED: 'bg-green-100 text-green-800 border-green-200'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[status]}`}>
      {status}
    </span>
  );
};

export const IncidentReviewQueue: React.FC<IncidentReviewQueueProps> = ({
  coordinatorId,
  coordinatorName,
}) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'severity' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      
      // Build query parameters for filtering
      const params = new URLSearchParams({
        status: 'ACTIVE', // Only show active incidents in review queue
        sortBy: 'date',
        sortOrder: 'desc',
        pageSize: '50' // Get more incidents for the queue
      });
      
      const response = await fetch(`/api/v1/incidents?${params}`);
      const data = await response.json();
      
      if (data.success && data.data?.incidents) {
        // Map API response to component's expected format
        const apiIncidents = data.data.incidents.map((incident: any) => ({
          id: incident.id,
          name: incident.name,
          type: incident.type,
          severity: incident.severity,
          status: incident.status,
          date: incident.date,
          preliminaryAssessmentIds: incident.preliminaryAssessmentIds || [],
          source: incident.source || 'Unknown Source',
          createdAt: incident.createdAt,
          updatedAt: incident.updatedAt,
        }));
        
        setIncidents(apiIncidents);
      } else {
        console.warn('Invalid response format or no incidents found');
        setIncidents([]);
      }
    } catch (error) {
      console.error('Failed to load incidents:', error);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedIncidents = incidents
    .filter(incident => {
      if (filterType && incident.type !== filterType) return false;
      if (filterSeverity && incident.severity !== filterSeverity) return false;
      return true;
    })
    .sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'severity':
          const severityOrder = { CATASTROPHIC: 4, SEVERE: 3, MODERATE: 2, MINOR: 1 };
          aValue = severityOrder[a.severity];
          bValue = severityOrder[b.severity];
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleAssignToSelf = async (incidentId: string) => {
    try {
      // TODO: Implement assignment API call
      // await fetch(`/api/v1/incidents/${incidentId}/assign`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ coordinatorId, coordinatorName }),
      // });
      
      console.log(`Incident ${incidentId} assigned to ${coordinatorName}`);
      await loadIncidents(); // Refresh the list
    } catch (error) {
      console.error('Failed to assign incident:', error);
    }
  };

  const handleViewDetails = (incidentId: string) => {
    // TODO: Navigate to incident details page
    console.log(`Viewing details for incident ${incidentId}`);
  };

  const handleMarkAsContained = async (incidentId: string) => {
    try {
      // TODO: Implement status update API call
      // await fetch(`/api/v1/incidents/${incidentId}/status`, {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ status: 'CONTAINED', updatedBy: coordinatorId }),
      // });
      
      console.log(`Incident ${incidentId} marked as contained`);
      await loadIncidents(); // Refresh the list
    } catch (error) {
      console.error('Failed to update incident status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading incident review queue...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Incident Review Queue</h1>
        <p className="text-sm text-gray-600 mt-2">
          Review and coordinate response for incidents created from preliminary assessments
        </p>
      </div>

      {/* Filters and Sort */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">All Types</option>
              <option value="FLOOD">Flood</option>
              <option value="FIRE">Fire</option>
              <option value="LANDSLIDE">Landslide</option>
              <option value="CYCLONE">Cyclone</option>
              <option value="CONFLICT">Conflict</option>
              <option value="EPIDEMIC">Epidemic</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Severity
            </label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">All Severities</option>
              <option value="CATASTROPHIC">Catastrophic</option>
              <option value="SEVERE">Severe</option>
              <option value="MODERATE">Moderate</option>
              <option value="MINOR">Minor</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full p-2 border rounded-md"
            >
              <option value="date">Date Created</option>
              <option value="severity">Severity</option>
              <option value="type">Type</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-full p-2 border rounded-md"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Incident List */}
      {filteredAndSortedIncidents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No incidents in the review queue.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedIncidents.map((incident) => (
            <div
              key={incident.id}
              className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {incident.name}
                    </h3>
                    <SeverityBadge severity={incident.severity} />
                    <StatusBadge status={incident.status} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                    <div>
                      <span className="font-medium">Type:</span> {incident.type}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>{' '}
                      {new Date(incident.createdAt).toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Source:</span> {incident.source || 'Unknown'}
                    </div>
                    <div>
                      <span className="font-medium">Assessments:</span>{' '}
                      {incident.preliminaryAssessmentIds.length} preliminary
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    onClick={() => handleViewDetails(incident.id)}
                    variant="outline"
                    size="sm"
                  >
                    View Details
                  </Button>
                  <Button
                    onClick={() => handleAssignToSelf(incident.id)}
                    size="sm"
                  >
                    Assign to Me
                  </Button>
                  <Button
                    onClick={() => handleMarkAsContained(incident.id)}
                    variant="outline"
                    size="sm"
                  >
                    Mark Contained
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Queue Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-blue-700">Total Incidents:</span>{' '}
            <span className="font-medium">{filteredAndSortedIncidents.length}</span>
          </div>
          <div>
            <span className="text-blue-700">High Priority:</span>{' '}
            <span className="font-medium">
              {filteredAndSortedIncidents.filter(i => i.severity === 'CATASTROPHIC' || i.severity === 'SEVERE').length}
            </span>
          </div>
          <div>
            <span className="text-blue-700">Active:</span>{' '}
            <span className="font-medium">
              {filteredAndSortedIncidents.filter(i => i.status === 'ACTIVE').length}
            </span>
          </div>
          <div>
            <span className="text-blue-700">Unassigned:</span>{' '}
            <span className="font-medium">{filteredAndSortedIncidents.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};