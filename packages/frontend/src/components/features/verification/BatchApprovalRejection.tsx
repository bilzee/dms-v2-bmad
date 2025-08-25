'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertTriangle,
  CheckSquare,
  Users,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { BatchApprovalRequest, BatchRejectionRequest } from '@dms/shared';
import { useAuth } from '@/hooks/useAuth';
import { useVerificationStore, useBatchOperations } from '@/stores/verification.store';

interface BatchApprovalRejectionProps {
  selectedAssessmentIds: string[];
  className?: string;
  onBatchComplete?: () => void;
  onClearSelection?: () => void;
}

interface BatchApprovalFormData {
  batchNote: string;
  notifyAssessors: boolean;
}

interface BatchRejectionFormData {
  rejectionReason: 'DATA_QUALITY' | 'MISSING_INFO' | 'VALIDATION_ERROR' | 'INSUFFICIENT_EVIDENCE' | 'OTHER';
  rejectionComments: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  notifyAssessors: boolean;
}

const REJECTION_REASONS = {
  DATA_QUALITY: 'Data Quality Issues',
  MISSING_INFO: 'Missing Information',
  VALIDATION_ERROR: 'Validation Error',
  INSUFFICIENT_EVIDENCE: 'Insufficient Evidence',
  OTHER: 'Other',
} as const;

const PRIORITY_LEVELS = {
  LOW: { label: 'Low', color: 'bg-green-100 text-green-800' },
  NORMAL: { label: 'Normal', color: 'bg-blue-100 text-blue-800' },
  HIGH: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  URGENT: { label: 'Urgent', color: 'bg-red-100 text-red-800' },
} as const;

