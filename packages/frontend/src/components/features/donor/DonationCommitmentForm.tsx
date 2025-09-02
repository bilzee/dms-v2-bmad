'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ResponseType } from '@dms/shared';
import { useDonorStore } from '@/stores/donor.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AutoSaveIndicator } from '@/components/shared/AutoSaveIndicator';
import { Calendar, Package, AlertCircle } from 'lucide-react';

const DonationCommitmentSchema = z.object({
  responseType: z.nativeEnum(ResponseType),
  quantity: z.number().min(1, 'Quantity must be at least 1').max(999999, 'Quantity cannot exceed 999,999'),
  unit: z.string().min(1, 'Unit is required').max(50, 'Unit cannot exceed 50 characters'),
  targetDate: z.date().min(new Date(Date.now() + 24 * 60 * 60 * 1000), 'Target date must be at least tomorrow'),
  affectedEntityId: z.string().optional(),
  incidentId: z.string().optional(),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
});

type DonationCommitmentFormData = z.infer<typeof DonationCommitmentSchema>;

interface DonationCommitmentFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

const RESPONSE_TYPES = [
  { type: ResponseType.HEALTH, label: 'Health', icon: '🏥', color: 'bg-red-50 border-red-200 text-red-800' },
  { type: ResponseType.WASH, label: 'WASH', icon: '💧', color: 'bg-blue-50 border-blue-200 text-blue-800' },
  { type: ResponseType.SHELTER, label: 'Shelter', icon: '🏠', color: 'bg-orange-50 border-orange-200 text-orange-800' },
  { type: ResponseType.FOOD, label: 'Food', icon: '🍚', color: 'bg-green-50 border-green-200 text-green-800' },
  { type: ResponseType.SECURITY, label: 'Security', icon: '🛡️', color: 'bg-purple-50 border-purple-200 text-purple-800' },
  { type: ResponseType.POPULATION, label: 'Population', icon: '👥', color: 'bg-gray-50 border-gray-200 text-gray-800' },
];

const COMMON_UNITS_BY_TYPE = {
  [ResponseType.HEALTH]: ['kits', 'units', 'doses', 'bottles', 'boxes'],
  [ResponseType.WASH]: ['liters', 'units', 'kits', 'containers', 'tablets'],
  [ResponseType.SHELTER]: ['units', 'tarpaulins', 'tents', 'kits', 'sheets'],
  [ResponseType.FOOD]: ['kg', 'bags', 'cartons', 'liters', 'units'],
  [ResponseType.SECURITY]: ['personnel', 'units', 'equipment', 'vehicles'],
  [ResponseType.POPULATION]: ['services', 'documents', 'kits', 'units'],
};

