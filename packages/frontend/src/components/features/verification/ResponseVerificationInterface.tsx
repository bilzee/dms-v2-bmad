'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, ArrowLeft, CheckCircle, XCircle, Eye, Clock, Camera, BarChart3, FileText, Table, Download } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { RapidResponse, RapidAssessment, MediaAttachment, ResponseType, VerificationStatus } from '@dms/shared';
import { useVerificationStore } from '@/stores/verification.store';
import { format } from 'date-fns';
import DeliveryPhotoReviewer from './DeliveryPhotoReviewer';
import DeliveryMetricsValidator from './DeliveryMetricsValidator';
import ResponseAccountabilityTracker from './ResponseAccountabilityTracker';
import { StatusBadge } from './VerificationStatusIndicators';
import { VerificationStamp } from './VerificationStamp';

interface ResponseVerificationInterfaceProps {
  response: RapidResponse;
  assessment?: RapidAssessment;
  onVerificationComplete?: (responseId: string, status: 'VERIFIED' | 'REJECTED') => void;
  onClose?: () => void;
  className?: string;
}

// Response Summary Component
const ResponseSummary: React.FC<{
  response: RapidResponse;
  assessment?: RapidAssessment;
}> = ({ response, assessment }) => {
  const getResponseTypeConfig = (type: ResponseType) => {
    switch (type) {
      case ResponseType.HEALTH:
        return { color: 'bg-red-100 text-red-800 border-red-200', icon: '🏥', label: 'Health' };
      case ResponseType.WASH:
        return { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '💧', label: 'WASH' };
      case ResponseType.SHELTER:
        return { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: '🏠', label: 'Shelter' };
      case ResponseType.FOOD:
        return { color: 'bg-green-100 text-green-800 border-green-200', icon: '🍽️', label: 'Food' };
      case ResponseType.SECURITY:
        return { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: '🛡️', label: 'Security' };
      case ResponseType.POPULATION:
        return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '👥', label: 'Population' };
      default:
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: '❓', label: 'Unknown' };
    }
  };

  const typeConfig = getResponseTypeConfig(response.responseType);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Badge variant="outline" className={cn('text-sm font-medium', typeConfig.color)}>
              <span className="mr-1">{typeConfig.icon}</span>
              {typeConfig.label}
            </Badge>
            Response Verification
          </CardTitle>
          <StatusBadge status={response.verificationStatus} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Responder</label>
            <p className="text-sm font-medium">{response.responderName}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Planned Date</label>
            <p className="text-sm">{format(new Date(response.plannedDate), 'MMM dd, yyyy HH:mm')}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Delivered Date</label>
            <p className="text-sm">
              {response.deliveredDate ? 
                format(new Date(response.deliveredDate), 'MMM dd, yyyy HH:mm') : 
                'Not delivered'
              }
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Status</label>
            <Badge variant="outline" className="text-xs">
              {response.status}
            </Badge>
          </div>
        </div>

        {/* Donor Information */}
        {response.donorName && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Donor</label>
            <p className="text-sm font-medium">{response.donorName}</p>
          </div>
        )}

        {/* Assessment Link */}
        {assessment && (
          <div className="border-t pt-4">
            <label className="text-sm font-medium text-muted-foreground">Related Assessment</label>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {assessment.type}
              </Badge>
              <span className="text-sm">by {assessment.assessorName}</span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(assessment.date), 'MMM dd, yyyy')}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Verification Actions Component
