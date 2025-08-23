'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import debounce from 'lodash.debounce';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ResponseType,
  type ResponsePlanDraft,
  type AffectedEntity,
  type RapidAssessment,
  ResponsePlanFormSchema,
  type ResponsePlanFormData,
  generateOfflineId,
} from '@dms/shared';
import { useResponseStore } from '@/stores/response.store';
import { useGPS } from '@/hooks/useGPS';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, FormLabel, FormMessage } from '@/components/ui/form';
import { ItemQuantityPlanner } from './ItemQuantityPlanner';
import { DeliveryTimelinePlanner } from './DeliveryTimelinePlanner';
import { EntityAssessmentLinker } from './EntityAssessmentLinker';

interface ResponsePlanningFormProps {
  initialResponseType?: ResponseType;
  initialEntityId?: string;
  initialAssessmentId?: string;
  onSave?: (draft: ResponsePlanDraft) => void;
  onCancel?: () => void;
  className?: string;
}

// Response type tabs configuration
const RESPONSE_TYPES = [
  { type: ResponseType.HEALTH, label: 'Health', icon: '🏥', color: 'bg-red-50 border-red-200 text-red-800' },
  { type: ResponseType.WASH, label: 'WASH', icon: '💧', color: 'bg-blue-50 border-blue-200 text-blue-800' },
  { type: ResponseType.SHELTER, label: 'Shelter', icon: '🏠', color: 'bg-orange-50 border-orange-200 text-orange-800' },
  { type: ResponseType.FOOD, label: 'Food', icon: '🍚', color: 'bg-green-50 border-green-200 text-green-800' },
  { type: ResponseType.SECURITY, label: 'Security', icon: '🛡️', color: 'bg-purple-50 border-purple-200 text-purple-800' },
  { type: ResponseType.POPULATION, label: 'Population', icon: '👥', color: 'bg-gray-50 border-gray-200 text-gray-800' },
];

