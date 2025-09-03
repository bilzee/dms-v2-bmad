'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, MapPin, User, Calendar, CheckCircle, Clock, AlertCircle, Package, Download, Truck } from 'lucide-react';

interface DrillDownResponseData {
  id: string;
  responseType: string;
  status: string;
  plannedDate: Date;
  deliveredDate?: Date;
  responderName: string;
  entityName: string;
  entityType: 'CAMP' | 'COMMUNITY';
  coordinates: { latitude: number; longitude: number };
  assessmentType: string;
  donorName?: string;
  dataDetails: Record<string, any>;
  deliveryItems: { item: string; quantity: number; unit: string }[];
  evidenceCount: number;
  verificationStatus: string;
}

interface DetailedResponseViewProps {
  filters?: {
    incidentIds?: string[];
    entityIds?: string[];
    timeframe?: { start: string; end: string };
    responseTypes?: string[];
    status?: string[];
  };
  onDrillDown?: (responseId: string) => void;
  onExport?: (exportType: string) => void;
}

export function DetailedResponseView({
  filters = {},
  onDrillDown,
  onExport,
}: DetailedResponseViewProps) {
  const [responses, setResponses] = useState<DrillDownResponseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aggregations, setAggregations] = useState<any>({});
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchDetailedResponses = async () => {
    try {
      const searchParams = new URLSearchParams();
      
      if (filters.incidentIds?.length) {
        searchParams.append('incidentIds', filters.incidentIds.join(','));
      }
      if (filters.entityIds?.length) {
        searchParams.append('entityIds', filters.entityIds.join(','));
      }
      if (filters.responseTypes?.length) {
        searchParams.append('responseTypes', filters.responseTypes.join(','));
      }
      if (filters.status?.length) {
        searchParams.append('status', filters.status.join(','));
      }
      if (filters.timeframe) {
        searchParams.append('timeframeStart', filters.timeframe.start);
        searchParams.append('timeframeEnd', filters.timeframe.end);
      }
      searchParams.append('page', currentPage.toString());
      
      const response = await fetch(`/api/v1/monitoring/drill-down/responses?${searchParams}`);
      const data = await response.json();
      
      if (data.success) {
        setResponses(data.data.map((response: any) => ({
          ...response,
          plannedDate: new Date(response.plannedDate),
          deliveredDate: response.deliveredDate ? new Date(response.deliveredDate) : undefined,
        })));
        setAggregations(data.meta.aggregations);
        setTotalRecords(data.meta.totalRecords);
        setTotalPages(data.meta.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch detailed responses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetailedResponses();
  }, [filters, currentPage]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'default';
      case 'IN_PROGRESS': return 'secondary';
      case 'PLANNED': return 'outline';
      case 'CANCELLED': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="h-3 w-3" />;
      case 'IN_PROGRESS': return <Clock className="h-3 w-3" />;
      case 'PLANNED': return <Calendar className="h-3 w-3" />;
      case 'CANCELLED': return <AlertCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const getVerificationBadgeVariant = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'default';
      case 'AUTO_VERIFIED': return 'secondary';
      case 'PENDING': return 'outline';
      case 'REJECTED': return 'destructive';
      default: return 'outline';
    }
  };

  const formatResponseType = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase();
  };

  const renderDataDetails = (details: Record<string, any>, type: string) => {
    if (type === 'SUPPLIES' && details.itemsDelivered) {
      return (
        <div className="space-y-2">
          <div className="text-sm font-medium">Items Delivered:</div>
          {details.itemsDelivered.map((item: any, index: number) => (
            <div key={index} className="flex justify-between text-sm">
              <span>{item.item}:</span>
              <span className="font-semibold">{item.quantity} {item.unit}</span>
            </div>
          ))}
          <div className="text-sm pt-2 border-t">
            <span className="text-muted-foreground">Beneficiaries:</span>
            <span className="font-semibold ml-2">{details.totalBeneficiaries}</span>
          </div>
        </div>
      );
    }
    
    if (type === 'MEDICAL' && details.patientsHelped) {
      return (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Patients:</span>
            <div className="font-semibold">{details.patientsHelped}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Medicines:</span>
            <div className="font-semibold">{details.medicinesDistributed}</div>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Team Size:</span>
            <span className="font-semibold ml-2">{details.medicalTeamSize} staff</span>
          </div>
        </div>
      );
    }
    
    if (type === 'SHELTER' && details.temporaryShelters) {
      return (
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Shelters:</span>
            <span className="font-semibold ml-2">{details.temporaryShelters}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Families Helped:</span>
            <span className="font-semibold ml-2">{details.familiesHelped}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Materials:</span>
            <span className="font-semibold ml-2">{details.materialUsed}</span>
          </div>
        </div>
      );
    }
    
    return (
      <div className="text-sm text-muted-foreground">
        Response details available for review
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Detailed Response View</CardTitle>
          <CardDescription>Loading detailed response data...</CardDescription>
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
              <Truck className="h-5 w-5" />
              Detailed Response View
            </CardTitle>
            <CardDescription>
              Comprehensive response data with delivery tracking and verification
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onExport?.('responses')}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={fetchDetailedResponses}>
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
              <div className="text-sm font-medium">Total Responses</div>
            </div>
            <div className="text-center p-3 border rounded-lg bg-green-50">
              <div className="text-2xl font-bold text-green-600">
                {aggregations.byStatus?.COMPLETED || 0}
              </div>
              <div className="text-sm font-medium">Completed</div>
            </div>
            <div className="text-center p-3 border rounded-lg bg-yellow-50">
              <div className="text-2xl font-bold text-yellow-600">
                {aggregations.byStatus?.IN_PROGRESS || 0}
              </div>
              <div className="text-sm font-medium">In Progress</div>
            </div>
            <div className="text-center p-3 border rounded-lg bg-gray-50">
              <div className="text-2xl font-bold text-gray-600">
                {aggregations.byStatus?.PLANNED || 0}
              </div>
              <div className="text-sm font-medium">Planned</div>
            </div>
          </div>

          {/* Response Cards */}
          <div className="space-y-4">
            {responses.map((response) => (
              <Card key={response.id} className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{response.id}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {formatResponseType(response.responseType)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(response.status)} className="flex items-center gap-1">
                        {getStatusIcon(response.status)}
                        {response.status}
                      </Badge>
                      <Badge variant={getVerificationBadgeVariant(response.verificationStatus)} className="text-xs">
                        {response.verificationStatus}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Responder:</span>
                        <span className="font-medium">{response.responderName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Planned:</span>
                        <span className="font-medium">{response.plannedDate.toLocaleDateString()}</span>
                      </div>
                      {response.deliveredDate && (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Delivered:</span>
                          <span className="font-medium">{response.deliveredDate.toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-medium">{response.entityName}</span>
                        <Badge variant="outline" className="text-xs">{response.entityType}</Badge>
                      </div>
                      {response.donorName && (
                        <div className="flex items-center gap-2 text-sm">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Donor:</span>
                          <span className="font-medium">{response.donorName}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Response Details</h4>
                      {renderDataDetails(response.dataDetails, response.responseType)}
                    </div>
                  </div>
                  
                  {/* Delivery Items */}
                  {response.deliveryItems.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Delivery Items</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {response.deliveryItems.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                            <span>{item.item}:</span>
                            <span className="font-semibold">{item.quantity} {item.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Evidence attachments: {response.evidenceCount}</span>
                      <span>Assessment: {response.assessmentType}</span>
                      <span>Coordinates: {response.coordinates.latitude.toFixed(4)}, {response.coordinates.longitude.toFixed(4)}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onDrillDown?.(response.id)}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {responses.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                No responses found matching current filters
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