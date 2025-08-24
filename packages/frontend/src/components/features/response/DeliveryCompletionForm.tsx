'use client';

import React, { useState, useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { 
  type ResponseConversionFormData,
  type RapidResponse,
  type DeliveryConversion,
  type MediaAttachment,
} from '@dms/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CameraIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ClockIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface DeliveryCompletionFormProps {
  form: UseFormReturn<ResponseConversionFormData>;
  response: RapidResponse;
  conversionDraft: DeliveryConversion | null;
  onAutoSave: () => void;
  onBack: () => void;
  className?: string;
}

export function DeliveryCompletionForm({
  form,
  response,
  conversionDraft,
  onAutoSave,
  onBack,
  className,
}: DeliveryCompletionFormProps) {
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<MediaAttachment[]>([]);

  const { register, formState: { errors }, setValue, getValues, watch } = form;
  
  // Watch for changes to trigger auto-save
  const watchedBeneficiaries = watch('beneficiariesServed');
  const watchedDeliveryNotes = watch('deliveryNotes');
  const watchedChallenges = watch('challenges');

  // Handle photo capture
  const handlePhotoCapture = useCallback(async () => {
    setIsCapturingPhoto(true);

    try {
      // NOTE: This is currently simulated for MVP
      // TODO: Replace with actual device camera integration
      // Implementation should use navigator.mediaDevices.getUserMedia()
      // or a camera library like react-camera-pro

      const timestamp = new Date();
      const newPhoto: MediaAttachment = {
        id: `photo_${Date.now()}`,
        localPath: `temp/photo_${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        size: 1024000, // 1MB placeholder
        metadata: {
          timestamp,
          gpsCoordinates: conversionDraft?.deliveryLocation,
        },
      };

      // Production implementation would:
      // 1. Access device camera
      // 2. Capture actual photo
      // 3. Store in device storage
      // 4. Upload when online
      
      setCapturedPhotos(prev => [...prev, newPhoto]);
      setValue('deliveryEvidence', [...capturedPhotos, newPhoto]);
      
      // Trigger auto-save
      setTimeout(onAutoSave, 100);
      
    } catch (error) {
      console.error('Failed to capture photo:', error);
    } finally {
      setIsCapturingPhoto(false);
    }
  }, [conversionDraft, capturedPhotos, setValue, onAutoSave]);

  // Handle photo removal
  const handlePhotoRemove = (photoId: string) => {
    const updatedPhotos = capturedPhotos.filter(photo => photo.id !== photoId);
    setCapturedPhotos(updatedPhotos);
    setValue('deliveryEvidence', updatedPhotos);
    onAutoSave();
  };

  // Calculate completion metrics
  const completionMetrics = {
    hasDeliveryTimestamp: !!conversionDraft?.deliveryTimestamp,
    hasGPSLocation: !!(conversionDraft?.deliveryLocation?.latitude && conversionDraft?.deliveryLocation?.longitude),
    hasBeneficiaryCount: watchedBeneficiaries > 0,
    hasDeliveryNotes: (watchedDeliveryNotes?.length || 0) > 0,
    hasEvidence: capturedPhotos.length > 0,
  };

  const completedFields = Object.values(completionMetrics).filter(Boolean).length;
  const totalFields = Object.keys(completionMetrics).length;
  const completionPercentage = Math.round((completedFields / totalFields) * 100);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Completion Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-blue-600" />
            Delivery Documentation Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Completion Status</span>
              <Badge variant={completionPercentage >= 80 ? "default" : "secondary"}>
                {completionPercentage}% Complete
              </Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className={`flex items-center gap-2 ${completionMetrics.hasDeliveryTimestamp ? 'text-green-600' : 'text-gray-500'}`}>
                <ClockIcon className="w-4 h-4" />
                Delivery timestamp
              </div>
              <div className={`flex items-center gap-2 ${completionMetrics.hasGPSLocation ? 'text-green-600' : 'text-gray-500'}`}>
                <MapPinIcon className="w-4 h-4" />
                GPS location
              </div>
              <div className={`flex items-center gap-2 ${completionMetrics.hasBeneficiaryCount ? 'text-green-600' : 'text-gray-500'}`}>
                <UserGroupIcon className="w-4 h-4" />
                Beneficiary count
              </div>
              <div className={`flex items-center gap-2 ${completionMetrics.hasEvidence ? 'text-green-600' : 'text-gray-500'}`}>
                <CameraIcon className="w-4 h-4" />
                Photo evidence
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Timestamp and Location */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormLabel htmlFor="deliveryTimestamp">Delivery Date & Time</FormLabel>
              <Input
                type="datetime-local"
                {...register('deliveryTimestamp')}
                className="w-full"
              />
              {errors.deliveryTimestamp && (
                <FormMessage>{errors.deliveryTimestamp.message}</FormMessage>
              )}
            </div>
            <div>
              <FormLabel>GPS Location</FormLabel>
              <div className="p-3 bg-gray-50 rounded-lg">
                {conversionDraft?.deliveryLocation?.latitude ? (
                  <div className="text-sm">
                    <div>Lat: {conversionDraft.deliveryLocation.latitude.toFixed(6)}</div>
                    <div>Lng: {conversionDraft.deliveryLocation.longitude.toFixed(6)}</div>
                    <div className="text-gray-500 text-xs mt-1">
                      Captured: {new Date(conversionDraft.deliveryLocation.timestamp).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Location not captured</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Beneficiary Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserGroupIcon className="w-5 h-5 text-blue-600" />
            Beneficiary Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <FormLabel htmlFor="beneficiariesServed">Number of Beneficiaries Served</FormLabel>
            <Input
              type="number"
              {...register('beneficiariesServed', { 
                valueAsNumber: true,
                onChange: onAutoSave 
              })}
              className="w-full"
              min="0"
              placeholder="Enter total number of people served"
            />
            {errors.beneficiariesServed && (
              <FormMessage>{errors.beneficiariesServed.message}</FormMessage>
            )}
            <div className="text-sm text-gray-500 mt-1">
              Include all individuals who directly received assistance
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <FormLabel htmlFor="deliveryNotes">Delivery Notes</FormLabel>
            <textarea
              {...register('deliveryNotes', { onChange: onAutoSave })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Document successful delivery details, beneficiary feedback, or any notable observations..."
            />
            {errors.deliveryNotes && (
              <FormMessage>{errors.deliveryNotes.message}</FormMessage>
            )}
          </div>

          <div>
            <FormLabel htmlFor="challenges">Challenges Encountered (if any)</FormLabel>
            <textarea
              {...register('challenges', { onChange: onAutoSave })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Document any challenges, delays, or issues encountered during delivery..."
            />
            {errors.challenges && (
              <FormMessage>{errors.challenges.message}</FormMessage>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Photo Evidence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CameraIcon className="w-5 h-5 text-blue-600" />
            Delivery Evidence
          </CardTitle>
          <p className="text-sm text-gray-600">
            Take photos of the delivery for documentation and verification purposes
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Photo Capture Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handlePhotoCapture}
            disabled={isCapturingPhoto}
            className="flex items-center gap-2"
          >
            <CameraIcon className="w-4 h-4" />
            {isCapturingPhoto ? 'Capturing...' : 'Take Photo'}
          </Button>

          {/* Captured Photos Display */}
          {capturedPhotos.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Captured Photos ({capturedPhotos.length})</h4>
              <div className="grid grid-cols-3 gap-4">
                {capturedPhotos.map((photo) => (
                  <div key={photo.id} className="relative">
                    <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                      <CameraIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => handlePhotoRemove(photo.id)}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {photo.localPath?.split('/').pop()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photo Requirements Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-1">Photo Documentation Tips</div>
                <ul className="space-y-1 text-blue-700">
                  <li>• Include clear shots of delivered items</li>
                  <li>• Capture beneficiaries receiving assistance (with consent)</li>
                  <li>• Document delivery location and conditions</li>
                  <li>• Ensure photos are clear and properly lit</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Final Validation Warning */}
      {completionPercentage < 80 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800">
                <div className="font-medium mb-1">Incomplete Documentation</div>
                <p>
                  Consider completing all documentation fields for comprehensive delivery records. 
                  Missing information may affect reporting and accountability.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back to Comparison
        </Button>
        <div className="text-sm text-gray-500 self-center">
          Ready to complete conversion
        </div>
      </div>
    </div>
  );
}