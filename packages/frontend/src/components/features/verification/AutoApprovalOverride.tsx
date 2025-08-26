'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertTriangle, 
  Shield, 
  Clock, 
  User, 
  FileText, 
  CheckSquare,
  XCircle,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { 
  AutoApprovalOverride, 
  AutoApprovalOverrideRequest,
  VerificationStatus 
} from '@dms/shared';
import { format } from 'date-fns';

interface AutoApprovalOverrideProps {
  className?: string;
  selectedItems: Array<{
    id: string;
    type: 'ASSESSMENT' | 'RESPONSE';
    title: string;
    currentStatus: VerificationStatus;
    autoApprovedAt?: Date;
    ruleId?: string;
  }>;
  coordinatorId: string;
  coordinatorName: string;
  onOverride?: (request: AutoApprovalOverrideRequest) => Promise<void>;
  onCancel?: () => void;
  recentOverrides?: AutoApprovalOverride[];
}

export const AutoApprovalOverride: React.FC<AutoApprovalOverrideProps> = ({
  className,
  selectedItems,
  coordinatorId,
  coordinatorName,
  onOverride,
  onCancel,
  recentOverrides = [],
}) => {
  const [overrideData, setOverrideData] = React.useState<{
    newStatus: 'PENDING' | 'REJECTED';
    reason: string;
    reasonDetails: string;
  }>({
    newStatus: 'PENDING',
    reason: 'QUALITY_CONCERN',
    reasonDetails: '',
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [showConfirmation, setShowConfirmation] = React.useState(false);

  const autoVerifiedItems = selectedItems.filter(item => 
    item.currentStatus === VerificationStatus.AUTO_VERIFIED
  );

  const handleOverride = async () => {
    if (!onOverride || autoVerifiedItems.length === 0) return;

    setIsLoading(true);
    try {
      const request: AutoApprovalOverrideRequest = {
        targetType: autoVerifiedItems[0].type,
        targetIds: autoVerifiedItems.map(item => item.id),
        newStatus: overrideData.newStatus,
        reason: overrideData.reason,
        reasonDetails: overrideData.reasonDetails,
        coordinatorId,
      };

      await onOverride(request);
      setShowConfirmation(false);
      onCancel?.();
    } catch (error) {
      console.error('Failed to override auto-approvals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const reasonOptions = [
    { value: 'EMERGENCY_OVERRIDE', label: 'Emergency Override', icon: AlertTriangle },
    { value: 'QUALITY_CONCERN', label: 'Quality Concern', icon: Shield },
    { value: 'POLICY_CHANGE', label: 'Policy Change', icon: FileText },
    { value: 'OTHER', label: 'Other', icon: FileText },
  ];

  if (selectedItems.length === 0) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          No items selected for override
        </CardContent>
      </Card>
    );
  }

  if (autoVerifiedItems.length === 0) {
    return (
      <Card className={cn('', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Auto-Approval Override
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Only auto-verified items can be overridden. Please select items with AUTO_VERIFIED status.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Auto-Approval Override
            <Badge variant="destructive" className="ml-auto">
              {autoVerifiedItems.length} items
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              You are about to override {autoVerifiedItems.length} auto-approved{' '}
              {autoVerifiedItems[0]?.type.toLowerCase()}(s). This action requires justification and will be logged for audit purposes.
            </AlertDescription>
          </Alert>

          {/* Selected Items Summary */}
          <div className="space-y-2">
            <Label>Selected Items for Override</Label>
            <div className="border rounded-md max-h-32 overflow-y-auto">
              {autoVerifiedItems.map((item, index) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center justify-between p-2',
                    index < autoVerifiedItems.length - 1 && 'border-b'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {item.type}
                      </Badge>
                      <Badge variant="default" className="text-xs">
                        {item.currentStatus}
                      </Badge>
                      {item.autoApprovedAt && (
                        <span className="text-xs text-muted-foreground">
                          Auto-approved {format(item.autoApprovedAt, 'MMM dd, HH:mm')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Override Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="newStatus">New Status</Label>
              <Select
                value={overrideData.newStatus}
                onValueChange={(value: 'PENDING' | 'REJECTED') =>
                  setOverrideData(prev => ({ ...prev, newStatus: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Return to Pending Review
                    </div>
                  </SelectItem>
                  <SelectItem value="REJECTED">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Mark as Rejected
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Override Reason</Label>
              <Select
                value={overrideData.reason}
                onValueChange={(value) =>
                  setOverrideData(prev => ({ ...prev, reason: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {reasonOptions.map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reasonDetails">Detailed Justification *</Label>
            <Textarea
              id="reasonDetails"
              placeholder="Provide detailed explanation for this override action..."
              value={overrideData.reasonDetails}
              onChange={(e) =>
                setOverrideData(prev => ({ ...prev, reasonDetails: e.target.value }))
              }
              className="min-h-[100px]"
              required
            />
            <p className="text-xs text-muted-foreground">
              This justification will be included in the audit log and may be reviewed by supervisors.
            </p>
          </div>

          <Separator />

          {/* Coordinator Information */}
          <div className="bg-muted/50 p-4 rounded-md space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4" />
              <span className="font-medium">Override authorized by:</span>
              <span>{coordinatorName}</span>
              <Badge variant="outline" className="text-xs">
                Coordinator
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Override timestamp: {format(new Date(), 'MMM dd, yyyy HH:mm:ss')}</span>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            
            <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={!overrideData.reasonDetails.trim() || isLoading}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Override Auto-Approval
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Override Action</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      This action will override {autoVerifiedItems.length} auto-approved items 
                      and change their status to {overrideData.newStatus}. This cannot be undone.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2 text-sm">
                    <div><strong>Items:</strong> {autoVerifiedItems.length}</div>
                    <div><strong>New Status:</strong> {overrideData.newStatus}</div>
                    <div><strong>Reason:</strong> {reasonOptions.find(r => r.value === overrideData.reason)?.label}</div>
                    <div><strong>Justification:</strong> {overrideData.reasonDetails}</div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowConfirmation(false)}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleOverride}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processing...' : 'Confirm Override'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Recent Overrides */}
      {recentOverrides.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Override Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {recentOverrides.slice(0, 5).map((override) => (
                <div
                  key={override.id}
                  className="flex items-center justify-between p-2 border rounded text-sm"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {override.targetType}
                      </Badge>
                      <span>{override.coordinatorName}</span>
                    </div>
                    <p className="text-muted-foreground text-xs mt-1">
                      {override.reasonDetails.substring(0, 60)}...
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={override.newStatus === 'REJECTED' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {override.originalStatus} → {override.newStatus}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(override.overriddenAt, 'MMM dd, HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AutoApprovalOverride;