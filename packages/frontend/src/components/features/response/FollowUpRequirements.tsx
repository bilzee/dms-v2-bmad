'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { FollowUpTask, ItemCompletionData } from '@dms/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, AlertTriangle, Clock, CheckCircle2, X, Flag } from 'lucide-react';
import { format } from 'date-fns';

export interface FollowUpRequirementsProps {
  itemCompletionData: ItemCompletionData[];
  followUpTasks: FollowUpTask[];
  onChange: (followUpTasks: FollowUpTask[]) => void;
  isReadOnly?: boolean;
  autoGenerate?: boolean;
  className?: string;
}

interface NewFollowUpTask {
  type: FollowUpTask['type'];
  priority: FollowUpTask['priority'];
  estimatedDate: Date;
  assignedTo: string;
  description: string;
}

const FOLLOW_UP_TYPES: { value: FollowUpTask['type']; label: string; description: string }[] = [
  {
    value: 'COMPLETE_DELIVERY',
    label: 'Complete Delivery',
    description: 'Deliver remaining quantities of planned items'
  },
  {
    value: 'SUPPLY_PROCUREMENT',
    label: 'Supply Procurement',
    description: 'Source and procure additional supplies'
  },
  {
    value: 'ACCESS_NEGOTIATION',
    label: 'Access Negotiation',
    description: 'Negotiate access permissions or route alternatives'
  },
  {
    value: 'SECURITY_CLEARANCE',
    label: 'Security Clearance',
    description: 'Obtain security clearance for delivery operations'
  }
];

const PRIORITY_LEVELS: { value: FollowUpTask['priority']; label: string; color: string }[] = [
  { value: 'HIGH', label: 'High Priority', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'MEDIUM', label: 'Medium Priority', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'LOW', label: 'Low Priority', color: 'bg-green-100 text-green-800 border-green-200' }
];

