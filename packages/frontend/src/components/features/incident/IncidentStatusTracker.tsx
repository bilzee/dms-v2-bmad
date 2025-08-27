'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Plus,
  Edit3,
  Trash2,
  User,
  Calendar,
  Activity,
  Target,
  Zap,
  PlayCircle
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { 
  useIncidentData,
  useIncidentForms,
  useIncidentActions
} from '@/stores/incident.store';
import { 
  IncidentStatus,
  IncidentStatusUpdate,
  IncidentActionItem
} from '@dms/shared';
import { format, formatDistanceToNow } from 'date-fns';

interface IncidentStatusTrackerProps {
  coordinatorId: string;
  coordinatorName: string;
  className?: string;
}

interface StatusUpdateFormData {
  newStatus: IncidentStatus;
  notes: string;
  milestone: string;
}

interface ActionItemFormData {
  description: string;
  assignedTo: string;
  dueDate: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

const statusConfig = {
  ACTIVE: {
    label: 'Active',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: <Zap className="h-4 w-4" />,
    description: 'Incident is ongoing and requires immediate attention'
  },
  CONTAINED: {
    label: 'Contained',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: <PlayCircle className="h-4 w-4" />,
    description: 'Incident spread has been controlled but monitoring continues'
  },
  RESOLVED: {
    label: 'Resolved',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: <CheckCircle2 className="h-4 w-4" />,
    description: 'Incident has been fully resolved and closed'
  }
};

const statusFlow = [
  { from: 'ACTIVE', to: 'CONTAINED', label: 'Contain Incident' },
  { from: 'CONTAINED', to: 'RESOLVED', label: 'Resolve Incident' },
  { from: 'ACTIVE', to: 'RESOLVED', label: 'Direct Resolution' }
];

export default function IncidentStatusTracker({
  coordinatorId,
  coordinatorName,
  className,
}: IncidentStatusTrackerProps) {
  const [selectedIncidentId, setSelectedIncidentId] = React.useState<string>('');
  const [showStatusUpdateDialog, setShowStatusUpdateDialog] = React.useState(false);
  const [showActionItemDialog, setShowActionItemDialog] = React.useState(false);
  const [editingActionItem, setEditingActionItem] = React.useState<IncidentActionItem | null>(null);

  const { incidents, incidentStats } = useIncidentData();
  const { statusUpdateForm, isUpdatingStatus } = useIncidentForms();
  const { 
    updateIncidentStatus, 
    addActionItem, 
    updateActionItem,
    fetchIncidentDetail,
    fetchIncidentTimeline 
  } = useIncidentActions();

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId);

  const {
    register: registerStatus,
    handleSubmit: handleStatusSubmit,
    watch: watchStatus,
    reset: resetStatus,
    formState: { errors: statusErrors, isValid: isStatusValid }
  } = useForm<StatusUpdateFormData>({
    defaultValues: {
      newStatus: undefined,
      notes: '',
      milestone: ''
    },
    mode: 'onChange'
  });

  const {
    register: registerActionItem,
    handleSubmit: handleActionItemSubmit,
    reset: resetActionItem,
    formState: { errors: actionItemErrors, isValid: isActionItemValid }
  } = useForm<ActionItemFormData>({
    defaultValues: {
      description: '',
      assignedTo: '',
      dueDate: '',
      priority: 'MEDIUM'
    },
    mode: 'onChange'
  });

  const newStatus = watchStatus('newStatus');

  const getValidNextStatuses = (currentStatus: IncidentStatus): IncidentStatus[] => {
    const validTransitions = statusFlow
      .filter(flow => flow.from === currentStatus)
      .map(flow => flow.to as IncidentStatus);
    
    return validTransitions;
  };

  const getStatusProgress = (status: IncidentStatus): number => {
    switch (status) {
      case 'ACTIVE': return 33;
      case 'CONTAINED': return 66;
      case 'RESOLVED': return 100;
      default: return 0;
    }
  };