export function ResponsePlanningForm({
  initialResponseType = ResponseType.HEALTH,
  initialEntityId,
  initialAssessmentId,
  onSave,
  onCancel,
  className,
}: ResponsePlanningFormProps) {
  const [activeResponseType, setActiveResponseType] = useState<ResponseType>(initialResponseType);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<AffectedEntity | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<RapidAssessment | null>(null);

  const {
    currentDraft,
    createDraft,
    updateDraft,
    saveDraftToQueue,
    isCreating,
    error,
    clearError,
    availableEntities,
    availableAssessments,
    loadPlanningData,
  } = useResponseStore();

  const { captureLocation, isLoading: isCapturingGPS } = useGPS();

  // Initialize form with comprehensive schema
  const form = useForm<ResponsePlanFormData>({
    resolver: zodResolver(ResponsePlanFormSchema),
    defaultValues: {
      responseType: activeResponseType,
      affectedEntityId: initialEntityId || '',
      assessmentId: initialAssessmentId,
      plannedDate: new Date(),
      data: getDefaultResponseData(activeResponseType),
      otherItemsDelivered: [],
      notes: '',
    },
    mode: 'onChange',
  });

  const { setValue, getValues, handleSubmit, formState: { errors, isDirty } } = form;

  // Use useWatch instead of watch to prevent infinite loops
  const watchedPlannedDate = useWatch({ control: form.control, name: 'plannedDate' });
  const watchedOtherItems = useWatch({ control: form.control, name: 'otherItemsDelivered' });

  // Load planning data on component mount
  useEffect(() => {
    loadPlanningData();
  }, [loadPlanningData]);

  // Create or load draft when component initializes
  useEffect(() => {
    if (!currentDraft && initialEntityId) {
      const draftId = createDraft(activeResponseType, initialEntityId);
      if (initialAssessmentId) {
        updateDraft(draftId, { assessmentId: initialAssessmentId });
      }
    }
  }, [activeResponseType, initialEntityId, initialAssessmentId, currentDraft, createDraft, updateDraft]);

  // Auto-save functionality - properly debounced to prevent infinite loops
  const autoSaveFunction = useCallback(() => {
    if (isDirty && currentDraft) {
      setIsAutoSaving(true);
      const formData = getValues();
      updateDraft(currentDraft.id, formData);
      setLastAutoSave(new Date());
      setTimeout(() => setIsAutoSaving(false), 1000);
    }
  }, [isDirty, currentDraft, getValues, updateDraft]);

  const debouncedAutoSave = useMemo(
    () => debounce(autoSaveFunction, 2000),
    [autoSaveFunction]
  );

  // Auto-save when form becomes dirty
  useEffect(() => {
    if (isDirty) {
      debouncedAutoSave();
    }
    return () => {
      debouncedAutoSave.cancel();
    };
  }, [isDirty, debouncedAutoSave]);

  // Memoize expensive operations
  const defaultResponseData = useMemo(() => getDefaultResponseData(activeResponseType), [activeResponseType]);

  // Response type handler - memoized to prevent infinite loops but preserve functionality
  const handleResponseTypeChange = useCallback((newType: ResponseType) => {
    // Update local state
    setActiveResponseType(newType);
    
    // Update form values with controlled options to prevent cascades
    const defaultData = getDefaultResponseData(newType);
    setValue('responseType', newType, { shouldValidate: false, shouldDirty: true, shouldTouch: false });
    setValue('data', defaultData, { shouldValidate: false, shouldDirty: true, shouldTouch: false });
    
    // Create or update draft in store
    if (currentDraft) {
      updateDraft(currentDraft.id, {
        responseType: newType,
        data: defaultData,
      });
    } else {
      // Create a new draft if none exists
      const draftId = createDraft(newType, initialEntityId || '');
      updateDraft(draftId, {
        responseType: newType,
        data: defaultData,
      });
    }
  }, [setValue, currentDraft, updateDraft, createDraft, initialEntityId]);

  // Handle entity selection - memoized to prevent infinite loops
  const handleEntitySelect = useCallback((entity: AffectedEntity) => {
    setSelectedEntity(entity);
    setValue('affectedEntityId', entity.id, { shouldValidate: false, shouldDirty: false });
    
    if (currentDraft) {
      updateDraft(currentDraft.id, { affectedEntityId: entity.id });
    }
    
    // Capture GPS location for travel time estimation
    captureLocation().then(location => {
      if (location) {
        // Calculate estimated travel time based on distance
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          entity.latitude,
          entity.longitude
        );
        const estimatedTravelTime = Math.round(distance * 2); // Rough estimate: 2 minutes per km
        
        if (currentDraft) {
          updateDraft(currentDraft.id, { travelTimeToLocation: estimatedTravelTime });
        }
      }
    }).catch(console.error);
  }, [setValue, currentDraft, updateDraft, captureLocation]);

  // Handle assessment selection - memoized to prevent infinite loops  
  const handleAssessmentSelect = useCallback((assessment: RapidAssessment) => {
    setSelectedAssessment(assessment);
    setValue('assessmentId', assessment.id, { shouldValidate: false, shouldDirty: false });
    
    if (currentDraft) {
      updateDraft(currentDraft.id, { assessmentId: assessment.id });
    }
  }, [setValue, currentDraft, updateDraft]);

  // Handle form submission
  const onSubmit = async (data: ResponsePlanFormData) => {
    if (!currentDraft) {
      console.error('No current draft to save');
      return;
    }

    try {
      // Update draft with final form data
      updateDraft(currentDraft.id, {
        ...data,
        plannedDate: new Date(data.plannedDate),
      });

      // Save to queue for sync
      await saveDraftToQueue(currentDraft.id);
      
      // Call onSave callback if provided
      if (onSave && currentDraft) {
        onSave(currentDraft);
      }
    } catch (error) {
      console.error('Failed to save response plan:', error);
    }
  };

  // Handle items update from ItemQuantityPlanner - memoized to prevent infinite loops
  const handleItemsUpdate = useCallback((items: { item: string; quantity: number; unit: string }[]) => {
    const currentItems = getValues('otherItemsDelivered') || [];
    
    // Only update if items actually changed
    if (JSON.stringify(currentItems) !== JSON.stringify(items)) {
      setValue('otherItemsDelivered', items, { shouldValidate: false, shouldDirty: false });
      
      if (currentDraft) {
        updateDraft(currentDraft.id, { otherItemsDelivered: items });
      }
    }
  }, [setValue, getValues, currentDraft, updateDraft]);

  // Handle timeline update from DeliveryTimelinePlanner - memoized to prevent infinite loops
  const handleTimelineUpdate = useCallback((timeline: { 
    plannedDate: Date; 
    estimatedDeliveryTime?: number;
    notes?: string;
  }) => {
    const currentDate = getValues('plannedDate');
    
    // Only update if date actually changed
    if (currentDate?.getTime() !== timeline.plannedDate.getTime()) {
      setValue('plannedDate', timeline.plannedDate, { shouldValidate: false, shouldDirty: false });
    }
    
    if (currentDraft) {
      updateDraft(currentDraft.id, {
        plannedDate: timeline.plannedDate,
        estimatedDeliveryTime: timeline.estimatedDeliveryTime,
        notes: timeline.notes || currentDraft.notes,
      });
    }
  }, [setValue, getValues, currentDraft, updateDraft]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with response type tabs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Response Planning</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {isAutoSaving && (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Auto-saving...
              </span>
            )}
            {lastAutoSave && !isAutoSaving && (
              <span>Last saved: {lastAutoSave.toLocaleTimeString()}</span>
            )}
          </div>
        </div>

        {/* Response Type Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg overflow-x-auto">
          {RESPONSE_TYPES.map(({ type, label, icon, color }) => (
            <button
              key={type}
              type="button"
              onClick={() => handleResponseTypeChange(type)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeResponseType === type
                  ? `${color} ring-1 ring-inset`
                  : 'text-gray-600 hover:bg-white hover:text-gray-900'
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearError}
            className="mt-2 text-red-600 hover:text-red-800"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Main Form */}
      <FormProvider {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Entity and Assessment Selection */}
          <EntityAssessmentLinker
            selectedEntity={selectedEntity}
            selectedAssessment={selectedAssessment}
            availableEntities={availableEntities}
            availableAssessments={availableAssessments}
            onEntitySelect={handleEntitySelect}
            onAssessmentSelect={handleAssessmentSelect}
            responseType={activeResponseType}
          />

          {/* Delivery Timeline Planning */}
          <DeliveryTimelinePlanner
            initialDate={watchedPlannedDate}
            travelTimeToLocation={currentDraft?.travelTimeToLocation}
            onTimelineUpdate={handleTimelineUpdate}
            className="bg-gray-50 p-4 rounded-lg"
          />

          {/* Response-Specific Fields */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              {RESPONSE_TYPES.find(rt => rt.type === activeResponseType)?.label} Response Details
            </h3>
            
            {/* Dynamic response fields based on type */}
            {renderResponseTypeFields(activeResponseType, form)}
          </div>

          {/* Item Quantity Planner */}
          <ItemQuantityPlanner
            responseType={activeResponseType}
            initialItems={watchedOtherItems || []}
            onItemsUpdate={handleItemsUpdate}
            className="bg-gray-50 p-4 rounded-lg"
          />

          {/* Additional Notes */}
          <div className="space-y-2">
            <FormLabel htmlFor="notes">Additional Notes</FormLabel>
            <textarea
              id="notes"
              {...form.register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any additional notes or special instructions..."
            />
            {errors.notes && <FormMessage>{errors.notes.message}</FormMessage>}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-6">
            <div className="flex gap-3">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={debouncedAutoSave}
                disabled={!isDirty || isAutoSaving}
                className="flex items-center gap-2"
              >
                {isAutoSaving ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                ) : null}
                Save Draft
              </Button>
            </div>
            
            <Button
              type="submit"
              disabled={isCreating || !selectedEntity}
              className="flex items-center gap-2"
            >
              {isCreating ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : null}
              Submit Response Plan
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}

// Helper function to get default response data based on type
function getDefaultResponseData(responseType: ResponseType) {
  switch (responseType) {
    case ResponseType.HEALTH:
      return {
        medicinesDelivered: [],
        medicalSuppliesDelivered: [],
        healthWorkersDeployed: 0,
        patientsTreated: 0,
      };
    case ResponseType.WASH:
      return {
        waterDeliveredLiters: 0,
        waterContainersDistributed: 0,
        toiletsConstructed: 0,
        hygieneKitsDistributed: 0,
      };
    case ResponseType.SHELTER:
      return {
        sheltersProvided: 0,
        tarpaulinsDistributed: 0,
        beddingKitsDistributed: 0,
        repairsCompleted: 0,
      };
    case ResponseType.FOOD:
      return {
        foodItemsDelivered: [],
        householdsServed: 0,
        personsServed: 0,
        nutritionSupplementsProvided: 0,
      };
    case ResponseType.SECURITY:
      return {
        securityPersonnelDeployed: 0,
        checkpointsEstablished: 0,
        patrolsCompleted: 0,
        incidentsResolved: 0,
      };
    case ResponseType.POPULATION:
      return {
        evacuationsCompleted: 0,
        familiesReunited: 0,
        documentationProvided: 0,
        referralsMade: 0,
      };
    default:
      return {};
  }
}

// Helper function to render response type specific fields
function renderResponseTypeFields(responseType: ResponseType, form: any) {
  const { register, formState: { errors } } = form;
  
  const fieldClass = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
  
  switch (responseType) {
    case ResponseType.HEALTH:
      return (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FormLabel>Health Workers Deployed</FormLabel>
            <Input
              type="number"
              {...register('data.healthWorkersDeployed', { valueAsNumber: true })}
              className={fieldClass}
              min="0"
            />
          </div>
          <div>
            <FormLabel>Patients Treated</FormLabel>
            <Input
              type="number"
              {...register('data.patientsTreated', { valueAsNumber: true })}
              className={fieldClass}
              min="0"
            />
          </div>
        </div>
      );
    case ResponseType.WASH:
      return (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FormLabel>Water Delivered (Liters)</FormLabel>
            <Input
              type="number"
              {...register('data.waterDeliveredLiters', { valueAsNumber: true })}
              className={fieldClass}
              min="0"
            />
          </div>
          <div>
            <FormLabel>Water Containers Distributed</FormLabel>
            <Input
              type="number"
              {...register('data.waterContainersDistributed', { valueAsNumber: true })}
              className={fieldClass}
              min="0"
            />
          </div>
          <div>
            <FormLabel>Toilets Constructed</FormLabel>
            <Input
              type="number"
              {...register('data.toiletsConstructed', { valueAsNumber: true })}
              className={fieldClass}
              min="0"
            />
          </div>
          <div>
            <FormLabel>Hygiene Kits Distributed</FormLabel>
            <Input
              type="number"
              {...register('data.hygieneKitsDistributed', { valueAsNumber: true })}
              className={fieldClass}
              min="0"
            />
          </div>
        </div>
      );
    case ResponseType.SHELTER:
      return (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FormLabel>Shelters Provided</FormLabel>
            <Input
              type="number"
              {...register('data.sheltersProvided', { valueAsNumber: true })}
              className={fieldClass}
              min="0"
            />
          </div>
          <div>
            <FormLabel>Tarpaulins Distributed</FormLabel>
            <Input
              type="number"
              {...register('data.tarpaulinsDistributed', { valueAsNumber: true })}
              className={fieldClass}
              min="0"
            />
          </div>
          <div>
            <FormLabel>Bedding Kits Distributed</FormLabel>
            <Input
              type="number"
              {...register('data.beddingKitsDistributed', { valueAsNumber: true })}
              className={fieldClass}
              min="0"
            />
          </div>
          <div>
            <FormLabel>Repairs Completed</FormLabel>
            <Input
              type="number"
              {...register('data.repairsCompleted', { valueAsNumber: true })}
              className={fieldClass}
              min="0"
            />
          </div>
        </div>
      );
    case ResponseType.FOOD:
      return (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FormLabel>Households Served</FormLabel>
            <Input
              type="number"
              {...register('data.householdsServed', { valueAsNumber: true })}
              className={fieldClass}
              min="0"
            />
          </div>
          <div>
            <FormLabel>Persons Served</FormLabel>
            <Input
              type="number"
              {...register('data.personsServed', { valueAsNumber: true })}
              className={fieldClass}
              min="0"
            />
          </div>
          <div>
            <FormLabel>Nutrition Supplements Provided</FormLabel>
            <Input
              type="number"
              {...register('data.nutritionSupplementsProvided', { valueAsNumber: true })}
              className={fieldClass}
              min="0"
            />
          </div>
        </div>
      );
    case ResponseType.SECURITY:
      return (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FormLabel>Security Personnel Deployed</FormLabel>
            <Input
              type="number"
              {...register('data.securityPersonnelDeployed', { valueAsNumber: true })}
              className={fieldClass}
              min="0"
            />
          </div>
          <div>
            <FormLabel>Checkpoints Established</FormLabel>
            <Input
              type="number"
              {...register('data.checkpointsEstablished', { valueAsNumber: true })}
              className={fieldClass}
              min="0"
            />
          </div>
          <div>
            <FormLabel>Patrols Completed</FormLabel>
            <Input
              type="number"
              {...register('data.patrolsCompleted', { valueAsNumber: true })}
              className={fieldClass}
              min="0"
            />
          </div>
          <div>
            <FormLabel>Incidents Resolved</FormLabel>
            <Input
              type="number"
              {...register('data.incidentsResolved', { valueAsNumber: true })}
              className={fieldClass}
              min="0"
            />
          </div>
        </div>
      );
    case ResponseType.POPULATION:
      return (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FormLabel>Evacuations Completed</FormLabel>
            <Input
              type="number"
              {...register('data.evacuationsCompleted', { valueAsNumber: true })}
              className={fieldClass}
              min="0"
            />
          </div>
          <div>
            <FormLabel>Families Reunited</FormLabel>
            <Input
              type="number"
              {...register('data.familiesReunited', { valueAsNumber: true })}
              className={fieldClass}
              min="0"
            />
          </div>
          <div>
            <FormLabel>Documentation Provided</FormLabel>
            <Input
              type="number"
              {...register('data.documentationProvided', { valueAsNumber: true })}
              className={fieldClass}
              min="0"
            />
          </div>
          <div>
            <FormLabel>Referrals Made</FormLabel>
            <Input
              type="number"
              {...register('data.referralsMade', { valueAsNumber: true })}
              className={fieldClass}
              min="0"
            />
          </div>
        </div>
      );
    default:
      return null;
  }
}

// Helper function to calculate distance between two GPS coordinates (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}