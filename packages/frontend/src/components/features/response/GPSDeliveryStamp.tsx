'use client';

import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  GPSCoordinatesSchema,
  type GPSCoordinates,
  encryptGPSCoordinates,
} from '@dms/shared';
import { useGPS } from '@/hooks/useGPS';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, FormItem, FormLabel, FormMessage, FormControl } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MapPin, 
  Target, 
  AlertTriangle, 
  CheckCircle, 
  Navigation,
  Edit3
} from 'lucide-react';

interface GPSDeliveryStampProps {
  value?: GPSCoordinates;
  onChange: (location: GPSCoordinates) => void;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

export function GPSDeliveryStamp({
  value,
  onChange,
  disabled = false,
  className,
  required = true,
}: GPSDeliveryStampProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const { captureLocation, isLoading: isGPSLoading } = useGPS();

  const form = useForm<GPSCoordinates>({
    resolver: zodResolver(GPSCoordinatesSchema),
    defaultValues: value || {
      latitude: 0,
      longitude: 0,
      timestamp: new Date(),
      captureMethod: 'GPS' as const,
      accuracy: undefined,
    },
    mode: 'onChange',
  });

  const { setValue, watch, formState: { errors } } = form;
  const watchedValues = watch();

  // Trigger onChange when form values change
  useEffect(() => {
    const handleLocationChange = async () => {
      if (watchedValues && Object.keys(errors).length === 0) {
        // Encrypt GPS coordinates before saving
        try {
          const encryptedLocation = await encryptGPSCoordinates({
            latitude: watchedValues.latitude,
            longitude: watchedValues.longitude
          });
          
          // Create an encrypted version of the data
          const encryptedData = {
            ...watchedValues,
            encryptedCoordinates: encryptedLocation,
            // Keep original coordinates for UI display but mark as sensitive
            latitude: watchedValues.latitude,
            longitude: watchedValues.longitude,
            isEncrypted: true
          } as any;
          
          onChange(encryptedData);
        } catch (error) {
          console.error('Failed to encrypt GPS coordinates:', error);
          // Fall back to unencrypted data if encryption fails
          onChange(watchedValues);
        }
      }
    };

    handleLocationChange();
  }, [watchedValues, onChange, errors]);

  // Auto-capture GPS location on component mount
  useEffect(() => {
    if (!value || (value.latitude === 0 && value.longitude === 0)) {
      handleAutoCapture();
    }
  }, []);

  const handleAutoCapture = async () => {
    if (disabled) return;
    
    setIsCapturing(true);
    setLocationError(null);
    
    try {
      const location = await captureLocation();
      if (location) {
        setValue('latitude', location.latitude);
        setValue('longitude', location.longitude);
        setValue('timestamp', new Date());
        setValue('captureMethod', 'GPS');
        
        // Calculate accuracy if available
        if (location.accuracy) {
          setValue('accuracy', location.accuracy);
          setAccuracy(location.accuracy);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to capture location';
      setLocationError(errorMessage);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleManualCapture = async () => {
    setIsCapturing(true);
    setLocationError(null);
    
    try {
      const location = await captureLocation();
      if (location) {
        setValue('latitude', location.latitude);
        setValue('longitude', location.longitude);
        setValue('timestamp', new Date());
        setValue('captureMethod', 'GPS');
        
        if (location.accuracy) {
          setValue('accuracy', location.accuracy);
          setAccuracy(location.accuracy);
        }
        
        setManualEntry(false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to capture location';
      setLocationError(errorMessage);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleManualEntry = () => {
    setManualEntry(true);
    setValue('captureMethod', 'MANUAL');
    setValue('timestamp', new Date());
    setLocationError(null);
  };

  const getAccuracyStatus = (accuracy: number | undefined) => {
    if (!accuracy) return { text: 'Unknown', variant: 'secondary' as const };
    if (accuracy <= 5) return { text: 'Excellent', variant: 'default' as const };
    if (accuracy <= 10) return { text: 'Good', variant: 'secondary' as const };
    if (accuracy <= 20) return { text: 'Fair', variant: 'outline' as const };
    return { text: 'Poor', variant: 'destructive' as const };
  };

  const isLocationCaptured = watchedValues.latitude !== 0 && watchedValues.longitude !== 0;
  const accuracyStatus = getAccuracyStatus(watchedValues.accuracy);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Delivery Location GPS Stamp
        </CardTitle>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <form className="space-y-6">
            {/* Location Status */}
            {isLocationCaptured && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Location successfully captured with {accuracyStatus.text.toLowerCase()} accuracy
                  {watchedValues.accuracy && ` (±${watchedValues.accuracy.toFixed(1)}m)`}
                </AlertDescription>
              </Alert>
            )}

            {locationError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {locationError}
                </AlertDescription>
              </Alert>
            )}

            {/* Capture Method Selection */}
            <FormField
              name="captureMethod"
              control={form.control}
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Capture Method</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value === 'MANUAL') {
                          setManualEntry(true);
                        } else {
                          setManualEntry(false);
                        }
                      }}
                      disabled={disabled}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="GPS" id="gps" />
                        <Label htmlFor="gps" className="flex items-center gap-2">
                          <Navigation className="h-4 w-4" />
                          GPS Auto-Capture
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="MANUAL" id="manual" />
                        <Label htmlFor="manual" className="flex items-center gap-2">
                          <Edit3 className="h-4 w-4" />
                          Manual Entry
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* GPS Capture Buttons */}
            {!manualEntry && (
              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={handleManualCapture}
                  disabled={disabled || isCapturing || isGPSLoading}
                  className="w-full"
                  variant={isLocationCaptured ? "outline" : "default"}
                >
                  <Target className="mr-2 h-4 w-4" />
                  {isCapturing || isGPSLoading ? 'Capturing Location...' : 'Capture GPS Location'}
                </Button>

                {isLocationCaptured && (
                  <div className="flex items-center justify-between">
                    <Badge variant={accuracyStatus.variant}>
                      Accuracy: {accuracyStatus.text}
                    </Badge>
                    <Badge variant="secondary">
                      Method: GPS
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* Manual Entry Fields */}
            {manualEntry && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name="latitude"
                  control={form.control}
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.000001"
                          placeholder="e.g., 9.0765"
                          disabled={disabled}
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            field.onChange(isNaN(value) ? 0 : value);
                            setValue('timestamp', new Date());
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="longitude"
                  control={form.control}
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.000001"
                          placeholder="e.g., 7.3986"
                          disabled={disabled}
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            field.onChange(isNaN(value) ? 0 : value);
                            setValue('timestamp', new Date());
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isLocationCaptured && (
                  <div className="col-span-full">
                    <Badge variant="secondary">
                      Method: Manual Entry
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* Location Display */}
            {isLocationCaptured && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Captured Location Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>Coordinates</Label>
                    <div className="font-mono text-xs">
                      {watchedValues.latitude.toFixed(6)}, {watchedValues.longitude.toFixed(6)}
                    </div>
                  </div>
                  <div>
                    <Label>Timestamp</Label>
                    <div className="font-mono text-xs">
                      {watchedValues.timestamp?.toLocaleString()}
                    </div>
                  </div>
                  {watchedValues.accuracy && (
                    <div>
                      <Label>Accuracy</Label>
                      <div className="font-mono text-xs">
                        ±{watchedValues.accuracy.toFixed(1)} meters
                      </div>
                    </div>
                  )}
                  <div>
                    <Label>Capture Method</Label>
                    <div className="text-xs">
                      {watchedValues.captureMethod}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Validation Requirements */}
            {required && !isLocationCaptured && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  GPS location is required for delivery documentation
                </AlertDescription>
              </Alert>
            )}
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}