  const onStatusUpdate = async (data: StatusUpdateFormData) => {
    if (!selectedIncidentId) return;

    try {
      const statusUpdate: IncidentStatusUpdate = {
        incidentId: selectedIncidentId,
        newStatus: data.newStatus,
        coordinatorId,
        notes: data.notes || undefined,
        milestone: data.milestone || undefined,
      };

      await updateIncidentStatus(statusUpdate);
      setShowStatusUpdateDialog(false);
      resetStatus();
    } catch (error) {
      console.error('Failed to update incident status:', error);
    }
  };

  const onActionItemSubmit = async (data: ActionItemFormData) => {
    if (!selectedIncidentId) return;

    try {
      const actionItem: Omit<IncidentActionItem, 'id'> = {
        description: data.description,
        assignedTo: data.assignedTo || undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        status: 'PENDING',
        priority: data.priority,
      };

      if (editingActionItem) {
        await updateActionItem(selectedIncidentId, editingActionItem.id, actionItem);
      } else {
        await addActionItem(selectedIncidentId, actionItem);
      }
      
      setShowActionItemDialog(false);
      setEditingActionItem(null);
      resetActionItem();
    } catch (error) {
      console.error('Failed to save action item:', error);
    }
  };

  const openActionItemDialog = (actionItem?: IncidentActionItem) => {
    if (actionItem) {
      setEditingActionItem(actionItem);
      resetActionItem({
        description: actionItem.description,
        assignedTo: actionItem.assignedTo || '',
        dueDate: actionItem.dueDate ? format(new Date(actionItem.dueDate), 'yyyy-MM-dd') : '',
        priority: actionItem.priority,
      });
    } else {
      setEditingActionItem(null);
      resetActionItem();
    }
    setShowActionItemDialog(true);
  };

  const openStatusUpdateDialog = () => {
    if (selectedIncident) {
      resetStatus({
        newStatus: undefined,
        notes: '',
        milestone: ''
      });
      setShowStatusUpdateDialog(true);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Incident Status Progression</h2>
          <p className="text-muted-foreground">
            Track and manage incident status transitions and action items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {incidentStats.activeIncidents} Active
          </Badge>
          <Badge variant="outline">
            {Object.values(incidentStats.byStatus).reduce((a, b) => a + (b || 0), 0)} Total
          </Badge>
        </div>
      </div>

      {/* Incident Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Select Incident
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedIncidentId} onValueChange={setSelectedIncidentId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an incident to track..." />
            </SelectTrigger>
            <SelectContent>
              {incidents.map((incident) => (
                <SelectItem key={incident.id} value={incident.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{incident.name}</span>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge 
                        variant="outline" 
                        className={statusConfig[incident.status].color}
                      >
                        {statusConfig[incident.status].label}
                      </Badge>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedIncident && (
        <>
          {/* Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Status Overview: {selectedIncident.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-full",
                    statusConfig[selectedIncident.status].color
                  )}>
                    {statusConfig[selectedIncident.status].icon}
                  </div>
                  <div>
                    <div className="font-semibold">
                      {statusConfig[selectedIncident.status].label}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {statusConfig[selectedIncident.status].description}
                    </div>
                  </div>
                </div>
                <Button onClick={openStatusUpdateDialog} className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4" />
                  Update Status
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{getStatusProgress(selectedIncident.status)}%</span>
                </div>
                <Progress value={getStatusProgress(selectedIncident.status)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Type:</span> {selectedIncident.type}
                </div>
                <div>
                  <span className="font-medium">Severity:</span> {selectedIncident.severity}
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span> {' '}
                  {formatDistanceToNow(new Date(selectedIncident.lastUpdated), { addSuffix: true })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Flow */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5" />
                Status Flow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {Object.entries(statusConfig).map(([status, config], index) => (
                  <React.Fragment key={status}>
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "p-4 rounded-full border-2 transition-colors",
                        selectedIncident.status === status 
                          ? "border-primary bg-primary/10" 
                          : getStatusProgress(status as IncidentStatus) <= getStatusProgress(selectedIncident.status)
                            ? "border-green-500 bg-green-50"
                            : "border-gray-300 bg-gray-50"
                      )}>
                        {config.icon}
                      </div>
                      <div className="mt-2 text-center">
                        <div className="font-medium">{config.label}</div>
                        <div className="text-xs text-muted-foreground max-w-20">
                          {config.description}
                        </div>
                      </div>
                    </div>
                    {index < Object.entries(statusConfig).length - 1 && (
                      <ArrowRight className="h-6 w-6 text-gray-400" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Action Items
                </div>
                <Button 
                  onClick={() => openActionItemDialog()}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Action Item
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mock action items - would come from incident details */}
              <div className="space-y-3">
                <div className="border rounded p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox defaultChecked={false} />
                      <span className="font-medium">Coordinate evacuation teams</span>
                      <Badge variant="outline" className="bg-red-100 text-red-800">
                        HIGH
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openActionItemDialog()}>
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground ml-6">
                    Assigned to: Relief Team Alpha • Due: {format(new Date(Date.now() + 86400000), 'MMM dd, yyyy')}
                  </div>
                </div>

                <div className="border rounded p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox defaultChecked={true} />
                      <span className="font-medium line-through">Set up emergency shelters</span>
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        COMPLETED
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground ml-6">
                    Completed {formatDistanceToNow(new Date(Date.now() - 3600000), { addSuffix: true })}
                  </div>
                </div>

                <div className="border rounded p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox defaultChecked={false} />
                      <span className="font-medium">Medical supplies distribution</span>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                        MEDIUM
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openActionItemDialog()}>
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground ml-6">
                    Assigned to: Medical Team • Due: {format(new Date(Date.now() + 172800000), 'MMM dd, yyyy')}
                  </div>
                </div>
              </div>

              {/* Empty state would show here if no action items */}
            </CardContent>
          </Card>
        </>
      )}

      {/* Status Update Dialog */}
      <Dialog open={showStatusUpdateDialog} onOpenChange={setShowStatusUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Incident Status</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleStatusSubmit(onStatusUpdate)} className="space-y-4">
            <div>
              <Label htmlFor="newStatus">New Status *</Label>
              <Select onValueChange={(value) => registerStatus('newStatus').onChange({ target: { value } })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status..." />
                </SelectTrigger>
                <SelectContent>
                  {selectedIncident && getValidNextStatuses(selectedIncident.status).map((status) => (
                    <SelectItem key={status} value={status}>
                      <div className="flex items-center gap-2">
                        {statusConfig[status].icon}
                        {statusConfig[status].label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {statusErrors.newStatus && (
                <p className="text-sm text-red-600 mt-1">{statusErrors.newStatus.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="milestone">Milestone (Optional)</Label>
              <Input
                id="milestone"
                {...registerStatus('milestone')}
                placeholder="e.g., All residents evacuated"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...registerStatus('notes')}
                placeholder="Add any relevant notes about this status change..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowStatusUpdateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isStatusValid || isUpdatingStatus}
              >
                {isUpdatingStatus ? 'Updating...' : 'Update Status'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Action Item Dialog */}
      <Dialog open={showActionItemDialog} onOpenChange={setShowActionItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingActionItem ? 'Edit' : 'Add'} Action Item
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleActionItemSubmit(onActionItemSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                {...registerActionItem('description', { 
                  required: 'Description is required' 
                })}
                placeholder="What needs to be done?"
              />
              {actionItemErrors.description && (
                <p className="text-sm text-red-600 mt-1">{actionItemErrors.description.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="assignedTo">Assigned To</Label>
              <Input
                id="assignedTo"
                {...registerActionItem('assignedTo')}
                placeholder="Person or team responsible"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  {...registerActionItem('dueDate')}
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select onValueChange={(value) => registerActionItem('priority').onChange({ target: { value } })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">High Priority</SelectItem>
                    <SelectItem value="MEDIUM">Medium Priority</SelectItem>
                    <SelectItem value="LOW">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowActionItemDialog(false);
                  setEditingActionItem(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isActionItemValid}
              >
                {editingActionItem ? 'Update' : 'Add'} Action Item
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}