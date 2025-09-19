'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Package, TrendingUp, Clock, Users, MapPin } from 'lucide-react';

interface ResourceCommitment {
  donorId: string;
  donorName: string;
  quantity: number;
  targetDate: Date;
  status: string;
  incidentId: string;
}

interface ResourceAllocation {
  affectedEntityId: string;
  affectedEntityName: string;
  quantity: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  targetDate: Date;
}

interface ResourceAvailability {
  responseType: string;
  totalCommitted: number;
  totalAllocated: number;
  totalAvailable: number;
  unit: string;
  commitments: ResourceCommitment[];
  allocations: ResourceAllocation[];
  projectedShortfall: number;
  earliestAvailable: Date;
  lastUpdated: Date;
}

interface ResourceCoordinationPanelProps {
  incidentId?: string;
  className?: string;
}

export function ResourceCoordinationPanel({ incidentId, className }: ResourceCoordinationPanelProps) {
  const [resources, setResources] = useState<ResourceAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    fetchResourceAvailability();
  }, [incidentId]);

  const fetchResourceAvailability = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (incidentId) params.append('incidentId', incidentId);
      
      const response = await fetch(`/api/v1/coordinator/resources/available?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setResources(data.data.resources);
      } else {
        setError(data.errors?.[0] || 'Failed to fetch resource data');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredResources = selectedType === 'all' 
    ? resources 
    : resources.filter(r => r.responseType.toLowerCase() === selectedType);

  const getUtilizationPercentage = (resource: ResourceAvailability) => {
    return resource.totalCommitted > 0 
      ? Math.round((resource.totalAllocated / resource.totalCommitted) * 100)
      : 0;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'secondary';
      case 'LOW': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'bg-green-500';
      case 'IN_PROGRESS': return 'bg-blue-500';
      case 'PLANNED': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) return <div className="p-4">Loading resource coordination data...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <CardTitle>Resource Coordination</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={fetchResourceAvailability}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedType} onValueChange={setSelectedType}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="food">Food</TabsTrigger>
              <TabsTrigger value="wash">WASH</TabsTrigger>
              <TabsTrigger value="health">Health</TabsTrigger>
              <TabsTrigger value="shelter">Shelter</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedType} className="space-y-4">
              {filteredResources.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No resource data available for {selectedType === 'all' ? 'any category' : selectedType}
                </div>
              ) : (
                filteredResources.map((resource) => {
                  const utilization = getUtilizationPercentage(resource);
                  const hasShortfall = resource.projectedShortfall > 0;
                  
                  return (
                    <Card key={resource.responseType} className={`${hasShortfall ? 'border-orange-200' : ''}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold capitalize">{resource.responseType.toLowerCase()}</h3>
                            {hasShortfall && (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Shortfall
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Updated {new Date(resource.lastUpdated).toLocaleTimeString()}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-2xl font-bold">{resource.totalCommitted.toLocaleString()}</div>
                            <div className="text-muted-foreground">Committed {resource.unit}</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold">{resource.totalAllocated.toLocaleString()}</div>
                            <div className="text-muted-foreground">Allocated {resource.unit}</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-600">{resource.totalAvailable.toLocaleString()}</div>
                            <div className="text-muted-foreground">Available {resource.unit}</div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Utilization</span>
                            <span>{utilization}%</span>
                          </div>
                          <Progress value={utilization} className="h-2" />
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Commitments */}
                          <div>
                            <h4 className="font-medium mb-2 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Commitments ({resource.commitments.length})
                            </h4>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {resource.commitments.slice(0, 3).map((commitment, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                                  <div>
                                    <div className="font-medium">{commitment.donorName}</div>
                                    <div className="text-muted-foreground">
                                      {commitment.quantity.toLocaleString()} {resource.unit}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className={`w-2 h-2 rounded-full ${getStatusColor(commitment.status)}`}></div>
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(commitment.targetDate).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {resource.commitments.length > 3 && (
                                <div className="text-xs text-muted-foreground text-center">
                                  +{resource.commitments.length - 3} more commitments
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Allocations */}
                          <div>
                            <h4 className="font-medium mb-2 flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              Allocations ({resource.allocations.length})
                            </h4>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {resource.allocations.slice(0, 3).map((allocation, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                                  <div>
                                    <div className="font-medium">{allocation.affectedEntityName}</div>
                                    <div className="text-muted-foreground">
                                      {allocation.quantity.toLocaleString()} {resource.unit}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <Badge variant={getPriorityColor(allocation.priority) as any} className="text-xs">
                                      {allocation.priority}
                                    </Badge>
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(allocation.targetDate).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {resource.allocations.length > 3 && (
                                <div className="text-xs text-muted-foreground text-center">
                                  +{resource.allocations.length - 3} more allocations
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {hasShortfall && (
                          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="flex items-center gap-2 text-orange-800">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="font-medium">
                                Projected Shortfall: {resource.projectedShortfall.toLocaleString()} {resource.unit}
                              </span>
                            </div>
                            <div className="text-sm text-orange-700 mt-1">
                              Additional resources needed to meet all allocations
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Earliest available: {new Date(resource.earliestAvailable).toLocaleDateString()}
                          </div>
                          <Button variant="outline" size="sm">
                            Manage Allocation
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}