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
import { BatchResponseApprovalRequest, BatchResponseRejectionRequest } from '@dms/shared';
import { useAuth } from '@/hooks/useAuth';
import { useVerificationStore, useResponseBatchOperations } from '@/stores/verification.store';

interface BatchResponseApprovalRejectionProps {
  selectedResponseIds: string[];
  className?: string;
  onBatchComplete?: () => void;
  onClearSelection?: () => void;
}

interface BatchApprovalFormData {
  batchNote: string;
  notifyResponders: boolean;
}

interface BatchRejectionFormData {
  rejectionReason: 'DATA_QUALITY' | 'MISSING_INFO' | 'VALIDATION_ERROR' | 'INSUFFICIENT_EVIDENCE' | 'OTHER';
  rejectionComments: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  notifyResponders: boolean;
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

export const BatchResponseApprovalRejection: React.FC<BatchResponseApprovalRejectionProps> = ({
  selectedResponseIds,
  className,
  onBatchComplete,
  onClearSelection,
}) => {
  const [approvalDialogOpen, setApprovalDialogOpen] = React.useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = React.useState(false);
  
  const [approvalFormData, setApprovalFormData] = React.useState<BatchApprovalFormData>({
    batchNote: '',
    notifyResponders: true,
  });
  
  const [rejectionFormData, setRejectionFormData] = React.useState<BatchRejectionFormData>({
    rejectionReason: 'DATA_QUALITY',
    rejectionComments: '',
    priority: 'NORMAL',
    notifyResponders: true,
  });

  const { user } = useAuth();
  const { batchApproveResponses, batchRejectResponses } = useVerificationStore();
  const { isBatchProcessing, batchProgress } = useResponseBatchOperations();

  const handleBatchApproval = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to approve responses.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedResponseIds.length === 0) {
      toast({
        title: 'No Responses Selected',
        description: 'Please select at least one response to approve.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const approvalRequest: BatchResponseApprovalRequest = {
        responseIds: selectedResponseIds,
        coordinatorId: user.id,
        coordinatorName: user.name,
        batchNote: approvalFormData.batchNote.trim() || undefined,
        notifyResponders: approvalFormData.notifyResponders,
      };

      await batchApproveResponses(selectedResponseIds, approvalRequest);

      toast({
        title: 'Batch Approval Successful',
        description: `Successfully approved ${selectedResponseIds.length} response${selectedResponseIds.length !== 1 ? 's' : ''}.`,
        variant: 'default',
      });

      // Reset form and close dialog
      setApprovalFormData({
        batchNote: '',
        notifyResponders: true,
      });
      setApprovalDialogOpen(false);
      
      // Notify parent components
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
        description: 'You must be logged in to reject responses.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedResponseIds.length === 0) {
      toast({
        title: 'No Responses Selected',
        description: 'Please select at least one response to reject.',
        variant: 'destructive',
      });
      return;
    }

    if (!rejectionFormData.rejectionComments.trim()) {
      toast({
        title: 'Rejection Comments Required',
        description: 'Please provide comments explaining the rejection.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const rejectionRequest: BatchResponseRejectionRequest = {
        responseIds: selectedResponseIds,
        coordinatorId: user.id,
        coordinatorName: user.name,
        rejectionReason: rejectionFormData.rejectionReason,
        rejectionComments: rejectionFormData.rejectionComments,
        priority: rejectionFormData.priority,
        notifyResponders: rejectionFormData.notifyResponders,
      };

      await batchRejectResponses(selectedResponseIds, rejectionRequest);

      toast({
        title: 'Batch Rejection Successful',
        description: `Successfully rejected ${selectedResponseIds.length} response${selectedResponseIds.length !== 1 ? 's' : ''}.`,
        variant: 'default',
      });

      // Reset form and close dialog
      setRejectionFormData({
        rejectionReason: 'DATA_QUALITY',
        rejectionComments: '',
        priority: 'NORMAL',
        notifyResponders: true,
      });
      setRejectionDialogOpen(false);
      
      // Notify parent components
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
      notifyResponders: true,
    });
  };

  const resetRejectionForm = () => {
    setRejectionFormData({
      rejectionReason: 'DATA_QUALITY',
      rejectionComments: '',
      priority: 'NORMAL',
      notifyResponders: true,
    });
  };

