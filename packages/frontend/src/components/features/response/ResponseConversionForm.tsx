'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ResponseConversionFormSchema,
  type ResponseConversionFormData,
  type RapidResponse,
  ResponseStatus,
  generateOfflineId,
} from '@dms/shared';
import { useResponseStore } from '@/stores/response.store';
import { useGPS } from '@/hooks/useGPS';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConnectionStatusHeader } from '@/components/shared/ConnectionStatusHeader';
import { AutoSaveIndicator } from '@/components/shared/AutoSaveIndicator';
import { ActualVsPlannedComparison } from './ActualVsPlannedComparison';
import { DeliveryStatusTransition } from './DeliveryStatusTransition';
import { DeliveryCompletionForm } from './DeliveryCompletionForm';

interface ResponseConversionFormProps {
  responseId: string;
  onComplete?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function ResponseConversionForm({
  responseId,
  onComplete,
  onCancel,
  className,
}: ResponseConversionFormProps) {
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [conversionStep, setConversionStep] = useState<'review' | 'compare' | 'complete'>('review');

  const {
    conversionInProgress,
    conversionDraft,
    currentConversion,
    isConverting,
    error,
    clearError,
    startConversion,
    updateConversionData,
    completeConversion,
    cancelConversion,
    getResponseForConversion,
    calculateActualVsPlanned,
  } = useResponseStore();

  const { captureLocation, isLoading: isCapturingGPS } = useGPS();
  const response = getResponseForConversion(responseId);

  // Initialize form with validation
  const form = useForm<ResponseConversionFormData>({
    resolver: zodResolver(ResponseConversionFormSchema),
    defaultValues: {
      responseId,
      deliveryTimestamp: new Date(),
      deliveryLocation: {
        latitude: 0,
        longitude: 0,
        timestamp: new Date(),
        captureMethod: 'GPS' as const,
      },
      actualData: response?.data || {},
      actualItemsDelivered: response?.otherItemsDelivered || [],
      beneficiariesServed: 0,
      deliveryNotes: '',
      challenges: '',
      deliveryEvidence: [],
    },
    mode: 'onChange',
  });

  const { setValue, getValues, handleSubmit, formState: { errors, isDirty } } = form;

  // Initialize conversion when component mounts
  useEffect(() => {
    if (!conversionInProgress && responseId) {
      startConversion(responseId);
    }
  }, [responseId, conversionInProgress, startConversion]);

  // Capture GPS location on component mount
  useEffect(() => {
    const captureCurrentLocation = async () => {
      try {
        const location = await captureLocation();
        if (location) {
          const gpsData = {
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: new Date(),
            captureMethod: 'GPS' as const,
          };
          setValue('deliveryLocation', gpsData);
          updateConversionData({ deliveryLocation: gpsData });
        }
      } catch (error) {
        console.warn('Failed to capture GPS location:', error);
        // Add fallback: show manual entry option or use default location
        setValue('deliveryLocation', {
          latitude: 0,
          longitude: 0,
          timestamp: new Date(),
          captureMethod: 'MANUAL' as const,
        });
        // Optionally show user notification about GPS failure
      }
    };

    captureCurrentLocation();
  }, [captureLocation, setValue, updateConversionData]);

  // Auto-save conversion data
  const handleAutoSave = useCallback(() => {
    if (isDirty && conversionDraft) {
      setIsAutoSaving(true);
      const formData = getValues();
      updateConversionData({
        deliveryTimestamp: formData.deliveryTimestamp,
        deliveryLocation: formData.deliveryLocation,
        beneficiariesServed: formData.beneficiariesServed,
        deliveryNotes: formData.deliveryNotes,
        challenges: formData.challenges,
      });
      setLastAutoSave(new Date());
      setTimeout(() => setIsAutoSaving(false), 1000);
    }
  }, [isDirty, conversionDraft, getValues, updateConversionData]);

  // Handle form submission
  const onSubmit = async (data: ResponseConversionFormData) => {
    if (!response || !conversionDraft) {
      console.error('No response or conversion data available');
      return;
    }

    try {
      // Update conversion with final data
      updateConversionData({
        deliveryTimestamp: data.deliveryTimestamp,
        deliveryLocation: data.deliveryLocation,
        beneficiariesServed: data.beneficiariesServed,
        deliveryNotes: data.deliveryNotes,
        challenges: data.challenges,
        deliveryEvidence: data.deliveryEvidence,
      });

      // Complete the conversion
      await completeConversion(responseId);
      
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Failed to complete conversion:', error);
    }
  };

  // Handle cancellation
  const handleCancel = () => {
    cancelConversion();
    if (onCancel) {
      onCancel();
    }
  };

  // Calculate actual vs planned items
  const actualVsPlannedItems = response 
    ? calculateActualVsPlanned(responseId, getValues('actualItemsDelivered') || [])
    : [];

  if (!response) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Response Not Found</h3>
          <p className="text-gray-500 mt-2">The response you&apos;re trying to convert could not be found.</p>
          <Button onClick={onCancel} className="mt-4">Go Back</Button>
        </div>
      </div>
    );
  }

  if (response.status !== ResponseStatus.PLANNED) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Invalid Response Status</h3>
          <p className="text-gray-500 mt-2">
            Only planned responses can be converted to delivery documentation.
            This response has status: {response.status}
          </p>
          <Button onClick={onCancel} className="mt-4">Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <ConnectionStatusHeader />
      
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Convert to Delivery</h2>
            <p className="text-gray-600">
              Convert planned response to actual delivery documentation
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge 
              variant={response.status === ResponseStatus.PLANNED ? "secondary" : "default"}
            >
              {response.status}
            </Badge>
            <AutoSaveIndicator isSaving={isAutoSaving} lastSaved={lastAutoSave} />
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center space-x-4">
          <div className={`flex items-center ${conversionStep === 'review' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
              conversionStep === 'review' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300'
            }`}>
              1
            </div>
            <span className="ml-2">Review Plan</span>
          </div>
          <div className="w-12 h-px bg-gray-300" />
          <div className={`flex items-center ${conversionStep === 'compare' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
              conversionStep === 'compare' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300'
            }`}>
              2
            </div>
            <span className="ml-2">Compare Actual</span>
          </div>
          <div className="w-12 h-px bg-gray-300" />
          <div className={`flex items-center ${conversionStep === 'complete' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
              conversionStep === 'complete' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300'
            }`}>
              3
            </div>
            <span className="ml-2">Complete</span>
          </div>
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

      {/* Original Plan Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Original Response Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Response Type</p>
              <p className="text-base">{response.responseType}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Planned Date</p>
              <p className="text-base">{new Date(response.plannedDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Planned Items</p>
              <p className="text-base">{response.otherItemsDelivered.length} items</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Responder</p>
              <p className="text-base">{response.responderName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Form */}
      <FormProvider {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" role="form">
          {conversionStep === 'review' && (
            <DeliveryStatusTransition
              response={response}
              onStartConversion={() => setConversionStep('compare')}
              isCapturingGPS={isCapturingGPS}
            />
          )}

          {conversionStep === 'compare' && (
            <ActualVsPlannedComparison
              response={response}
              actualVsPlannedItems={actualVsPlannedItems}
              onItemsUpdate={(items) => {
                setValue('actualItemsDelivered', items);
                handleAutoSave();
              }}
              onContinue={() => setConversionStep('complete')}
              onBack={() => setConversionStep('review')}
            />
          )}

          {conversionStep === 'complete' && (
            <DeliveryCompletionForm
              form={form}
              response={response}
              conversionDraft={conversionDraft}
              onAutoSave={handleAutoSave}
              onBack={() => setConversionStep('compare')}
            />
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isConverting}
            >
              Cancel Conversion
            </Button>
            
            {conversionStep === 'complete' && (
              <Button
                type="submit"
                disabled={isConverting || !conversionDraft}
                className="flex items-center gap-2"
              >
                {isConverting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : null}
                Complete Conversion
              </Button>
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  );
}