// Generate unique ID for follow-up tasks
const generateTaskId = (): string => {
  return `followup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export function FollowUpRequirements({
  itemCompletionData,
  followUpTasks,
  onChange,
  isReadOnly = false,
  autoGenerate = true,
  className = '',
}: FollowUpRequirementsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState<NewFollowUpTask>({
    type: 'COMPLETE_DELIVERY',
    priority: 'MEDIUM',
    estimatedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 1 week from now
    assignedTo: '',
    description: '',
  });

  // Calculate follow-up requirements based on completion data
  const followUpRequirements = useMemo(() => {
    const incompleteItems = itemCompletionData.filter(item => item.percentageComplete < 100);
    const criticalItems = itemCompletionData.filter(item => item.percentageComplete === 0);
    const partialItems = itemCompletionData.filter(item => 
      item.percentageComplete > 0 && item.percentageComplete < 100
    );

    const totalRemainingQuantity = incompleteItems.reduce(
      (sum, item) => sum + item.remainingQuantity, 0
    );

    return {
      requiresFollowUp: incompleteItems.length > 0,
      totalIncompleteItems: incompleteItems.length,
      criticalItemsCount: criticalItems.length,
      partialItemsCount: partialItems.length,
      totalRemainingQuantity,
      completionRate: itemCompletionData.length > 0 
        ? Math.round((itemCompletionData.reduce((sum, item) => sum + item.percentageComplete, 0) / itemCompletionData.length) * 10) / 10
        : 0,
    };
  }, [itemCompletionData]);

  // Auto-generate follow-up tasks based on incomplete items
  useEffect(() => {
    if (!autoGenerate || isReadOnly) return;

    const incompleteItems = itemCompletionData.filter(item => item.percentageComplete < 100);
    const existingTaskTypes = new Set(followUpTasks.map(task => task.type));

    const autoTasks: FollowUpTask[] = [];

    // Generate completion tasks for incomplete items
    if (incompleteItems.length > 0 && !existingTaskTypes.has('COMPLETE_DELIVERY')) {
      const criticalItems = incompleteItems.filter(item => item.percentageComplete === 0);
      const priority = criticalItems.length > 0 ? 'HIGH' : 'MEDIUM';
      
      autoTasks.push({
        id: generateTaskId(),
        type: 'COMPLETE_DELIVERY',
        priority,
        estimatedDate: new Date(Date.now() + (priority === 'HIGH' ? 3 : 7) * 24 * 60 * 60 * 1000),
        description: `Complete delivery of ${incompleteItems.length} incomplete items: ${incompleteItems.map(item => `${item.item} (${item.remainingQuantity} ${item.unit} remaining)`).join(', ')}`,
        status: 'PENDING'
      });
    }

    // Generate supply procurement tasks if significant shortages
    const lowCompletionItems = incompleteItems.filter(item => item.percentageComplete < 50);
    if (lowCompletionItems.length > 0 && !existingTaskTypes.has('SUPPLY_PROCUREMENT')) {
      autoTasks.push({
        id: generateTaskId(),
        type: 'SUPPLY_PROCUREMENT',
        priority: 'MEDIUM',
        estimatedDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        description: `Procure additional supplies for items with significant shortages: ${lowCompletionItems.map(item => item.item).join(', ')}`,
        status: 'PENDING'
      });
    }

    if (autoTasks.length > 0) {
      onChange([...followUpTasks, ...autoTasks]);
    }
  }, [itemCompletionData, autoGenerate, followUpTasks, onChange, isReadOnly]);

  // Add new follow-up task
  const addFollowUpTask = () => {
    const task: FollowUpTask = {
      id: generateTaskId(),
      type: newTask.type,
      priority: newTask.priority,
      estimatedDate: newTask.estimatedDate,
      assignedTo: newTask.assignedTo || undefined,
      description: newTask.description,
      status: 'PENDING'
    };

    onChange([...followUpTasks, task]);

    // Reset form
    setNewTask({
      type: 'COMPLETE_DELIVERY',
      priority: 'MEDIUM',
      estimatedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      assignedTo: '',
      description: '',
    });
    setShowAddForm(false);
  };

  // Remove follow-up task
  const removeFollowUpTask = (taskId: string) => {
    onChange(followUpTasks.filter(task => task.id !== taskId));
  };

  // Update follow-up task
  const updateFollowUpTask = (taskId: string, updates: Partial<FollowUpTask>) => {
    onChange(
      followUpTasks.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      )
    );
  };

  // Get priority badge styling
  const getPriorityBadge = (priority: FollowUpTask['priority']) => {
    const config = PRIORITY_LEVELS.find(p => p.value === priority);
    return config ? config.color : PRIORITY_LEVELS[1].color;
  };

  // Get status icon
  const getStatusIcon = (status: FollowUpTask['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Follow-up Requirements Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Follow-up Requirements
          </CardTitle>
          <CardDescription>
            Automatically flagged requirements based on delivery completion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${followUpRequirements.requiresFollowUp ? 'text-red-600' : 'text-green-600'}`}>
                {followUpRequirements.requiresFollowUp ? 'Yes' : 'No'}
              </div>
              <div className="text-sm text-gray-600">Follow-up Required</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {followUpRequirements.totalIncompleteItems}
              </div>
              <div className="text-sm text-gray-600">Incomplete Items</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {followUpRequirements.criticalItemsCount}
              </div>
              <div className="text-sm text-gray-600">Not Delivered</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {followUpRequirements.completionRate}%
              </div>
              <div className="text-sm text-gray-600">Overall Completion</div>
            </div>
          </div>

          {followUpRequirements.requiresFollowUp && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Follow-up Action Required</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    {followUpRequirements.totalIncompleteItems} items require follow-up delivery. 
                    {followUpRequirements.criticalItemsCount > 0 && 
                      ` ${followUpRequirements.criticalItemsCount} items have not been delivered at all.`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Follow-up Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Follow-up Tasks</CardTitle>
          <CardDescription>
            Tasks to complete remaining deliveries and resolve issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Existing Tasks */}
            {followUpTasks.length > 0 ? (
              <div className="space-y-3">
                {followUpTasks.map((task) => (
                  <Card key={task.id} className="border-l-4 border-l-orange-500">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(task.status)}
                            <Badge className={getPriorityBadge(task.priority)}>
                              {task.priority} Priority
                            </Badge>
                            <Badge variant="outline">
                              {FOLLOW_UP_TYPES.find(type => type.value === task.type)?.label}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-gray-700 mb-3">{task.description}</p>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Due: {format(task.estimatedDate, 'MMM d, yyyy')}</span>
                            {task.assignedTo && <span>Assigned to: {task.assignedTo}</span>}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 ml-4">
                          {!isReadOnly && (
                            <>
                              <Select
                                value={task.status}
                                onValueChange={(value: FollowUpTask['status']) =>
                                  updateFollowUpTask(task.id, { status: value })
                                }
                              >
                                <SelectTrigger className="w-32 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PENDING">Pending</SelectItem>
                                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                  <SelectItem value="COMPLETED">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFollowUpTask(task.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Follow-up Tasks</h3>
                <p className="text-gray-600">
                  {followUpRequirements.requiresFollowUp
                    ? 'Tasks will be automatically generated based on delivery completion data.'
                    : 'All items have been fully delivered. No follow-up required.'}
                </p>
              </div>
            )}

            {/* Add Task Form */}
            {!isReadOnly && followUpRequirements.requiresFollowUp && (
              <div className="border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Follow-up Task
                </Button>

                {showAddForm && (
                  <Card className="mt-3">
                    <CardContent className="pt-4">
                      <div className="grid gap-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="task-type">Task Type</Label>
                            <Select
                              value={newTask.type}
                              onValueChange={(value: FollowUpTask['type']) =>
                                setNewTask(prev => ({ ...prev, type: value }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FOLLOW_UP_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="task-priority">Priority</Label>
                            <Select
                              value={newTask.priority}
                              onValueChange={(value: FollowUpTask['priority']) =>
                                setNewTask(prev => ({ ...prev, priority: value }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PRIORITY_LEVELS.map((priority) => (
                                  <SelectItem key={priority.value} value={priority.value}>
                                    {priority.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="task-date">Estimated Date</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left">
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {format(newTask.estimatedDate, 'PPP')}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={newTask.estimatedDate}
                                  onSelect={(date: Date | undefined) => date && setNewTask(prev => ({ ...prev, estimatedDate: date }))}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          
                          <div>
                            <Label htmlFor="task-assigned">Assigned To (Optional)</Label>
                            <Input
                              id="task-assigned"
                              value={newTask.assignedTo}
                              onChange={(e) =>
                                setNewTask(prev => ({ ...prev, assignedTo: e.target.value }))
                              }
                              placeholder="Enter name or role"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="task-description">Description</Label>
                          <Textarea
                            id="task-description"
                            value={newTask.description}
                            onChange={(e) =>
                              setNewTask(prev => ({ ...prev, description: e.target.value }))
                            }
                            placeholder="Describe the follow-up task..."
                            rows={3}
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={addFollowUpTask}
                            disabled={!newTask.description.trim()}
                          >
                            Add Task
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowAddForm(false);
                              setNewTask({
                                type: 'COMPLETE_DELIVERY',
                                priority: 'MEDIUM',
                                estimatedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                                assignedTo: '',
                                description: '',
                              });
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}