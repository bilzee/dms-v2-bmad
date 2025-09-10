'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useBatchOperations, useQueueSelection } from '@/stores/verification.store';
import { BatchVerificationRequest } from '@dms/shared';

interface BatchVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  action: 'APPROVE' | 'REJECT';
  selectedAssessments: Array<{
    id: string;
    type: string;
    assessorName: string;
    affectedEntityName: string;
    date: Date;
  }>;
  className?: string;
}

export const BatchVerification: React.FC<BatchVerificationProps> = ({
  isOpen,
  onClose,
  action,
  selectedAssessments,
  className,
}) => {
  const [feedbackReason, setFeedbackReason] = React.useState<string>('');
  const [comments, setComments] = React.useState('');
  const [priority, setPriority] = React.useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [confirmationStep, setConfirmationStep] = React.useState(false);
  
  const { isBatchProcessing, batchProgress, batchVerify } = useBatchOperations();
  const { clearSelection } = useQueueSelection();

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setFeedbackReason('');
      setComments('');
      setPriority('NORMAL');
      setConfirmationStep(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!confirmationStep) {
      setConfirmationStep(true);
      return;
    }

    try {
      const request: BatchVerificationRequest = {
        assessmentIds: selectedAssessments.map(a => a.id),
        action,
        ...(action === 'REJECT' && feedbackReason && {
          feedback: {
            reason: feedbackReason as any,
            comments,
            priority,
          }
        })
      };

      await batchVerify(request);
      onClose();
      clearSelection();
    } catch (error) {
      console.error('Batch verification failed:', error);
      // Error handling would be managed by the store
    }
  };

  const handleBack = () => {
    if (confirmationStep) {
      setConfirmationStep(false);
    } else {
      onClose();
    }
  };

  const isFormValid = () => {
    if (action === 'APPROVE') return true;
    return feedbackReason && comments.trim().length > 0;
  };

  const getProgressPercentage = () => {
    if (batchProgress.total === 0) return 0;
    return (batchProgress.processed / batchProgress.total) * 100;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn('max-w-2xl', className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === 'APPROVE' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            Batch {action === 'APPROVE' ? 'Approval' : 'Rejection'}
          </DialogTitle>
        </DialogHeader>

        {isBatchProcessing ? (
          <BatchProcessingDisplay 
            progress={batchProgress}
            progressPercentage={getProgressPercentage()}
          />
        ) : confirmationStep ? (
          <ConfirmationStep
            action={action}
            selectedAssessments={selectedAssessments}
            feedbackReason={feedbackReason}
            comments={comments}
            priority={priority}
            onConfirm={handleSubmit}
            onBack={handleBack}
          />
        ) : (
          <BatchFormStep
            action={action}
            selectedAssessments={selectedAssessments}
            feedbackReason={feedbackReason}
            setFeedbackReason={setFeedbackReason}
            comments={comments}
            setComments={setComments}
            priority={priority}
            setPriority={setPriority}
            isFormValid={!!isFormValid()}
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

interface BatchFormStepProps {
  action: 'APPROVE' | 'REJECT';
  selectedAssessments: Array<{
    id: string;
    type: string;
    assessorName: string;
    affectedEntityName: string;
    date: Date;
  }>;
  feedbackReason: string;
  setFeedbackReason: (reason: string) => void;
  comments: string;
  setComments: (comments: string) => void;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  setPriority: (priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT') => void;
  isFormValid: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

const BatchFormStep: React.FC<BatchFormStepProps> = ({
  action,
  selectedAssessments,
  feedbackReason,
  setFeedbackReason,
  comments,
  setComments,
  priority,
  setPriority,
  isFormValid,
  onSubmit,
  onCancel,
}) => {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {action === 'APPROVE' ? 'Approve' : 'Reject'} {selectedAssessments.length} Assessments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-40 overflow-y-auto">
            {selectedAssessments.map((assessment) => (
              <div key={assessment.id} className="flex items-center justify-between p-2 bg-muted rounded">
                <div className="flex-1">
                  <div className="font-medium text-sm">{assessment.affectedEntityName}</div>
                  <div className="text-xs text-muted-foreground">
                    {assessment.type} • {assessment.assessorName}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {new Date(assessment.date).toLocaleDateString()}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rejection Form */}
      {action === 'REJECT' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rejection Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <Select value={feedbackReason} onValueChange={setFeedbackReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rejection reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DATA_QUALITY">Data Quality Issues</SelectItem>
                  <SelectItem value="MISSING_INFO">Missing Information</SelectItem>
                  <SelectItem value="VALIDATION_ERROR">Validation Error</SelectItem>
                  <SelectItem value="INSUFFICIENT_EVIDENCE">Insufficient Evidence</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Comments <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Provide detailed feedback for the rejection..."
                rows={4}
                className="resize-none"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {comments.length}/500 characters
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warning for Approval */}
      {action === 'APPROVE' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900">Bulk Approval Confirmation</h4>
                <p className="text-sm text-green-700 mt-1">
                  You are about to approve {selectedAssessments.length} assessments. This action will mark them as verified and move them out of the verification queue.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={onSubmit}
          disabled={!isFormValid}
          variant={action === 'APPROVE' ? 'default' : 'destructive'}
        >
          {action === 'APPROVE' ? 'Review Approval' : 'Review Rejection'}
        </Button>
      </div>
    </div>
  );
};

interface ConfirmationStepProps {
  action: 'APPROVE' | 'REJECT';
  selectedAssessments: Array<{
    id: string;
    type: string;
    assessorName: string;
    affectedEntityName: string;
    date: Date;
  }>;
  feedbackReason: string;
  comments: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  onConfirm: () => void;
  onBack: () => void;
}

const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  action,
  selectedAssessments,
  feedbackReason,
  comments,
  priority,
  onConfirm,
  onBack,
}) => {
  return (
    <div className="space-y-6">
      {/* Warning */}
      <Card className={cn(
        'border-2',
        action === 'APPROVE' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
      )}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className={cn(
              'h-6 w-6 mt-0.5',
              action === 'APPROVE' ? 'text-green-600' : 'text-red-600'
            )} />
            <div>
              <h3 className={cn(
                'font-semibold text-lg',
                action === 'APPROVE' ? 'text-green-900' : 'text-red-900'
              )}>
                Final Confirmation Required
              </h3>
              <p className={cn(
                'text-sm mt-2',
                action === 'APPROVE' ? 'text-green-800' : 'text-red-800'
              )}>
                You are about to {action.toLowerCase()} {selectedAssessments.length} assessments. 
                This action cannot be undone and will immediately update the verification status of all selected assessments.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Action Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Action</div>
              <div className="font-semibold">{action}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Assessments</div>
              <div className="font-semibold">{selectedAssessments.length}</div>
            </div>
            {action === 'REJECT' && (
              <>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Reason</div>
                  <div className="font-semibold">{feedbackReason.replace('_', ' ')}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Priority</div>
                  <div className="font-semibold">{priority}</div>
                </div>
              </>
            )}
          </div>
          
          {action === 'REJECT' && comments && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">Comments</div>
              <div className="text-sm bg-muted p-3 rounded border">
                {comments}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assessment List */}
      <Card>
        <CardHeader>
          <CardTitle>Affected Assessments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {selectedAssessments.map((assessment) => (
              <div key={assessment.id} className="flex items-center justify-between p-3 bg-muted rounded">
                <div>
                  <div className="font-medium text-sm">{assessment.affectedEntityName}</div>
                  <div className="text-xs text-muted-foreground">
                    {assessment.type} assessment by {assessment.assessorName}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {new Date(assessment.date).toLocaleDateString()}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Back to Edit
        </Button>
        <Button 
          onClick={onConfirm}
          variant={action === 'APPROVE' ? 'default' : 'destructive'}
        >
          {action === 'APPROVE' ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Approval
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 mr-2" />
              Confirm Rejection
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

interface BatchProcessingDisplayProps {
  progress: {
    processed: number;
    total: number;
    currentOperation: string;
  };
  progressPercentage: number;
}

const BatchProcessingDisplay: React.FC<BatchProcessingDisplayProps> = ({
  progress,
  progressPercentage,
}) => {
  return (
    <div className="space-y-6 py-8">
      <div className="text-center">
        <Clock className="h-12 w-12 mx-auto mb-4 text-blue-500 animate-spin" />
        <h3 className="text-lg font-semibold mb-2">Processing Batch Operation</h3>
        <p className="text-sm text-muted-foreground">
          Please wait while we process your verification request...
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{progress.processed} of {progress.total} completed</span>
            </div>
            <Progress value={progressPercentage} className="w-full" />
            <div className="text-center text-sm text-muted-foreground">
              {progress.currentOperation}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          This may take a few moments. Please do not close this dialog.
        </p>
      </div>
    </div>
  );
};