export const BatchApprovalRejection: React.FC<BatchApprovalRejectionProps> = ({
  selectedAssessmentIds,
  className,
  onBatchComplete,
  onClearSelection,
}) => {
  const [approvalDialogOpen, setApprovalDialogOpen] = React.useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = React.useState(false);
  
  const [approvalFormData, setApprovalFormData] = React.useState<BatchApprovalFormData>({
    batchNote: '',
    notifyAssessors: true,
  });
  
  const [rejectionFormData, setRejectionFormData] = React.useState<BatchRejectionFormData>({
    rejectionReason: 'DATA_QUALITY',
    rejectionComments: '',
    priority: 'NORMAL',
    notifyAssessors: true,
  });

  const { user } = useAuth();
  const { batchApprove, batchReject } = useVerificationStore();
  const { isBatchProcessing, batchProgress } = useBatchOperations();

  const selectedCount = selectedAssessmentIds.length;

  const handleBatchApproval = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to approve assessments.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const approvalData: BatchApprovalRequest = {
        assessmentIds: selectedAssessmentIds,
        coordinatorId: user.id,
        coordinatorName: user.name,
        batchNote: approvalFormData.batchNote.trim() || undefined,
        notifyAssessors: approvalFormData.notifyAssessors,
      };

      await batchApprove(selectedAssessmentIds, approvalData);

      toast({
        title: 'Batch Approval Successful',
        description: `Successfully processed ${selectedCount} assessments for approval.`,
        variant: 'default',
      });

      // Close dialog and reset form
      setApprovalDialogOpen(false);
      resetApprovalForm();
      onBatchComplete?.();

    } catch (error) {
      console.error('Batch approval failed:', error);
      toast({
        title: 'Batch Approval Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleBatchRejection = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to reject assessments.',
        variant: 'destructive',
      });
      return;
    }

    if (!rejectionFormData.rejectionComments.trim()) {
      toast({
        title: 'Comments Required',
        description: 'Please provide specific feedback for the batch rejection.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const rejectionData: BatchRejectionRequest = {
        assessmentIds: selectedAssessmentIds,
        coordinatorId: user.id,
        coordinatorName: user.name,
        rejectionReason: rejectionFormData.rejectionReason,
        rejectionComments: rejectionFormData.rejectionComments.trim(),
        priority: rejectionFormData.priority,
        notifyAssessors: rejectionFormData.notifyAssessors,
      };

      await batchReject(selectedAssessmentIds, rejectionData);

      toast({
        title: 'Batch Rejection Successful',
        description: `Successfully processed ${selectedCount} assessments for rejection.`,
        variant: 'default',
      });

      // Close dialog and reset form
      setRejectionDialogOpen(false);
      resetRejectionForm();
      onBatchComplete?.();

    } catch (error) {
      console.error('Batch rejection failed:', error);
      toast({
        title: 'Batch Rejection Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const resetApprovalForm = () => {
    setApprovalFormData({
      batchNote: '',
      notifyAssessors: true,
    });
  };

  const resetRejectionForm = () => {
    setRejectionFormData({
      rejectionReason: 'DATA_QUALITY',
      rejectionComments: '',
      priority: 'NORMAL',
      notifyAssessors: true,
    });
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className={cn('bg-primary/5 border border-primary/20 rounded-lg p-4', className)}>
      {/* Batch Processing Progress */}
      {isBatchProcessing && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Processing batch operation...</span>
          </div>
          <Progress 
            value={(batchProgress.processed / batchProgress.total) * 100} 
            className="w-full" 
          />
          <div className="text-xs text-muted-foreground">
            {batchProgress.currentOperation}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            <span className="font-semibold text-primary">
              {selectedCount} assessment{selectedCount > 1 ? 's' : ''} selected
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearSelection}
            disabled={isBatchProcessing}
          >
            Clear Selection
          </Button>

          {/* Batch Approval Dialog */}
          <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="default" 
                size="sm"
                disabled={isBatchProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve All ({selectedCount})
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Batch Approve Assessments
                </DialogTitle>
                <DialogDescription>
                  Approve {selectedCount} selected assessment{selectedCount > 1 ? 's' : ''} with optional batch note.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Selection Summary */}
                <div className="rounded-lg border p-3 bg-muted/50">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">
                      {selectedCount} assessments will be approved
                    </span>
                  </div>
                </div>

                {/* Batch Note */}
                <div className="space-y-2">
                  <Label htmlFor="batchNote">
                    Batch Approval Note <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea
                    id="batchNote"
                    placeholder="Add a note for all approved assessments (e.g., 'Excellent data quality across all submissions')..."
                    value={approvalFormData.batchNote}
                    onChange={(e) => setApprovalFormData({ ...approvalFormData, batchNote: e.target.value })}
                    className="min-h-[80px]"
                  />
                </div>

                {/* Notification Settings */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notifyAssessors"
                    checked={approvalFormData.notifyAssessors}
                    onCheckedChange={(checked) => 
                      setApprovalFormData({ ...approvalFormData, notifyAssessors: checked as boolean })
                    }
                  />
                  <Label
                    htmlFor="notifyAssessors"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Notify all assessors of approval
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setApprovalDialogOpen(false);
                    resetApprovalForm();
                  }}
                  disabled={isBatchProcessing}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handleBatchApproval}
                  disabled={isBatchProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isBatchProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve {selectedCount} Assessment{selectedCount > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Batch Rejection Dialog */}
          <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="destructive" 
                size="sm"
                disabled={isBatchProcessing}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject All ({selectedCount})
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Batch Reject Assessments
                </DialogTitle>
                <DialogDescription>
                  Reject {selectedCount} selected assessment{selectedCount > 1 ? 's' : ''} with structured feedback.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Selection Summary */}
                <div className="rounded-lg border p-3 bg-muted/50">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">
                      {selectedCount} assessments will be rejected
                    </span>
                  </div>
                </div>

                {/* Rejection Reason */}
                <div className="space-y-3">
                  <Label htmlFor="batchRejectionReason">
                    Rejection Reason <span className="text-destructive">*</span>
                  </Label>
                  <Select 
                    value={rejectionFormData.rejectionReason} 
                    onValueChange={(value) => 
                      setRejectionFormData({ ...rejectionFormData, rejectionReason: value as typeof rejectionFormData.rejectionReason })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rejection reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(REJECTION_REASONS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority Level */}
                <div className="space-y-3">
                  <Label htmlFor="batchPriority">
                    Feedback Priority <span className="text-destructive">*</span>
                  </Label>
                  <Select 
                    value={rejectionFormData.priority} 
                    onValueChange={(value) => 
                      setRejectionFormData({ ...rejectionFormData, priority: value as typeof rejectionFormData.priority })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority level" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LEVELS).map(([value, config]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={config.color}>
                              {config.label}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Batch Rejection Comments */}
                <div className="space-y-3">
                  <Label htmlFor="batchRejectionComments">
                    Batch Feedback <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="batchRejectionComments"
                    placeholder="Provide feedback that applies to all selected assessments. Be specific about common issues that need to be addressed across all submissions."
                    value={rejectionFormData.rejectionComments}
                    onChange={(e) => setRejectionFormData({ ...rejectionFormData, rejectionComments: e.target.value })}
                    className="min-h-[120px]"
                    required
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>This feedback will be sent to all {selectedCount} assessors</span>
                    <span>{rejectionFormData.rejectionComments.length} characters</span>
                  </div>
                </div>

                {/* Notification Settings */}
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="batchNotifyAssessors"
                    checked={rejectionFormData.notifyAssessors}
                    onCheckedChange={(checked) => 
                      setRejectionFormData({ ...rejectionFormData, notifyAssessors: checked as boolean })
                    }
                  />
                  <div className="space-y-1">
                    <Label
                      htmlFor="batchNotifyAssessors"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Notify all assessors immediately
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Send batch feedback notification to all {selectedCount} assessors
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejectionDialogOpen(false);
                    resetRejectionForm();
                  }}
                  disabled={isBatchProcessing}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBatchRejection}
                  disabled={isBatchProcessing || !rejectionFormData.rejectionComments.trim()}
                >
                  {isBatchProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject {selectedCount} Assessment{selectedCount > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default BatchApprovalRejection;