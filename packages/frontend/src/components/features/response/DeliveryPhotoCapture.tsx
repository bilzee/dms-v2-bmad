'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  type MediaAttachment,
  type GPSCoordinates,
} from '@dms/shared';
import { useGPS } from '@/hooks/useGPS';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Camera, 
  Upload, 
  X, 
  Eye, 
  MapPin,
  FileImage,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface DeliveryPhotoCaptureProps {
  value?: MediaAttachment[];
  onChange: (photos: MediaAttachment[]) => void;
  disabled?: boolean;
  className?: string;
  maxPhotos?: number;
  compressionQuality?: number;
}

export function DeliveryPhotoCapture({
  value = [],
  onChange,
  disabled = false,
  className,
  maxPhotos = 10,
  compressionQuality = 0.8,
}: DeliveryPhotoCaptureProps) {
  const [photos, setPhotos] = useState<MediaAttachment[]>(value);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [previewPhoto, setPreviewPhoto] = useState<MediaAttachment | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const { captureLocation, isLoading: isGPSLoading } = useGPS();

  // Photo validation function for security scanning
  const validatePhotoSecurity = async (file: File): Promise<boolean> => {
    try {
      // Check file headers for malicious content
      const buffer = await file.arrayBuffer();
      const header = new Uint8Array(buffer.slice(0, 50));
      
      // Basic image format validation - check magic bytes
      const isJPEG = header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
      const isPNG = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
      const isGIF = header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46;
      
      if (!isJPEG && !isPNG && !isGIF) {
        return false; // Not a valid image format
      }
      
      // Check file size limits (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return false;
      }
      
      // Scan for embedded scripts (basic XSS protection)
      const fileContent = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /on\w+\s*=/i, // Event handlers like onclick=
        /<iframe/i,
        /<object/i,
        /<embed/i
      ];
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(fileContent)) {
          return false; // Found suspicious content
        }
      }
      
      return true; // File passed security validation
    } catch (error) {
      console.error('Photo validation error:', error);
      return false; // Fail safe - reject file if validation fails
    }
  };

  // Update parent when photos change
  useEffect(() => {
    onChange(photos);
  }, [photos, onChange]);

  // Compress image file
  const compressImage = useCallback((file: File, quality: number = compressionQuality): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 1920x1080)
        let { width, height } = img;
        const maxWidth = 1920;
        const maxHeight = 1080;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }, [compressionQuality]);

  // Process uploaded files
  const processFiles = useCallback(async (files: File[]) => {
    if (disabled || photos.length + files.length > maxPhotos) {
      setCaptureError(`Cannot add more than ${maxPhotos} photos`);
      return;
    }

    setIsCompressing(true);
    setCaptureError(null);

    try {
      const location = await captureLocation();
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCompressionProgress(((i + 1) / files.length) * 100);

        // Validate photo security before processing
        if (!await validatePhotoSecurity(file)) {
          setCaptureError('Invalid or potentially unsafe photo file. Please ensure you are uploading a valid image file.');
          continue; // Skip this file and continue with others
        }

        // Compress the image
        const compressedBlob = await compressImage(file);
        
        // Create local URL for the compressed image
        const localUrl = URL.createObjectURL(compressedBlob);
        
        // Create MediaAttachment object
        const photo: MediaAttachment = {
          id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          localPath: localUrl,
          mimeType: 'image/jpeg',
          size: compressedBlob.size,
          metadata: {
            gpsCoordinates: location ? {
              latitude: location.latitude,
              longitude: location.longitude,
              timestamp: new Date(),
              captureMethod: 'GPS',
              accuracy: location.accuracy,
            } : undefined,
            timestamp: new Date(),
          },
        };

        setPhotos(prev => [...prev, photo]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process photos';
      setCaptureError(errorMessage);
    } finally {
      setIsCompressing(false);
      setCompressionProgress(0);
    }
  }, [photos.length, maxPhotos, disabled, compressImage, captureLocation]);

  // Remove photo
  const removePhoto = (photoId: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === photoId);
      if (photo?.localPath) {
        URL.revokeObjectURL(photo.localPath);
      }
      return prev.filter(p => p.id !== photoId);
    });
  };

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: processFiles,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    disabled: disabled || isCompressing,
    maxFiles: maxPhotos - photos.length,
  });

  // Camera capture (mobile devices)
  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use back camera
    input.multiple = true;
    
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        processFiles(files);
      }
    };
    
    input.click();
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Delivery Photo Documentation
          <Badge variant="secondary">
            {photos.length}/{maxPhotos}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Upload Area */}
          {photos.length < maxPhotos && !disabled && (
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                  ${isCompressing ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <input {...getInputProps()} />
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {isDragActive ? 'Drop photos here...' : 'Drag & drop photos or click to browse'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Supports JPEG, PNG, WebP. Photos will be compressed and GPS-tagged.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCameraCapture}
                  disabled={disabled || isCompressing}
                  className="flex-1"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Take Photo
                </Button>
              </div>
            </div>
          )}

          {/* Compression Progress */}
          {isCompressing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileImage className="h-4 w-4" />
                <span className="text-sm">Compressing and processing photos...</span>
              </div>
              <Progress value={compressionProgress} className="w-full" />
            </div>
          )}

          {/* Error Display */}
          {captureError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{captureError}</AlertDescription>
            </Alert>
          )}

          {/* Photo Gallery */}
          {photos.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Captured Photos ({photos.length})
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={photo.localPath || photo.url}
                        alt="Delivery evidence"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Photo Actions */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setPreviewPhoto(photo)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => removePhoto(photo.id)}
                        disabled={disabled}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* GPS Badge */}
                    {photo.metadata?.gpsCoordinates && (
                      <div className="absolute bottom-2 left-2">
                        <Badge variant="secondary" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          GPS
                        </Badge>
                      </div>
                    )}

                    {/* Size Badge */}
                    <div className="absolute bottom-2 right-2">
                      <Badge variant="outline" className="text-xs">
                        {(photo.size / 1024).toFixed(0)}KB
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photo Preview Modal */}
          {previewPhoto && (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg max-w-4xl max-h-full overflow-auto">
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="font-medium">Photo Preview</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewPhoto(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4">
                  <img
                    src={previewPhoto.localPath || previewPhoto.url}
                    alt="Delivery evidence preview"
                    className="max-w-full h-auto"
                  />
                  {previewPhoto.metadata && (
                    <div className="mt-4 p-3 bg-gray-50 rounded text-sm space-y-2">
                      <div><strong>Timestamp:</strong> {previewPhoto.metadata.timestamp.toLocaleString()}</div>
                      <div><strong>Size:</strong> {(previewPhoto.size / 1024).toFixed(1)} KB</div>
                      {previewPhoto.metadata.gpsCoordinates && (
                        <>
                          <div><strong>Location:</strong> {previewPhoto.metadata.gpsCoordinates.latitude.toFixed(6)}, {previewPhoto.metadata.gpsCoordinates.longitude.toFixed(6)}</div>
                          {previewPhoto.metadata.gpsCoordinates.accuracy && (
                            <div><strong>Accuracy:</strong> ±{previewPhoto.metadata.gpsCoordinates.accuracy.toFixed(1)}m</div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          {photos.length === 0 && !isCompressing && (
            <Alert>
              <Camera className="h-4 w-4" />
              <AlertDescription>
                Capture photos of the delivery as evidence. Photos will be automatically compressed and GPS-tagged for verification.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}