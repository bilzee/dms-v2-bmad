'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AssessmentType,
  SyncStatus,
  VerificationStatus,
  IncidentType,
  IncidentSeverity,
  type RapidAssessment,
  type AssessmentData,
  type GPSCoordinates,
  type MediaAttachment,
} from '@dms/shared';
import {
  AssessmentFormSchema,
  HealthAssessmentDataSchema,
  WashAssessmentDataSchema,
  ShelterAssessmentDataSchema,
  FoodAssessmentDataSchema,
  SecurityAssessmentDataSchema,
  PopulationAssessmentDataSchema,
  PreliminaryAssessmentDataSchema,
  generateUUID,
  generateOfflineId,
} from '@dms/shared';
import { useGPS } from '@/hooks/useGPS';
import { useOfflineStore } from '@/stores/offline.store';
import { db } from '@/lib/offline/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, FormLabel, FormMessage } from '@/components/ui/form';
import { MediaUpload } from '@/components/shared/MediaUpload';
import { EntitySelector } from '@/components/features/entity/EntitySelector';
import { AssessmentSyncStatus } from '@/components/features/sync/AssessmentSyncStatus';

interface AssessmentFormProps {
  assessmentType: AssessmentType;
  affectedEntityId?: string; // Made optional to support entity selection
  assessorName: string;
  assessorId: string;
  onSubmit?: (assessment: RapidAssessment) => void;
  onSaveDraft?: (draftData: any) => void;
  onCreateEntity?: () => void; // Callback to create new entity
  initialData?: Partial<AssessmentData>;
}

type AssessmentFormData = z.infer<typeof AssessmentFormSchema>;

