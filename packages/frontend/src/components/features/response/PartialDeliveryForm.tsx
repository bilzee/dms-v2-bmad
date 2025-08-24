'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  RapidResponse, 
  PartialDeliveryData, 
  ItemCompletionData, 
  DeliveryReasonCode, 
  FollowUpTask,
  PartialDeliveryUpdateRequest 
} from '@dms/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Save, Eye, Clock, CheckCircle2 } from 'lucide-react';
import { PartialDeliveryTracker } from './PartialDeliveryTracker';
import { ReasonCodeSelector } from './ReasonCodeSelector';
import { FollowUpRequirements } from './FollowUpRequirements';
import { useResponseStore } from '@/stores/response.store';
import { useToast } from '@/hooks/use-toast';

// Validation schema
const partialDeliverySchema = z.object({
  itemCompletionTracking: z.array(z.object({
    item: z.string().min(1, 'Item name is required'),
    plannedQuantity: z.number().min(0, 'Planned quantity must be non-negative'),
    deliveredQuantity: z.number().min(0, 'Delivered quantity must be non-negative'),
    remainingQuantity: z.number().min(0, 'Remaining quantity must be non-negative'),
    percentageComplete: z.number().min(0).max(100, 'Percentage must be between 0 and 100'),
    unit: z.string().min(1, 'Unit is required'),
    reasonCodes: z.array(z.string()),
    followUpRequired: z.boolean(),
  })),
  reasonCodes: z.array(z.object({
    code: z.string().min(1, 'Reason code is required'),
    category: z.enum(['SUPPLY_SHORTAGE', 'ACCESS_LIMITATION', 'SECURITY_ISSUE', 'WEATHER_DELAY', 'LOGISTICS_CHALLENGE', 'BENEFICIARY_UNAVAILABLE', 'OTHER']),
    description: z.string().min(1, 'Description is required'),
    appliesTo: z.array(z.string()),
  })),
  followUpTasks: z.array(z.object({
    id: z.string(),
    type: z.enum(['COMPLETE_DELIVERY', 'SUPPLY_PROCUREMENT', 'ACCESS_NEGOTIATION', 'SECURITY_CLEARANCE']),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    estimatedDate: z.date(),
    assignedTo: z.string().optional(),
    description: z.string().min(1, 'Description is required'),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
  })),
  partialDeliveryTimestamp: z.date(),
  estimatedCompletionDate: z.date().optional(),
});

type PartialDeliveryFormData = z.infer<typeof partialDeliverySchema>;

export interface PartialDeliveryFormProps {
  response: RapidResponse;
  onSave: (data: PartialDeliveryUpdateRequest) => Promise<void>;
  onCancel: () => void;
  isReadOnly?: boolean;
  className?: string;
}

