'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Camera, 
  MapPin, 
  Clock, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Check, 
  X, 
  AlertCircle,
  FileImage,
  Maximize,
  Download,
  Star,
  Save,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { RapidResponse, MediaAttachment, GPSCoordinates } from '@dms/shared';
import { format } from 'date-fns';

interface PhotoVerificationData {
  photoId: string;
  gpsAccuracy: number;
  timestampAccuracy: boolean;
  qualityScore: number;
  relevanceScore: number;
  verifierNotes: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  persistedAt?: Date;
}

interface DeliveryPhotoReviewerProps {
  response: RapidResponse;
  onVerificationComplete?: (verified: boolean) => void;
  onNotesChange?: (notes: string) => void;
  className?: string;
}

// Photo Gallery Component
const PhotoGallery: React.FC<{
  photos: MediaAttachment[];
  selectedPhotoId: string | null;
  onPhotoSelect: (photoId: string) => void;
  photoVerifications: Record<string, PhotoVerificationData>;
}> = ({ photos, selectedPhotoId, onPhotoSelect, photoVerifications }) => {
  if (photos.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileImage className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No delivery photos</h3>
          <p className="text-sm text-muted-foreground text-center">
            No photos have been uploaded for this response delivery.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {photos.map((photo, index) => {
        const verification = photoVerifications[photo.id];
        const isSelected = selectedPhotoId === photo.id;
        
        return (
          <div
            key={photo.id}
            className={cn(
              'relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all',
              isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200 hover:border-gray-300'
            )}
            onClick={() => onPhotoSelect(photo.id)}
          >
            {/* Photo Thumbnail */}
            <img
              src={photo.thumbnailUrl || photo.url}
              alt={`Delivery photo ${index + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            
            {/* Verification Status Overlay */}
            <div className="absolute top-2 right-2">
              {verification?.verificationStatus === 'VERIFIED' && (
                <Badge className="bg-green-500 text-white">
                  <Check className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
              {verification?.verificationStatus === 'REJECTED' && (
                <Badge className="bg-red-500 text-white">
                  <X className="h-3 w-3 mr-1" />
                  Rejected
                </Badge>
              )}
              {verification?.verificationStatus === 'PENDING' && (
                <Badge variant="outline" className="bg-white">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              )}
            </div>

            {/* Photo Index */}
            <div className="absolute bottom-2 left-2">
              <Badge variant="secondary" className="text-xs">
                {index + 1}
              </Badge>
            </div>

            {/* GPS Indicator */}
            {photo.metadata?.gpsCoordinates && (
              <div className="absolute bottom-2 right-2">
                <MapPin className="h-4 w-4 text-white drop-shadow-sm" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Photo Viewer Component
const PhotoViewer: React.FC<{
  photo: MediaAttachment | null;
  verification: PhotoVerificationData | null;
  onVerificationUpdate: (photoId: string, data: Partial<PhotoVerificationData>) => void;
}> = ({ photo, verification, onVerificationUpdate }) => {
  const [zoom, setZoom] = React.useState(100);
  const [rotation, setRotation] = React.useState(0);

  if (!photo) {
    return (
      <Card className="h-96 border-dashed">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Select a photo to review</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleQualityChange = (value: number[]) => {
    onVerificationUpdate(photo.id, { qualityScore: value[0] });
  };

  const handleRelevanceChange = (value: number[]) => {
    onVerificationUpdate(photo.id, { relevanceScore: value[0] });
  };

  const handleNotesChange = (notes: string) => {
    onVerificationUpdate(photo.id, { verifierNotes: notes });
  };

  const handleStatusChange = (status: 'VERIFIED' | 'REJECTED') => {
    onVerificationUpdate(photo.id, { verificationStatus: status });
  };

  return (
    <div className="space-y-4">
      {/* Photo Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Photo Verification</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(prev => Math.min(prev + 25, 200))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">{zoom}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(prev => Math.max(prev - 25, 50))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRotation(prev => (prev + 90) % 360)}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              
              {/* Fullscreen Dialog */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Maximize className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                  <DialogHeader>
                    <DialogTitle>Delivery Photo - Full View</DialogTitle>
                  </DialogHeader>
                  <div className="flex justify-center">
                    <img
                      src={photo.url}
                      alt="Full delivery photo"
                      className="max-w-full max-h-[70vh] object-contain"
                    />
                  </div>
                </DialogContent>
              </Dialog>

              {/* Download Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = photo.url || '';
                  link.download = `delivery-photo-${photo.id}.jpg`;
                  link.click();
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ height: '400px' }}>
            <img
              src={photo.url}
              alt="Delivery photo"
              className="w-full h-full object-contain transition-transform duration-200"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              }}
            />
            
            {/* GPS Overlay */}
            {photo.metadata?.gpsCoordinates && (
              <div className="absolute top-4 left-4 bg-black/70 text-white p-2 rounded-lg text-sm">
                <div className="flex items-center gap-1 mb-1">
                  <MapPin className="h-3 w-3" />
                  GPS Location
                </div>
                <div>
                  Lat: {photo.metadata.gpsCoordinates.latitude.toFixed(6)}
                </div>
                <div>
                  Lng: {photo.metadata.gpsCoordinates.longitude.toFixed(6)}
                </div>
                {photo.metadata.gpsCoordinates.accuracy && (
                  <div className="text-xs opacity-75">
                    Accuracy: ±{photo.metadata.gpsCoordinates.accuracy}m
                  </div>
                )}
              </div>
            )}

            {/* Timestamp Overlay */}
            {photo.metadata?.timestamp && (
              <div className="absolute top-4 right-4 bg-black/70 text-white p-2 rounded-lg text-sm">
                <div className="flex items-center gap-1 mb-1">
                  <Clock className="h-3 w-3" />
                  Timestamp
                </div>
                <div>
                  {format(new Date(photo.metadata.timestamp), 'MMM dd, yyyy')}
                </div>
                <div>
                  {format(new Date(photo.metadata.timestamp), 'HH:mm:ss')}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Photo Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Photo Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">File Size</label>
              <p className="text-sm">{(photo.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Format</label>
              <p className="text-sm">{photo.mimeType}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">GPS Accuracy</label>
              <p className="text-sm">
                {photo.metadata?.gpsCoordinates?.accuracy 
                  ? `±${photo.metadata.gpsCoordinates.accuracy}m`
                  : 'No GPS data'
                }
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Capture Method</label>
              <p className="text-sm">
                {photo.metadata?.gpsCoordinates?.captureMethod || 'Unknown'}
              </p>
            </div>
          </div>

          {/* GPS Accuracy Warning */}
          {photo.metadata?.gpsCoordinates?.accuracy && photo.metadata.gpsCoordinates.accuracy > 100 && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-700">
                GPS accuracy is low (±{photo.metadata.gpsCoordinates.accuracy}m). 
                Location data may be unreliable.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Photo Quality Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quality Score */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Image Quality Score: {verification?.qualityScore || 5}
            </label>
            <Slider
              value={[verification?.qualityScore || 5]}
              onValueChange={handleQualityChange}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Poor Quality</span>
              <span>Excellent Quality</span>
            </div>
          </div>

          {/* Relevance Score */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Content Relevance Score: {verification?.relevanceScore || 5}
            </label>
            <Slider
              value={[verification?.relevanceScore || 5]}
              onValueChange={handleRelevanceChange}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Not Relevant</span>
              <span>Highly Relevant</span>
            </div>
          </div>

          {/* Verification Notes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Verification Notes</label>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {false && (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Saving...</span>
                  </>
                )}
                {false && (
                  <>
                    <Save className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">
                      Auto-saved
                    </span>
                  </>
                )}
                {false && (
                  <>
                    <AlertCircle className="h-3 w-3 text-yellow-600" />
                    <span className="text-yellow-600">Unsaved changes</span>
                  </>
                )}
              </div>
            </div>
            <Textarea
              value={verification?.verifierNotes || ''}
              onChange={(e) => {
                handleNotesChange(e.target.value);
              }}
              placeholder="Add notes about photo quality, content, or issues..."
              className="min-h-[80px]"
            />
          </div>

          {/* Verification Actions */}
          <div className="flex items-center gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => handleStatusChange('REJECTED')}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4 mr-2" />
              Reject Photo
            </Button>
            <Button
              onClick={() => handleStatusChange('VERIFIED')}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Verify Photo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Simple debounce utility
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const DeliveryPhotoReviewer: React.FC<DeliveryPhotoReviewerProps> = ({
  response,
  onVerificationComplete,
  onNotesChange,
  className,
}) => {
  const [selectedPhotoId, setSelectedPhotoId] = React.useState<string | null>(null);
  const [photoVerifications, setPhotoVerifications] = React.useState<Record<string, PhotoVerificationData>>({});
  const [overallNotes, setOverallNotes] = React.useState('');
  
  // Auto-save states
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = React.useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Initialize photo verifications
  React.useEffect(() => {
    const initialVerifications: Record<string, PhotoVerificationData> = {};
    response.deliveryEvidence.forEach(photo => {
      initialVerifications[photo.id] = validatePhotoMetadata(photo);
    });
    setPhotoVerifications(initialVerifications);

    // Auto-select first photo
    if (response.deliveryEvidence.length > 0) {
      setSelectedPhotoId(response.deliveryEvidence[0].id);
    }
  }, [response.deliveryEvidence]);

  // Update verification data
  // Enhanced photo metadata validation function
  const validatePhotoMetadata = (photo: MediaAttachment): PhotoVerificationData => {
    const metadata = photo.metadata as any;
    
    return {
      photoId: photo.id,
      gpsAccuracy: metadata?.gpsCoordinates?.accuracy || 0,
      timestampAccuracy: Boolean(metadata?.timestamp),
      qualityScore: calculateImageQuality(photo),
      relevanceScore: calculateRelevanceScore(photo, metadata),
      verifierNotes: '',
      verificationStatus: 'PENDING'
    };
  };

  // Enhanced image quality assessment function
  const calculateImageQuality = (photo: MediaAttachment): number => {
    const size = photo.size;
    const metadata = photo.metadata as any;
    const hasGPS = Boolean(metadata?.gpsCoordinates);
    const hasTimestamp = Boolean(metadata?.timestamp);
    const gpsAccuracy = metadata?.gpsCoordinates?.accuracy || Infinity;
    
    let score = 3; // Base score for existing photo
    
    // File size scoring (0-2 points)
    if (size > 2 * 1024 * 1024) score += 2; // >2MB = excellent quality
    else if (size > 1024 * 1024) score += 1.5; // >1MB = good quality
    else if (size > 500 * 1024) score += 1; // >500KB = acceptable
    else score += 0.5; // <500KB = poor quality
    
    // GPS metadata scoring (0-2 points)
    if (hasGPS) {
      if (gpsAccuracy <= 10) score += 2; // <10m = excellent GPS
      else if (gpsAccuracy <= 50) score += 1.5; // <50m = good GPS  
      else if (gpsAccuracy <= 100) score += 1; // <100m = acceptable GPS
      else score += 0.5; // >100m = poor GPS
    }
    
    // Timestamp scoring (0-2 points)
    if (hasTimestamp) {
      const photoTime = new Date(metadata.timestamp);
      const now = new Date();
      const hoursDiff = Math.abs(now.getTime() - photoTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff <= 24) score += 2; // Within 24 hours = excellent timing
      else if (hoursDiff <= 72) score += 1.5; // Within 3 days = good timing
      else if (hoursDiff <= 168) score += 1; // Within 1 week = acceptable timing
      else score += 0.5; // Older = poor timing
    }
    
    // MIME type scoring (0-1 points)
    if (photo.mimeType === 'image/jpeg') score += 1; // JPEG preferred
    else if (photo.mimeType.startsWith('image/')) score += 0.5;
    
    return Math.min(Math.round(score * 10) / 10, 10); // Round to 1 decimal, cap at 10
  };

  // Calculate photo relevance score based on context and metadata
  const calculateRelevanceScore = (photo: MediaAttachment, metadata: any): number => {
    let score = 5; // Base relevance score
    
    // GPS proximity to expected delivery location (placeholder logic)
    if (metadata?.gpsCoordinates) {
      const accuracy = metadata.gpsCoordinates.accuracy;
      if (accuracy <= 25) score += 2; // Very precise location
      else if (accuracy <= 100) score += 1; // Good location precision
      else if (accuracy <= 500) score += 0.5; // Acceptable precision
      // No bonus for poor GPS accuracy
    }
    
    // Time correlation with delivery window
    if (metadata?.timestamp && response.deliveredDate) {
      const photoTime = new Date(metadata.timestamp);
      const deliveryTime = new Date(response.deliveredDate);
      const hoursDiff = Math.abs(photoTime.getTime() - deliveryTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff <= 2) score += 2; // Within 2 hours of delivery
      else if (hoursDiff <= 12) score += 1.5; // Same day delivery
      else if (hoursDiff <= 24) score += 1; // Within 24 hours
      else if (hoursDiff <= 72) score += 0.5; // Within 3 days
      // No bonus for photos taken too far from delivery time
    }
    
    // File characteristics that indicate delivery evidence
    const hasLargeSize = photo.size > 1024 * 1024; // >1MB suggests detailed photo
    if (hasLargeSize) score += 1;
    
    return Math.min(Math.round(score * 10) / 10, 10); // Round to 1 decimal, cap at 10
  };

  const handleVerificationUpdate = (photoId: string, data: Partial<PhotoVerificationData>) => {
    setPhotoVerifications(prev => ({
      ...prev,
      [photoId]: {
        ...prev[photoId],
        ...data,
      },
    }));
    
    // Trigger auto-save if notes were changed
    if (data.verifierNotes !== undefined) {
      debouncedSave(photoId, data.verifierNotes);
    }
  };

  // Debounced save function
  const debouncedSave = useMemo(
    () => debounce(async (photoId: string, notes: string) => {
      setSaveStatus('saving');
      try {
        const apiResponse = await fetch(`/api/v1/verification/photos/${photoId}/save-annotations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            notes, 
            timestamp: new Date().toISOString(),
            responseId: response.id
          })
        });

        if (apiResponse.ok) {
          setLastSaved(new Date());
          setSaveStatus('saved');
          // Update the persisted timestamp
          setPhotoVerifications(prev => ({
            ...prev,
            [photoId]: {
              ...prev[photoId],
              persistedAt: new Date(),
            },
          }));
        } else {
          setSaveStatus('unsaved');
        }
      } catch (error) {
        console.error('Failed to save photo annotations:', error);
        setSaveStatus('unsaved');
      }
    }, 2000),
    [response.id]
  );

  // Check if all photos are verified
  React.useEffect(() => {
    const allPhotos = Object.values(photoVerifications);
    const allVerified = allPhotos.length > 0 && 
                       allPhotos.every(v => v.verificationStatus === 'VERIFIED');
    
    onVerificationComplete?.(allVerified);
  }, [photoVerifications, onVerificationComplete]);

  // Update overall notes
  React.useEffect(() => {
    onNotesChange?.(overallNotes);
  }, [overallNotes, onNotesChange]);

  const selectedPhoto = selectedPhotoId 
    ? response.deliveryEvidence.find(p => p.id === selectedPhotoId) || null
    : null;
  
  const selectedVerification = selectedPhotoId 
    ? photoVerifications[selectedPhotoId] || null 
    : null;

  const verifiedCount = Object.values(photoVerifications).filter(v => v.verificationStatus === 'VERIFIED').length;
  const totalPhotos = response.deliveryEvidence.length;

  // Batch operations
  const handleBatchVerifyAll = () => {
    const updatedVerifications = { ...photoVerifications };
    response.deliveryEvidence.forEach(photo => {
      if (updatedVerifications[photo.id]?.verificationStatus !== 'VERIFIED') {
        updatedVerifications[photo.id] = {
          ...updatedVerifications[photo.id],
          verificationStatus: 'VERIFIED',
          verifierNotes: updatedVerifications[photo.id]?.verifierNotes || 'Batch verified',
          qualityScore: updatedVerifications[photo.id]?.qualityScore || 8,
          relevanceScore: updatedVerifications[photo.id]?.relevanceScore || 8,
        };
      }
    });
    setPhotoVerifications(updatedVerifications);
  };

  const handleBatchRejectAll = () => {
    const updatedVerifications = { ...photoVerifications };
    response.deliveryEvidence.forEach(photo => {
      updatedVerifications[photo.id] = {
        ...updatedVerifications[photo.id],
        verificationStatus: 'REJECTED',
        verifierNotes: updatedVerifications[photo.id]?.verifierNotes || 'Batch rejected',
      };
    });
    setPhotoVerifications(updatedVerifications);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Stats */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">
                  {totalPhotos} Photo{totalPhotos !== 1 ? 's' : ''}
                </span>
              </div>
              <Badge variant={verifiedCount === totalPhotos ? 'default' : 'secondary'}>
                {verifiedCount} / {totalPhotos} Verified
              </Badge>
            </div>
            
            <div className="flex items-center gap-3">
              {totalPhotos > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBatchVerifyAll}
                    disabled={verifiedCount === totalPhotos}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Verify All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBatchRejectAll}
                    disabled={totalPhotos === 0}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject All
                  </Button>
                </div>
              )}
              
              {totalPhotos > 0 && (
                <div className="text-sm text-muted-foreground">
                  Progress: {totalPhotos > 0 ? Math.round((verifiedCount / totalPhotos) * 100) : 0}%
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Gallery */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoGallery
            photos={response.deliveryEvidence}
            selectedPhotoId={selectedPhotoId}
            onPhotoSelect={setSelectedPhotoId}
            photoVerifications={photoVerifications}
          />
        </CardContent>
      </Card>

      {/* Photo Viewer */}
      {selectedPhoto && (
        <PhotoViewer
          photo={selectedPhoto}
          verification={selectedVerification}
          onVerificationUpdate={handleVerificationUpdate}
        />
      )}

      {/* Overall Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Photo Review Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={overallNotes}
            onChange={(e) => setOverallNotes(e.target.value)}
            placeholder="Add overall comments about the delivery photos, their quality, and relevance to the response..."
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryPhotoReviewer;