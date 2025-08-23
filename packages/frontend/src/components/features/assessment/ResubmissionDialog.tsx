'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { type RapidAssessment, type CoordinatorFeedback, VerificationStatus } from '@dms/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOfflineStore } from '@/stores/offline.store';

// Validation schema for resubmission
const resubmissionSchema = z.object({
  resubmissionNotes: z
    .string()
    .min(10, 'Please provide at least 10 characters explaining the changes made')
    .max(500, 'Notes must be less than 500 characters'),
  acknowledgedFeedback: z
    .boolean()
    .refine(val => val === true, 'You must acknowledge that you have addressed the feedback'),
});

type ResubmissionFormData = z.infer<typeof resubmissionSchema>;

interface ResubmissionDialogProps {
  assessment: RapidAssessment;
  feedback?: CoordinatorFeedback[];
  onSubmit: (data: ResubmissionFormData & { assessmentId: string }) => Promise<void>;
  onCancel: () => void;
  className?: string;
}

export const ResubmissionDialog: React.FC<ResubmissionDialogProps> = ({
  assessment,
  feedback = [],
  onSubmit,
  onCancel,
  className = '',
}) => {
  const [submitting, setSubmitting] = useState(false);
  const { isOnline } = useOfflineStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<ResubmissionFormData>({
    resolver: zodResolver(resubmissionSchema),
    mode: 'onBlur',
    defaultValues: {
      resubmissionNotes: '',
      acknowledgedFeedback: false,
    },
  });

  const watchedNotes = watch('resubmissionNotes');

  const onSubmitForm = async (data: ResubmissionFormData) => {
    if (!isOnline) {
      alert('You must be online to resubmit an assessment.');
      return;
    }

    if (assessment.verificationStatus !== VerificationStatus.REJECTED) {
      alert('Only rejected assessments can be resubmitted.');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        ...data,
        assessmentId: assessment.id,
      });
    } catch (error) {
      console.error('Resubmission failed:', error);
      alert('Failed to resubmit assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getAssessmentIcon = (type: string) => {
    switch (type) {
      case 'HEALTH':
        return '🏥';
      case 'WASH':
        return '💧';
      case 'SHELTER':
        return '🏠';
      case 'FOOD':
        return '🍽️';
      case 'SECURITY':
        return '🛡️';
      case 'POPULATION':
        return '👥';
      case 'PRELIMINARY':
        return '🚨';
      default:
        return '📋';
    }
  };

  const getFeedbackSummary = () => {
    if (feedback.length === 0) return 'No specific feedback provided.';
    
    const reasonCounts = feedback.reduce((acc, fb) => {
      acc[fb.reason] = (acc[fb.reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const reasons = Object.entries(reasonCounts).map(([reason, count]) => {
      const label = {
        'DATA_QUALITY': 'Data Quality',
        'MISSING_INFO': 'Missing Information',
        'VALIDATION_ERROR': 'Validation Error',
        'OTHER': 'Other Issues'
      }[reason] || reason;
      
      return count > 1 ? `${label} (${count})` : label;
    });

    return reasons.join(', ');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onCancel}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">{getAssessmentIcon(assessment.type)}</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Resubmit Assessment
                </h2>
                <p className="text-sm text-gray-600">
                  {assessment.type} Assessment by {assessment.assessorName}
                </p>
              </div>
            </div>
            {!isOnline && (
              <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                Offline
              </span>
            )}
          </div>

          {/* Assessment info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Assessment Date:</span>
                <div className="font-medium">{new Date(assessment.date).toLocaleDateString()}</div>
              </div>
              <div>
                <span className="text-gray-500">Original Submission:</span>
                <div className="font-medium">{new Date(assessment.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Feedback Issues:</span>
                <div className="font-medium text-red-700">{getFeedbackSummary()}</div>
              </div>
            </div>
          </div>

          {/* Feedback summary */}
          {feedback.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Feedback:</h3>
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {feedback.slice(0, 3).map((fb) => (
                  <div key={fb.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-red-900">
                            {fb.coordinatorName}
                          </span>
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                            {fb.reason.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-red-700 line-clamp-2">
                          {fb.comments}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {feedback.length > 3 && (
                  <p className="text-xs text-gray-500 text-center">
                    And {feedback.length - 3} more feedback items...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Resubmission form */}
          <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
            {/* Resubmission notes */}
            <div>
              <label htmlFor="resubmissionNotes" className="block text-sm font-medium text-gray-700 mb-2">
                Resubmission Notes *
              </label>
              <textarea
                {...register('resubmissionNotes')}
                id="resubmissionNotes"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Please explain what changes you made to address the coordinator feedback..."
                disabled={submitting}
              />
              <div className="flex justify-between mt-1">
                {errors.resubmissionNotes && (
                  <p className="text-sm text-red-600">{errors.resubmissionNotes.message}</p>
                )}
                <p className={`text-xs ${watchedNotes.length > 400 ? 'text-red-500' : 'text-gray-500'} ml-auto`}>
                  {watchedNotes.length}/500 characters
                </p>
              </div>
            </div>

            {/* Acknowledgment checkbox */}
            <div className="flex items-start space-x-3">
              <input
                {...register('acknowledgedFeedback')}
                id="acknowledgedFeedback"
                type="checkbox"
                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={submitting}
              />
              <div className="flex-1">
                <label htmlFor="acknowledgedFeedback" className="text-sm font-medium text-gray-700">
                  I acknowledge that I have reviewed and addressed all coordinator feedback *
                </label>
                {errors.acknowledgedFeedback && (
                  <p className="text-sm text-red-600 mt-1">{errors.acknowledgedFeedback.message}</p>
                )}
              </div>
            </div>

            {/* Warning for offline */}
            {!isOnline && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <span className="text-yellow-500 text-sm">⚠️</span>
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Offline Mode</p>
                    <p className="text-sm text-yellow-700">
                      You must be online to resubmit an assessment. The resubmission will be processed when you connect to the internet.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isValid || submitting || !isOnline}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Resubmitting...</span>
                  </div>
                ) : (
                  'Resubmit Assessment'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};