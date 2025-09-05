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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Shield, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { AdminRole, AdminUser, RoleAssignmentRequest, RoleAssignmentResponse } from '../../../../../../../shared/types/admin';
import { toast } from '@/components/ui/use-toast';

interface RoleAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null;
  availableRoles: AdminRole[];
  onRoleAssignment: (userId: string, request: RoleAssignmentRequest) => Promise<RoleAssignmentResponse>;
}

interface PermissionPreview {
  resource: string;
  actions: string[];
}

export function RoleAssignmentModal({
  isOpen,
  onClose,
  user,
  availableRoles,
  onRoleAssignment
}: RoleAssignmentModalProps) {
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [notifyUser, setNotifyUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [permissionPreview, setPermissionPreview] = useState<PermissionPreview[]>([]);

  // Initialize selected roles when user changes
  useEffect(() => {
    if (user) {
      setSelectedRoleIds(user.roles.map(role => role.id));
      setReason('');
      setNotifyUser(false);
    }
  }, [user]);

  // Update permission preview when selected roles change
  useEffect(() => {
    if (selectedRoleIds.length > 0) {
      const selectedRoles = availableRoles.filter(role => selectedRoleIds.includes(role.id));
      const allPermissions = selectedRoles.flatMap(role => role.permissions);
      
      // Group permissions by resource
      const permissionMap = new Map<string, Set<string>>();
      allPermissions.forEach(permission => {
        if (!permissionMap.has(permission.resource)) {
          permissionMap.set(permission.resource, new Set());
        }
        permissionMap.get(permission.resource)!.add(permission.action);
      });

      const preview: PermissionPreview[] = Array.from(permissionMap.entries()).map(([resource, actions]) => ({
        resource,
        actions: Array.from(actions).sort()
      }));

      setPermissionPreview(preview.sort((a, b) => a.resource.localeCompare(b.resource)));
    } else {
      setPermissionPreview([]);
    }
  }, [selectedRoleIds, availableRoles]);

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoleIds(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSubmit = async () => {
    if (!user || selectedRoleIds.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one role",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const request: RoleAssignmentRequest = {
        userId: user.id,
        roleIds: selectedRoleIds,
        reason: reason.trim() || undefined,
        notifyUser
      };

      await onRoleAssignment(user.id, request);
      
      toast({
        title: "Success",
        description: "User roles updated successfully",
        variant: "default"
      });
      
      onClose();
    } catch (error) {
      console.error('Role assignment error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user roles",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSensitiveRoles = () => {
    return availableRoles.filter(role => 
      ['ADMIN', 'COORDINATOR'].includes(role.name) && selectedRoleIds.includes(role.id)
    );
  };

  const getAddedRoles = () => {
    if (!user) return [];
    const currentRoleIds = user.roles.map(r => r.id);
    return availableRoles.filter(role => 
      selectedRoleIds.includes(role.id) && !currentRoleIds.includes(role.id)
    );
  };

  const getRemovedRoles = () => {
    if (!user) return [];
    const currentRoleIds = user.roles.map(r => r.id);
    return availableRoles.filter(role => 
      currentRoleIds.includes(role.id) && !selectedRoleIds.includes(role.id)
    );
  };

  const sensitiveRoles = getSensitiveRoles();
  const addedRoles = getAddedRoles();
  const removedRoles = getRemovedRoles();

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Assign Roles to {user.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="roles" className="h-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="roles">Role Selection</TabsTrigger>
              <TabsTrigger value="permissions">Permission Preview</TabsTrigger>
              <TabsTrigger value="impact">Change Impact</TabsTrigger>
            </TabsList>

            <TabsContent value="roles" className="h-96 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-4 pr-4">
                  <div className="grid gap-3">
                    {availableRoles.map((role) => (
                      <Card key={role.id} className="cursor-pointer hover:bg-muted/50">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id={`role-${role.id}`}
                              checked={selectedRoleIds.includes(role.id)}
                              onCheckedChange={() => handleRoleToggle(role.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Label 
                                  htmlFor={`role-${role.id}`}
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
                                {user.roles.some(r => r.id === role.id) && (
                                  <Badge variant="secondary" className="text-xs">
                                    Current
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
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="permissions" className="h-96 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-4 pr-4">
                  {permissionPreview.length > 0 ? (
                    permissionPreview.map((preview) => (
                      <Card key={preview.resource}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">
                            {preview.resource.charAt(0).toUpperCase() + preview.resource.slice(1)}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex flex-wrap gap-1">
                            {preview.actions.map((action) => (
                              <Badge key={action} variant="secondary" className="text-xs">
                                {action}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No permissions preview available</p>
                      <p className="text-sm">Select one or more roles to see permissions</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="impact" className="h-96 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-4 pr-4">
                  {addedRoles.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Roles Being Added ({addedRoles.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {addedRoles.map((role) => (
                            <div key={role.id} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                              <span className="font-medium">{role.name}</span>
                              <Badge variant="outline">
                                +{role.permissions.length} permissions
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {removedRoles.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Roles Being Removed ({removedRoles.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {removedRoles.map((role) => (
                            <div key={role.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                              <span className="font-medium">{role.name}</span>
                              <Badge variant="outline">
                                -{role.permissions.length} permissions
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {sensitiveRoles.length > 0 && (
                    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-400 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Sensitive Role Warning
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
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

                  {addedRoles.length === 0 && removedRoles.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No changes detected</p>
                      <p className="text-sm">User will keep their current role assignments</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Change (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Explain why these role changes are being made..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="notify-user"
              checked={notifyUser}
              onCheckedChange={setNotifyUser}
            />
            <Label htmlFor="notify-user" className="text-sm">
              Send notification to user about role changes
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || selectedRoleIds.length === 0}
          >
            {isSubmitting ? 'Updating...' : 'Update Roles'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}