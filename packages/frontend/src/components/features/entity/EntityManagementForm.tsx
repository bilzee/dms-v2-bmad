'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  EntityManagementFormSchema,
  EntityFormData,
  generateUUID,
  generateOfflineId,
  validateCoordinates,
  isWithinNigeriaBounds,
  type AffectedEntity,
  type GPSCoordinates,
} from '@dms/shared';
import { useGPS } from '@/hooks/useGPS';
import { useOfflineStore } from '@/stores/offline.store';
import { db } from '@/lib/offline/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, FormLabel, FormMessage } from '@/components/ui/form';

interface EntityManagementFormProps {
  onSubmit?: (entity: AffectedEntity) => void;
  onSaveDraft?: (draftData: EntityFormData) => void;
  initialData?: Partial<EntityFormData>;
  editingId?: string; // For editing existing entities
}

export const EntityManagementForm: React.FC<EntityManagementFormProps> = ({
  onSubmit,
  onSaveDraft,
  initialData,
  editingId,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [manualCoordinates, setManualCoordinates] = useState({
    latitude: initialData?.latitude || '',
    longitude: initialData?.longitude || '',
  });

  const { coordinates, captureLocation, isLoading: gpsLoading, error: gpsError } = useGPS();
  const { isOnline, addToQueue } = useOfflineStore();

  const form = useForm<EntityFormData>({
    resolver: zodResolver(EntityManagementFormSchema),
    defaultValues: (() => {
      const type = initialData?.type || 'CAMP';
      return {
        type,
        name: initialData?.name || '',
        lga: initialData?.lga || '',
        ward: initialData?.ward || '',
        longitude: initialData?.longitude || 0,
        latitude: initialData?.latitude || 0,
        campDetails: type === 'CAMP' ? ((initialData as any)?.campDetails || {
          campName: '',
          campStatus: 'OPEN' as const,
          campCoordinatorName: '',
          campCoordinatorPhone: '',
          superviserName: '',
          superviserOrganization: '',
          estimatedPopulation: undefined,
        }) : undefined,
        communityDetails: type === 'COMMUNITY' ? ((initialData as any)?.communityDetails || {
          communityName: '',
          contactPersonName: '',
          contactPersonPhone: '',
          contactPersonRole: '',
          estimatedHouseholds: undefined,
        }) : undefined,
      } as EntityFormData;
    })(),
  });

  const { handleSubmit, watch, setValue, formState: { errors, isDirty } } = form;
  const entityType = watch('type');

  // Update form fields when entity type changes
  useEffect(() => {
    if (entityType === 'CAMP') {
      (setValue as any)('communityDetails', undefined);
      (setValue as any)('campDetails', {
        campName: '',
        campStatus: 'OPEN',
        campCoordinatorName: '',
        campCoordinatorPhone: '',
        superviserName: '',
        superviserOrganization: '',
        estimatedPopulation: undefined,
      });
    } else if (entityType === 'COMMUNITY') {
      (setValue as any)('campDetails', undefined);
      (setValue as any)('communityDetails', {
        communityName: '',
        contactPersonName: '',
        contactPersonPhone: '',
        contactPersonRole: '',
        estimatedHouseholds: undefined,
      });
    }
  }, [entityType, setValue]);

  // Update coordinates when GPS capture succeeds
  useEffect(() => {
    if (coordinates) {
      setValue('latitude', coordinates.latitude);
      setValue('longitude', coordinates.longitude);
      setManualCoordinates({
        latitude: coordinates.latitude.toString(),
        longitude: coordinates.longitude.toString(),
      });
    }
  }, [coordinates, setValue]);

  // Auto-save functionality
  useEffect(() => {
    if (!isDirty) return;

    const autoSaveTimer = setTimeout(async () => {
      try {
        setAutoSaveStatus('saving');
        const formData = form.getValues();
        
        const draftId = `entity_draft_${entityType}_${Date.now()}`;
        await db.saveEntityDraft({
          id: draftId,
          type: entityType,
          data: formData,
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
  }, [watch(), isDirty, entityType, form, onSaveDraft]);

  const handleManualCoordinateChange = useCallback((field: 'latitude' | 'longitude', value: string) => {
    setManualCoordinates(prev => ({ ...prev, [field]: value }));
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setValue(field, numValue);
    }
  }, [setValue]);

  const validateManualCoordinates = useCallback(() => {
    const lat = parseFloat(manualCoordinates.latitude);
    const lng = parseFloat(manualCoordinates.longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      return 'Please enter valid coordinates';
    }
    
    if (!validateCoordinates(lat, lng)) {
      return 'Coordinates out of valid range (Lat: -90 to 90, Lng: -180 to 180)';
    }
    
    if (!isWithinNigeriaBounds(lat, lng)) {
      return 'Warning: Coordinates outside Nigeria bounds (recommended: Lat 4°-14°N, Lng 3°-15°E)';
    }
    
    return null;
  }, [manualCoordinates]);

  const handleFormSubmit = async (data: EntityFormData) => {
    try {
      setIsSubmitting(true);

      // Validate coordinates
      const coordinateError = validateManualCoordinates();
      if (coordinateError && (coordinateError.startsWith('Please enter valid') || coordinateError.startsWith('Coordinates out of valid'))) {
        alert(coordinateError);
        return;
      }

      const entity: AffectedEntity = {
        id: editingId || generateUUID(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save to IndexedDB
      await db.saveEntity(entity);

      if (isOnline) {
        // Add to sync queue for immediate processing
        addToQueue({
          type: 'ENTITY',
          action: editingId ? 'UPDATE' : 'CREATE',
          entityId: editingId,
          data: entity,
          priority: 'HIGH', // Entity operations are high priority as assessments depend on them
        });
      }

      onSubmit?.(entity);
      
      // Reset form after successful submission
      if (!editingId) {
        form.reset();
        setManualCoordinates({ latitude: '', longitude: '' });
      }
      setAutoSaveStatus('idle');
      
    } catch (error) {
      console.error('Failed to submit entity:', error);
      alert('Failed to save entity. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {editingId ? 'Edit' : 'Create'} Affected Entity
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          {isOnline ? 'Online' : 'Offline'} • Create or manage camps and communities for assessment tracking
          {autoSaveStatus === 'saved' && ' • Draft saved'}
          {autoSaveStatus === 'saving' && ' • Saving...'}
          {autoSaveStatus === 'error' && ' • Save failed'}
        </p>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Entity Type Selection */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <FormField>
            <FormLabel htmlFor="type">Entity Type</FormLabel>
            <select
              id="type"
              {...form.register('type')}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              disabled={!!editingId} // Don't allow changing type when editing
            >
              <option value="CAMP">IDP Camp</option>
              <option value="COMMUNITY">Community</option>
            </select>
            {errors.type && <FormMessage>{errors.type.message}</FormMessage>}
          </FormField>
        </div>

        {/* Basic Entity Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField>
            <FormLabel htmlFor="name">Entity Name *</FormLabel>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="Enter entity name"
            />
            {errors.name && <FormMessage>{errors.name.message}</FormMessage>}
          </FormField>

          <FormField>
            <FormLabel htmlFor="lga">Local Government Area (LGA) *</FormLabel>
            <Input
              id="lga"
              {...form.register('lga')}
              placeholder="Enter LGA"
            />
            {errors.lga && <FormMessage>{errors.lga.message}</FormMessage>}
          </FormField>

          <FormField>
            <FormLabel htmlFor="ward">Ward *</FormLabel>
            <Input
              id="ward"
              {...form.register('ward')}
              placeholder="Enter ward"
            />
            {errors.ward && <FormMessage>{errors.ward.message}</FormMessage>}
          </FormField>
        </div>

        {/* GPS Location Section */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium">Location Coordinates</h3>
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

          {/* Manual Coordinate Entry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField>
              <FormLabel htmlFor="latitude">Latitude *</FormLabel>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={manualCoordinates.latitude}
                onChange={(e) => handleManualCoordinateChange('latitude', e.target.value)}
                placeholder="Enter latitude"
              />
              {errors.latitude && <FormMessage>{errors.latitude.message}</FormMessage>}
            </FormField>

            <FormField>
              <FormLabel htmlFor="longitude">Longitude *</FormLabel>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={manualCoordinates.longitude}
                onChange={(e) => handleManualCoordinateChange('longitude', e.target.value)}
                placeholder="Enter longitude"
              />
              {errors.longitude && <FormMessage>{errors.longitude.message}</FormMessage>}
            </FormField>
          </div>

          {/* Coordinate validation feedback */}
          {manualCoordinates.latitude && manualCoordinates.longitude && (
            <div className="mt-2">
              {(() => {
                const validationError = validateManualCoordinates();
                if (validationError) {
                  const isWarning = validationError.startsWith('Warning:');
                  return (
                    <p className={`text-sm ${isWarning ? 'text-yellow-600' : 'text-red-600'}`}>
                      {validationError}
                    </p>
                  );
                } else {
                  return <p className="text-sm text-green-600">✓ Coordinates are valid</p>;
                }
              })()}
            </div>
          )}
        </div>

        {/* Conditional Fields Based on Entity Type */}
        {entityType === 'CAMP' ? (
          <div className="p-4 bg-orange-50 rounded-lg">
            <h3 className="font-medium mb-4 text-orange-800">Camp Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField>
                  <FormLabel htmlFor="campDetails.campName">Camp Name *</FormLabel>
                  <Input
                    id="campDetails.campName"
                    {...form.register('campDetails.campName')}
                    placeholder="Enter camp name"
                  />
                  {(errors as any).campDetails?.campName && (
                    <FormMessage>{(errors as any).campDetails.campName.message}</FormMessage>
                  )}
                </FormField>

                <FormField>
                  <FormLabel htmlFor="campDetails.campStatus">Camp Status</FormLabel>
                  <select
                    id="campDetails.campStatus"
                    {...form.register('campDetails.campStatus')}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="OPEN">Open</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField>
                  <FormLabel htmlFor="campDetails.campCoordinatorName">Coordinator Name *</FormLabel>
                  <Input
                    id="campDetails.campCoordinatorName"
                    {...form.register('campDetails.campCoordinatorName')}
                    placeholder="Enter coordinator name"
                  />
                  {(errors as any).campDetails?.campCoordinatorName && (
                    <FormMessage>{(errors as any).campDetails.campCoordinatorName.message}</FormMessage>
                  )}
                </FormField>

                <FormField>
                  <FormLabel htmlFor="campDetails.campCoordinatorPhone">Coordinator Phone *</FormLabel>
                  <Input
                    id="campDetails.campCoordinatorPhone"
                    type="tel"
                    {...form.register('campDetails.campCoordinatorPhone')}
                    placeholder="+234..."
                  />
                  {(errors as any).campDetails?.campCoordinatorPhone && (
                    <FormMessage>{(errors as any).campDetails.campCoordinatorPhone.message}</FormMessage>
                  )}
                </FormField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField>
                  <FormLabel htmlFor="campDetails.superviserName">Supervisor Name</FormLabel>
                  <Input
                    id="campDetails.superviserName"
                    {...form.register('campDetails.superviserName')}
                    placeholder="Enter supervisor name (optional)"
                  />
                </FormField>

                <FormField>
                  <FormLabel htmlFor="campDetails.superviserOrganization">Supervisor Organization</FormLabel>
                  <Input
                    id="campDetails.superviserOrganization"
                    {...form.register('campDetails.superviserOrganization')}
                    placeholder="Enter organization (optional)"
                  />
                </FormField>
              </div>

              <FormField>
                <FormLabel htmlFor="campDetails.estimatedPopulation">Estimated Population</FormLabel>
                <Input
                  id="campDetails.estimatedPopulation"
                  type="number"
                  min="0"
                  {...form.register('campDetails.estimatedPopulation', { valueAsNumber: true })}
                  placeholder="Enter estimated population"
                />
              </FormField>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-medium mb-4 text-green-800">Community Details</h3>
            <div className="space-y-4">
              <FormField>
                <FormLabel htmlFor="communityDetails.communityName">Community Name *</FormLabel>
                <Input
                  id="communityDetails.communityName"
                  {...form.register('communityDetails.communityName')}
                  placeholder="Enter community name"
                />
                {(errors as any).communityDetails?.communityName && (
                  <FormMessage>{(errors as any).communityDetails.communityName.message}</FormMessage>
                )}
              </FormField>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField>
                  <FormLabel htmlFor="communityDetails.contactPersonName">Contact Person Name *</FormLabel>
                  <Input
                    id="communityDetails.contactPersonName"
                    {...form.register('communityDetails.contactPersonName')}
                    placeholder="Enter contact person name"
                  />
                  {(errors as any).communityDetails?.contactPersonName && (
                    <FormMessage>{(errors as any).communityDetails.contactPersonName.message}</FormMessage>
                  )}
                </FormField>

                <FormField>
                  <FormLabel htmlFor="communityDetails.contactPersonPhone">Contact Person Phone *</FormLabel>
                  <Input
                    id="communityDetails.contactPersonPhone"
                    type="tel"
                    {...form.register('communityDetails.contactPersonPhone')}
                    placeholder="+234..."
                  />
                  {(errors as any).communityDetails?.contactPersonPhone && (
                    <FormMessage>{(errors as any).communityDetails.contactPersonPhone.message}</FormMessage>
                  )}
                </FormField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField>
                  <FormLabel htmlFor="communityDetails.contactPersonRole">Contact Person Role *</FormLabel>
                  <Input
                    id="communityDetails.contactPersonRole"
                    {...form.register('communityDetails.contactPersonRole')}
                    placeholder="e.g., Village Head, Secretary"
                  />
                  {(errors as any).communityDetails?.contactPersonRole && (
                    <FormMessage>{(errors as any).communityDetails.contactPersonRole.message}</FormMessage>
                  )}
                </FormField>

                <FormField>
                  <FormLabel htmlFor="communityDetails.estimatedHouseholds">Estimated Households</FormLabel>
                  <Input
                    id="communityDetails.estimatedHouseholds"
                    type="number"
                    min="0"
                    {...form.register('communityDetails.estimatedHouseholds', { valueAsNumber: true })}
                    placeholder="Enter estimated households"
                  />
                </FormField>
              </div>
            </div>
          </div>
        )}

        {/* Submit Buttons */}
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
              {isSubmitting ? 'Saving...' : (editingId ? 'Update Entity' : 'Create Entity')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};