export function PartialDeliveryForm({
  response,
  onSave,
  onCancel,
  isReadOnly = false,
  className = '',
}: PartialDeliveryFormProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('tracking');
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);

  // Form state management
  const [itemCompletionData, setItemCompletionData] = useState<ItemCompletionData[]>([]);
  const [reasonCodes, setReasonCodes] = useState<DeliveryReasonCode[]>([]);
  const [followUpTasks, setFollowUpTasks] = useState<FollowUpTask[]>([]);

  // Initialize form data from response
  useEffect(() => {
    const existingData = response.partialDeliveryData;
    
    if (existingData) {
      setItemCompletionData(existingData.itemCompletionTracking);
      setReasonCodes(existingData.reasonCodes);
      setFollowUpTasks(existingData.followUpTasks);
    } else {
      // Initialize with planned items
      const initialCompletion = response.otherItemsDelivered.map(item => ({
        item: item.item,
        plannedQuantity: item.quantity,
        deliveredQuantity: 0,
        remainingQuantity: item.quantity,
        percentageComplete: 0,
        unit: item.unit,
        reasonCodes: [],
        followUpRequired: false,
      }));
      
      setItemCompletionData(initialCompletion);
      setReasonCodes([]);
      setFollowUpTasks([]);
    }
  }, [response]);

  // React Hook Form setup
  const form = useForm<PartialDeliveryFormData>({
    resolver: zodResolver(partialDeliverySchema),
    defaultValues: {
      itemCompletionTracking: [],
      reasonCodes: [],
      followUpTasks: [],
      partialDeliveryTimestamp: new Date(),
      estimatedCompletionDate: undefined,
    },
    mode: 'onChange',
  });

  // Update form values when state changes
  useEffect(() => {
    form.setValue('itemCompletionTracking', itemCompletionData);
    form.setValue('reasonCodes', reasonCodes);
    form.setValue('followUpTasks', followUpTasks);
    form.setValue('partialDeliveryTimestamp', new Date());
    
    // Auto-save functionality
    if (autoSaveEnabled && !isReadOnly && itemCompletionData.length > 0) {
      const timer = setTimeout(() => {
        handleAutoSave();
      }, 2000); // Auto-save after 2 seconds of inactivity
      
      return () => clearTimeout(timer);
    }
  }, [itemCompletionData, reasonCodes, followUpTasks, form, autoSaveEnabled, isReadOnly]);

  // Auto-save functionality
  const handleAutoSave = async () => {
    if (!form.formState.isValid || isReadOnly) return;
    
    try {
      const formData = form.getValues();
      const updateRequest: PartialDeliveryUpdateRequest = {
        itemCompletionTracking: formData.itemCompletionTracking,
        reasonCodes: formData.reasonCodes,
        partialDeliveryTimestamp: formData.partialDeliveryTimestamp,
        estimatedCompletionDate: formData.estimatedCompletionDate,
        followUpTasks: formData.followUpTasks.map(task => ({
          type: task.type,
          priority: task.priority,
          estimatedDate: task.estimatedDate,
          assignedTo: task.assignedTo,
          description: task.description,
        })),
      };

      // Store in local storage for offline capability
      const offlineKey = `partial_delivery_${response.id}`;
      localStorage.setItem(offlineKey, JSON.stringify(updateRequest));
      
      setLastAutoSave(new Date());
      
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  // Manual save
  const handleSave = async () => {
    if (!form.formState.isValid) {
      toast({
        title: "Validation Error",
        description: "Please fix the validation errors before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    
    try {
      const formData = form.getValues();
      const updateRequest: PartialDeliveryUpdateRequest = {
        itemCompletionTracking: formData.itemCompletionTracking,
        reasonCodes: formData.reasonCodes,
        partialDeliveryTimestamp: formData.partialDeliveryTimestamp,
        estimatedCompletionDate: formData.estimatedCompletionDate,
        followUpTasks: formData.followUpTasks.map(task => ({
          type: task.type,
          priority: task.priority,
          estimatedDate: task.estimatedDate,
          assignedTo: task.assignedTo,
          description: task.description,
        })),
      };

      await onSave(updateRequest);
      
      // Clear auto-saved data
      const offlineKey = `partial_delivery_${response.id}`;
      localStorage.removeItem(offlineKey);
      
      toast({
        title: "Saved Successfully",
        description: "Partial delivery data has been saved.",
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save partial delivery data';
      toast({
        title: "Save Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate form completion statistics
  const completionStats = React.useMemo(() => {
    const totalItems = itemCompletionData.length;
    const fullyDelivered = itemCompletionData.filter(item => item.percentageComplete >= 100).length;
    const partiallyDelivered = itemCompletionData.filter(item => item.percentageComplete > 0 && item.percentageComplete < 100).length;
    const pending = itemCompletionData.filter(item => item.percentageComplete === 0).length;
    const overallPercentage = totalItems > 0 
      ? itemCompletionData.reduce((sum, item) => sum + item.percentageComplete, 0) / totalItems 
      : 0;

    return {
      totalItems,
      fullyDelivered,
      partiallyDelivered,
      pending,
      overallPercentage: Math.round(overallPercentage * 100) / 100,
      hasIncomplete: fullyDelivered < totalItems,
    };
  }, [itemCompletionData]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Partial Delivery Tracking
            </span>
            <div className="flex items-center gap-2">
              {completionStats.overallPercentage >= 100 ? (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Complete
                </Badge>
              ) : (
                <Badge variant="warning" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {completionStats.overallPercentage.toFixed(1)}% Complete
                </Badge>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            Document partial deliveries and create follow-up tasks for remaining items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{completionStats.totalItems}</div>
              <div className="text-sm text-gray-600">Total Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completionStats.fullyDelivered}</div>
              <div className="text-sm text-gray-600">Complete</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{completionStats.partiallyDelivered}</div>
              <div className="text-sm text-gray-600">Partial</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{completionStats.pending}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>

          {lastAutoSave && (
            <div className="mt-4 text-xs text-gray-500 text-center">
              Last auto-saved: {lastAutoSave.toLocaleTimeString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Form Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tracking">
            Item Tracking
            {itemCompletionData.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {itemCompletionData.filter(item => item.percentageComplete > 0).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reasons">
            Reason Codes
            {reasonCodes.length > 0 && (
              <Badge variant="secondary" className="ml-2">{reasonCodes.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="followup">
            Follow-up
            {followUpTasks.length > 0 && (
              <Badge variant="secondary" className="ml-2">{followUpTasks.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Item Tracking Tab */}
        <TabsContent value="tracking" className="space-y-4">
          <PartialDeliveryTracker
            plannedItems={response.otherItemsDelivered}
            initialCompletionData={itemCompletionData}
            onChange={setItemCompletionData}
            isReadOnly={isReadOnly}
          />
        </TabsContent>

        {/* Reason Codes Tab */}
        <TabsContent value="reasons" className="space-y-4">
          <ReasonCodeSelector
            selectedReasonCodes={reasonCodes}
            availableItems={response.otherItemsDelivered.map(item => item.item)}
            onChange={setReasonCodes}
            isReadOnly={isReadOnly}
          />
        </TabsContent>

        {/* Follow-up Tab */}
        <TabsContent value="followup" className="space-y-4">
          <FollowUpRequirements
            itemCompletionData={itemCompletionData}
            followUpTasks={followUpTasks}
            onChange={setFollowUpTasks}
            isReadOnly={isReadOnly}
            autoGenerate={true}
          />
        </TabsContent>
      </Tabs>

      {/* Validation Summary */}
      {!form.formState.isValid && Object.keys(form.formState.errors).length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800 mb-2">Form Validation Errors</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {Object.entries(form.formState.errors).map(([field, error]) => (
                    <li key={field}>
                      {field}: {error?.message}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {!isReadOnly && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !form.formState.isValid}
                  className="flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Partial Delivery
                    </>
                  )}
                </Button>

                <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                  Cancel
                </Button>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                  className="rounded"
                />
                <span>Auto-save enabled</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Read-only mode indicator */}
      {isReadOnly && (
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-gray-600">
              <Eye className="h-4 w-4" />
              <span className="text-sm">Read-only mode: This form cannot be edited</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}