  // Calculate progress percentage for processing
  const progressPercentage = batchProgress.total > 0 
    ? (batchProgress.processed / batchProgress.total) * 100 
    : 0;

  return (
    <div className={cn('bg-muted/30 border border-dashed border-muted-foreground/30 rounded-lg p-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            <Badge variant="secondary" className="font-medium">
              <Users className="h-3 w-3 mr-1" />
              {selectedResponseIds.length} Selected
            </Badge>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <p className="text-sm text-muted-foreground">
            Batch operations available for selected responses
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Batch Processing Progress */}
          {isBatchProcessing && (
            <div className="flex items-center gap-2 mr-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <div className="min-w-[120px]">
                <Progress value={progressPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {batchProgress.currentOperation}
                </p>
              </div>
            </div>
          )}

          {/* Clear Selection Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onClearSelection?.()}
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
                disabled={isBatchProcessing || selectedResponseIds.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Batch Approve
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Batch Approve Responses
                </DialogTitle>
                <DialogDescription>
                  Approve {selectedResponseIds.length} selected response{selectedResponseIds.length !== 1 ? 's' : ''} for delivery verification.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Selection Summary */}
                <div className="rounded-lg border p-3 bg-muted/50">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">
                      {selectedResponseIds.length} response{selectedResponseIds.length !== 1 ? 's' : ''} selected for approval
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
                    placeholder="Add a general note for this batch approval (e.g., 'All responses meet quality standards')..."
                    value={approvalFormData.batchNote}
                    onChange={(e) => setApprovalFormData({ ...approvalFormData, batchNote: e.target.value })}
                    className="min-h-[80px]"
                  />
                </div>

                {/* Notification Settings */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notifyResponders"
                    checked={approvalFormData.notifyResponders}
                    onCheckedChange={(checked) => 
                      setApprovalFormData({ ...approvalFormData, notifyResponders: checked as boolean })
                    }
                  />
                  <Label
                    htmlFor="notifyResponders"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Notify all responders of approval
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
                      Approve All
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
                disabled={isBatchProcessing || selectedResponseIds.length === 0}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Batch Reject
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-destructive" />
                  Batch Reject Responses
                </DialogTitle>
                <DialogDescription>
                  Reject {selectedResponseIds.length} selected response{selectedResponseIds.length !== 1 ? 's' : ''} and require resubmission.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Selection Summary */}
                <div className="rounded-lg border border-destructive/20 p-3 bg-destructive/5">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="font-medium">
                      {selectedResponseIds.length} response{selectedResponseIds.length !== 1 ? 's' : ''} will be rejected
                    </span>
                  </div>
                </div>

                {/* Rejection Reason */}
                <div className="space-y-2">
                  <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                  <Select
                    value={rejectionFormData.rejectionReason}
                    onValueChange={(value: any) => 
                      setRejectionFormData({ ...rejectionFormData, rejectionReason: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(REJECTION_REASONS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Rejection Comments */}
                <div className="space-y-2">
                  <Label htmlFor="rejectionComments">Rejection Comments *</Label>
                  <Textarea
                    id="rejectionComments"
                    placeholder="Explain why these responses are being rejected and what needs to be corrected..."
                    value={rejectionFormData.rejectionComments}
                    onChange={(e) => setRejectionFormData({ ...rejectionFormData, rejectionComments: e.target.value })}
                    className="min-h-[100px]"
                    required
                  />
                </div>

                {/* Priority Level */}
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select
                    value={rejectionFormData.priority}
                    onValueChange={(value: any) => 
                      setRejectionFormData({ ...rejectionFormData, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LEVELS).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn('text-xs', config.color)}>
                              {config.label}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notification Settings */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notifyRespondersRejection"
                    checked={rejectionFormData.notifyResponders}
                    onCheckedChange={(checked) => 
                      setRejectionFormData({ ...rejectionFormData, notifyResponders: checked as boolean })
                    }
                  />
                  <Label
                    htmlFor="notifyRespondersRejection"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Notify all responders of rejection
                  </Label>
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
                      Reject All
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

export default BatchResponseApprovalRejection;