'use client';

import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  BeneficiaryVerificationDataSchema,
  type BeneficiaryVerificationFormData,
  type GPSCoordinates,
  type MediaAttachment,
  encryptDemographicData,
} from '@dms/shared';
import { useGPS } from '@/hooks/useGPS';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, FormItem, FormLabel, FormMessage, FormControl } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { MapPin, Camera, Users, CheckCircle } from 'lucide-react';

interface BeneficiaryVerificationProps {
  value?: BeneficiaryVerificationFormData;
  onChange: (data: BeneficiaryVerificationFormData) => void;
  disabled?: boolean;
  className?: string;
}

export function BeneficiaryVerification({
  value,
  onChange,
  disabled = false,
  className,
}: BeneficiaryVerificationProps) {
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [locationCaptured, setLocationCaptured] = useState(false);

  const { captureLocation, isLoading: isGPSLoading } = useGPS();

  const form = useForm<BeneficiaryVerificationFormData>({
    resolver: zodResolver(BeneficiaryVerificationDataSchema),
    defaultValues: value || {
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
    mode: 'onChange',
  });

  const { setValue, watch, handleSubmit, formState: { errors } } = form;
  const watchedValues = watch();

  // Auto-calculate totals
  useEffect(() => {
    const { demographicBreakdown, householdsServed } = watchedValues;
    if (demographicBreakdown) {
      const totalIndividuals = demographicBreakdown.male + demographicBreakdown.female;
      const totalBeneficiaries = totalIndividuals;
      
      setValue('individualsServed', totalIndividuals);
      setValue('totalBeneficiariesServed', totalBeneficiaries);
    }
  }, [watchedValues.demographicBreakdown, setValue]);

  // Trigger onChange when form values change
  useEffect(() => {
    const handleDataChange = async () => {
      if (watchedValues && (!errors || Object.keys(errors).length === 0)) {
        // Encrypt sensitive demographic data before saving
        const encryptedData = { ...watchedValues };
        
        if (watchedValues.demographicBreakdown) {
          try {
            const encryptedDemographics = await encryptDemographicData(watchedValues.demographicBreakdown);
            encryptedData.demographicBreakdown = encryptedDemographics as any; // Store as encrypted string
          } catch (error) {
            console.error('Failed to encrypt demographic data:', error);
            // Fall back to unencrypted data if encryption fails
          }
        }
        
        onChange(encryptedData);
      }
    };

    handleDataChange();
  }, [watchedValues, onChange, errors]);

  // Capture GPS location
  const handleCaptureLocation = async () => {
    setIsCapturingLocation(true);
    try {
      const location = await captureLocation();
      if (location) {
        setValue('verificationLocation', {
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: new Date(),
          captureMethod: 'GPS',
        });
        setValue('verificationTimestamp', new Date());
        setLocationCaptured(true);
      }
    } catch (error) {
      console.error('Failed to capture location:', error);
    } finally {
      setIsCapturingLocation(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Beneficiary Verification
        </CardTitle>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <form className="space-y-6">
            {/* Verification Method */}
            <FormField
              name="verificationMethod"
              control={form.control}
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Verification Method</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={disabled}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="SIGNATURE" id="signature" />
                        <Label htmlFor="signature">Signature</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="THUMBPRINT" id="thumbprint" />
                        <Label htmlFor="thumbprint">Thumbprint</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="PHOTO" id="photo" />
                        <Label htmlFor="photo">Photo</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="VERBAL_CONFIRMATION" id="verbal" />
                        <Label htmlFor="verbal">Verbal Confirmation</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Households Served */}
            <FormField
              name="householdsServed"
              control={form.control}
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Number of Households Served</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      disabled={disabled}
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Demographic Breakdown */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Demographic Breakdown (Individuals)</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="demographicBreakdown.male"
                  control={form.control}
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Male</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          disabled={disabled}
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="demographicBreakdown.female"
                  control={form.control}
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Female</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          disabled={disabled}
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="demographicBreakdown.children"
                  control={form.control}
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Children (Under 18)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          disabled={disabled}
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="demographicBreakdown.elderly"
                  control={form.control}
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Elderly (65+)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          disabled={disabled}
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="demographicBreakdown.pwD"
                  control={form.control}
                  render={({ field }: { field: any }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Persons with Disabilities</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          disabled={disabled}
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Totals Summary */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium text-sm">Verification Summary</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <Label>Total Households</Label>
                  <div className="font-medium">{watchedValues.householdsServed || 0}</div>
                </div>
                <div>
                  <Label>Total Individuals</Label>
                  <div className="font-medium">{watchedValues.individualsServed || 0}</div>
                </div>
                <div>
                  <Label>Total Beneficiaries</Label>
                  <div className="font-medium">{watchedValues.totalBeneficiariesServed || 0}</div>
                </div>
              </div>
            </div>

            {/* Location Capture */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Verification Location</Label>
                {locationCaptured && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Location Captured
                  </Badge>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleCaptureLocation}
                disabled={disabled || isCapturingLocation || isGPSLoading}
                className="w-full"
              >
                <MapPin className="mr-2 h-4 w-4" />
                {isCapturingLocation || isGPSLoading ? 'Capturing Location...' : 'Capture Current Location'}
              </Button>

              {watchedValues.verificationLocation && watchedValues.verificationLocation.latitude !== 0 && (
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  <strong>Location:</strong> {watchedValues.verificationLocation.latitude.toFixed(6)}, {watchedValues.verificationLocation.longitude.toFixed(6)}
                  <br />
                  <strong>Captured:</strong> {watchedValues.verificationTimestamp?.toLocaleString()}
                </div>
              )}
            </div>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}