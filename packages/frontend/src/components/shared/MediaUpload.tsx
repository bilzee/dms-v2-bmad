'use client';

import React, { useRef, useCallback } from 'react';
import { Camera, Upload, X, RotateCcw, MapPin, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useOfflineStore } from '@/stores/offline.store';
import type { MediaAttachment } from '@dms/shared';

interface MediaUploadProps {
  onMediaChange?: (media: MediaAttachment[]) => void;
  onUploadComplete?: (uploadedMedia: MediaAttachment[]) => void;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedTypes?: string[];
  assessmentId?: string;
  disabled?: boolean;
  className?: string;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  onMediaChange,
  onUploadComplete,
  maxFiles = 10,
  maxFileSize = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ['image/*', 'audio/*', 'video/*'],
  assessmentId,
  disabled = false,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isOnline } = useOfflineStore();

  const {
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
  } = useMediaUpload({
    maxFileSize,
    acceptedTypes,
    autoGPS: true,
    maxFiles,
  });

  // Notify parent component of media changes
  React.useEffect(() => {
    onMediaChange?.(mediaFiles);
  }, [mediaFiles, onMediaChange]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      selectFiles(files);
    }
    // Reset input to allow selecting same file again
    event.target.value = '';
  }, [selectFiles]);

  const handleCameraCapture = useCallback(async () => {
    await captureFromCamera();
  }, [captureFromCamera]);

  const handleUpload = useCallback(async () => {
    await uploadFiles(assessmentId);
    if (mediaFiles.length > 0) {
      onUploadComplete?.(mediaFiles);
    }
  }, [uploadFiles, assessmentId, mediaFiles, onUploadComplete]);

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleString();
  };

  const getSyncStatusIcon = (file: any) => {
    if (file.url) {
      return <div className="w-2 h-2 bg-green-500 rounded-full" title="Synced" />;
    }
    if (isOnline) {
      return <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" title="Pending sync" />;
    }
    return <div className="w-2 h-2 bg-gray-500 rounded-full" title="Offline" />;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          onClick={handleCameraCapture}
          disabled={disabled || isCapturing || mediaFiles.length >= maxFiles}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Camera className="w-4 h-4" />
          {isCapturing ? 'Capturing...' : 'Take Photo'}
        </Button>

        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || mediaFiles.length >= maxFiles}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Select Files
        </Button>

        {mediaFiles.length > 0 && (
          <Button
            type="button"
            onClick={handleUpload}
            disabled={disabled || isUploading}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {isUploading ? 'Uploading...' : `Upload ${mediaFiles.length} file${mediaFiles.length > 1 ? 's' : ''}`}
          </Button>
        )}

        {mediaFiles.length > 0 && (
          <Button
            type="button"
            onClick={clearFiles}
            disabled={disabled || isUploading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear All
          </Button>
        )}
      </div>

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Upload Limits Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>Maximum {maxFiles} files, {formatFileSize(maxFileSize)} per file</p>
        <p>Accepted types: {acceptedTypes.join(', ')}</p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            Synced
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
            Pending
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-500 rounded-full" />
            Offline
          </span>
        </div>
      </div>

      {/* Media Preview Grid */}
      {mediaFiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {mediaFiles.map((file) => (
            <div key={file.id} className="relative group border rounded-lg overflow-hidden bg-white shadow-sm">
              {/* Media Preview */}
              <div className="aspect-square relative bg-gray-100">
                {file.mimeType.startsWith('image/') && (
                  <img
                    src={file.thumbnailUrl || file.preview}
                    alt="Media preview"
                    className="w-full h-full object-cover"
                  />
                )}
                {file.mimeType.startsWith('video/') && (
                  <video
                    src={file.preview}
                    className="w-full h-full object-cover"
                    controls={false}
                    muted
                  />
                )}
                {file.mimeType.startsWith('audio/') && (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                
                {/* Sync Status Indicator */}
                <div className="absolute top-2 left-2">
                  {getSyncStatusIcon(file)}
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeFile(file.id)}
                  disabled={disabled || isUploading}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  title="Remove file"
                >
                  <X className="w-3 h-3" />
                </button>

                {/* Error Indicator */}
                {file.error && (
                  <div className="absolute inset-0 bg-red-500 bg-opacity-75 flex items-center justify-center">
                    <button
                      onClick={() => retryUpload(file.id)}
                      className="p-2 bg-white rounded-full hover:bg-gray-100"
                      title="Retry upload"
                    >
                      <RotateCcw className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="p-2 space-y-1">
                <p className="text-xs text-gray-600 truncate" title={file.mimeType}>
                  {file.mimeType.split('/')[1].toUpperCase()}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.size)}
                </p>
                
                {/* GPS Info */}
                {file.metadata?.gpsCoordinates && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="w-3 h-3" />
                    <span>
                      {file.metadata.gpsCoordinates.latitude.toFixed(4)}, {file.metadata.gpsCoordinates.longitude.toFixed(4)}
                    </span>
                  </div>
                )}

                {/* Timestamp */}
                {file.metadata?.timestamp && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>
                      {formatTimestamp(file.metadata.timestamp)}
                    </span>
                  </div>
                )}

                {/* Error Message */}
                {file.error && (
                  <p className="text-xs text-red-600" title={file.error}>
                    {file.error.length > 30 ? `${file.error.slice(0, 30)}...` : file.error}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress Indicator */}
      {isUploading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 text-sm text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            Uploading media files...
          </div>
        </div>
      )}

      {/* Offline Status */}
      {!isOnline && mediaFiles.length > 0 && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-600">
            You&apos;re offline. Media will be uploaded when connection is restored.
          </p>
        </div>
      )}
    </div>
  );
};