const VerificationActions: React.FC<{
  response: RapidResponse;
  isLoading: boolean;
  onVerify: () => void;
  onReject: () => void;
  canVerify: boolean;
}> = ({ response, isLoading, onVerify, onReject, canVerify }) => {
  if (response.verificationStatus !== VerificationStatus.PENDING) {
    return (
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            {response.verificationStatus === VerificationStatus.VERIFIED ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Response has been verified</span>
              </>
            ) : response.verificationStatus === VerificationStatus.REJECTED ? (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                <span>Response has been rejected</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-blue-500" />
                <span>Response was auto-verified</span>
              </>
            )}
          </div>
          
          {/* Display Verification Stamp for verified responses */}
          {response.verificationStatus === VerificationStatus.VERIFIED && (
            <div className="border-t pt-4">
              <VerificationStamp 
                responseId={response.id}
                verificationId={'verification-' + response.id}
                verifiedAt={new Date()}
                verifiedBy={'System'}
                verificationNotes={'Verified'}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>Response requires verification</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onReject}
              disabled={isLoading || !canVerify}
              className="text-red-600 hover:text-red-700"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={onVerify}
              disabled={isLoading || !canVerify}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Verify Response
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const ResponseVerificationInterface: React.FC<ResponseVerificationInterfaceProps> = ({
  response,
  assessment,
  onVerificationComplete,
  onClose,
  className,
}) => {
  const [activeTab, setActiveTab] = React.useState('photos');
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [verificationData, setVerificationData] = React.useState({
    photosVerified: false,
    metricsVerified: false,
    accountabilityVerified: false,
    verifierNotes: '',
  });
  const [isExporting, setIsExporting] = React.useState(false);

  const { approveResponse, rejectResponse } = useVerificationStore();

  // Handle export report
  const handleExportReport = async (format: 'pdf' | 'excel' | 'csv') => {
    setIsExporting(true);
    try {
      const exportData = {
        response,
        assessment,
        verificationData,
        timestamp: new Date().toISOString(),
        verifier: 'Current User' // TODO: Get from auth context
      };

      const apiResponse = await fetch(`/api/v1/verification/responses/${response.id}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: exportData, format })
      });

      if (apiResponse.ok) {
        const blob = await apiResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `response-verification-${response.id}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Export failed:', apiResponse.statusText);
      }
    } catch (error) {
      console.error('Failed to export report:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle verification completion
  const handleVerify = async () => {
    if (!canVerify) return;

    setIsVerifying(true);
    try {
      const verificationPayload = {
        status: 'VERIFIED' as const,
        verifierNotes: verificationData.verifierNotes,
        verifiedAt: new Date().toISOString(),
        verificationData: {
          photosVerified: verificationData.photosVerified,
          metricsVerified: verificationData.metricsVerified,
          accountabilityVerified: verificationData.accountabilityVerified,
        },
      };

      await approveResponse(response.id, verificationPayload);
      onVerificationComplete?.(response.id, 'VERIFIED');
    } catch (error) {
      console.error('Failed to verify response:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReject = async () => {
    setIsVerifying(true);
    try {
      const rejectionPayload = {
        status: 'REJECTED' as const,
        verifierNotes: verificationData.verifierNotes || 'Response rejected during verification',
        rejectedAt: new Date().toISOString(),
      };

      await rejectResponse(response.id, rejectionPayload);
      onVerificationComplete?.(response.id, 'REJECTED');
    } catch (error) {
      console.error('Failed to reject response:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  // Update verification status based on component states
  const updateVerificationStatus = (component: string, status: boolean) => {
    setVerificationData(prev => ({
      ...prev,
      [`${component}Verified`]: status,
    }));
  };

  // Check if all components are verified
  const canVerify = verificationData.photosVerified && 
                   verificationData.metricsVerified && 
                   verificationData.accountabilityVerified;

  return (
    <div className={cn('space-y-6 max-w-7xl mx-auto', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onClose && (
            <Button variant="ghost" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Queue
            </Button>
          )}
          <h1 className="text-3xl font-bold">Response Verification</h1>
        </div>
      </div>

      {/* Response Summary */}
      <ResponseSummary response={response} assessment={assessment} />

      {/* Verification Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="photos" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Photo Review</span>
            <span className="sm:hidden">Photos</span>
            {verificationData.photosVerified && (
              <CheckCircle className="h-3 w-3 text-green-500" />
            )}
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Metrics</span>
            <span className="sm:hidden">Data</span>
            {verificationData.metricsVerified && (
              <CheckCircle className="h-3 w-3 text-green-500" />
            )}
          </TabsTrigger>
          <TabsTrigger value="accountability" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Accountability</span>
            <span className="sm:hidden">Timeline</span>
            {verificationData.accountabilityVerified && (
              <CheckCircle className="h-3 w-3 text-green-500" />
            )}
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="photos" className="space-y-4">
          <DeliveryPhotoReviewer
            response={response}
            onVerificationComplete={(verified) => updateVerificationStatus('photos', verified)}
            onNotesChange={(notes) => setVerificationData(prev => ({ ...prev, verifierNotes: notes }))}
          />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <DeliveryMetricsValidator
            response={response}
            assessment={assessment}
            onVerificationComplete={(verified) => updateVerificationStatus('metrics', verified)}
            onNotesChange={(notes) => setVerificationData(prev => ({ ...prev, verifierNotes: notes }))}
          />
        </TabsContent>

        <TabsContent value="accountability" className="space-y-4">
          <ResponseAccountabilityTracker
            response={response}
            assessment={assessment}
            onVerificationComplete={(verified) => updateVerificationStatus('accountability', verified)}
            onNotesChange={(notes) => setVerificationData(prev => ({ ...prev, verifierNotes: notes }))}
          />
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Verification Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={cn('p-4 rounded-lg border', verificationData.photosVerified ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200')}>
                  <div className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    <span className="font-medium">Photo Review</span>
                    {verificationData.photosVerified ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {verificationData.photosVerified ? 'Photos verified' : 'Photos require verification'}
                  </p>
                </div>

                <div className={cn('p-4 rounded-lg border', verificationData.metricsVerified ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200')}>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    <span className="font-medium">Delivery Metrics</span>
                    {verificationData.metricsVerified ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {verificationData.metricsVerified ? 'Metrics validated' : 'Metrics require validation'}
                  </p>
                </div>

                <div className={cn('p-4 rounded-lg border', verificationData.accountabilityVerified ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200')}>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">Accountability</span>
                    {verificationData.accountabilityVerified ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {verificationData.accountabilityVerified ? 'Accountability verified' : 'Accountability requires verification'}
                  </p>
                </div>
              </div>
              
              {/* Export Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium">Export Verification Report</h4>
                    <p className="text-sm text-muted-foreground">
                      Export comprehensive verification data and analysis
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handleExportReport('pdf')}
                    disabled={isExporting}
                    size="sm"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleExportReport('excel')}
                    disabled={isExporting}
                    size="sm"
                  >
                    <Table className="h-4 w-4 mr-2" />
                    Export Excel
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleExportReport('csv')}
                    disabled={isExporting}
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
                {isExporting && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Preparing export... This may take a moment.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Verification Actions */}
      <VerificationActions
        response={response}
        isLoading={isVerifying}
        onVerify={handleVerify}
        onReject={handleReject}
        canVerify={canVerify}
      />
    </div>
  );
};

export default ResponseVerificationInterface;