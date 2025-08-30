'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, AlertTriangle, CheckCircle, Clock, MapPin, Filter, SortAsc } from 'lucide-react';

interface IncidentSummary {
  id: string;
  name: string;
  type: 'FLOOD' | 'FIRE' | 'LANDSLIDE' | 'CYCLONE' | 'CONFLICT' | 'EPIDEMIC' | 'OTHER';
  severity: 'MINOR' | 'MODERATE' | 'SEVERE' | 'CATASTROPHIC';
  status: 'ACTIVE' | 'CONTAINED' | 'RESOLVED';
  date: Date;
  assessmentCount: number;
  responseCount: number;
  gapScore: number; // 0-100 percentage of needs fulfilled
  lastUpdate: Date;
}

interface IncidentOverviewGridProps {
  refreshInterval?: number;
  showFilters?: boolean;
  statusFilter?: 'ACTIVE' | 'CONTAINED' | 'RESOLVED' | null;
  severityFilter?: 'MINOR' | 'MODERATE' | 'SEVERE' | 'CATASTROPHIC' | null;
  sortBy?: 'date' | 'severity' | 'gapScore' | 'assessmentCount';
  sortOrder?: 'asc' | 'desc';
}

export function IncidentOverviewGrid({
  refreshInterval = 25000,
  showFilters = true,
  statusFilter = null,
  severityFilter = null,
  sortBy = 'date',
  sortOrder = 'desc'
}: IncidentOverviewGridProps) {
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [totalActive, setTotalActive] = useState(0);
  const [totalContained, setTotalContained] = useState(0);
  const [totalResolved, setTotalResolved] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);

  const fetchIncidents = async () => {
    try {
      const searchParams = new URLSearchParams();
      if (statusFilter) searchParams.append('status', statusFilter);
      if (severityFilter) searchParams.append('severity', severityFilter);
      searchParams.append('sortBy', sortBy);
      searchParams.append('sortOrder', sortOrder);
      
      const response = await fetch(`/api/v1/monitoring/situation/incidents?${searchParams}`);
      const data = await response.json();
      
      if (data.success) {
        setIncidents(data.data.map((incident: any) => ({
          ...incident,
          date: new Date(incident.date),
          lastUpdate: new Date(incident.lastUpdate),
        })));
        setTotalActive(data.meta.totalActive);
        setTotalContained(data.meta.totalContained);
        setTotalResolved(data.meta.totalResolved);
        setCriticalCount(data.meta.criticalCount);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch incidents overview:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    
    const interval = setInterval(fetchIncidents, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, statusFilter, severityFilter, sortBy, sortOrder]);

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'CATASTROPHIC': return 'destructive';
      case 'SEVERE': return 'destructive';
      case 'MODERATE': return 'secondary';
      case 'MINOR': return 'default';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'destructive';
      case 'CONTAINED': return 'secondary';
      case 'RESOLVED': return 'default';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <AlertTriangle className="h-3 w-3" />;
      case 'CONTAINED': return <Clock className="h-3 w-3" />;
      case 'RESOLVED': return <CheckCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const getGapScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatIncidentType = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase();
  };

  const formatTimeSince = (date: Date) => {
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Less than 1h';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Multi-Incident Overview
          </CardTitle>
          <CardDescription>Loading incident overview with priority indicators...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse border rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-2 bg-gray-100 rounded mb-2"></div>
                <div className="h-2 bg-gray-100 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            <CardTitle>Multi-Incident Overview</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {showFilters && (
              <>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-1" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <SortAsc className="h-4 w-4 mr-1" />
                  Sort
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={fetchIncidents} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        <CardDescription>
          Active incidents with priority indicators and status progression
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 border rounded-lg bg-red-50">
              <div className="text-2xl font-bold text-red-600">{totalActive}</div>
              <div className="text-sm font-medium">Active</div>
              <div className="text-xs text-muted-foreground">Ongoing incidents</div>
            </div>
            <div className="text-center p-3 border rounded-lg bg-yellow-50">
              <div className="text-2xl font-bold text-yellow-600">{totalContained}</div>
              <div className="text-sm font-medium">Contained</div>
              <div className="text-xs text-muted-foreground">Under control</div>
            </div>
            <div className="text-center p-3 border rounded-lg bg-green-50">
              <div className="text-2xl font-bold text-green-600">{totalResolved}</div>
              <div className="text-sm font-medium">Resolved</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="text-center p-3 border rounded-lg bg-orange-50">
              <div className="text-2xl font-bold text-orange-600">{criticalCount}</div>
              <div className="text-sm font-medium">Critical</div>
              <div className="text-xs text-muted-foreground">High priority</div>
            </div>
          </div>

          {/* Incident Cards Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {incidents.map((incident) => (
              <Card key={incident.id} className="border-l-4 border-l-red-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{incident.name}</CardTitle>
                    <Badge variant={getStatusBadgeVariant(incident.status)} className="flex items-center gap-1">
                      {getStatusIcon(incident.status)}
                      {incident.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {formatIncidentType(incident.type)}
                    </Badge>
                    <Badge variant={getSeverityBadgeVariant(incident.severity)} className="text-xs">
                      {incident.severity}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Assessments:</span>
                      <div className="font-semibold">{incident.assessmentCount}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Responses:</span>
                      <div className="font-semibold">{incident.responseCount}</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Gap Coverage</span>
                      <span className={`text-sm font-bold ${getGapScoreColor(incident.gapScore)}`}>
                        {incident.gapScore}%
                      </span>
                    </div>
                    <Progress value={incident.gapScore} className="h-2" />
                  </div>
                  
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Started: {incident.date.toLocaleDateString()}</div>
                    <div>Last update: {formatTimeSince(incident.lastUpdate)}</div>
                  </div>

                  {incident.severity === 'CATASTROPHIC' && incident.status === 'ACTIVE' && (
                    <div className="flex items-center gap-2 p-2 bg-red-50 rounded border border-red-200">
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                      <span className="text-xs text-red-700">Requires immediate attention</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {incidents.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                No incidents found matching current filters
              </p>
            </div>
          )}

          {/* Footer Information */}
          <div className="border-t pt-3 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
              <span>Showing {incidents.length} incidents • Auto-refresh every {refreshInterval / 1000}s</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}