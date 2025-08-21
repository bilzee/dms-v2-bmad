import { useState, useCallback, useEffect } from 'react';
import type { GPSCoordinates } from '@dms/shared';

interface UseGPSOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  autoCapture?: boolean;
}

interface UseGPSReturn {
  coordinates: GPSCoordinates | null;
  isLoading: boolean;
  error: string | null;
  accuracy: number | null;
  captureLocation: () => Promise<GPSCoordinates | null>;
  clearCoordinates: () => void;
  isSupported: boolean;
}

export function useGPS(options: UseGPSOptions = {}): UseGPSReturn {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 60000,
    autoCapture = false,
  } = options;

  const [coordinates, setCoordinates] = useState<GPSCoordinates | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const isSupported = 'geolocation' in navigator;

  const captureLocation = useCallback(async (): Promise<GPSCoordinates | null> => {
    if (!isSupported) {
      setError('Geolocation is not supported by this browser');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy,
            timeout,
            maximumAge,
          }
        );
      });

      const gpsCoordinates: GPSCoordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date(),
        captureMethod: 'GPS',
      };

      setCoordinates(gpsCoordinates);
      setAccuracy(position.coords.accuracy);
      setError(null);
      
      return gpsCoordinates;
    } catch (err) {
      let errorMessage = 'Failed to capture location';
      
      if (err instanceof GeolocationPositionError) {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case err.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
          default:
            errorMessage = 'Unknown location error occurred';
        }
      }
      
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, enableHighAccuracy, timeout, maximumAge]);

  const clearCoordinates = useCallback(() => {
    setCoordinates(null);
    setAccuracy(null);
    setError(null);
  }, []);

  // Auto-capture on mount if enabled
  useEffect(() => {
    if (autoCapture && isSupported) {
      captureLocation();
    }
  }, [autoCapture, isSupported, captureLocation]);

  return {
    coordinates,
    isLoading,
    error,
    accuracy,
    captureLocation,
    clearCoordinates,
    isSupported,
  };
}