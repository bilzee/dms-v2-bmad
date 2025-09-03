'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, MapPin, User, Calendar, CheckCircle, Clock, AlertCircle, FileText, Download } from 'lucide-react';

interface DrillDownAssessmentData {
  id: string;
  type: string;
  date: Date;
  assessorName: string;
  verificationStatus: string;
  entityName: string;
  entityType: 'CAMP' | 'COMMUNITY';
  coordinates: { latitude: number; longitude: number };
  incidentName?: string;
  dataDetails: Record<string, any>;
  mediaCount: number;
  syncStatus: string;
}

interface DetailedAssessmentViewProps {
  filters?: {
    incidentIds?: string[];
    entityIds?: string[];
    timeframe?: { start: string; end: string };
    assessmentTypes?: string[];
    verificationStatus?: string[];
  };
  onDrillDown?: (assessmentId: string) => void;
  onExport?: (exportType: string) => void;
}

export function DetailedAssessmentView({
  filters = {},
  onDrillDown,
  onExport,
}: DetailedAssessmentViewProps) {
  const [assessments, setAssessments] = useState<DrillDownAssessmentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aggregations, setAggregations] = useState<any>({});
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchDetailedAssessments = async () => {
    try {
      const searchParams = new URLSearchParams();
      
      if (filters.incidentIds?.length) {
        searchParams.append('incidentIds', filters.incidentIds.join(','));
      }
      if (filters.entityIds?.length) {
        searchParams.append('entityIds', filters.entityIds.join(','));
      }
      if (filters.assessmentTypes?.length) {
        searchParams.append('assessmentTypes', filters.assessmentTypes.join(','));
      }
      if (filters.verificationStatus?.length) {
        searchParams.append('verificationStatus', filters.verificationStatus.join(','));
      }
      if (filters.timeframe) {
        searchParams.append('timeframeStart', filters.timeframe.start);
        searchParams.append('timeframeEnd', filters.timeframe.end);
      }
      searchParams.append('page', currentPage.toString());
      
      const response = await fetch(`/api/v1/monitoring/drill-down/assessments?${searchParams}`);
      const data = await response.json();
      
      if (data.success) {
        setAssessments(data.data.map((assessment: any) => ({
          ...assessment,
          date: new Date(assessment.date),
        })));
        setAggregations(data.meta.aggregations);
        setTotalRecords(data.meta.totalRecords);
        setTotalPages(data.meta.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch detailed assessments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetailedAssessments();
  }, [filters, currentPage]);

  const getVerificationBadgeVariant = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'default';
      case 'AUTO_VERIFIED': return 'secondary';
      case 'PENDING': return 'outline';
      case 'REJECTED': return 'destructive';
      default: return 'outline';
    }
  };

  const getSyncStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'SYNCED': return 'default';
      case 'SYNCING': return 'secondary';
      case 'PENDING': return 'outline';
      case 'CONFLICT': return 'destructive';
      case 'FAILED': return 'destructive';
      default: return 'outline';
    }
  };

  const formatAssessmentType = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase();
  };

  const renderDataDetails = (details: Record<string, any>, type: string) => {
    if (type === 'SHELTER' && details.shelterCount) {
      return (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Shelters:</span>
            <div className="font-semibold">{details.shelterCount}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Condition:</span>
            <div className="font-semibold">{details.shelterCondition}</div>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Occupancy Rate:</span>
            <div className="mt-1">
              <Progress value={details.occupancyRate} className="h-2" />
              <span className="text-xs text-muted-foreground">{Math.round(details.occupancyRate)}%</span>
            </div>
          </div>
        </div>
      );
    }
    
    if (type === 'HEALTHCARE' && details.facilitiesOperational) {
      return (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Facilities:</span>
            <div className="font-semibold">{details.facilitiesOperational}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Staff:</span>
            <div className="font-semibold">{details.staffPresent}</div>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Medical Supplies:</span>
            <Badge variant={details.medicalSupplies === 'ADEQUATE' ? 'default' : 'destructive'} className="ml-2">
              {details.medicalSupplies}
            </Badge>
          </div>
        </div>
      );
    }
    
    if (type === 'WASH' && details.waterSources) {
      return (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Water Sources:</span>
            <div className="font-semibold">{details.waterSources}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Sanitation:</span>
            <div className="font-semibold">{details.sanitationFacilities}</div>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Hygiene Supplies:</span>
            <Badge variant={details.hygieneSupplies === 'ADEQUATE' ? 'default' : 'destructive'} className="ml-2">
              {details.hygieneSupplies}
            </Badge>
          </div>
        </div>
      );
    }
    
    return (
      <div className="text-sm text-muted-foreground">
        Assessment details available for review
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Detailed Assessment View</CardTitle>
          <CardDescription>Loading detailed assessment data...</CardDescription>
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
              <FileText className="h-5 w-5" />
              Detailed Assessment View
            </CardTitle>
            <CardDescription>
              Comprehensive assessment data with filtering and drill-down capabilities
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onExport?.('assessments')}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={fetchDetailedAssessments}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Summary Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 border rounded-lg bg-blue-50">
              <div className="text-2xl font-bold text-blue-600">{totalRecords}</div>
              <div className="text-sm font-medium">Total Assessments</div>
            </div>
            <div className="text-center p-3 border rounded-lg bg-green-50">
              <div className="text-2xl font-bold text-green-600">
                {aggregations.byStatus?.VERIFIED || 0}
              </div>
              <div className="text-sm font-medium">Verified</div>
            </div>
            <div className="text-center p-3 border rounded-lg bg-yellow-50">
              <div className="text-2xl font-bold text-yellow-600">
                {aggregations.byStatus?.PENDING || 0}
              </div>
              <div className="text-sm font-medium">Pending</div>
            </div>
            <div className="text-center p-3 border rounded-lg bg-red-50">
              <div className="text-2xl font-bold text-red-600">
                {aggregations.byStatus?.REJECTED || 0}
              </div>
              <div className="text-sm font-medium">Rejected</div>
            </div>
          </div>

          {/* Assessment Cards */}
          <div className="space-y-4">
            {assessments.map((assessment) => (
              <Card key={assessment.id} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{assessment.id}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {formatAssessmentType(assessment.type)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getVerificationBadgeVariant(assessment.verificationStatus)}>
                        {assessment.verificationStatus === 'VERIFIED' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {assessment.verificationStatus === 'PENDING' && <Clock className="h-3 w-3 mr-1" />}
                        {assessment.verificationStatus === 'REJECTED' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {assessment.verificationStatus}
                      </Badge>
                      <Badge variant={getSyncStatusBadgeVariant(assessment.syncStatus)} className="text-xs">
                        {assessment.syncStatus}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Assessor:</span>
                        <span className="font-medium">{assessment.assessorName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Date:</span>
                        <span className="font-medium">{assessment.date.toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-medium">{assessment.entityName}</span>
                        <Badge variant="outline" className="text-xs">{assessment.entityType}</Badge>
                      </div>
                      {assessment.incidentName && (
                        <div className="flex items-center gap-2 text-sm">
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Incident:</span>
                          <span className="font-medium">{assessment.incidentName}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Assessment Details</h4>
                      {renderDataDetails(assessment.dataDetails, assessment.type)}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Media attachments: {assessment.mediaCount}</span>
                      <span>Coordinates: {assessment.coordinates.latitude.toFixed(4)}, {assessment.coordinates.longitude.toFixed(4)}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onDrillDown?.(assessment.id)}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {assessments.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                No assessments found matching current filters
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