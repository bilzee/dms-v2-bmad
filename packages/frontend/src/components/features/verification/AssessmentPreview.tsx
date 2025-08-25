'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, 
  MapPin, 
  Calendar, 
  User, 
  FileText, 
  Image as ImageIcon,
  Download,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAssessmentPreview } from '@/stores/verification.store';
import { 
  AssessmentStatusDisplay,
  StatusBadge,
  AssessmentTypeIndicator,
  PriorityIndicator 
} from './VerificationStatusIndicators';
import { 
  RapidAssessment, 
  AffectedEntity,
  AssessmentType,
  AssessmentData,
  HealthAssessmentData,
  WashAssessmentData,
  ShelterAssessmentData,
  FoodAssessmentData,
  SecurityAssessmentData,
  PopulationAssessmentData,
  PreliminaryAssessmentData
} from '@shared/types/entities';
import { format } from 'date-fns';

interface AssessmentPreviewProps {
  onVerify?: (assessmentId: string, action: 'APPROVE' | 'REJECT') => void;
  onRequestFeedback?: (assessmentId: string) => void;
  className?: string;
}

export const AssessmentPreview: React.FC<AssessmentPreviewProps> = ({
  onVerify,
  onRequestFeedback,
  className,
}) => {
  const { isPreviewOpen, previewAssessment, closePreview } = useAssessmentPreview();
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);

  const handleVerify = (action: 'APPROVE' | 'REJECT') => {
    if (previewAssessment) {
      onVerify?.(previewAssessment.id, action);
      closePreview();
    }
  };

  const handleFeedbackRequest = () => {
    if (previewAssessment) {
      onRequestFeedback?.(previewAssessment.id);
    }
  };

  if (!isPreviewOpen || !previewAssessment) {
    return null;
  }

  return (
    <>
      <Dialog open={isPreviewOpen} onOpenChange={closePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <AssessmentTypeIndicator type={previewAssessment.type} />
                Assessment Preview
              </DialogTitle>
              <Button variant="ghost" size="sm" onClick={closePreview}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-6">
            <div className="space-y-6">
              {/* Assessment Header */}
              <AssessmentHeader assessment={previewAssessment} />

              {/* Assessment Data */}
              <AssessmentDataDisplay 
                type={previewAssessment.type} 
                data={previewAssessment.data} 
              />

              {/* Media Attachments */}
              {previewAssessment.mediaAttachments && previewAssessment.mediaAttachments.length > 0 && (
                <MediaAttachmentsDisplay 
                  attachments={previewAssessment.mediaAttachments}
                  onImageClick={setSelectedImage}
                />
              )}

              {/* Verification Status */}
              <VerificationStatusSection assessment={previewAssessment} />
            </div>
          </ScrollArea>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button variant="outline" onClick={handleFeedbackRequest}>
              <AlertCircle className="h-4 w-4 mr-2" />
              Request Feedback
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={closePreview}>
                Close
              </Button>
              <Button variant="destructive" onClick={() => handleVerify('REJECT')}>
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button variant="default" onClick={() => handleVerify('APPROVE')}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Image Preview</DialogTitle>
            </DialogHeader>
            <div className="relative">
              <img 
                src={selectedImage} 
                alt="Assessment attachment" 
                className="w-full h-auto max-h-[70vh] object-contain"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <Button size="sm" variant="secondary">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedImage(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

interface AssessmentHeaderProps {
  assessment: RapidAssessment;
}

const AssessmentHeader: React.FC<AssessmentHeaderProps> = ({ assessment }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Assessment Details</h3>
              <StatusBadge status={assessment.verificationStatus} />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(assessment.date), 'MMM dd, yyyy HH:mm')}
              </div>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {assessment.assessorName}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Assessment ID</div>
            <div className="text-sm font-mono">{assessment.id}</div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

interface AssessmentDataDisplayProps {
  type: AssessmentType;
  data: AssessmentData;
}

const AssessmentDataDisplay: React.FC<AssessmentDataDisplayProps> = ({ type, data }) => {
  const renderAssessmentData = () => {
    switch (type) {
      case AssessmentType.HEALTH:
        return <HealthAssessmentDataDisplay data={data as HealthAssessmentData} />;
      case AssessmentType.WASH:
        return <WashAssessmentDataDisplay data={data as WashAssessmentData} />;
      case AssessmentType.SHELTER:
        return <ShelterAssessmentDataDisplay data={data as ShelterAssessmentData} />;
      case AssessmentType.FOOD:
        return <FoodAssessmentDataDisplay data={data as FoodAssessmentData} />;
      case AssessmentType.SECURITY:
        return <SecurityAssessmentDataDisplay data={data as SecurityAssessmentData} />;
      case AssessmentType.POPULATION:
        return <PopulationAssessmentDataDisplay data={data as PopulationAssessmentData} />;
      case AssessmentType.PRELIMINARY:
        return <PreliminaryAssessmentDataDisplay data={data as PreliminaryAssessmentData} />;
      default:
        return <div className="text-sm text-muted-foreground">Unknown assessment type</div>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Assessment Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderAssessmentData()}
      </CardContent>
    </Card>
  );
};

const HealthAssessmentDataDisplay: React.FC<{ data: HealthAssessmentData }> = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <DataField label="Has Functional Clinic" value={data.hasFunctionalClinic ? 'Yes' : 'No'} />
    <DataField label="Number of Health Facilities" value={data.numberHealthFacilities} />
    <DataField label="Health Facility Type" value={data.healthFacilityType} />
    <DataField label="Qualified Health Workers" value={data.qualifiedHealthWorkers} />
    <DataField label="Has Medicine Supply" value={data.hasMedicineSupply ? 'Yes' : 'No'} />
    <DataField label="Has Medical Supplies" value={data.hasMedicalSupplies ? 'Yes' : 'No'} />
    <DataField label="Has Maternal/Child Services" value={data.hasMaternalChildServices ? 'Yes' : 'No'} />
    <DataField label="Common Health Issues" value={data.commonHealthIssues.join(', ')} className="md:col-span-2" />
    {data.additionalDetails && (
      <DataField label="Additional Details" value={data.additionalDetails} className="md:col-span-2" />
    )}
  </div>
);

const WashAssessmentDataDisplay: React.FC<{ data: WashAssessmentData }> = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <DataField label="Water Sufficient" value={data.isWaterSufficient ? 'Yes' : 'No'} />
    <DataField label="Water Quality" value={data.waterQuality} />
    <DataField label="Water Source" value={data.waterSource.join(', ')} />
    <DataField label="Has Toilets" value={data.hasToilets ? 'Yes' : 'No'} />
    <DataField label="Number of Toilets" value={data.numberToilets} />
    <DataField label="Toilet Type" value={data.toiletType} />
    <DataField label="Has Solid Waste Disposal" value={data.hasSolidWasteDisposal ? 'Yes' : 'No'} />
    <DataField label="Has Handwashing Facilities" value={data.hasHandwashingFacilities ? 'Yes' : 'No'} />
    {data.additionalDetails && (
      <DataField label="Additional Details" value={data.additionalDetails} className="md:col-span-2" />
    )}
  </div>
);

