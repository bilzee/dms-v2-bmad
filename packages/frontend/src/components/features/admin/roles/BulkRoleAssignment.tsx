'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Clock,
  User
} from 'lucide-react';
import { AdminRole, AdminUser, BulkRoleAssignmentRequest } from '@dms/shared/types/admin';
import { toast } from '@/components/ui/use-toast';

interface BulkRoleAssignmentProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUsers: AdminUser[];
  availableRoles: AdminRole[];
  onBulkAssignment: (request: BulkRoleAssignmentRequest) => Promise<any>;
}

interface BulkAssignmentResult {
  userId: string;
  success: boolean;
  user?: AdminUser;
  error?: string;
}

interface AssignmentSummary {
  totalUsers: number;
  successfulAssignments: number;
  failedAssignments: number;
  assignedRoles: AdminRole[];
}

export function BulkRoleAssignment({
  isOpen,
  onClose,
  selectedUsers,
  availableRoles,
  onBulkAssignment
}: BulkRoleAssignmentProps) {
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [notifyUsers, setNotifyUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<BulkAssignmentResult[] | null>(null);
  const [summary, setSummary] = useState<AssignmentSummary | null>(null);
  const [currentStep, setCurrentStep] = useState<'setup' | 'confirmation' | 'results'>('setup');

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedRoleIds([]);
      setReason('');
      setNotifyUsers(false);
      setResults(null);
      setSummary(null);
      setCurrentStep('setup');
    }
  }, [isOpen]);

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoleIds(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleNext = () => {
    if (currentStep === 'setup') {
      if (selectedRoleIds.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please select at least one role",
          variant: "destructive"
        });
        return;
      }
      setCurrentStep('confirmation');
    }
  };

  const handleSubmit = async () => {
    if (selectedUsers.length === 0 || selectedRoleIds.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const request: BulkRoleAssignmentRequest = {
        userIds: selectedUsers.map(user => user.id),
        roleIds: selectedRoleIds,
        reason: reason.trim() || undefined,
        notifyUsers
      };

      const response = await onBulkAssignment(request);
      
      if (response.success) {
        setResults(response.data.results.successful.concat(response.data.results.failed));
        setSummary(response.data.summary);
        setCurrentStep('results');
        
        toast({
          title: "Bulk Assignment Completed",
          description: `${response.data.summary.successfulAssignments} successful, ${response.data.summary.failedAssignments} failed`,
          variant: response.data.summary.failedAssignments > 0 ? "destructive" : "default"
        });
      }
    } catch (error) {
      console.error('Bulk role assignment error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign roles",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSelectedRoles = () => {
    return availableRoles.filter(role => selectedRoleIds.includes(role.id));
  };

  const getSensitiveRoles = () => {
    return getSelectedRoles().filter(role => ['ADMIN', 'COORDINATOR'].includes(role.name));
  };

  const renderRoleSelection = () => (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Assigning roles to {selectedUsers.length} users
      </div>
      
      <ScrollArea className="h-64">
        <div className="space-y-3">
          {availableRoles.map((role) => (
            <Card key={role.id} className="cursor-pointer hover:bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={`bulk-role-${role.id}`}
                    checked={selectedRoleIds.includes(role.id)}
                    onCheckedChange={() => handleRoleToggle(role.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Label 
                        htmlFor={`bulk-role-${role.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {role.name}
                      </Label>
                      {['ADMIN', 'COORDINATOR'].includes(role.name) && (
                        <Badge variant="outline" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Sensitive
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {role.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        {role.permissions.length} permissions
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {role.userCount} users
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <div className="space-y-4 border-t pt-4">
        <div className="space-y-2">
          <Label htmlFor="bulk-reason">Reason for Assignment (Optional)</Label>
          <Textarea
            id="bulk-reason"
            placeholder="Explain why these roles are being assigned..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="bulk-notify-users"
            checked={notifyUsers}
            onCheckedChange={setNotifyUsers}
          />
          <Label htmlFor="bulk-notify-users" className="text-sm">
            Send notifications to all affected users
          </Label>
        </div>
      </div>
    </div>
  );

  const renderConfirmation = () => {
    const selectedRoles = getSelectedRoles();
    const sensitiveRoles = getSensitiveRoles();
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Confirm Bulk Role Assignment</div>
          <div className="text-sm text-muted-foreground">
            You are about to assign {selectedRoles.length} roles to {selectedUsers.length} users
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Selected Roles ({selectedRoles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedRoles.map((role) => (
                <Badge key={role.id} variant="secondary">
                  {role.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Selected Users ({selectedUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-32">
              <div className="space-y-1">
                {selectedUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-2 text-sm">
                    <User className="h-3 w-3" />
                    {user.name} ({user.email})
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {sensitiveRoles.length > 0 && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-orange-700 dark:text-orange-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Sensitive Role Warning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                You are assigning sensitive roles that grant elevated privileges:
              </p>
              <div className="mt-2 space-y-1">
                {sensitiveRoles.map((role) => (
                  <Badge key={role.id} variant="outline" className="mr-2">
                    {role.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {reason && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Assignment Reason</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{reason}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderResults = () => {
    if (!results || !summary) return null;

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Assignment Results</div>
          <Progress 
            value={(summary.successfulAssignments / summary.totalUsers) * 100} 
            className="w-full"
          />
          <div className="text-sm text-muted-foreground mt-2">
            {summary.successfulAssignments} of {summary.totalUsers} assignments completed
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Successful ({successful.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-32">
                <div className="space-y-1">
                  {successful.map((result) => (
                    <div key={result.userId} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      {result.user?.name || result.userId}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Failed ({failed.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-32">
                <div className="space-y-1">
                  {failed.map((result) => (
                    <div key={result.userId} className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="h-3 w-3 text-red-600" />
                        {selectedUsers.find(u => u.id === result.userId)?.name || result.userId}
                      </div>
                      <div className="text-xs text-muted-foreground ml-5">
                        {result.error}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Assigned Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summary.assignedRoles.map((role) => (
                <Badge key={role.id} variant="secondary">
                  {role.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Role Assignment
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {currentStep === 'setup' && renderRoleSelection()}
          {currentStep === 'confirmation' && renderConfirmation()}
          {currentStep === 'results' && renderResults()}
        </div>

        <DialogFooter>
          {currentStep === 'setup' && (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleNext} disabled={selectedRoleIds.length === 0}>
                Next
              </Button>
            </>
          )}
          
          {currentStep === 'confirmation' && (
            <>
              <Button variant="outline" onClick={() => setCurrentStep('setup')}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Assigning...' : 'Assign Roles'}
              </Button>
            </>
          )}
          
          {currentStep === 'results' && (
            <Button onClick={onClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}