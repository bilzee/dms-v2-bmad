/**
 * OptimisticAssessmentForm - Enhanced Assessment Form with Optimistic UI Updates
 * 
 * Demonstrates integration of optimistic UI patterns with existing form components.
 * Provides immediate UI feedback while sync operations occur in the background.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AssessmentType,
  type RapidAssessment,
  AssessmentFormSchema,
  generateOfflineId,
} from '@dms/shared';
import { useOptimisticUpdates } from '@/hooks/useOptimisticUpdates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SyncStatusIndicator } from '@/components/shared/SyncStatusIndicator';
import { EntitySyncStatus } from '@/components/shared/EntitySyncStatus';
import { RollbackConfirmation } from '@/components/shared/RollbackConfirmation';
import { OptimisticToast } from '@/components/shared/OptimisticToast';
import { useRollback } from '@/hooks/useOptimisticUpdates';
import { CheckCircle2, Clock, AlertCircle, Save, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface OptimisticAssessmentFormProps {
  assessmentType: AssessmentType;
  affectedEntityId?: string;
  assessorName: string;
  assessorId: string;
  onSubmit?: (assessment: RapidAssessment) => void;
  onCancel?: () => void;
  className?: string;
}

type FormData = z.infer<typeof AssessmentFormSchema>;

export const OptimisticAssessmentForm: React.FC<OptimisticAssessmentFormProps> = ({
  assessmentType,
  affectedEntityId,
  assessorName,
  assessorId,
  onSubmit,
  onCancel,
  className,
}) => {
  const [currentAssessmentId, setCurrentAssessmentId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData | null>(null);

  // Optimistic updates hook
  const {
    isPending,
    entityState,
    applyOptimisticUpdate,
    retryUpdate,
    hasActiveUpdates,
    getFailedUpdates,
    stats,
  } = useOptimisticUpdates({
    entityType: 'ASSESSMENT',
    entityId: currentAssessmentId || undefined,
    autoRetry: true,
    maxRetries: 3,
    onSuccess: (updateId) => {
      console.log('Assessment saved successfully:', updateId);
      // Optionally redirect or show success message
    },
    onError: (updateId, error) => {
      console.error('Assessment save failed:', updateId, error);
      // Error handling is managed by OptimisticToast component
    },
    onRollback: (updateId) => {
      console.log('Assessment changes rolled back:', updateId);
      // Reset form to previous state if needed
    },
  });

  // Rollback functionality
  const { confirmationDialog, showRollbackConfirmation, closeConfirmation } = useRollback();

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(AssessmentFormSchema),
    defaultValues: {
      type: assessmentType,
      affectedEntityId: affectedEntityId || '',
      data: {},
    },
    mode: 'onChange',
  });

  const { handleSubmit, formState: { errors, isDirty, isValid } } = form;

  // Handle optimistic form submission
  const onSubmitWithOptimisticUpdate = useCallback(async (data: FormData) => {
    try {
      // Generate assessment ID for tracking
      const assessmentId = generateOfflineId();
      setCurrentAssessmentId(assessmentId);
      setFormData(data);

      // Create the assessment object
      const assessment: RapidAssessment = {
        id: assessmentId,
        ...data,
        date: new Date(),
        assessorId,
        submittedAt: new Date(),
        verificationStatus: 'PENDING' as any,
        syncStatus: 'PENDING' as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as RapidAssessment;

      // Apply optimistic update for immediate UI feedback
      await applyOptimisticUpdate(
        assessmentId,
        'CREATE',
        assessment,
        null // No original data for create operations
      );

      // Call the onSubmit callback if provided
      onSubmit?.(assessment);

    } catch (error) {
      console.error('Failed to submit assessment:', error);
      // Error will be handled by the optimistic update system
    }
  }, [applyOptimisticUpdate, onSubmit]);

  // Handle retry for failed updates
  const handleRetry = useCallback(async () => {
    const failedUpdates = getFailedUpdates();
    if (failedUpdates.length > 0) {
      try {
        await retryUpdate(failedUpdates[0].id);
      } catch (error) {
        console.error('Retry failed:', error);
      }
    }
  }, [getFailedUpdates, retryUpdate]);

  // Handle rollback
  const handleRollback = useCallback(() => {
    const failedUpdates = getFailedUpdates();
    if (failedUpdates.length > 0) {
      showRollbackConfirmation(failedUpdates[0].id, 'USER_INITIATED');
    }
  }, [getFailedUpdates, showRollbackConfirmation]);

  const getSubmitButtonState = () => {
    if (isPending) {
      return {
        text: 'Saving...',
        icon: <Clock className="w-4 h-4 animate-pulse" />,
        disabled: true,
        className: 'bg-yellow-600 hover:bg-yellow-700',
      };
    }

    if (entityState?.syncStatus === 'SYNCED') {
      return {
        text: 'Saved',
        icon: <CheckCircle2 className="w-4 h-4" />,
        disabled: true,
        className: 'bg-green-600 hover:bg-green-700',
      };
    }

    if (entityState?.syncStatus === 'FAILED') {
      return {
        text: 'Save Failed',
        icon: <AlertCircle className="w-4 h-4" />,
        disabled: false,
        className: 'bg-red-600 hover:bg-red-700',
      };
    }

    return {
      text: 'Save Assessment',
      icon: <Save className="w-4 h-4" />,
      disabled: !isDirty || !isValid,
      className: 'bg-blue-600 hover:bg-blue-700',
    };
  };

  const submitButtonState = getSubmitButtonState();
  const hasFailedUpdates = getFailedUpdates().length > 0;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Global Sync Status */}
      <SyncStatusIndicator showDetails className="mb-4" />

      {/* Main Form Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Create Assessment</CardTitle>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="outline">{assessmentType}</Badge>
              {currentAssessmentId && (
                <EntitySyncStatus 
                  entityId={currentAssessmentId}
                  entityType="ASSESSMENT"
                  showActions={hasFailedUpdates}
                  onRetry={handleRetry}
                  onRollback={handleRollback}
                />
              )}
            </div>
          </div>
          
          {/* Statistics */}
          {stats.totalUpdates > 0 && (
            <div className="text-right">
              <div className="text-sm text-gray-500">Sync Statistics</div>
              <div className="flex items-center space-x-4 text-xs">
                <span className="text-green-600">{stats.confirmedUpdates} saved</span>
                <span className="text-yellow-600">{stats.pendingUpdates} pending</span>
                <span className="text-red-600">{stats.failedUpdates} failed</span>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmitWithOptimisticUpdate)} className="space-y-6">
            {/* Basic Assessment Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField>
                <FormLabel>Affected Entity ID</FormLabel>
                <Input 
                  {...form.register('affectedEntityId')}
                  placeholder="Enter entity ID"
                  disabled={isPending}
                />
                <FormMessage>{errors.affectedEntityId?.message}</FormMessage>
              </FormField>

              <FormField>
                <FormLabel>Priority Level</FormLabel>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isPending}
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
                <FormMessage></FormMessage>
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField>
                <FormLabel>Incident Type</FormLabel>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isPending}
                >
                  <option value="NATURAL_DISASTER">Natural Disaster</option>
                  <option value="CONFLICT">Conflict</option>
                  <option value="DISEASE_OUTBREAK">Disease Outbreak</option>
                  <option value="INFRASTRUCTURE_FAILURE">Infrastructure Failure</option>
                  <option value="OTHER">Other</option>
                </select>
                <FormMessage></FormMessage>
              </FormField>

              <FormField>
                <FormLabel>Incident Severity</FormLabel>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isPending}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
                <FormMessage></FormMessage>
              </FormField>
            </div>

            <FormField>
              <FormLabel>Estimated Affected Population</FormLabel>
              <Input 
// {...form.register('estimatedAffectedPopulation', { valueAsNumber: true })}
                type="number"
                placeholder="Enter estimated population"
                disabled={isPending}
              />
              <FormMessage></FormMessage>
            </FormField>

            <FormField>
              <FormLabel>Notes</FormLabel>
              <textarea
// {...form.register('notes')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Additional notes and observations..."
                disabled={isPending}
              />
              <FormMessage></FormMessage>
            </FormField>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6">
              <div className="flex items-center space-x-2">
                {hasFailedUpdates && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRollback}
                    className="text-orange-600 border-orange-600 hover:bg-orange-50"
                  >
                    <Undo2 className="w-4 h-4 mr-2" />
                    Rollback Changes
                  </Button>
                )}
                
                {hasActiveUpdates() && (
                  <div className="text-sm text-gray-500">
                    {stats.pendingUpdates} operations pending
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                
                <Button
                  type="submit"
                  disabled={submitButtonState.disabled}
                  className={cn('transition-colors', submitButtonState.className)}
                >
                  {submitButtonState.icon}
                  <span className="ml-2">{submitButtonState.text}</span>
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Rollback Confirmation Dialog */}
      <RollbackConfirmation
        isOpen={confirmationDialog.isOpen}
        onClose={closeConfirmation}
        onConfirm={confirmationDialog.onConfirm || (() => {})}
        rollbackOperation={confirmationDialog.updateId ? {
          updateId: confirmationDialog.updateId,
          entityId: currentAssessmentId || '',
          entityType: 'ASSESSMENT',
          reason: confirmationDialog.reason || 'USER_INITIATED',
          rollbackData: null,
          confirmationRequired: true,
          confirmationMessage: 'This will undo your assessment and remove it from the sync queue.',
        } : null}
      />

      {/* Toast Notifications */}
      <OptimisticToast />
    </div>
  );
};

export default OptimisticAssessmentForm;