const ShelterAssessmentDataDisplay: React.FC<{ data: ShelterAssessmentData }> = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <DataField label="Shelters Sufficient" value={data.areSheltersSufficient ? 'Yes' : 'No'} />
    <DataField label="Number of Shelters" value={data.numberShelters} />
    <DataField label="Shelter Types" value={data.shelterTypes.join(', ')} />
    <DataField label="Shelter Condition" value={data.shelterCondition} />
    <DataField label="Needs Repair" value={data.needsRepair ? 'Yes' : 'No'} />
    <DataField label="Needs Tarpaulin" value={data.needsTarpaulin ? 'Yes' : 'No'} />
    <DataField label="Needs Bedding" value={data.needsBedding ? 'Yes' : 'No'} />
    {data.additionalDetails && (
      <DataField label="Additional Details" value={data.additionalDetails} className="md:col-span-2" />
    )}
  </div>
);

const FoodAssessmentDataDisplay: React.FC<{ data: FoodAssessmentData }> = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <DataField label="Food Source" value={data.foodSource.join(', ')} />
    <DataField label="Available Food Duration (days)" value={data.availableFoodDurationDays} />
    <DataField label="Additional Food Required (persons)" value={data.additionalFoodRequiredPersons} />
    <DataField label="Additional Food Required (households)" value={data.additionalFoodRequiredHouseholds} />
    <DataField label="Malnutrition Cases" value={data.malnutritionCases} />
    <DataField label="Feeding Program Exists" value={data.feedingProgramExists ? 'Yes' : 'No'} />
    {data.additionalDetails && (
      <DataField label="Additional Details" value={data.additionalDetails} className="md:col-span-2" />
    )}
  </div>
);