export const AssessmentForm: React.FC<AssessmentFormProps> = ({
  assessmentType,
  affectedEntityId: initialEntityId = '',
  assessorName,
  assessorId,
  onSubmit,
  onSaveDraft,
  onCreateEntity,
  initialData,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [mediaAttachments, setMediaAttachments] = useState<MediaAttachment[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>(initialEntityId || '');
  
  const { coordinates, captureLocation, isLoading: gpsLoading, error: gpsError } = useGPS();
  const { isOnline, addToQueue, addPendingAssessment } = useOfflineStore();

  // Get the appropriate schema based on assessment type
  const getValidationSchema = useCallback(() => {
    const baseSchema = {
      type: z.literal(assessmentType),
      affectedEntityId: z.string().uuid(),
      assessorName: z.string().min(1),
      gpsCoordinates: z.object({
        latitude: z.number(),
        longitude: z.number(),
        accuracy: z.number().optional(),
        timestamp: z.date(),
        captureMethod: z.enum(['GPS', 'MANUAL', 'MAP_SELECT']),
      }).optional(),
      mediaAttachments: z.array(z.any()).default([]),
    };

    switch (assessmentType) {
      case AssessmentType.HEALTH:
        return z.object({ ...baseSchema, data: HealthAssessmentDataSchema });
      case AssessmentType.WASH:
        return z.object({ ...baseSchema, data: WashAssessmentDataSchema });
      case AssessmentType.SHELTER:
        return z.object({ ...baseSchema, data: ShelterAssessmentDataSchema });
      case AssessmentType.FOOD:
        return z.object({ ...baseSchema, data: FoodAssessmentDataSchema });
      case AssessmentType.SECURITY:
        return z.object({ ...baseSchema, data: SecurityAssessmentDataSchema });
      case AssessmentType.POPULATION:
        return z.object({ ...baseSchema, data: PopulationAssessmentDataSchema });
      case AssessmentType.PRELIMINARY:
        return z.object({ ...baseSchema, data: PreliminaryAssessmentDataSchema });
      default:
        throw new Error(`Unsupported assessment type: ${assessmentType}`);
    }
  }, [assessmentType]);

  const form = useForm<AssessmentFormData>({
    resolver: zodResolver(getValidationSchema()),
    defaultValues: {
      type: assessmentType,
      affectedEntityId: selectedEntityId,
      assessorName,
      data: getDefaultFormData(assessmentType, initialData),
      mediaAttachments: [],
    },
  });

  // Update form when entity selection changes
  useEffect(() => {
    if (selectedEntityId) {
      form.setValue('affectedEntityId', selectedEntityId);
    }
  }, [selectedEntityId, form]);

  const { handleSubmit, watch, formState: { errors, isDirty } } = form;

  // Auto-save functionality
  useEffect(() => {
    if (!isDirty) return;

    const autoSaveTimer = setTimeout(async () => {
      try {
        setAutoSaveStatus('saving');
        const formData = form.getValues();
        
        const draftId = `draft_${assessmentType}_${selectedEntityId}_${Date.now()}`;
        await db.saveDraft({
          id: draftId,
          type: assessmentType,
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
  }, [watch(), isDirty, assessmentType, selectedEntityId, form, onSaveDraft]);

  const handleFormSubmit = async (data: AssessmentFormData) => {
    try {
      setIsSubmitting(true);

      // Validate that an entity is selected
      if (!selectedEntityId) {
        alert('Please select an affected entity before submitting the assessment.');
        return;
      }

      const assessment: RapidAssessment = {
        id: generateUUID(),
        type: assessmentType,
        date: new Date(),
        affectedEntityId: selectedEntityId,
        assessorName,
        assessorId,
        verificationStatus: VerificationStatus.PENDING,
        syncStatus: isOnline ? SyncStatus.PENDING : SyncStatus.PENDING,
        offlineId: generateOfflineId(),
        data: data.data as AssessmentData,
        mediaAttachments: mediaAttachments,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save to IndexedDB
      await db.saveAssessment(assessment);

      if (isOnline) {
        // Add to sync queue for immediate processing
        addToQueue({
          type: 'ASSESSMENT',
          action: 'CREATE',
          data: assessment,
          priority: 'HIGH',
        });
      } else {
        // Keep as pending assessment for offline mode
        addPendingAssessment(assessment);
      }

      onSubmit?.(assessment);
      
      // Reset form after successful submission
      form.reset();
      setAutoSaveStatus('idle');
      
    } catch (error) {
      console.error('Failed to submit assessment:', error);
      // Handle error (show toast, etc.)
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {assessmentType} Assessment
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              {assessorName}
              {autoSaveStatus === 'saved' && ' • Draft saved'}
              {autoSaveStatus === 'saving' && ' • Saving...'}
              {autoSaveStatus === 'error' && ' • Save failed'}
            </p>
          </div>
          
          <div className="flex-shrink-0">
            <AssessmentSyncStatus
              assessmentType={assessmentType}
              affectedEntityId={selectedEntityId}
              className="w-80"
              onViewQueue={() => {
                // Navigate to queue page - in a real app this would use router
                window.open('/queue', '_blank');
              }}
            />
          </div>
        </div>
      </div>

      {/* Entity Selection Section */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium mb-4 text-blue-800">Affected Entity Selection</h3>
        <div className="space-y-4">
          <EntitySelector
            selectedEntityId={selectedEntityId}
            onSelect={(entity) => {
              setSelectedEntityId(entity.id);
            }}
            onCreateNew={onCreateEntity}
            className="w-full"
          />
          {!selectedEntityId && (
            <p className="text-sm text-red-600">
              ⚠️ Please select an affected entity to continue with the assessment.
            </p>
          )}
          {selectedEntityId && (
            <p className="text-sm text-green-600">
              ✓ Entity selected. You can now complete the assessment.
            </p>
          )}
        </div>
      </div>

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
          Add photos, audio recordings, or videos to provide visual evidence for this assessment.
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
        {renderAssessmentFields(assessmentType, form)}
        
        <div className="flex justify-between pt-6 border-t">
          <div className="text-sm text-gray-500">
            {isOnline ? 'Will sync immediately' : 'Will sync when online'}
          </div>
          <div className="space-x-4">
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

// Helper function to get default form data based on assessment type
function getDefaultFormData(type: AssessmentType, initialData?: Partial<AssessmentData>): AssessmentData {
  const defaults = {
    [AssessmentType.HEALTH]: {
      hasFunctionalClinic: false,
      numberHealthFacilities: 0,
      healthFacilityType: '',
      qualifiedHealthWorkers: 0,
      hasMedicineSupply: false,
      hasMedicalSupplies: false,
      hasMaternalChildServices: false,
      commonHealthIssues: [],
    },
    [AssessmentType.WASH]: {
      isWaterSufficient: false,
      waterSource: [],
      waterQuality: 'Unknown' as const,
      hasToilets: false,
      numberToilets: 0,
      toiletType: '',
      hasSolidWasteDisposal: false,
      hasHandwashingFacilities: false,
    },
    [AssessmentType.SHELTER]: {
      areSheltersSufficient: false,
      shelterTypes: [],
      numberShelters: 0,
      shelterCondition: 'Good' as const,
      needsRepair: false,
      needsTarpaulin: false,
      needsBedding: false,
    },
    [AssessmentType.FOOD]: {
      foodSource: [],
      availableFoodDurationDays: 0,
      additionalFoodRequiredPersons: 0,
      additionalFoodRequiredHouseholds: 0,
      malnutritionCases: 0,
      feedingProgramExists: false,
    },
    [AssessmentType.SECURITY]: {
      isAreaSecure: false,
      securityThreats: [],
      hasSecurityPresence: false,
      securityProvider: '',
      incidentsReported: 0,
      restrictedMovement: false,
    },
    [AssessmentType.POPULATION]: {
      totalHouseholds: 0,
      totalPopulation: 0,
      populationMale: 0,
      populationFemale: 0,
      populationUnder5: 0,
      pregnantWomen: 0,
      lactatingMothers: 0,
      personWithDisability: 0,
      elderlyPersons: 0,
      separatedChildren: 0,
      numberLivesLost: 0,
      numberInjured: 0,
    },
    [AssessmentType.PRELIMINARY]: {
      incidentType: '' as any, // Force user selection
      incidentSubType: '',
      severity: '' as any, // Force user selection
      affectedPopulationEstimate: 0,
      affectedHouseholdsEstimate: 0,
      immediateNeedsDescription: '',
      accessibilityStatus: '' as any, // Force user selection
      priorityLevel: '' as any, // Force user selection
      additionalDetails: '',
    },
  };

  return { ...defaults[type], ...initialData } as AssessmentData;
}

// Helper function to render assessment-specific fields
function renderAssessmentFields(type: AssessmentType, form: any) {
  const { register, formState: { errors } } = form;

  switch (type) {
    case AssessmentType.HEALTH:
      return (
        <div className="space-y-4">
          <FormField>
            <FormLabel htmlFor="hasFunctionalClinic">Has Functional Clinic</FormLabel>
            <input
              type="checkbox"
              id="hasFunctionalClinic"
              {...register('data.hasFunctionalClinic')}
              className="h-4 w-4 text-blue-600 rounded"
            />
          </FormField>
          
          <FormField>
            <FormLabel htmlFor="numberHealthFacilities">Number of Health Facilities</FormLabel>
            <Input
              type="number"
              id="numberHealthFacilities"
              {...register('data.numberHealthFacilities', { valueAsNumber: true })}
            />
            {errors.data?.numberHealthFacilities && (
              <FormMessage>{errors.data.numberHealthFacilities.message}</FormMessage>
            )}
          </FormField>

          <FormField>
            <FormLabel htmlFor="healthFacilityType">Health Facility Type</FormLabel>
            <Input
              type="text"
              id="healthFacilityType"
              {...register('data.healthFacilityType')}
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="qualifiedHealthWorkers">Qualified Health Workers</FormLabel>
            <Input
              type="number"
              id="qualifiedHealthWorkers"
              {...register('data.qualifiedHealthWorkers', { valueAsNumber: true })}
            />
          </FormField>
        </div>
      );

    case AssessmentType.POPULATION:
      return (
        <div className="space-y-4">
          <FormField>
            <FormLabel htmlFor="totalHouseholds">Total Households</FormLabel>
            <Input
              type="number"
              id="totalHouseholds"
              {...register('data.totalHouseholds', { valueAsNumber: true })}
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="totalPopulation">Total Population</FormLabel>
            <Input
              type="number"
              id="totalPopulation"
              {...register('data.totalPopulation', { valueAsNumber: true })}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField>
              <FormLabel htmlFor="populationMale">Male Population</FormLabel>
              <Input
                type="number"
                id="populationMale"
                {...register('data.populationMale', { valueAsNumber: true })}
              />
            </FormField>

            <FormField>
              <FormLabel htmlFor="populationFemale">Female Population</FormLabel>
              <Input
                type="number"
                id="populationFemale"
                {...register('data.populationFemale', { valueAsNumber: true })}
              />
            </FormField>
          </div>

          <FormField>
            <FormLabel htmlFor="populationUnder5">Population Under 5</FormLabel>
            <Input
              type="number"
              id="populationUnder5"
              {...register('data.populationUnder5', { valueAsNumber: true })}
            />
          </FormField>
        </div>
      );

    case AssessmentType.WASH:
      return (
        <div className="space-y-4">
          <FormField>
            <FormLabel htmlFor="isWaterSufficient">Is Water Sufficient</FormLabel>
            <input
              type="checkbox"
              id="isWaterSufficient"
              {...register('data.isWaterSufficient')}
              className="h-4 w-4 text-blue-600 rounded"
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="waterQuality">Water Quality</FormLabel>
            <select
              id="waterQuality"
              {...register('data.waterQuality')}
              className="w-full p-2 border rounded"
            >
              <option value="Unknown">Unknown</option>
              <option value="Safe">Safe</option>
              <option value="Contaminated">Contaminated</option>
            </select>
          </FormField>

          <FormField>
            <FormLabel htmlFor="hasToilets">Has Toilets</FormLabel>
            <input
              type="checkbox"
              id="hasToilets"
              {...register('data.hasToilets')}
              className="h-4 w-4 text-blue-600 rounded"
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="numberToilets">Number of Toilets</FormLabel>
            <Input
              type="number"
              id="numberToilets"
              {...register('data.numberToilets', { valueAsNumber: true })}
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="toiletType">Toilet Type</FormLabel>
            <Input
              type="text"
              id="toiletType"
              {...register('data.toiletType')}
            />
          </FormField>
        </div>
      );

    case AssessmentType.SHELTER:
      return (
        <div className="space-y-4">
          <FormField>
            <FormLabel htmlFor="areSheltersSufficient">Are Shelters Sufficient</FormLabel>
            <input
              type="checkbox"
              id="areSheltersSufficient"
              {...register('data.areSheltersSufficient')}
              className="h-4 w-4 text-blue-600 rounded"
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="numberShelters">Number of Shelters</FormLabel>
            <Input
              type="number"
              id="numberShelters"
              {...register('data.numberShelters', { valueAsNumber: true })}
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="shelterCondition">Shelter Condition</FormLabel>
            <select
              id="shelterCondition"
              {...register('data.shelterCondition')}
              className="w-full p-2 border rounded"
            >
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
              <option value="Critical">Critical</option>
            </select>
          </FormField>

          <FormField>
            <FormLabel htmlFor="needsRepair">Needs Repair</FormLabel>
            <input
              type="checkbox"
              id="needsRepair"
              {...register('data.needsRepair')}
              className="h-4 w-4 text-blue-600 rounded"
            />
          </FormField>
        </div>
      );

    case AssessmentType.FOOD:
      return (
        <div className="space-y-4">
          <FormField>
            <FormLabel htmlFor="availableFoodDurationDays">Available Food Duration (Days)</FormLabel>
            <Input
              type="number"
              id="availableFoodDurationDays"
              {...register('data.availableFoodDurationDays', { valueAsNumber: true })}
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="additionalFoodRequiredPersons">Additional Food Required (Persons)</FormLabel>
            <Input
              type="number"
              id="additionalFoodRequiredPersons"
              {...register('data.additionalFoodRequiredPersons', { valueAsNumber: true })}
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="malnutritionCases">Malnutrition Cases</FormLabel>
            <Input
              type="number"
              id="malnutritionCases"
              {...register('data.malnutritionCases', { valueAsNumber: true })}
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="feedingProgramExists">Feeding Program Exists</FormLabel>
            <input
              type="checkbox"
              id="feedingProgramExists"
              {...register('data.feedingProgramExists')}
              className="h-4 w-4 text-blue-600 rounded"
            />
          </FormField>
        </div>
      );

    case AssessmentType.SECURITY:
      return (
        <div className="space-y-4">
          <FormField>
            <FormLabel htmlFor="isAreaSecure">Is Area Secure</FormLabel>
            <input
              type="checkbox"
              id="isAreaSecure"
              {...register('data.isAreaSecure')}
              className="h-4 w-4 text-blue-600 rounded"
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="hasSecurityPresence">Has Security Presence</FormLabel>
            <input
              type="checkbox"
              id="hasSecurityPresence"
              {...register('data.hasSecurityPresence')}
              className="h-4 w-4 text-blue-600 rounded"
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="securityProvider">Security Provider</FormLabel>
            <Input
              type="text"
              id="securityProvider"
              {...register('data.securityProvider')}
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="incidentsReported">Incidents Reported</FormLabel>
            <Input
              type="number"
              id="incidentsReported"
              {...register('data.incidentsReported', { valueAsNumber: true })}
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="restrictedMovement">Restricted Movement</FormLabel>
            <input
              type="checkbox"
              id="restrictedMovement"
              {...register('data.restrictedMovement')}
              className="h-4 w-4 text-blue-600 rounded"
            />
          </FormField>
        </div>
      );

    case AssessmentType.PRELIMINARY:
      return (
        <div className="space-y-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-lg font-semibold text-red-800 mb-4">🚨 Emergency Incident Report</h3>
            
            {/* Incident Type Field */}
            <div className="mb-4">
              <FormLabel htmlFor="incidentType" className="block text-sm font-medium text-red-700 mb-2">
                Incident Type *
              </FormLabel>
              <select 
                id="incidentType"
                {...register('data.incidentType')} 
                className="w-full p-2 border border-red-200 rounded-md focus:border-red-500 focus:ring-red-500"
              >
                <option value="">Select incident type...</option>
                <option value="FLOOD">Flood</option>
                <option value="FIRE">Fire</option>
                <option value="LANDSLIDE">Landslide</option>
                <option value="CYCLONE">Cyclone</option>
                <option value="CONFLICT">Conflict</option>
                <option value="EPIDEMIC">Epidemic</option>
                <option value="EARTHQUAKE">Earthquake</option>
                <option value="WILDFIRE">Wildfire</option>
                <option value="OTHER">Other</option>
              </select>
              {errors.data?.incidentType && (
                <FormMessage className="text-red-600">{errors.data.incidentType.message}</FormMessage>
              )}
            </div>

            {/* Incident Sub Type */}
            <div className="mb-4">
              <FormLabel htmlFor="incidentSubType" className="block text-sm font-medium text-red-700 mb-2">
                Incident Sub Type
              </FormLabel>
              <Input
                type="text"
                id="incidentSubType"
                {...register('data.incidentSubType')}
                className="w-full p-2 border border-red-200 rounded-md focus:border-red-500 focus:ring-red-500"
                placeholder="e.g., Flash flood, Wildfire, etc."
              />
            </div>

            {/* Severity Field */}
            <div className="mb-4">
              <FormLabel htmlFor="severity" className="block text-sm font-medium text-red-700 mb-2">
                Severity Level *
              </FormLabel>
              <select 
                id="severity"
                {...register('data.severity')} 
                className="w-full p-2 border border-red-200 rounded-md focus:border-red-500 focus:ring-red-500"
              >
                <option value="">Select severity...</option>
                <option value="MINOR">Minor</option>
                <option value="MODERATE">Moderate</option>
                <option value="SEVERE">Severe</option>
                <option value="CATASTROPHIC">Catastrophic</option>
              </select>
              {errors.data?.severity && (
                <FormMessage className="text-red-600">{errors.data.severity.message}</FormMessage>
              )}
            </div>

            {/* Population Estimates */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <FormLabel htmlFor="affectedPopulationEstimate" className="block text-sm font-medium text-red-700 mb-2">
                  Affected Population *
                </FormLabel>
                <Input 
                  type="number" 
                  id="affectedPopulationEstimate"
                  {...register('data.affectedPopulationEstimate', { valueAsNumber: true })}
                  className="w-full p-2 border border-red-200 rounded-md focus:border-red-500 focus:ring-red-500"
                  min="0"
                  placeholder="0"
                />
                {errors.data?.affectedPopulationEstimate && (
                  <FormMessage className="text-red-600">{errors.data.affectedPopulationEstimate.message}</FormMessage>
                )}
              </div>
              <div>
                <FormLabel htmlFor="affectedHouseholdsEstimate" className="block text-sm font-medium text-red-700 mb-2">
                  Affected Households *
                </FormLabel>
                <Input 
                  type="number" 
                  id="affectedHouseholdsEstimate"
                  {...register('data.affectedHouseholdsEstimate', { valueAsNumber: true })}
                  className="w-full p-2 border border-red-200 rounded-md focus:border-red-500 focus:ring-red-500"
                  min="0"
                  placeholder="0"
                />
                {errors.data?.affectedHouseholdsEstimate && (
                  <FormMessage className="text-red-600">{errors.data.affectedHouseholdsEstimate.message}</FormMessage>
                )}
              </div>
            </div>

            {/* Immediate Needs */}
            <div className="mb-4">
              <FormLabel htmlFor="immediateNeedsDescription" className="block text-sm font-medium text-red-700 mb-2">
                Immediate Needs Description *
              </FormLabel>
              <textarea 
                id="immediateNeedsDescription"
                {...register('data.immediateNeedsDescription')}
                className="w-full p-2 border border-red-200 rounded-md h-24 focus:border-red-500 focus:ring-red-500"
                placeholder="Describe urgent needs and required assistance..."
              />
              {errors.data?.immediateNeedsDescription && (
                <FormMessage className="text-red-600">{errors.data.immediateNeedsDescription.message}</FormMessage>
              )}
            </div>

            {/* Accessibility Status */}
            <div className="mb-4">
              <FormLabel htmlFor="accessibilityStatus" className="block text-sm font-medium text-red-700 mb-2">
                Site Accessibility *
              </FormLabel>
              <select 
                id="accessibilityStatus"
                {...register('data.accessibilityStatus')} 
                className="w-full p-2 border border-red-200 rounded-md focus:border-red-500 focus:ring-red-500"
              >
                <option value="">Select accessibility...</option>
                <option value="ACCESSIBLE">Accessible</option>
                <option value="PARTIALLY_ACCESSIBLE">Partially Accessible</option>
                <option value="INACCESSIBLE">Inaccessible</option>
              </select>
              {errors.data?.accessibilityStatus && (
                <FormMessage className="text-red-600">{errors.data.accessibilityStatus.message}</FormMessage>
              )}
            </div>

            {/* Priority Level */}
            <div className="mb-4">
              <FormLabel className="block text-sm font-medium text-red-700 mb-2">
                Response Priority *
              </FormLabel>
              <div className="grid grid-cols-3 gap-2">
                {['LOW', 'NORMAL', 'HIGH'].map(priority => (
                  <label key={priority} className="flex items-center p-2 border border-red-200 rounded-md cursor-pointer hover:bg-red-50">
                    <input 
                      type="radio" 
                      {...register('data.priorityLevel')}
                      value={priority}
                      className="mr-2"
                    />
                    <span className={`text-sm ${priority === 'HIGH' ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                      {priority}
                    </span>
                  </label>
                ))}
              </div>
              {errors.data?.priorityLevel && (
                <FormMessage className="text-red-600">{errors.data.priorityLevel.message}</FormMessage>
              )}
            </div>

            {/* Additional Details */}
            <div className="mb-4">
              <FormLabel htmlFor="additionalDetails" className="block text-sm font-medium text-red-700 mb-2">
                Additional Details
              </FormLabel>
              <textarea 
                id="additionalDetails"
                {...register('data.additionalDetails')}
                className="w-full p-2 border border-red-200 rounded-md h-20 focus:border-red-500 focus:ring-red-500"
                placeholder="Any additional information about the situation..."
              />
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="text-center py-8 text-gray-500">
          Form fields for {type} assessment type not yet implemented
        </div>
      );
  }
}