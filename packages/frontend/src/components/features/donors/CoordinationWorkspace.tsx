'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  Package,
  MessageSquare,
  Calendar,
  AlertCircle,
  RefreshCw,
  Target,
  Truck
} from 'lucide-react';
import { CoordinationWorkspaceItem } from '@dms/shared';

interface CoordinationWorkspaceProps {
  workspaceItems: CoordinationWorkspaceItem[];
  onResolveConflict: (workspaceItemId: string, resolution: any) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function CoordinationWorkspace({ 
  workspaceItems, 
  onResolveConflict, 
  onRefresh 
}: CoordinationWorkspaceProps) {
  const [activeTab, setActiveTab] = useState('active');
  const [selectedItem, setSelectedItem] = useState<CoordinationWorkspaceItem | null>(null);
  const [resolutionDialogOpen, setResolutionDialogOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const getItemsByStatus = (status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') => {
    return workspaceItems.filter(item => item.status === status);
  };

  const activeItems = workspaceItems.filter(item => 
    item.status === 'PENDING' || item.status === 'IN_PROGRESS'
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'RESOURCE_ALLOCATION':
        return Package;
      case 'CONFLICT_RESOLUTION':
        return AlertTriangle;
      case 'DELIVERY_COORDINATION':
        return Truck;
      case 'DONOR_COMMUNICATION':
        return MessageSquare;
      default:
        return Target;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDaysUntilDue = (dueDate?: Date) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleResolveConflict = async () => {
    if (!selectedItem) return;

    await onResolveConflict(selectedItem.id, {
      resolvedAt: new Date(),
      resolution: resolutionNotes,
      resolvedBy: 'current-coordinator', // Would come from auth
    });

    setResolutionDialogOpen(false);
    setSelectedItem(null);
    setResolutionNotes('');
    await onRefresh();
  };

  const handleActionComplete = async (itemId: string, actionId: string) => {
    // In a real implementation, this would make an API call to update the action
    console.log('Completing action:', actionId, 'for item:', itemId);
    await onRefresh();
  };

  const renderWorkspaceItem = (item: CoordinationWorkspaceItem) => {
    const IconComponent = getTypeIcon(item.type);
    const daysUntilDue = getDaysUntilDue(item.dueDate);
    const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
    const completedActions = item.actions?.filter(a => a.completed).length || 0;
    const totalActions = item.actions?.length || 0;

    return (
      <Card key={item.id} className={`${isOverdue ? 'border-red-200 bg-red-50' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <IconComponent className="h-5 w-5 text-blue-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium leading-tight">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-tight">{item.description}</p>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(item.status)}>
                    {item.status.replace('_', ' ')}
                  </Badge>
                  <Badge variant="outline" className={getPriorityColor(item.priority)}>
                    {item.priority}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-right text-sm text-gray-500">
              {item.dueDate && (
                <div className={`flex items-center space-x-1 ${isOverdue ? 'text-red-600' : ''}`}>
                  <Calendar className="h-3 w-3" />
                  <span>
                    {isOverdue ? `Overdue by ${Math.abs(daysUntilDue!)}d` : 
                     daysUntilDue === 0 ? 'Due today' :
                     daysUntilDue === 1 ? 'Due tomorrow' :
                     `Due in ${daysUntilDue}d`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Entity and Resource Info */}
          {(item.affectedEntityName || item.responseType) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {item.affectedEntityName && (
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span>
                    <strong>Entity:</strong> {item.affectedEntityName}
                  </span>
                </div>
              )}
              {item.responseType && (
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-gray-400" />
                  <span>
                    <strong>Resource:</strong> {item.quantity} {item.unit} {item.responseType.replace('_', ' ').toLowerCase()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Donor Info */}
          {item.donorName && (
            <div className="text-sm">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span>
                  <strong>Donor:</strong> {item.donorName}
                </span>
              </div>
            </div>
          )}

          {/* Conflict Details */}
          {item.type === 'CONFLICT_RESOLUTION' && item.conflictDescription && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    {item.conflictType?.replace('_', ' ')} Conflict
                  </p>
                  <p className="text-sm text-red-700">{item.conflictDescription}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions Checklist */}
          {item.actions && item.actions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Action Items</h4>
                <Badge variant="outline" className="text-xs">
                  {completedActions}/{totalActions} completed
                </Badge>
              </div>
              <div className="space-y-2">
                {item.actions.map((action) => (
                  <div key={action.id} className="flex items-start space-x-2">
                    <Checkbox
                      checked={action.completed}
                      onCheckedChange={() => handleActionComplete(item.id, action.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className={`text-sm ${action.completed ? 'line-through text-gray-500' : ''}`}>
                        {action.description}
                      </p>
                      {action.dueDate && !action.completed && (
                        <p className="text-xs text-gray-500">
                          Due: {new Date(action.dueDate).toLocaleDateString()}
                        </p>
                      )}
                      {action.completed && action.completedAt && (
                        <p className="text-xs text-green-600">
                          Completed: {new Date(action.completedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-2 border-t">
            {item.type === 'CONFLICT_RESOLUTION' && item.status !== 'COMPLETED' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedItem(item);
                  setResolutionDialogOpen(true);
                }}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Resolve Conflict
              </Button>
            )}
            <Button variant="ghost" size="sm">
              View Details
            </Button>
            <Button variant="ghost" size="sm">
              <MessageSquare className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Coordination Workspace</h2>
          <p className="text-gray-600">Manage coordination tasks and resolve conflicts</p>
        </div>
        <Button onClick={onRefresh} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Active Items</p>
                <p className="text-2xl font-bold">{activeItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium">Conflicts</p>
                <p className="text-2xl font-bold">
                  {getItemsByStatus('PENDING').filter(i => i.type === 'CONFLICT_RESOLUTION').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Allocations</p>
                <p className="text-2xl font-bold">
                  {workspaceItems.filter(i => i.type === 'RESOURCE_ALLOCATION').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold">
                  {getItemsByStatus('COMPLETED').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active ({activeItems.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({getItemsByStatus('PENDING').length})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({getItemsByStatus('IN_PROGRESS').length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({getItemsByStatus('COMPLETED').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <p className="text-gray-500">No active coordination items</p>
                <p className="text-sm text-gray-400 mt-1">All tasks are completed or resolved!</p>
              </CardContent>
            </Card>
          ) : (
            activeItems.map(renderWorkspaceItem)
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {getItemsByStatus('PENDING').map(renderWorkspaceItem)}
        </TabsContent>

        <TabsContent value="in_progress" className="space-y-4">
          {getItemsByStatus('IN_PROGRESS').map(renderWorkspaceItem)}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {getItemsByStatus('COMPLETED').length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No completed items yet</p>
              </CardContent>
            </Card>
          ) : (
            getItemsByStatus('COMPLETED').map(renderWorkspaceItem)
          )}
        </TabsContent>
      </Tabs>

      {/* Conflict Resolution Dialog */}
      <Dialog open={resolutionDialogOpen} onOpenChange={setResolutionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Conflict</DialogTitle>
            <DialogDescription>
              {selectedItem?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedItem?.conflictDescription && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{selectedItem.conflictDescription}</p>
              </div>
            )}
            
            <div>
              <Label htmlFor="resolution">Resolution Notes</Label>
              <Textarea
                id="resolution"
                placeholder="Describe how this conflict was resolved..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolutionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolveConflict} disabled={!resolutionNotes.trim()}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}