export function DonationCommitmentForm({
  onSuccess,
  onCancel,
  className,
}: DonationCommitmentFormProps) {
  const [selectedResponseType, setSelectedResponseType] = useState<ResponseType>(ResponseType.HEALTH);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [showUnitSuggestions, setShowUnitSuggestions] = useState(false);

  const {
    createCommitment,
    isCreating,
    error,
    clearError,
    availableEntities,
    availableIncidents,
    loadDonorData,
  } = useDonorStore();

  const form = useForm<DonationCommitmentFormData>({
    resolver: zodResolver(DonationCommitmentSchema),
    defaultValues: {
      responseType: selectedResponseType,
      quantity: 1,
      unit: '',
      targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 1 week from now
      notes: '',
    },
    mode: 'onChange',
  });

  const { register, handleSubmit, setValue, watch, formState: { errors, isDirty } } = form;

  // Load data on mount
  useEffect(() => {
    loadDonorData();
  }, [loadDonorData]);

  // Auto-save functionality
  const autoSave = useCallback(() => {
    if (isDirty) {
      setIsAutoSaving(true);
      // Save draft to localStorage
      const formData = form.getValues();
      localStorage.setItem('donor-commitment-draft', JSON.stringify({
        ...formData,
        targetDate: formData.targetDate?.toISOString(),
      }));
      setLastAutoSave(new Date());
      setTimeout(() => setIsAutoSaving(false), 1000);
    }
  }, [isDirty, form]);

  // Load draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('donor-commitment-draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.targetDate) {
          draft.targetDate = new Date(draft.targetDate);
        }
        form.reset(draft);
        setSelectedResponseType(draft.responseType || ResponseType.HEALTH);
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }
  }, [form]);

  // Auto-save when form changes
  useEffect(() => {
    const timer = setTimeout(autoSave, 2000);
    return () => clearTimeout(timer);
  }, [autoSave, watch()]);

  // Handle response type change
  const handleResponseTypeChange = (newType: ResponseType) => {
    setSelectedResponseType(newType);
    setValue('responseType', newType, { shouldValidate: true, shouldDirty: true });
    
    // Suggest common units for this response type
    const commonUnits = COMMON_UNITS_BY_TYPE[newType];
    if (commonUnits.length > 0 && !watch('unit')) {
      setValue('unit', commonUnits[0], { shouldValidate: true, shouldDirty: true });
    }
  };

  // Handle unit input focus
  const handleUnitFocus = () => {
    setShowUnitSuggestions(true);
  };

  // Handle unit suggestion selection
  const handleUnitSelect = (unit: string) => {
    setValue('unit', unit, { shouldValidate: true, shouldDirty: true });
    setShowUnitSuggestions(false);
  };

  // Handle form submission
  const onSubmit = async (data: DonationCommitmentFormData) => {
    try {
      await createCommitment(data);
      
      // Clear draft from localStorage
      localStorage.removeItem('donor-commitment-draft');
      
      // Reset form
      form.reset();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to create commitment:', error);
    }
  };

  // Calculate minimum date (tomorrow)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateString = minDate.toISOString().split('T')[0];

  // Calculate maximum date (1 year from now)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  const maxDateString = maxDate.toISOString().split('T')[0];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div className="flex-1">
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
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Response Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Response Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedResponseType} onValueChange={handleResponseTypeChange}>
              <TabsList className="grid w-full grid-cols-6">
                {RESPONSE_TYPES.map(({ type, label, icon }) => (
                  <TabsTrigger key={type} value={type} className="text-xs">
                    <span className="mr-1">{icon}</span>
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {errors.responseType && (
              <FormMessage className="mt-2">{errors.responseType.message}</FormMessage>
            )}
          </CardContent>
        </Card>

        {/* Quantity and Unit */}
        <Card>
          <CardHeader>
            <CardTitle>Item Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FormLabel htmlFor="quantity">Quantity *</FormLabel>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max="999999"
                  {...register('quantity', { valueAsNumber: true })}
                  placeholder="Enter quantity"
                />
                {errors.quantity && <FormMessage>{errors.quantity.message}</FormMessage>}
              </div>
              
              <div className="relative">
                <FormLabel htmlFor="unit">Unit *</FormLabel>
                <Input
                  id="unit"
                  {...register('unit')}
                  placeholder="e.g., kg, units, liters"
                  onFocus={handleUnitFocus}
                  onBlur={() => setTimeout(() => setShowUnitSuggestions(false), 200)}
                />
                {errors.unit && <FormMessage>{errors.unit.message}</FormMessage>}
                
                {/* Unit Suggestions Dropdown */}
                {showUnitSuggestions && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                    <div className="p-2 text-sm text-gray-600 border-b">Common units for {RESPONSE_TYPES.find(rt => rt.type === selectedResponseType)?.label}:</div>
                    {COMMON_UNITS_BY_TYPE[selectedResponseType].map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => handleUnitSelect(unit)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quantity + Unit Preview */}
            {watch('quantity') && watch('unit') && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Commitment Preview:</p>
                <p className="font-semibold">
                  {watch('quantity').toLocaleString()} {watch('unit')} of {' '}
                  {RESPONSE_TYPES.find(rt => rt.type === selectedResponseType)?.label} supplies
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Delivery Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <FormLabel htmlFor="targetDate">Target Delivery Date *</FormLabel>
              <Input
                id="targetDate"
                type="date"
                min={minDateString}
                max={maxDateString}
                {...register('targetDate', { 
                  valueAsDate: true,
                  setValueAs: (value) => value ? new Date(value) : undefined
                })}
              />
              {errors.targetDate && <FormMessage>{errors.targetDate.message}</FormMessage>}
              <p className="text-xs text-gray-500 mt-1">
                Must be between tomorrow and {maxDate.toLocaleDateString()}
              </p>
            </div>

            {watch('targetDate') && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  Planned delivery: {new Date(watch('targetDate')).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {Math.ceil((new Date(watch('targetDate')).getTime() - Date.now()) / (24 * 60 * 60 * 1000))} days from now
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Target Selection (Optional) */}
        <Card>
          <CardHeader>
            <CardTitle>Target Assignment (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FormLabel htmlFor="incidentId">Specific Incident</FormLabel>
                <select
                  id="incidentId"
                  {...register('incidentId')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select incident (optional)</option>
                  {availableIncidents.map((incident) => (
                    <option key={incident.id} value={incident.id}>
                      {incident.name} - {incident.type}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <FormLabel htmlFor="affectedEntityId">Specific Location</FormLabel>
                <select
                  id="affectedEntityId"
                  {...register('affectedEntityId')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select location (optional)</option>
                  {availableEntities.map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name} ({entity.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <p className="text-sm text-gray-600">
              Leave blank to make this commitment available for any relevant incident or location
            </p>
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <FormLabel htmlFor="notes">Notes</FormLabel>
              <textarea
                id="notes"
                {...register('notes')}
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any special instructions, conditions, or details about this commitment..."
              />
              {errors.notes && <FormMessage>{errors.notes.message}</FormMessage>}
              <p className="text-xs text-gray-500 mt-1">
                {watch('notes')?.length || 0}/500 characters
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-6">
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
              onClick={autoSave}
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
            disabled={isCreating || !watch('quantity') || !watch('unit') || !watch('targetDate')}
            className="flex items-center gap-2"
          >
            {isCreating ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            Register Commitment
          </Button>
        </div>
        
        {/* Auto-save indicator */}
        <AutoSaveIndicator isSaving={isAutoSaving} lastSaved={lastAutoSave} />
      </form>
    </div>
  );
}