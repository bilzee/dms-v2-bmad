'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AssessmentType,
  SyncStatus,
  VerificationStatus,
  IncidentType,
  IncidentSeverity,
  type RapidAssessment,
  type PreliminaryAssessmentData,
  type GPSCoordinates,
  type MediaAttachment,
} from '@dms/shared';
import {
  PreliminaryAssessmentFormSchema,
  type PreliminaryAssessmentForm as PreliminaryAssessmentFormData,
  generateUUID,
  generateOfflineId,
} from '@dms/shared';
import { useGPS } from '@/hooks/useGPS';
import { useOfflineStore } from '@/stores/offline.store';
import { IncidentService } from '@/lib/api/incident.service';
import { db } from '@/lib/offline/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, FormLabel, FormMessage } from '@/components/ui/form';
import { MediaUpload } from '@/components/shared/MediaUpload';

interface PreliminaryAssessmentFormProps {
  affectedEntityId: string;
  assessorName: string;
  assessorId: string;
  onSubmit?: (assessment: RapidAssessment, incidentId?: string) => void;
  onCancel?: () => void;
  onSaveDraft?: (draftData: any) => void;
  initialData?: Partial<PreliminaryAssessmentData>;
}

const PriorityBadge: React.FC<{ priority: 'HIGH' | 'NORMAL' | 'LOW' }> = ({ priority }) => {
  const variants = {
    HIGH: 'bg-red-100 text-red-800 border-red-200',
    NORMAL: 'bg-blue-100 text-blue-800 border-blue-200',
    LOW: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const icons = {
    HIGH: '❗',
    NORMAL: '',
    LOW: '🕐'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[priority]}`}>
      {icons[priority] && <span className="mr-1">{icons[priority]}</span>}
      {priority}
    </span>
  );
};

export const PreliminaryAssessmentForm: React.FC<PreliminaryAssessmentFormProps> = ({
  affectedEntityId,
  assessorName,
  assessorId,
  onSubmit,
  onCancel,
  onSaveDraft,
  initialData,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [mediaAttachments, setMediaAttachments] = useState<MediaAttachment[]>([]);
  const [incidentCreationStatus, setIncidentCreationStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  
  const { coordinates, captureLocation, isLoading: gpsLoading, error: gpsError } = useGPS();
  const { isOnline, addToQueue, addPendingAssessment } = useOfflineStore();

  const form = useForm<PreliminaryAssessmentFormData>({
    resolver: zodResolver(PreliminaryAssessmentFormSchema),
    defaultValues: {
      type: 'PRELIMINARY',
      affectedEntityId,
      assessorName,
      data: {
        incidentType: IncidentType.OTHER,
        severity: IncidentSeverity.MODERATE,
        affectedPopulationEstimate: 0,
        affectedHouseholdsEstimate: 0,
        immediateNeedsDescription: '',
        accessibilityStatus: 'ACCESSIBLE',
        priorityLevel: 'NORMAL',
        ...initialData,
      },
      mediaAttachments: [],
    },
  });

  const { handleSubmit, watch, formState: { errors, isDirty } } = form;
  const watchedPriority = watch('data.priorityLevel');
  
  // Extract the watch expression to avoid useEffect dependency warnings
  const watchedValues = watch();

  // Auto-save functionality
  useEffect(() => {
    if (!isDirty) return;

    const autoSaveTimer = setTimeout(async () => {
      try {
        setAutoSaveStatus('saving');
        const formData = form.getValues();
        
        const draftId = `draft_preliminary_${affectedEntityId}_${Date.now()}`;
        await db.saveDraft({
          id: draftId,
          type: AssessmentType.PRELIMINARY,
          data: formData.data,
          formData,
        });
        
        setAutoSaveStatus('saved');
        onSaveDraft?.(formData);
      } catch (error) {
        console.error('Auto-save failed:', error);
        setAutoSaveStatus('error');
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearTimeout(autoSaveTimer);
  }, [watchedValues, isDirty, affectedEntityId, form, onSaveDraft]);

  const handleFormSubmit = async (data: PreliminaryAssessmentFormData) => {
    try {
      setIsSubmitting(true);

      const assessment: RapidAssessment = {
        id: generateUUID(),
        type: AssessmentType.PRELIMINARY,
        date: new Date(),
        affectedEntityId,
        assessorName,
        assessorId,
        verificationStatus: VerificationStatus.PENDING,
        syncStatus: isOnline ? SyncStatus.PENDING : SyncStatus.PENDING,
        offlineId: generateOfflineId(),
        data: data.data as PreliminaryAssessmentData,
        mediaAttachments: mediaAttachments,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save assessment to IndexedDB
      await db.saveAssessment(assessment);

      let incidentId: string | undefined;

      // Try to create incident if online
      if (isOnline) {
        try {
          setIncidentCreationStatus('creating');
          
          const incidentRequest = IncidentService.prepareIncidentRequest(assessment, coordinates || undefined);
          if (incidentRequest) {
            const incidentResponse = await IncidentService.createFromAssessment(incidentRequest);
            
            if (incidentResponse.success && incidentResponse.incident) {
              incidentId = incidentResponse.incident.id;
              setIncidentCreationStatus('success');
            } else {
              setIncidentCreationStatus('error');
              console.warn('Incident creation failed:', incidentResponse.error);
            }
          }
        } catch (error) {
          setIncidentCreationStatus('error');
          console.error('Failed to create incident:', error);
          // Continue with assessment submission even if incident creation fails
        }

        // Add assessment to sync queue
        addToQueue({
          type: 'ASSESSMENT',
          action: 'CREATE',
          data: assessment,
          priority: data.data.priorityLevel === 'HIGH' ? 'HIGH' : 'NORMAL',
        });

        // If incident creation failed online, queue it for retry
        if (!incidentId) {
          addToQueue({
            type: 'INCIDENT',
            action: 'CREATE',
            data: {
              assessmentId: assessment.id,
              assessmentData: data.data,
              affectedEntityId,
              assessorId,
              assessorName,
              gpsCoordinates: coordinates || undefined,
            },
            priority: 'HIGH',
          });
        }
      } else {
        // Keep as pending assessment for offline mode
        addPendingAssessment(assessment);
        
        // Queue incident creation for when online
        addToQueue({
          type: 'INCIDENT',
          action: 'CREATE',
          data: {
            assessmentId: assessment.id,
            assessmentData: data.data,
            affectedEntityId,
            assessorId,
            assessorName,
            gpsCoordinates: coordinates || undefined,
          },
          priority: 'HIGH',
        });
      }

      onSubmit?.(assessment, incidentId);
      
      // Reset form after successful submission
      form.reset();
      setAutoSaveStatus('idle');
      setIncidentCreationStatus('idle');
      
    } catch (error) {
      console.error('Failed to submit preliminary assessment:', error);
      setIncidentCreationStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Preliminary Assessment
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          {isOnline ? 'Online' : 'Offline'} • {assessorName}
          {autoSaveStatus === 'saved' && ' • Draft saved'}
          {autoSaveStatus === 'saving' && ' • Saving...'}
          {autoSaveStatus === 'error' && ' • Save failed'}
        </p>
        <div className="mt-2">
          <PriorityBadge priority={watchedPriority} />
        </div>
      </div>

      {/* Incident Creation Status */}
      {incidentCreationStatus !== 'idle' && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-900">Incident Creation</h3>
          <p className="text-sm text-blue-700 mt-1">
            {incidentCreationStatus === 'creating' && 'Creating incident for coordinators...'}
            {incidentCreationStatus === 'success' && 'Incident created successfully! Coordinators will be notified.'}
            {incidentCreationStatus === 'error' && 'Incident creation queued for retry when online.'}
          </p>
        </div>
      )}

      {/* GPS Capture Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Location Capture</h3>
            {coordinates ? (
              <p className="text-sm text-gray-600">
                Lat: {coordinates.latitude.toFixed(6)}, 
                Lng: {coordinates.longitude.toFixed(6)}
                {coordinates.accuracy && ` (±${coordinates.accuracy.toFixed(0)}m)`}
              </p>
            ) : (
              <p className="text-sm text-gray-600">No location captured</p>
            )}
            {gpsError && (
              <p className="text-sm text-red-600">{gpsError}</p>
            )}
          </div>
          <Button
            type="button"
            onClick={captureLocation}
            disabled={gpsLoading}
            variant="outline"
          >
            {gpsLoading ? 'Capturing...' : 'Capture GPS'}
          </Button>
        </div>
      </div>

      {/* Media Attachments Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-4">Media Attachments</h3>
        <p className="text-sm text-gray-600 mb-4">
          Add photos, audio recordings, or videos to provide visual evidence for this preliminary assessment.
          Location and timestamp will be automatically captured.
        </p>
        <MediaUpload
          onMediaChange={setMediaAttachments}
          maxFiles={10}
          maxFileSize={5 * 1024 * 1024} // 5MB
          acceptedTypes={['image/*', 'audio/*', 'video/*']}
        />
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Incident Type */}
        <FormField>
          <FormLabel htmlFor="incidentType">Incident Type *</FormLabel>
          <select
            id="incidentType"
            {...form.register('data.incidentType')}
            className="w-full p-2 border rounded-md"
          >
            <option value={IncidentType.FLOOD}>Flood</option>
            <option value={IncidentType.FIRE}>Fire</option>
            <option value={IncidentType.LANDSLIDE}>Landslide</option>
            <option value={IncidentType.CYCLONE}>Cyclone</option>
            <option value={IncidentType.CONFLICT}>Conflict</option>
            <option value={IncidentType.EPIDEMIC}>Epidemic</option>
            <option value={IncidentType.OTHER}>Other</option>
          </select>
          {errors.data?.incidentType && (
            <FormMessage>{errors.data.incidentType.message}</FormMessage>
          )}
        </FormField>

        {/* Incident Sub Type */}
        <FormField>
          <FormLabel htmlFor="incidentSubType">Incident Sub Type</FormLabel>
          <Input
            type="text"
            id="incidentSubType"
            placeholder="e.g., Flash flood, Wildfire, etc."
            {...form.register('data.incidentSubType')}
          />
        </FormField>

        {/* Severity */}
        <FormField>
          <FormLabel htmlFor="severity">Severity *</FormLabel>
          <select
            id="severity"
            {...form.register('data.severity')}
            className="w-full p-2 border rounded-md"
          >
            <option value={IncidentSeverity.MINOR}>Minor</option>
            <option value={IncidentSeverity.MODERATE}>Moderate</option>
            <option value={IncidentSeverity.SEVERE}>Severe</option>
            <option value={IncidentSeverity.CATASTROPHIC}>Catastrophic</option>
          </select>
          {errors.data?.severity && (
            <FormMessage>{errors.data.severity.message}</FormMessage>
          )}
        </FormField>

        {/* Priority Level */}
        <FormField>
          <FormLabel htmlFor="priorityLevel">Priority Level *</FormLabel>
          <select
            id="priorityLevel"
            {...form.register('data.priorityLevel')}
            className="w-full p-2 border rounded-md"
          >
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            High priority assessments will create incidents immediately and notify coordinators
          </p>
        </FormField>

        {/* Population Estimates */}
        <div className="grid grid-cols-2 gap-4">
          <FormField>
            <FormLabel htmlFor="affectedPopulationEstimate">Affected Population Estimate *</FormLabel>
            <Input
              type="number"
              id="affectedPopulationEstimate"
              min="0"
              {...form.register('data.affectedPopulationEstimate', { valueAsNumber: true })}
            />
            {errors.data?.affectedPopulationEstimate && (
              <FormMessage>{errors.data.affectedPopulationEstimate.message}</FormMessage>
            )}
          </FormField>

          <FormField>
            <FormLabel htmlFor="affectedHouseholdsEstimate">Affected Households Estimate *</FormLabel>
            <Input
              type="number"
              id="affectedHouseholdsEstimate"
              min="0"
              {...form.register('data.affectedHouseholdsEstimate', { valueAsNumber: true })}
            />
            {errors.data?.affectedHouseholdsEstimate && (
              <FormMessage>{errors.data.affectedHouseholdsEstimate.message}</FormMessage>
            )}
          </FormField>
        </div>

        {/* Accessibility Status */}
        <FormField>
          <FormLabel htmlFor="accessibilityStatus">Accessibility Status *</FormLabel>
          <select
            id="accessibilityStatus"
            {...form.register('data.accessibilityStatus')}
            className="w-full p-2 border rounded-md"
          >
            <option value="ACCESSIBLE">Accessible</option>
            <option value="PARTIALLY_ACCESSIBLE">Partially Accessible</option>
            <option value="INACCESSIBLE">Inaccessible</option>
          </select>
        </FormField>

        {/* Immediate Needs Description */}
        <FormField>
          <FormLabel htmlFor="immediateNeedsDescription">Immediate Needs Description *</FormLabel>
          <textarea
            id="immediateNeedsDescription"
            rows={4}
            placeholder="Describe the immediate needs and emergency situation..."
            {...form.register('data.immediateNeedsDescription')}
            className="w-full p-2 border rounded-md"
          />
          {errors.data?.immediateNeedsDescription && (
            <FormMessage>{errors.data.immediateNeedsDescription.message}</FormMessage>
          )}
        </FormField>

        {/* Additional Details */}
        <FormField>
          <FormLabel htmlFor="additionalDetails">Additional Details</FormLabel>
          <textarea
            id="additionalDetails"
            rows={3}
            placeholder="Any additional information about the situation..."
            {...form.register('data.additionalDetails')}
            className="w-full p-2 border rounded-md"
          />
        </FormField>
        
        <div className="flex justify-between pt-6 border-t">
          <div className="text-sm text-gray-500">
            {isOnline ? 'Will create incident and sync immediately' : 'Will sync when online'}
          </div>
          <div className="space-x-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || gpsLoading}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};