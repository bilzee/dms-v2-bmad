'use client';

import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  DeliveryDocumentationFormSchema,
  type DeliveryDocumentationFormData,
  type RapidResponse,
  type DeliveryCondition,
  type WitnessInformation,
  ResponseStatus,
  generateOfflineId,
} from '@dms/shared';
import { useResponseStore } from '@/stores/response.store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FormField, FormItem, FormLabel, FormMessage, FormControl } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  CheckCircle, 
  Save,
  Send,
  AlertTriangle,
  Clock,
  User
} from 'lucide-react';

import { BeneficiaryVerification } from './BeneficiaryVerification';
import { GPSDeliveryStamp } from './GPSDeliveryStamp';
import { DeliveryPhotoCapture } from './DeliveryPhotoCapture';
import { AutoSaveIndicator } from '@/components/shared/AutoSaveIndicator';
import { ConnectionStatusHeader } from '@/components/shared/ConnectionStatusHeader';

interface DeliveryDocumentationFormProps {
  responseId: string;
  onComplete?: (documentation: DeliveryDocumentationFormData) => void;
  onCancel?: () => void;
  className?: string;
}

export function DeliveryDocumentationForm({
  responseId,
  onComplete,
  onCancel,
  className,
}: DeliveryDocumentationFormProps) {
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [completionStep, setCompletionStep] = useState<'document' | 'review' | 'complete'>('document');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    responses,
    isLoading,
    error,
    clearError,
  } = useResponseStore();

  const response = responses.find(r => r.id === responseId);

  // Initialize form with validation
  const form = useForm<DeliveryDocumentationFormData>({
    resolver: zodResolver(DeliveryDocumentationFormSchema),
    defaultValues: {
      responseId,
      deliveryLocation: {
        latitude: 0,
        longitude: 0,
        timestamp: new Date(),
        captureMethod: 'GPS' as const,
      },
      beneficiaryVerification: {
        verificationMethod: 'VERBAL_CONFIRMATION',
        totalBeneficiariesServed: 0,
        householdsServed: 0,
        individualsServed: 0,
        demographicBreakdown: {
          male: 0,
          female: 0,
          children: 0,
          elderly: 0,
          pwD: 0,
        },
        verificationTimestamp: new Date(),
        verificationLocation: {
          latitude: 0,
          longitude: 0,
          timestamp: new Date(),
          captureMethod: 'GPS' as const,
        },
      },
      deliveryNotes: '',
      deliveryConditions: [],
      deliveryEvidence: [],
      completionTimestamp: new Date(),
      deliveryCompletionStatus: 'FULL',
      followUpRequired: false,
    },
    mode: 'onChange',
  });

  const { setValue, watch, handleSubmit, formState: { errors, isDirty } } = form;
  const watchedValues = watch();

  // Auto-save functionality
  useEffect(() => {
    if (isDirty && !isSubmitting) {
      const timer = setTimeout(() => {
        handleAutoSave();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [watchedValues, isDirty, isSubmitting]);

  const handleAutoSave = async () => {
    setIsAutoSaving(true);
    try {
      // Save draft to local storage or offline queue
      localStorage.setItem(`delivery_doc_draft_${responseId}`, JSON.stringify(watchedValues));
      setLastAutoSave(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(`delivery_doc_draft_${responseId}`);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        Object.keys(draft).forEach(key => {
          setValue(key as keyof DeliveryDocumentationFormData, draft[key]);
        });
      } catch (error) {
        console.error('Failed to load saved draft:', error);
      }
    }
  }, [responseId, setValue]);

  const handleFormSubmit = async (data: DeliveryDocumentationFormData) => {
    setIsSubmitting(true);
    clearError();

    try {
      // Update completion timestamp
      data.completionTimestamp = new Date();
      
      // Clean up draft from storage
      localStorage.removeItem(`delivery_doc_draft_${responseId}`);
      
      // Call completion handler
      if (onComplete) {
        onComplete(data);
      }

      setCompletionStep('complete');
    } catch (error) {
      console.error('Failed to complete delivery documentation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCompletionProgress = () => {
    const steps = [
      watchedValues.deliveryLocation?.latitude !== 0,
      watchedValues.beneficiaryVerification?.totalBeneficiariesServed > 0,
      watchedValues.deliveryNotes?.length > 0,
      watchedValues.deliveryEvidence?.length > 0,
    ];
    
    const completed = steps.filter(Boolean).length;
    return (completed / steps.length) * 100;
  };

  if (!response) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Response not found. Please verify the response ID and try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (completionStep === 'complete') {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <h2 className="text-xl font-semibold">Delivery Documentation Complete</h2>
            <p className="text-gray-600">
              The delivery documentation has been successfully completed and will be synchronized when connected.
            </p>
            <Badge variant="secondary" className="text-sm">
              Status: {watchedValues.deliveryCompletionStatus}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <ConnectionStatusHeader />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Delivery Documentation - {response.responseType}
            <Badge variant="outline">
              {response.status}
            </Badge>
          </CardTitle>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Response ID: {response.id}
            </div>
            <AutoSaveIndicator 
              isSaving={isAutoSaving}
              lastSaved={lastAutoSave}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <Label>Completion Progress</Label>
              <span className="text-sm text-gray-600">{Math.round(getCompletionProgress())}%</span>
            </div>
            <Progress value={getCompletionProgress()} className="w-full" />
          </div>
        </CardContent>
      </Card>

      <FormProvider {...form}>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* GPS Location Capture */}
          <GPSDeliveryStamp
            value={watchedValues.deliveryLocation}
            onChange={(location) => setValue('deliveryLocation', location)}
            disabled={isSubmitting}
          />

          {/* Beneficiary Verification */}
          <BeneficiaryVerification
            value={watchedValues.beneficiaryVerification}
            onChange={(verification) => setValue('beneficiaryVerification', verification)}
            disabled={isSubmitting}
          />

          {/* Photo Evidence */}
          <DeliveryPhotoCapture
            value={watchedValues.deliveryEvidence}
            onChange={(photos) => setValue('deliveryEvidence', photos)}
            disabled={isSubmitting}
          />

          {/* Delivery Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Delivery Notes & Conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                name="deliveryNotes"
                control={form.control}
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Delivery Notes *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the delivery process, any challenges faced, beneficiary feedback, and overall outcome..."
                        disabled={isSubmitting}
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Delivery Completion Status */}
              <FormField
                name="deliveryCompletionStatus"
                control={form.control}
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Delivery Completion Status</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isSubmitting}
                        className="grid grid-cols-3 gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="FULL" id="full" />
                          <Label htmlFor="full">Full Delivery</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="PARTIAL" id="partial" />
                          <Label htmlFor="partial">Partial Delivery</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="CANCELLED" id="cancelled" />
                          <Label htmlFor="cancelled">Cancelled</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Follow-up Required */}
              <FormField
                name="followUpRequired"
                control={form.control}
                render={({ field }: { field: any }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Follow-up Required</FormLabel>
                      <p className="text-sm text-gray-600">
                        Check this if additional follow-up actions are needed
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Form Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                
                <div className="flex-1" />
                
                <Button
                  type="submit"
                  disabled={isSubmitting || getCompletionProgress() < 100}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Completing Documentation...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Complete Delivery Documentation
                    </>
                  )}
                </Button>
              </div>
              
              {getCompletionProgress() < 100 && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Please complete all required sections before submitting
                </p>
              )}
            </CardContent>
          </Card>
        </form>
      </FormProvider>
    </div>
  );
}