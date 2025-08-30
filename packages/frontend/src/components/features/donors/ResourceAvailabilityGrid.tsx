'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Plus,
  Users,
  Calendar
} from 'lucide-react';
import { ResourceAvailability, ResourceAllocationRequest, ResponseType } from '@dms/shared';

interface ResourceAvailabilityGridProps {
  resourceAvailability: {
    resources: ResourceAvailability[];
    summary: {
      totalResourceTypes: number;
      resourcesWithShortfalls: number;
      resourcesFullyAllocated: number;
      totalCommitments: number;
      totalAllocations: number;
      criticalShortfalls: Array<{
        responseType: string;
        shortfall: number;
        unit: string;
        percentage: number;
      }>;
      upcomingDeadlines: Array<{
        responseType: string;
        affectedEntityName: string;
        quantity: number;
        unit: string;
        targetDate: Date;
        priority: string;
        daysUntilDeadline: number;
      }>;
    };
  } | null;
  onCreateAllocation: (allocation: ResourceAllocationRequest) => Promise<{ success: boolean; conflicts?: any[]; error?: string }>;
  onRefresh: () => Promise<void>;
}

export function ResourceAvailabilityGrid({ 
  resourceAvailability, 
  onCreateAllocation, 
  onRefresh 
}: ResourceAvailabilityGridProps) {
  const [selectedResource, setSelectedResource] = useState<ResourceAvailability | null>(null);
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Allocation form state
  const [allocationForm, setAllocationForm] = useState<Partial<ResourceAllocationRequest>>({
    responseType: undefined,
    quantity: undefined,
    priority: 'MEDIUM',
  });

  if (!resourceAvailability) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No resource availability data available</p>
              <Button onClick={onRefresh} variant="outline" size="sm" className="mt-2">
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { resources, summary } = resourceAvailability;

  const getAvailabilityStatus = (resource: ResourceAvailability) => {
    if (resource.projectedShortfall > 0) {
      return { 
        status: 'shortfall', 
        color: 'bg-red-100 text-red-800', 
        icon: AlertTriangle 
      };
    }
    if (resource.totalAvailable === 0) {
      return { 
        status: 'allocated', 
        color: 'bg-yellow-100 text-yellow-800', 
        icon: Clock 
      };
    }
    return { 
      status: 'available', 
      color: 'bg-green-100 text-green-800', 
      icon: CheckCircle 
    };
  };

  const handleCreateAllocation = async () => {
    if (!allocationForm.responseType || !allocationForm.quantity || !allocationForm.affectedEntityId) {
      return;
    }

    const result = await onCreateAllocation(allocationForm as ResourceAllocationRequest);
    
    if (result.success) {
      setAllocationDialogOpen(false);
      setAllocationForm({
        responseType: undefined,
        quantity: undefined,
        priority: 'MEDIUM',
      });
      await onRefresh();
    }
  };

  const getResourceUtilization = (resource: ResourceAvailability) => {
    if (resource.totalCommitted === 0) return 0;
    return Math.round((resource.totalAllocated / resource.totalCommitted) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Resource Types</p>
                <p className="text-2xl font-bold">{summary.totalResourceTypes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium">Critical Shortfalls</p>
                <p className="text-2xl font-bold">{summary.resourcesWithShortfalls}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Total Commitments</p>
                <p className="text-2xl font-bold">{summary.totalCommitments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Total Allocations</p>
                <p className="text-2xl font-bold">{summary.totalAllocations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="detailed">Detailed View</TabsTrigger>
            <TabsTrigger value="allocations">Allocations</TabsTrigger>
          </TabsList>
          
          <Dialog open={allocationDialogOpen} onOpenChange={setAllocationDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Allocation
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Resource Allocation</DialogTitle>
                <DialogDescription>
                  Allocate resources from available commitments to affected entities.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="resourceType">Resource Type</Label>
                  <Select 
                    value={allocationForm.responseType} 
                    onValueChange={(value: ResponseType) => 
                      setAllocationForm(prev => ({ ...prev, responseType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select resource type" />
                    </SelectTrigger>
                    <SelectContent>
                      {resources.map(resource => (
                        <SelectItem key={resource.responseType} value={resource.responseType}>
                          {resource.responseType.replace('_', ' ')} ({resource.totalAvailable} {resource.unit} available)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="Enter quantity"
                    value={allocationForm.quantity || ''}
                    onChange={(e) => 
                      setAllocationForm(prev => ({ ...prev, quantity: parseInt(e.target.value) }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="affectedEntity">Affected Entity ID</Label>
                  <Input
                    id="affectedEntity"
                    placeholder="Enter affected entity ID"
                    value={allocationForm.affectedEntityId || ''}
                    onChange={(e) => 
                      setAllocationForm(prev => ({ ...prev, affectedEntityId: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select 
                    value={allocationForm.priority} 
                    onValueChange={(value: 'HIGH' | 'MEDIUM' | 'LOW') => 
                      setAllocationForm(prev => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes or requirements..."
                    value={allocationForm.notes || ''}
                    onChange={(e) => 
                      setAllocationForm(prev => ({ ...prev, notes: e.target.value }))
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setAllocationDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAllocation}>
                  Create Allocation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((resource) => {
              const availability = getAvailabilityStatus(resource);
              const utilization = getResourceUtilization(resource);
              const IconComponent = availability.icon;

              return (
                <Card key={resource.responseType} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {resource.responseType.replace('_', ' ')}
                      </CardTitle>
                      <Badge className={availability.color}>
                        <IconComponent className="w-3 h-3 mr-1" />
                        {availability.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Utilization</span>
                        <span>{utilization}%</span>
                      </div>
                      <Progress value={utilization} className="h-2" />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-center">
                        <p className="font-medium text-blue-600">{resource.totalCommitted}</p>
                        <p className="text-gray-600">Committed</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-orange-600">{resource.totalAllocated}</p>
                        <p className="text-gray-600">Allocated</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-green-600">{resource.totalAvailable}</p>
                        <p className="text-gray-600">Available</p>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 space-y-1">
                      <p>Unit: {resource.unit}</p>
                      <p>Commitments: {resource.commitments.length}</p>
                      {resource.projectedShortfall > 0 && (
                        <p className="text-red-600">
                          Shortfall: {resource.projectedShortfall} {resource.unit}
                        </p>
                      )}
                    </div>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setSelectedResource(resource)}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="detailed">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Resource Breakdown</CardTitle>
              <CardDescription>
                Complete view of all resource commitments and allocations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {resources.map((resource) => (
                  <div key={resource.responseType} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">
                        {resource.responseType.replace('_', ' ')}
                      </h3>
                      <Badge className={getAvailabilityStatus(resource).color}>
                        {resource.totalAvailable} {resource.unit} available
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Commitments */}
                      <div>
                        <h4 className="font-medium mb-3 flex items-center">
                          <Users className="w-4 h-4 mr-2" />
                          Commitments ({resource.commitments.length})
                        </h4>
                        <div className="space-y-2">
                          {resource.commitments.map((commitment, index) => (
                            <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">{commitment.donorName}</p>
                                  <p className="text-gray-600">
                                    {commitment.quantity} {resource.unit}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <Badge variant="outline" className="text-xs">
                                    {commitment.status}
                                  </Badge>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(commitment.targetDate).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Allocations */}
                      <div>
                        <h4 className="font-medium mb-3 flex items-center">
                          <Package className="w-4 h-4 mr-2" />
                          Allocations ({resource.allocations.length})
                        </h4>
                        <div className="space-y-2">
                          {resource.allocations.map((allocation, index) => (
                            <div key={index} className="text-sm bg-blue-50 p-2 rounded">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">{allocation.affectedEntityName}</p>
                                  <p className="text-gray-600">
                                    {allocation.quantity} {resource.unit}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      allocation.priority === 'HIGH' ? 'border-red-300 text-red-700' :
                                      allocation.priority === 'MEDIUM' ? 'border-orange-300 text-orange-700' :
                                      'border-green-300 text-green-700'
                                    }`}
                                  >
                                    {allocation.priority}
                                  </Badge>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(allocation.targetDate).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocations">
          <Card>
            <CardHeader>
              <CardTitle>Recent Allocations</CardTitle>
              <CardDescription>
                Track resource allocations and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Allocation tracking view coming soon</p>
                <Button variant="outline" className="mt-4">
                  View All Allocations
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}