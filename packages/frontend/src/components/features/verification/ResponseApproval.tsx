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
import { RapidResponse, ResponseApprovalRequest } from '@dms/shared';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface ResponseApprovalProps {
  response: RapidResponse;
  className?: string;
  onApprovalComplete?: (responseId: string) => void;
  disabled?: boolean;
}

interface ApprovalFormData {
  approvalNote: string;
  notifyResponder: boolean;
}

export const ResponseApproval: React.FC<ResponseApprovalProps> = ({
  response,
  className,
  onApprovalComplete,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [formData, setFormData] = React.useState<ApprovalFormData>({
    approvalNote: '',
    notifyResponder: true,
  });

  const { user } = useAuth();

  const handleApproval = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to approve responses.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const approvalRequest: ResponseApprovalRequest = {
        responseId: response.id,
        coordinatorId: user.id,
        coordinatorName: user.name,
        approvalNote: formData.approvalNote.trim() || undefined,
        approvalTimestamp: new Date(),
        notifyResponder: formData.notifyResponder,
      };

      const response_api = await fetch(`/api/v1/verification/responses/${response.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(approvalRequest),
      });

      if (!response_api.ok) {
        const errorData = await response_api.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response_api.status}`);
      }

      const result = await response_api.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to approve response');
      }

      toast({
        title: 'Response Approved',
        description: `Response ${response.responseType} delivery has been successfully approved.${
          result.data.notificationSent ? ' Responder has been notified.' : ''
        }`,
        variant: 'default',
      });

      // Close dialog and reset form
      setIsOpen(false);
      setFormData({
        approvalNote: '',
        notifyResponder: true,
      });

      // Notify parent component
      onApprovalComplete?.(response.id);

    } catch (error) {
      console.error('Failed to approve response:', error);
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
        description: 'You must be logged in to approve responses.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const approvalRequest: ResponseApprovalRequest = {
        responseId: response.id,
        coordinatorId: user.id,
        coordinatorName: user.name,
        approvalTimestamp: new Date(),
        notifyResponder: true,
      };

      const response_api = await fetch(`/api/v1/verification/responses/${response.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(approvalRequest),
      });

      if (!response_api.ok) {
        const errorData = await response_api.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response_api.status}`);
      }

      const result = await response_api.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to approve response');
      }

      toast({
        title: 'Response Approved',
        description: `Response ${response.responseType} delivery has been successfully approved.${
          result.data.notificationSent ? ' Responder has been notified.' : ''
        }`,
        variant: 'default',
      });

      onApprovalComplete?.(response.id);

    } catch (error) {
      console.error('Failed to approve response:', error);
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
      notifyResponder: true,
    });
  };

  if (response.verificationStatus === 'VERIFIED') {
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
              Approve Response Delivery
            </DialogTitle>
            <DialogDescription>
              Approve the {response.responseType} delivery submitted by {response.responderName} on{' '}
              {response.deliveredDate ? format(new Date(response.deliveredDate), 'PPP') : 'pending delivery'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Response Summary */}
            <div className="rounded-lg border p-3 bg-muted/50">
              <div className="text-sm space-y-1">
                <div><span className="font-medium">Type:</span> {response.responseType}</div>
                <div><span className="font-medium">Responder:</span> {response.responderName}</div>
                <div><span className="font-medium">Planned Date:</span> {format(new Date(response.plannedDate), 'PPP')}</div>
                {response.deliveredDate && (
                  <div><span className="font-medium">Delivered:</span> {format(new Date(response.deliveredDate), 'PPP')}</div>
                )}
                <div><span className="font-medium">Status:</span> {response.status}</div>
              </div>
            </div>

            {/* Approval Note */}
            <div className="space-y-2">
              <Label htmlFor="approvalNote">
                Approval Note <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="approvalNote"
                placeholder="Add a note about the approval (e.g., 'Excellent delivery documentation' or specific commendations)..."
                value={formData.approvalNote}
                onChange={(e) => setFormData({ ...formData, approvalNote: e.target.value })}
                className="min-h-[80px]"
              />
            </div>

            {/* Notification Settings */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notifyResponder"
                checked={formData.notifyResponder}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, notifyResponder: checked as boolean })
                }
              />
              <Label
                htmlFor="notifyResponder"
                className="text-sm font-normal cursor-pointer"
              >
                Notify responder of approval
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
                  Approve Response
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResponseApproval;