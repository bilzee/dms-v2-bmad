'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, MapPin, Activity, Calendar, CheckCircle, Clock, AlertTriangle, Download, Building } from 'lucide-react';

interface DrillDownEntityData {
  id: string;
  name: string;
  type: 'CAMP' | 'COMMUNITY';
  lga: string;
  ward: string;
  longitude: number;
  latitude: number;
  assessmentHistory: Array<{
    id: string;
    type: string;
    date: Date;
    verificationStatus: string;
  }>;
  responseHistory: Array<{
    id: string;
    responseType: string;
    status: string;
    plannedDate: Date;
    deliveredDate?: Date;
  }>;
  incidentAssociations: Array<{
    id: string;
    name: string;
    type: string;
    severity: string;
    status: string;
  }>;
  activitySummary: {
    totalAssessments: number;
    verifiedAssessments: number;
    totalResponses: number;
    completedResponses: number;
    lastActivity: Date;
  };
}

interface DetailedEntityViewProps {
  filters?: {
    entityIds?: string[];
    entityTypes?: string[];
    lgas?: string[];
    incidentIds?: string[];
    activitySince?: string;
  };
  onDrillDown?: (entityId: string) => void;
  onExport?: (exportType: string) => void;
}

export function DetailedEntityView({
  filters = {},
  onDrillDown,
  onExport,
}: DetailedEntityViewProps) {
  const [entities, setEntities] = useState<DrillDownEntityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aggregations, setAggregations] = useState<any>({});
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [incidents, setIncidents] = useState<{ id: string; name: string }[]>([]);

  const fetchFilterOptions = async () => {
    try {
      // Fetch incidents
      const incidentsResponse = await fetch('/api/v1/incidents');
      if (incidentsResponse.ok) {
        const incidentsData = await incidentsResponse.json();
        if (incidentsData.success && incidentsData.data.incidents) {
          setIncidents(incidentsData.data.incidents.map((incident: any) => ({
            id: incident.id,
            name: incident.name
          })));
        }
      }
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
    }
  };

  const fetchDetailedEntities = async () => {
    try {
      const searchParams = new URLSearchParams();
      
      if (filters.entityIds?.length) {
        searchParams.append('entityIds', filters.entityIds.join(','));
      }
      if (filters.entityTypes?.length) {
        searchParams.append('entityTypes', filters.entityTypes.join(','));
      }
      if (filters.lgas?.length) {
        searchParams.append('lgas', filters.lgas.join(','));
      }
      if (filters.incidentIds?.length) {
        searchParams.append('incidentIds', filters.incidentIds.join(','));
      }
      if (filters.activitySince) {
        searchParams.append('activitySince', filters.activitySince);
      }
      searchParams.append('page', currentPage.toString());
      
      const response = await fetch(`/api/v1/monitoring/drill-down/entities?${searchParams}`);
      const data = await response.json();
      
      if (data.success) {
        setEntities(data.data.map((entity: any) => ({
          ...entity,
          assessmentHistory: entity.assessmentHistory.map((item: any) => ({
            ...item,
            date: new Date(item.date),
          })),
          responseHistory: entity.responseHistory.map((item: any) => ({
            ...item,
            plannedDate: new Date(item.plannedDate),
            deliveredDate: item.deliveredDate ? new Date(item.deliveredDate) : undefined,
          })),
          activitySummary: {
            ...entity.activitySummary,
            lastActivity: new Date(entity.activitySummary.lastActivity),
          },
        })));
        setAggregations(data.meta.aggregations);
        setTotalRecords(data.meta.totalRecords);
        setTotalPages(data.meta.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch detailed entities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
    fetchDetailedEntities();
  }, [filters, currentPage]);

  const getIncidentNameById = (id: string) => {
    const incident = incidents.find(inc => inc.id === id);
    return incident?.name || id;
  };

  const getVerificationRate = (entity: DrillDownEntityData) => {
    if (entity.activitySummary.totalAssessments === 0) return 0;
    return Math.round((entity.activitySummary.verifiedAssessments / entity.activitySummary.totalAssessments) * 100);
  };

  const getResponseRate = (entity: DrillDownEntityData) => {
    if (entity.activitySummary.totalResponses === 0) return 0;
    return Math.round((entity.activitySummary.completedResponses / entity.activitySummary.totalResponses) * 100);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED': return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'PENDING': return <Clock className="h-3 w-3 text-yellow-600" />;
      case 'COMPLETED': return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'IN_PROGRESS': return <Activity className="h-3 w-3 text-blue-600" />;
      default: return <Clock className="h-3 w-3 text-gray-600" />;
    }
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
          <CardTitle>Detailed Entity View</CardTitle>
          <CardDescription>Loading detailed entity data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
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
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Detailed Entity View
            </CardTitle>
            <CardDescription>
              Comprehensive entity analysis with activity history and performance metrics
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onExport?.('entities')}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={fetchDetailedEntities}>
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
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h4 className="font-medium text-sm text-purple-800 mb-2">Active Filters Applied:</h4>
              <div className="flex flex-wrap gap-2">
                {filters.entityIds?.map(id => (
                  <Badge key={id} variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                    Entity: {id}
                  </Badge>
                ))}
                {filters.entityTypes?.map(type => (
                  <Badge key={type} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                    Type: {type}
                  </Badge>
                ))}
                {filters.lgas?.map(lga => (
                  <Badge key={lga} variant="secondary" className="text-xs bg-green-100 text-green-800">
                    LGA: {lga}
                  </Badge>
                ))}
                {filters.incidentIds?.map(id => (
                  <Badge key={id} variant="secondary" className="text-xs bg-red-100 text-red-800">
                    Incident: {getIncidentNameById(id)}
                  </Badge>
                ))}
                {filters.activitySince && (
                  <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                    Activity Since: {new Date(filters.activitySince).toLocaleDateString()}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Summary Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 border rounded-lg bg-blue-50">
              <div className="text-2xl font-bold text-blue-600">{totalRecords}</div>
              <div className="text-sm font-medium">Total Entities</div>
            </div>
            <div className="text-center p-3 border rounded-lg bg-green-50">
              <div className="text-2xl font-bold text-green-600">
                {aggregations.byType?.CAMP || 0}
              </div>
              <div className="text-sm font-medium">Camps</div>
            </div>
            <div className="text-center p-3 border rounded-lg bg-purple-50">
              <div className="text-2xl font-bold text-purple-600">
                {aggregations.byType?.COMMUNITY || 0}
              </div>
              <div className="text-sm font-medium">Communities</div>
            </div>
            <div className="text-center p-3 border rounded-lg bg-orange-50">
              <div className="text-2xl font-bold text-orange-600">
                {aggregations.activitySummary?.averageVerificationRate || 0}%
              </div>
              <div className="text-sm font-medium">Avg Verification</div>
            </div>
          </div>

          {/* Entity Cards */}
          <div className="space-y-4">
            {entities.map((entity) => (
              <Card key={entity.id} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{entity.name}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {entity.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {entity.lga}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {entity.ward}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Activity Summary */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Activity Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Assessments:</span>
                          <span className="font-semibold">{entity.activitySummary.totalAssessments}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Verified:</span>
                          <span className="font-semibold">{entity.activitySummary.verifiedAssessments}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Responses:</span>
                          <span className="font-semibold">{entity.activitySummary.totalResponses}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Completed:</span>
                          <span className="font-semibold">{entity.activitySummary.completedResponses}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Activity:</span>
                          <span className="font-semibold">{formatTimeSince(entity.activitySummary.lastActivity)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Performance Metrics */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Performance</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-muted-foreground">Verification Rate</span>
                            <span className="text-xs font-medium">{getVerificationRate(entity)}%</span>
                          </div>
                          <Progress value={getVerificationRate(entity)} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-muted-foreground">Response Rate</span>
                            <span className="text-xs font-medium">{getResponseRate(entity)}%</span>
                          </div>
                          <Progress value={getResponseRate(entity)} className="h-2" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Location Info */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Location</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Coordinates:</span>
                        </div>
                        <div className="text-xs text-muted-foreground ml-6">
                          {entity.latitude.toFixed(4)}, {entity.longitude.toFixed(4)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Administrative:</span>
                        </div>
                        <div className="text-xs text-muted-foreground ml-6">
                          {entity.lga} / {entity.ward}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Recent Assessment History */}
                  {entity.assessmentHistory.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Recent Assessments</h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {entity.assessmentHistory.slice(0, 5).map((assessment) => (
                          <div key={assessment.id} className="flex items-center justify-between p-2 border rounded text-sm">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(assessment.verificationStatus)}
                              <span>{assessment.type}</span>
                              <span className="text-muted-foreground text-xs">
                                {assessment.date.toLocaleDateString()}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {assessment.verificationStatus}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Recent Response History */}
                  {entity.responseHistory.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Recent Responses</h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {entity.responseHistory.slice(0, 5).map((response) => (
                          <div key={response.id} className="flex items-center justify-between p-2 border rounded text-sm">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(response.status)}
                              <span>{response.responseType}</span>
                              <span className="text-muted-foreground text-xs">
                                {response.plannedDate.toLocaleDateString()}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {response.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Incident Associations */}
                  {entity.incidentAssociations.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Associated Incidents</h4>
                      <div className="flex flex-wrap gap-2">
                        {entity.incidentAssociations.map((incident) => (
                          <Badge 
                            key={incident.id} 
                            variant={incident.status === 'ACTIVE' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {incident.name} ({incident.severity})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Incidents: {entity.incidentAssociations.length}</span>
                      <span>Last activity: {formatTimeSince(entity.activitySummary.lastActivity)}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onDrillDown?.(entity.id)}
                    >
                      View History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {entities.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                No entities found matching current filters
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
  );
}