const SecurityAssessmentDataDisplay: React.FC<{ data: SecurityAssessmentData }> = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <DataField label="Area Secure" value={data.isAreaSecure ? 'Yes' : 'No'} />
    <DataField label="Security Threats" value={data.securityThreats.join(', ')} />
    <DataField label="Has Security Presence" value={data.hasSecurityPresence ? 'Yes' : 'No'} />
    <DataField label="Security Provider" value={data.securityProvider} />
    <DataField label="Incidents Reported" value={data.incidentsReported} />
    <DataField label="Restricted Movement" value={data.restrictedMovement ? 'Yes' : 'No'} />
    {data.additionalDetails && (
      <DataField label="Additional Details" value={data.additionalDetails} className="md:col-span-2" />
    )}
  </div>
);

const PopulationAssessmentDataDisplay: React.FC<{ data: PopulationAssessmentData }> = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <DataField label="Total Households" value={data.totalHouseholds} />
    <DataField label="Total Population" value={data.totalPopulation} />
    <DataField label="Male" value={data.populationMale} />
    <DataField label="Female" value={data.populationFemale} />
    <DataField label="Under 5" value={data.populationUnder5} />
    <DataField label="Pregnant Women" value={data.pregnantWomen} />
    <DataField label="Lactating Mothers" value={data.lactatingMothers} />
    <DataField label="Persons with Disability" value={data.personWithDisability} />
    <DataField label="Elderly Persons" value={data.elderlyPersons} />
    <DataField label="Separated Children" value={data.separatedChildren} />
    <DataField label="Lives Lost" value={data.numberLivesLost} />
    <DataField label="Injured" value={data.numberInjured} />
    {data.additionalDetails && (
      <DataField label="Additional Details" value={data.additionalDetails} className="md:col-span-3" />
    )}
  </div>
);

const PreliminaryAssessmentDataDisplay: React.FC<{ data: PreliminaryAssessmentData }> = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <DataField label="Incident Type" value={data.incidentType} />
    <DataField label="Incident Sub Type" value={data.incidentSubType || 'N/A'} />
    <DataField label="Severity" value={data.severity} />
    <DataField label="Priority Level" value={data.priorityLevel} />
    <DataField label="Affected Population (estimate)" value={data.affectedPopulationEstimate} />
    <DataField label="Affected Households (estimate)" value={data.affectedHouseholdsEstimate} />
    <DataField label="Accessibility Status" value={data.accessibilityStatus} />
    <DataField label="Immediate Needs" value={data.immediateNeedsDescription} className="md:col-span-2" />
    {data.additionalDetails && (
      <DataField label="Additional Details" value={data.additionalDetails} className="md:col-span-2" />
    )}
  </div>
);

interface DataFieldProps {
  label: string;
  value: string | number;
  className?: string;
}

const DataField: React.FC<DataFieldProps> = ({ label, value, className }) => (
  <div className={cn('space-y-1', className)}>
    <div className="text-sm font-medium text-muted-foreground">{label}</div>
    <div className="text-sm">{value}</div>
  </div>
);

interface MediaAttachmentsDisplayProps {
  attachments: any[];
  onImageClick: (url: string) => void;
}

const MediaAttachmentsDisplay: React.FC<MediaAttachmentsDisplayProps> = ({ attachments, onImageClick }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Media Attachments ({attachments.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {attachments.map((attachment, index) => (
            <div key={attachment.id || index} className="relative group">
              <div 
                className="aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => attachment.url && onImageClick(attachment.url)}
              >
                {attachment.url ? (
                  <img 
                    src={attachment.thumbnailUrl || attachment.url} 
                    alt={`Attachment ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="secondary">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
              <div className="mt-1 text-xs text-muted-foreground truncate">
                {attachment.mimeType} • {formatFileSize(attachment.size || 0)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const VerificationStatusSection: React.FC<{ assessment: RapidAssessment }> = ({ assessment }) => (
  <Card>
    <CardHeader>
      <CardTitle>Verification Status</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Current Status:</span>
          <StatusBadge status={assessment.verificationStatus} />
        </div>
        <Separator />
        <div className="space-y-2">
          <div className="text-sm font-medium">Sync Status:</div>
          <Badge variant="outline">
            {assessment.syncStatus}
          </Badge>
        </div>
        {assessment.offlineId && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Offline ID:</div>
            <div className="text-sm font-mono text-muted-foreground">{assessment.offlineId}</div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <div className="text-sm font-medium">Created:</div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(assessment.createdAt), 'MMM dd, yyyy HH:mm')}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium">Updated:</div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(assessment.updatedAt), 'MMM dd, yyyy HH:mm')}
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}