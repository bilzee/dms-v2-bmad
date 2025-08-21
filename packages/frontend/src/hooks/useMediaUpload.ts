import { useState, useCallback, useRef } from 'react';
import { useGPS } from './useGPS';
import { db } from '@/lib/offline/db';
import { generateUUID } from '@dms/shared';
import type { MediaAttachment, GPSCoordinates } from '@dms/shared';

interface UseMediaUploadOptions {
  maxFileSize?: number; // in bytes, default 5MB
  acceptedTypes?: string[]; // MIME types
  autoGPS?: boolean; // Automatically capture GPS with media
  maxFiles?: number; // Maximum number of files
}

interface MediaFile extends MediaAttachment {
  file: File;
  preview: string;
  uploadProgress?: number;
  error?: string;
}

interface UseMediaUploadReturn {
  mediaFiles: MediaFile[];
  isCapturing: boolean;
  isUploading: boolean;
  error: string | null;
  captureFromCamera: () => Promise<void>;
  selectFiles: (files: FileList) => Promise<void>;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  uploadFiles: (assessmentId?: string) => Promise<void>;
  retryUpload: (id: string) => Promise<void>;
}

export function useMediaUpload(options: UseMediaUploadOptions = {}): UseMediaUploadReturn {
  const {
    maxFileSize = 5 * 1024 * 1024, // 5MB default
    acceptedTypes = ['image/*', 'audio/*', 'video/*'],
    autoGPS = true,
    maxFiles = 10,
  } = options;

  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const { captureLocation, coordinates } = useGPS({ autoCapture: false });

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File size must be less than ${Math.round(maxFileSize / (1024 * 1024))}MB`;
    }

    // Check file type
    const isAccepted = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isAccepted) {
      return `File type ${file.type} is not supported`;
    }

    return null;
  }, [maxFileSize, acceptedTypes]);

  const createMediaAttachment = useCallback(async (
    file: File,
    gpsCoords?: GPSCoordinates
  ): Promise<MediaFile> => {
    // Compress image if needed
    let processedFile: Blob = file;
    if (file.type.startsWith('image/') && file.size > 1024 * 1024) {
      processedFile = await db.compressMedia(file, maxFileSize);
    }

    // Generate thumbnail for images
    let thumbnailUrl: string | undefined;
    if (file.type.startsWith('image/')) {
      const thumbnailBlob = await db.generateThumbnail(file, 150);
      thumbnailUrl = URL.createObjectURL(thumbnailBlob);
    }

    // Create preview URL
    const preview = URL.createObjectURL(processedFile);

    const mediaAttachment: MediaAttachment = {
      id: generateUUID(),
      localPath: preview,
      mimeType: file.type,
      size: processedFile.size,
      thumbnailUrl,
      metadata: {
        gpsCoordinates: gpsCoords,
        timestamp: new Date(),
      },
    };

    return {
      ...mediaAttachment,
      file: processedFile instanceof File ? processedFile : new File([processedFile], file.name, { type: file.type }),
      preview,
    };
  }, [maxFileSize]);

  const captureFromCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera is not supported in this browser');
      return;
    }

    try {
      setIsCapturing(true);
      setError(null);

      // Get GPS coordinates if enabled
      let gpsCoords: GPSCoordinates | undefined;
      if (autoGPS) {
        gpsCoords = (await captureLocation()) || undefined;
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = stream;

      // Create a video element to capture frame
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Wait for video to be ready
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      // Capture frame to canvas
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/jpeg', 0.85);
      });

      // Stop camera stream
      stream.getTracks().forEach(track => track.stop());
      streamRef.current = null;

      // Create file from blob
      const file = new File([blob], `photo_${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });

      // Validate and add file
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      if (mediaFiles.length >= maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const mediaFile = await createMediaAttachment(file, gpsCoords);
      setMediaFiles(prev => [...prev, mediaFile]);

    } catch (error) {
      console.error('Camera capture failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to capture photo');
      
      // Clean up stream if error occurred
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    } finally {
      setIsCapturing(false);
    }
  }, [autoGPS, captureLocation, validateFile, maxFiles, mediaFiles.length, createMediaAttachment]);

  const selectFiles = useCallback(async (files: FileList) => {
    try {
      setError(null);

      // Get GPS coordinates if enabled
      let gpsCoords: GPSCoordinates | undefined;
      if (autoGPS) {
        gpsCoords = (await captureLocation()) || undefined;
      }

      const filesToAdd: MediaFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check if we've reached max files
        if (mediaFiles.length + filesToAdd.length >= maxFiles) {
          setError(`Maximum ${maxFiles} files allowed`);
          break;
        }

        // Validate file
        const validationError = validateFile(file);
        if (validationError) {
          console.warn(`File ${file.name} rejected:`, validationError);
          continue;
        }

        const mediaFile = await createMediaAttachment(file, gpsCoords);
        filesToAdd.push(mediaFile);
      }

      if (filesToAdd.length > 0) {
        setMediaFiles(prev => [...prev, ...filesToAdd]);
      }

    } catch (error) {
      console.error('File selection failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to process files');
    }
  }, [autoGPS, captureLocation, validateFile, maxFiles, mediaFiles.length, createMediaAttachment]);

  const removeFile = useCallback((id: string) => {
    setMediaFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        // Clean up object URLs to prevent memory leaks
        URL.revokeObjectURL(fileToRemove.preview);
        if (fileToRemove.thumbnailUrl) {
          URL.revokeObjectURL(fileToRemove.thumbnailUrl);
        }
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const clearFiles = useCallback(() => {
    // Clean up all object URLs
    mediaFiles.forEach(file => {
      URL.revokeObjectURL(file.preview);
      if (file.thumbnailUrl) {
        URL.revokeObjectURL(file.thumbnailUrl);
      }
    });
    setMediaFiles([]);
    setError(null);
  }, [mediaFiles]);

  const uploadFiles = useCallback(async (assessmentId?: string) => {
    if (mediaFiles.length === 0) return;

    try {
      setIsUploading(true);
      setError(null);

      // Save all media to IndexedDB
      for (const mediaFile of mediaFiles) {
        await db.saveMediaAttachment(mediaFile, assessmentId);
        
        // Add to sync queue for upload
        if (assessmentId) {
          await db.addToQueue({
            type: 'MEDIA',
            action: 'CREATE',
            entityId: mediaFile.id,
            data: {
              ...mediaFile,
              assessmentId,
            },
            retryCount: 0,
            priority: 'NORMAL',
            createdAt: new Date(),
          });
        }
      }

      // Clear files after successful save
      clearFiles();

    } catch (error) {
      console.error('Media upload failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload media');
    } finally {
      setIsUploading(false);
    }
  }, [mediaFiles, clearFiles]);

  const retryUpload = useCallback(async (id: string) => {
    const mediaFile = mediaFiles.find(f => f.id === id);
    if (!mediaFile) return;

    try {
      setError(null);
      
      // Update file to show it's retrying
      setMediaFiles(prev => prev.map(f => 
        f.id === id ? { ...f, error: undefined, uploadProgress: 0 } : f
      ));

      // Re-add to queue
      await db.addToQueue({
        type: 'MEDIA',
        action: 'CREATE',
        entityId: mediaFile.id,
        data: mediaFile,
        retryCount: 0,
        priority: 'HIGH', // Higher priority for retries
        createdAt: new Date(),
      });

    } catch (error) {
      console.error('Retry upload failed:', error);
      setMediaFiles(prev => prev.map(f => 
        f.id === id ? { 
          ...f, 
          error: error instanceof Error ? error.message : 'Retry failed' 
        } : f
      ));
    }
  }, [mediaFiles]);

  return {
    mediaFiles,
    isCapturing,
    isUploading,
    error,
    captureFromCamera,
    selectFiles,
    removeFile,
    clearFiles,
    uploadFiles,
    retryUpload,
  };
}