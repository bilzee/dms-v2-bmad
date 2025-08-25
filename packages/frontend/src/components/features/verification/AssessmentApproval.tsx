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
import { toast } from '@/hooks/use-toast';
import { CheckCircle, Loader2, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { RapidAssessment, AssessmentApprovalRequest } from '@dms/shared';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface AssessmentApprovalProps {
  assessment: RapidAssessment;
  className?: string;
  onApprovalComplete?: (assessmentId: string) => void;
  disabled?: boolean;
}

interface ApprovalFormData {
  approvalNote: string;
  notifyAssessor: boolean;
}

export const AssessmentApproval: React.FC<AssessmentApprovalProps> = ({
  assessment,
  className,
  onApprovalComplete,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [formData, setFormData] = React.useState<ApprovalFormData>({
    approvalNote: '',
    notifyAssessor: true,
  });

  const { user } = useAuth();

  const handleApproval = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to approve assessments.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const approvalRequest: AssessmentApprovalRequest = {
        assessmentId: assessment.id,
        coordinatorId: user.id,
        coordinatorName: user.name,
        approvalNote: formData.approvalNote.trim() || undefined,
        approvalTimestamp: new Date(),
        notifyAssessor: formData.notifyAssessor,
      };

      const response = await fetch(`/api/v1/verification/assessments/${assessment.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(approvalRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to approve assessment');
      }

      toast({
        title: 'Assessment Approved',
        description: `Assessment ${assessment.type} has been successfully approved.${
          result.data.notificationSent ? ' Assessor has been notified.' : ''
        }`,
        variant: 'default',
      });

      // Close dialog and reset form
      setIsOpen(false);
      setFormData({
        approvalNote: '',
        notifyAssessor: true,
      });

      // Notify parent component
      onApprovalComplete?.(assessment.id);

    } catch (error) {
      console.error('Failed to approve assessment:', error);
      toast({
        title: 'Approval Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickApproval = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to approve assessments.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const approvalRequest: AssessmentApprovalRequest = {
        assessmentId: assessment.id,
        coordinatorId: user.id,
        coordinatorName: user.name,
        approvalTimestamp: new Date(),
        notifyAssessor: true,
      };

      const response = await fetch(`/api/v1/verification/assessments/${assessment.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(approvalRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to approve assessment');
      }

      toast({
        title: 'Assessment Approved',
        description: `Assessment ${assessment.type} has been successfully approved.${
          result.data.notificationSent ? ' Assessor has been notified.' : ''
        }`,
        variant: 'default',
      });

      onApprovalComplete?.(assessment.id);

    } catch (error) {
      console.error('Failed to approve assessment:', error);
      toast({
        title: 'Approval Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setFormData({
      approvalNote: '',
      notifyAssessor: true,
    });
  };

  if (assessment.verificationStatus === 'VERIFIED') {
    return (
      <div className={cn('flex items-center gap-2 text-green-600', className)}>
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Already Approved</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Quick Approval Button */}
      <Button
        variant="default"
        size="sm"
        onClick={handleQuickApproval}
        disabled={disabled || isProcessing}
        className="bg-green-600 hover:bg-green-700"
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <ThumbsUp className="h-4 w-4 mr-2" />
        )}
        Quick Approve
      </Button>

      {/* Detailed Approval Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || isProcessing}
          >
            Approve with Note
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Approve Assessment
            </DialogTitle>
            <DialogDescription>
              Approve the {assessment.type} assessment submitted by {assessment.assessorName} on{' '}
              {format(new Date(assessment.date), 'PPP')}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Assessment Summary */}
            <div className="rounded-lg border p-3 bg-muted/50">
              <div className="text-sm space-y-1">
                <div><span className="font-medium">Type:</span> {assessment.type}</div>
                <div><span className="font-medium">Assessor:</span> {assessment.assessorName}</div>
                <div><span className="font-medium">Date:</span> {format(new Date(assessment.date), 'PPP')}</div>
              </div>
            </div>

            {/* Approval Note */}
            <div className="space-y-2">
              <Label htmlFor="approvalNote">
                Approval Note <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="approvalNote"
                placeholder="Add a note about the approval (e.g., 'Excellent data quality' or specific commendations)..."
                value={formData.approvalNote}
                onChange={(e) => setFormData({ ...formData, approvalNote: e.target.value })}
                className="min-h-[80px]"
              />
            </div>

            {/* Notification Settings */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notifyAssessor"
                checked={formData.notifyAssessor}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, notifyAssessor: checked as boolean })
                }
              />
              <Label
                htmlFor="notifyAssessor"
                className="text-sm font-normal cursor-pointer"
              >
                Notify assessor of approval
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                resetForm();
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleApproval}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Assessment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssessmentApproval;