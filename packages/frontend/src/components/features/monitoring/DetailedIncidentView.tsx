'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, AlertTriangle, Calendar, MapPin, Activity, TrendingUp, Download } from 'lucide-react';
import { HistoricalComparisonChart } from './HistoricalComparisonChart';

interface DrillDownIncidentData {
  id: string;
  name: string;
  type: string;
  severity: string;
  status: string;
  date: Date;
  assessmentCount: number;
  responseCount: number;
  affectedEntityCount: number;
  verificationProgress: {
    assessments: { pending: number; verified: number; rejected: number };
    responses: { pending: number; verified: number; rejected: number };
  };
  timelineData: { date: Date; assessments: number; responses: number }[];
}

interface DetailedIncidentViewProps {
  filters?: {
    incidentIds?: string[];
    types?: string[];
    severities?: string[];
    statuses?: string[];
    timeframe?: { start: string; end: string };
  };
  onDrillDown?: (incidentId: string) => void;
  onExport?: (exportType: string) => void;
}

export function DetailedIncidentView({
  filters = {},
  onDrillDown,
  onExport,
}: DetailedIncidentViewProps) {
  const [incidents, setIncidents] = useState<DrillDownIncidentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aggregations, setAggregations] = useState<any>({});
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchDetailedIncidents = async () => {
    try {
      const searchParams = new URLSearchParams();
      
      if (filters.incidentIds?.length) {
        searchParams.append('incidentIds', filters.incidentIds.join(','));
      }
      if (filters.types?.length) {
        searchParams.append('types', filters.types.join(','));
      }
      if (filters.severities?.length) {
        searchParams.append('severities', filters.severities.join(','));
      }
      if (filters.statuses?.length) {
        searchParams.append('statuses', filters.statuses.join(','));
      }
      if (filters.timeframe) {
        searchParams.append('timeframeStart', filters.timeframe.start);
        searchParams.append('timeframeEnd', filters.timeframe.end);
      }
      searchParams.append('page', currentPage.toString());
      
      const response = await fetch(`/api/v1/monitoring/drill-down/incidents?${searchParams}`);
      const data = await response.json();
      
      if (data.success) {
        setIncidents(data.data.map((incident: any) => ({
          ...incident,
          date: new Date(incident.date),
          timelineData: incident.timelineData.map((item: any) => ({
            ...item,
            date: new Date(item.date),
          })),
        })));
        setAggregations(data.meta.aggregations);
        setTotalRecords(data.meta.totalRecords);
        setTotalPages(data.meta.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch detailed incidents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetailedIncidents();
  }, [filters, currentPage]);

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

  const calculateVerificationRate = (progress: any) => {
    const totalAssessments = progress.assessments.pending + progress.assessments.verified + progress.assessments.rejected;
    const totalResponses = progress.responses.pending + progress.responses.verified + progress.responses.rejected;
    
    if (totalAssessments === 0 && totalResponses === 0) return 0;
    
    const verifiedItems = progress.assessments.verified + progress.responses.verified;
    const totalItems = totalAssessments + totalResponses;
    
    return Math.round((verifiedItems / totalItems) * 100);
  };

  const formatIncidentType = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Detailed Incident View</CardTitle>
          <CardDescription>Loading detailed incident data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Detailed Incident View
              </CardTitle>
              <CardDescription>
                Comprehensive incident analysis with historical trends and verification progress
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onExport?.('incidents')}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={fetchDetailedIncidents}>
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-6">
            {/* Active Filters Display */}
            {Object.keys(filters).some(key => {
              const value = filters[key as keyof typeof filters];
              return Array.isArray(value) ? value.length > 0 : value;
            }) && (
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h4 className="font-medium text-sm text-orange-800 mb-2">Active Filters Applied:</h4>
                <div className="flex flex-wrap gap-2">
                  {filters.incidentIds?.map(id => (
                    <Badge key={id} variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                      Incident: {id}
                    </Badge>
                  ))}
                  {filters.types?.map(type => (
                    <Badge key={type} variant="secondary" className="text-xs bg-red-100 text-red-800">
                      Type: {type}
                    </Badge>
                  ))}
                  {filters.severities?.map(severity => (
                    <Badge key={severity} variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                      Severity: {severity}
                    </Badge>
                  ))}
                  {filters.statuses?.map(status => (
                    <Badge key={status} variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                      Status: {status}
                    </Badge>
                  ))}
                  {filters.timeframe && (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                      Date Range: {new Date(filters.timeframe.start).toLocaleDateString()} - {new Date(filters.timeframe.end).toLocaleDateString()}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Summary Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 border rounded-lg bg-blue-50">
                <div className="text-2xl font-bold text-blue-600">{totalRecords}</div>
                <div className="text-sm font-medium">Total Incidents</div>
              </div>
              <div className="text-center p-3 border rounded-lg bg-red-50">
                <div className="text-2xl font-bold text-red-600">
                  {aggregations.byStatus?.ACTIVE || 0}
                </div>
                <div className="text-sm font-medium">Active</div>
              </div>
              <div className="text-center p-3 border rounded-lg bg-orange-50">
                <div className="text-2xl font-bold text-orange-600">
                  {aggregations.bySeverity?.CATASTROPHIC || 0}
                </div>
                <div className="text-sm font-medium">Critical</div>
              </div>
              <div className="text-center p-3 border rounded-lg bg-green-50">
                <div className="text-2xl font-bold text-green-600">
                  {aggregations.totalAssessments || 0}
                </div>
                <div className="text-sm font-medium">Assessments</div>
              </div>
            </div>

            {/* Incident Cards */}
            <div className="space-y-4">
              {incidents.map((incident) => (
                <Card key={incident.id} className="border-l-4 border-l-orange-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{incident.name}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {formatIncidentType(incident.type)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(incident.status)}>
                          {incident.status}
                        </Badge>
                        <Badge variant={getSeverityBadgeVariant(incident.severity)} className="text-xs">
                          {incident.severity}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Basic Info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Started:</span>
                          <span className="font-medium">{incident.date.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Assessments:</span>
                          <span className="font-medium">{incident.assessmentCount}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Responses:</span>
                          <span className="font-medium">{incident.responseCount}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Entities:</span>
                          <span className="font-medium">{incident.affectedEntityCount}</span>
                        </div>
                      </div>
                      
                      {/* Verification Progress */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">Verification Progress</h4>
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-muted-foreground">Assessments</span>
                              <span className="text-xs font-medium">
                                {incident.verificationProgress.assessments.verified} / {
                                  incident.verificationProgress.assessments.pending + 
                                  incident.verificationProgress.assessments.verified + 
                                  incident.verificationProgress.assessments.rejected
                                }
                              </span>
                            </div>
                            <Progress 
                              value={calculateVerificationRate({ assessments: incident.verificationProgress.assessments, responses: { pending: 0, verified: 0, rejected: 0 } })} 
                              className="h-2" 
                            />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-muted-foreground">Responses</span>
                              <span className="text-xs font-medium">
                                {incident.verificationProgress.responses.verified} / {
                                  incident.verificationProgress.responses.pending + 
                                  incident.verificationProgress.responses.verified + 
                                  incident.verificationProgress.responses.rejected
                                }
                              </span>
                            </div>
                            <Progress 
                              value={calculateVerificationRate({ assessments: { pending: 0, verified: 0, rejected: 0 }, responses: incident.verificationProgress.responses })} 
                              className="h-2" 
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Overall Verification Rate */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">Overall Rate</h4>
                        <div className="text-center p-3 border rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {calculateVerificationRate(incident.verificationProgress)}%
                          </div>
                          <div className="text-xs text-muted-foreground">Verified</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="text-xs text-muted-foreground">
                        Last updated: {new Date().toLocaleTimeString()}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onDrillDown?.(incident.id)}
                      >
                        View Timeline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {incidents.length === 0 && !isLoading && (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  No incidents found matching current filters
                </p>
              </div>
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages} ({totalRecords} total)
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Historical Comparison Chart */}
      {incidents.length > 0 && (
        <HistoricalComparisonChart 
          dataType="incidents"
          timeRange="3m"
          onMetricSelect={(metric) => console.log('Selected metric:', metric)}
        />
      )}
    </div>
  );
}