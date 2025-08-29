'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Clock, 
  User, 
  Phone,
  Mail,
  Calendar,
  FileText,
  Image,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { RapidAssessment, RapidResponse, VerificationStatus, AssessmentType, ResponseType } from '@dms/shared';
import { StatusBadge, PriorityIndicator } from './VerificationStatusIndicators';

interface QuickViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: RapidAssessment | RapidResponse | null;
  type: 'assessment' | 'response';
  onVerify?: (id: string) => void;
  onReject?: (id: string) => void;
}

interface AssessmentDetailsProps {
  assessment: RapidAssessment;
}

interface ResponseDetailsProps {
  response: RapidResponse;
}

// Assessment Details Component
const AssessmentDetails: React.FC<AssessmentDetailsProps> = ({ assessment }) => {
  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Assessment Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {format(new Date(assessment.date), 'PPP')} at {format(new Date(assessment.date), 'p')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline">{assessment.type}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={assessment.verificationStatus} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Assessor Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{assessment.assessorId}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">+234 xxx xxxx</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">assessor@example.com</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Affected Entity</p>
              <p className="text-sm text-muted-foreground">{assessment.affectedEntityId}</p>
            </div>
            <div>
              <p className="text-sm font-medium">GPS Coordinates</p>
              <p className="text-sm text-muted-foreground">
                {assessment.gpsCoordinates?.lat.toFixed(6)}, {assessment.gpsCoordinates?.lng.toFixed(6)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessment Data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Assessment Findings</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="summary" className="w-full">
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="mt-4">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Key Findings</p>
                  <p className="text-sm text-muted-foreground">
                    {assessment.notes || 'No summary provided'}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-lg font-bold text-red-600">High</p>
                    <p className="text-xs text-muted-foreground">Damage Level</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <p className="text-lg font-bold text-orange-600">15</p>
                    <p className="text-xs text-muted-foreground">Affected People</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-lg font-bold text-blue-600">3</p>
                    <p className="text-xs text-muted-foreground">Response Needs</p>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="details" className="mt-4">
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Assessment ID:</span> {assessment.id}
                </div>
                <div>
                  <span className="font-medium">Created:</span> {format(new Date(assessment.date), 'PPpp')}
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span> {format(new Date(assessment.date), 'PPpp')}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="photos" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Mock photos */}
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <Image className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <Image className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

// Response Details Component
const ResponseDetails: React.FC<ResponseDetailsProps> = ({ response }) => {
  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Response Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {format(new Date(response.plannedDate), 'PPP')} at {format(new Date(response.plannedDate), 'p')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline">{response.responseType}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={response.verificationStatus} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Responder Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{response.responderId}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">+234 xxx xxxx</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">responder@example.com</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Response Plan */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Response Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Description</p>
              <p className="text-sm text-muted-foreground">
                {response.description || 'No description provided'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Status</p>
                <Badge variant="outline">{response.status}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium">Priority</p>
                <PriorityIndicator priority="HIGH" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Delivery Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="plan" className="w-full">
            <TabsList>
              <TabsTrigger value="plan">Plan</TabsTrigger>
              <TabsTrigger value="delivery">Delivery</TabsTrigger>
              <TabsTrigger value="verification">Verification</TabsTrigger>
            </TabsList>
            <TabsContent value="plan" className="mt-4">
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium">Planned Date:</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    {format(new Date(response.plannedDate), 'PPpp')}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium">Estimated Beneficiaries:</span>
                  <span className="text-sm text-muted-foreground ml-2">25 people</span>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="delivery" className="mt-4">
              <div className="space-y-3">
                {response.deliveredDate ? (
                  <>
                    <div>
                      <span className="text-sm font-medium">Delivered:</span>
                      <span className="text-sm text-green-600 ml-2">
                        {format(new Date(response.deliveredDate), 'PPpp')}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Actual Beneficiaries:</span>
                      <span className="text-sm text-muted-foreground ml-2">23 people</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Delivery pending</p>
                )}
              </div>
            </TabsContent>
            <TabsContent value="verification" className="mt-4">
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium">Photos:</span>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="aspect-square bg-muted rounded flex items-center justify-center">
                      <Image className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="aspect-square bg-muted rounded flex items-center justify-center">
                      <Image className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  isOpen,
  onClose,
  item,
  type,
  onVerify,
  onReject,
}) => {
  if (!item) return null;

  const isPending = item.verificationStatus === VerificationStatus.PENDING;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Eye className="h-5 w-5" />
            {type === 'assessment' ? 'Assessment Details' : 'Response Details'}
            <StatusBadge status={item.verificationStatus} />
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {type === 'assessment' ? (
            <AssessmentDetails assessment={item as RapidAssessment} />
          ) : (
            <ResponseDetails response={item as RapidResponse} />
          )}
        </div>

        <DialogFooter className="gap-2">
          {isPending && (
            <>
              <Button
                variant="destructive"
                onClick={() => onReject?.(item.id)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => onVerify?.(item.id)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify
              </Button>
            </>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuickViewModal;