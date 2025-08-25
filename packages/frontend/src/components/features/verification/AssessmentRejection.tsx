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
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { RapidAssessment, AssessmentRejectionRequest } from '@dms/shared';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface AssessmentRejectionProps {
  assessment: RapidAssessment;
  className?: string;
  onRejectionComplete?: (assessmentId: string) => void;
  disabled?: boolean;
}

interface RejectionFormData {
  rejectionReason: 'DATA_QUALITY' | 'MISSING_INFO' | 'VALIDATION_ERROR' | 'INSUFFICIENT_EVIDENCE' | 'OTHER';
  rejectionComments: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  requiresResubmission: boolean;
  notifyAssessor: boolean;
}

const REJECTION_REASONS = {
  DATA_QUALITY: {
    label: 'Data Quality Issues',
    description: 'Assessment contains inaccurate or inconsistent data',
    color: 'bg-orange-100 text-orange-800',
  },
  MISSING_INFO: {
    label: 'Missing Information',
    description: 'Required fields or data points are incomplete',
    color: 'bg-blue-100 text-blue-800',
  },
  VALIDATION_ERROR: {
    label: 'Validation Error',
    description: 'Assessment fails validation rules or business logic',
    color: 'bg-purple-100 text-purple-800',
  },
  INSUFFICIENT_EVIDENCE: {
    label: 'Insufficient Evidence',
    description: 'Lacks adequate supporting documentation or media',
    color: 'bg-yellow-100 text-yellow-800',
  },
  OTHER: {
    label: 'Other',
    description: 'Other reason requiring explanation',
    color: 'bg-gray-100 text-gray-800',
  },
} as const;

const PRIORITY_LEVELS = {
  LOW: {
    label: 'Low',
    description: 'Minor issues, can be addressed at convenience',
    color: 'bg-green-100 text-green-800',
  },
  NORMAL: {
    label: 'Normal',
    description: 'Standard feedback requiring attention',
    color: 'bg-blue-100 text-blue-800',
  },
  HIGH: {
    label: 'High',
    description: 'Important issues requiring prompt attention',
    color: 'bg-orange-100 text-orange-800',
  },
  URGENT: {
    label: 'Urgent',
    description: 'Critical issues requiring immediate action',
    color: 'bg-red-100 text-red-800',
  },
} as const;

export const AssessmentRejection: React.FC<AssessmentRejectionProps> = ({
  assessment,
  className,
  onRejectionComplete,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [formData, setFormData] = React.useState<RejectionFormData>({
    rejectionReason: 'DATA_QUALITY',
    rejectionComments: '',
    priority: 'NORMAL',
    requiresResubmission: true,
    notifyAssessor: true,
  });

  const { user } = useAuth();

  const handleRejection = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to reject assessments.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.rejectionComments.trim()) {
      toast({
        title: 'Comments Required',
        description: 'Please provide specific feedback for the rejection.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const rejectionRequest: AssessmentRejectionRequest = {
        assessmentId: assessment.id,
        coordinatorId: user.id,
        coordinatorName: user.name,
        rejectionReason: formData.rejectionReason,
        rejectionComments: formData.rejectionComments.trim(),
        priority: formData.priority,
        requiresResubmission: formData.requiresResubmission,
        notifyAssessor: formData.notifyAssessor,
        rejectionTimestamp: new Date(),
      };

      const response = await fetch(`/api/v1/verification/assessments/${assessment.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rejectionRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to reject assessment');
      }

      toast({
        title: 'Assessment Rejected',
        description: `Assessment ${assessment.type} has been rejected with feedback.${
          result.data.notificationSent ? ' Assessor has been notified.' : ''
        }`,
        variant: 'default',
      });

      // Close dialog and reset form
      setIsOpen(false);
      resetForm();

      // Notify parent component
      onRejectionComplete?.(assessment.id);

    } catch (error) {
      console.error('Failed to reject assessment:', error);
      toast({
        title: 'Rejection Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setFormData({
      rejectionReason: 'DATA_QUALITY',
      rejectionComments: '',
      priority: 'NORMAL',
      requiresResubmission: true,
      notifyAssessor: true,
    });
  };

  const handleReasonChange = (reason: string) => {
    setFormData({
      ...formData,
      rejectionReason: reason as typeof formData.rejectionReason,
    });
  };

  const handlePriorityChange = (priority: string) => {
    setFormData({
      ...formData,
      priority: priority as typeof formData.priority,
    });
  };

  if (assessment.verificationStatus === 'REJECTED') {
    return (
      <div className={cn('flex items-center gap-2 text-red-600', className)}>
        <XCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Already Rejected</span>
      </div>
    );
  }

  return (
    <div className={cn('', className)}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="destructive"
            size="sm"
            disabled={disabled || isProcessing}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject Assessment
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Reject Assessment
            </DialogTitle>
            <DialogDescription>
              Provide structured feedback for the {assessment.type} assessment submitted by{' '}
              {assessment.assessorName} on {format(new Date(assessment.date), 'PPP')}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Assessment Summary */}
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="text-sm space-y-2">
                <div><span className="font-medium">Type:</span> {assessment.type}</div>
                <div><span className="font-medium">Assessor:</span> {assessment.assessorName}</div>
                <div><span className="font-medium">Date:</span> {format(new Date(assessment.date), 'PPP')}</div>
                <div><span className="font-medium">Status:</span> {assessment.verificationStatus}</div>
              </div>
            </div>

            {/* Rejection Reason */}
            <div className="space-y-3">
              <Label htmlFor="rejectionReason">
                Rejection Reason <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.rejectionReason} onValueChange={handleReasonChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rejection reason" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REJECTION_REASONS).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={cn('text-xs', config.color)}>
                          {config.label}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.rejectionReason && (
                <p className="text-xs text-muted-foreground">
                  {REJECTION_REASONS[formData.rejectionReason].description}
                </p>
              )}
            </div>

            {/* Priority Level */}
            <div className="space-y-3">
              <Label htmlFor="priority">
                Feedback Priority <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.priority} onValueChange={handlePriorityChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority level" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LEVELS).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={cn('text-xs', config.color)}>
                          {config.label}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.priority && (
                <p className="text-xs text-muted-foreground">
                  {PRIORITY_LEVELS[formData.priority].description}
                </p>
              )}
            </div>

            {/* Rejection Comments */}
            <div className="space-y-3">
              <Label htmlFor="rejectionComments">
                Specific Feedback <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rejectionComments"
                placeholder="Provide specific, constructive feedback explaining what needs to be corrected or improved. Be clear and actionable to help the assessor understand the issues and how to address them."
                value={formData.rejectionComments}
                onChange={(e) => setFormData({ ...formData, rejectionComments: e.target.value })}
                className="min-h-[120px]"
                required
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Be specific and constructive to help the assessor improve</span>
                <span>{formData.rejectionComments.length} characters</span>
              </div>
            </div>

            {/* Additional Options */}
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="requiresResubmission"
                  checked={formData.requiresResubmission}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, requiresResubmission: checked as boolean })
                  }
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="requiresResubmission"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Requires resubmission after corrections
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Assessment must be resubmitted after addressing the feedback
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="notifyAssessor"
                  checked={formData.notifyAssessor}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, notifyAssessor: checked as boolean })
                  }
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="notifyAssessor"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Notify assessor immediately
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Send notification with feedback when assessor is online
                  </p>
                </div>
              </div>
            </div>

            {/* Feedback Preview */}
            {formData.rejectionComments.trim() && (
              <div className="rounded-lg border-l-4 border-l-destructive bg-destructive/5 p-4">
                <div className="text-sm">
                  <div className="font-medium text-destructive mb-2">Feedback Preview:</div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={REJECTION_REASONS[formData.rejectionReason].color}>
                      {REJECTION_REASONS[formData.rejectionReason].label}
                    </Badge>
                    <Badge className={PRIORITY_LEVELS[formData.priority].color}>
                      {PRIORITY_LEVELS[formData.priority].label}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{formData.rejectionComments}</p>
                </div>
              </div>
            )}
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
              variant="destructive"
              onClick={handleRejection}
              disabled={isProcessing || !formData.rejectionComments.trim()}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Assessment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssessmentRejection;