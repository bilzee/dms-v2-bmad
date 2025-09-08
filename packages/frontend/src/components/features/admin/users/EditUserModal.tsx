'use client';

import { useState, useEffect } from 'react';
import { AdminUser, UpdateUserRequest } from '@dms/shared/types/admin';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';

const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  organization: z.string().optional().or(z.literal('')),
  roleIds: z.array(z.string()).min(1, 'At least one role is required').optional(),
  isActive: z.boolean().optional()
});

type UpdateUserFormData = z.infer<typeof updateUserSchema>;

interface Role {
  id: string;
  name: string;
  description?: string;
  userCount: number;
}

interface EditUserModalProps {
  user: AdminUser;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditUserModal({ user, open, onClose, onSuccess }: EditUserModalProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(true);

  const form = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: user.name || '',
      phone: user.phone || '',
      organization: user.organization || '',
      roleIds: user.roles.map(role => role.id),
      isActive: user.isActive
    }
  });

  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      const response = await fetch('/api/v1/admin/roles');
      
      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }

      const data = await response.json();
      
      if (data.success) {
        setRoles(data.data.roles || []);
      } else {
        throw new Error(data.message || 'Failed to fetch roles');
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load roles. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchRoles();
      // Reset form with current user data when modal opens
      form.reset({
        name: user.name || '',
        phone: user.phone || '',
        organization: user.organization || '',
        roleIds: user.roles.map(role => role.id),
        isActive: user.isActive
      });
    }
  }, [open, user, form]);

  const onSubmit = async (data: UpdateUserFormData) => {
    try {
      setLoading(true);
      
      // Only include fields that have actual values
      const updateData: Partial<UpdateUserFormData> = {};
      if (data.name) updateData.name = data.name;
      if (data.phone) updateData.phone = data.phone;
      if (data.organization) updateData.organization = data.organization;
      if (data.roleIds) updateData.roleIds = data.roleIds;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      
      const response = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user');
      }

      const result = await response.json();
      
      if (result.success) {
        onSuccess();
        toast({
          title: 'Success',
          description: 'User updated successfully'
        });
      } else {
        throw new Error(result.message || 'Failed to update user');
      }
    } catch (error) {
      console.error('Update user error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update user',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    const currentRoles = form.getValues('roleIds') || [];
    if (checked) {
      form.setValue('roleIds', [...currentRoles, roleId]);
    } else {
      form.setValue('roleIds', currentRoles.filter(id => id !== roleId));
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Edit User: {user.name}</DialogTitle>
          <DialogDescription>
            Update user information, roles, and account status.
          </DialogDescription>
        </DialogHeader>

        {/* User Info Summary */}
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Email:</span> {user.email}
            </div>
            <div>
              <span className="font-medium">Status:</span>{' '}
              <Badge variant={user.isActive ? 'default' : 'secondary'}>
                {user.accountStatus}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Created:</span> {formatDate(user.createdAt)}
            </div>
            <div>
              <span className="font-medium">Last Sync:</span>{' '}
              {user.lastSync ? formatDate(user.lastSync) : 'Never'}
            </div>
          </div>
          <div>
            <span className="font-medium">Current Roles:</span>{' '}
            <div className="flex flex-wrap gap-1 mt-1">
              {user.roles.map((role) => (
                <Badge
                  key={role.id}
                  variant={role.id === user.activeRole?.id ? 'default' : 'secondary'}
                >
                  {role.name} {role.id === user.activeRole?.id && '(Active)'}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <Label>Email Address</Label>
                <Input value={user.email} disabled className="bg-muted" />
                <p className="text-sm text-muted-foreground mt-1">Email cannot be changed</p>
              </div>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="organization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter organization" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="roleIds"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Roles</FormLabel>
                    <FormDescription>
                      Update user roles. The first selected role will become their active role.
                    </FormDescription>
                  </div>
                  {rolesLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                      <span className="ml-2">Loading roles...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {roles.map((role) => (
                        <FormField
                          key={role.id}
                          control={form.control}
                          name="roleIds"
                          render={({ field }) => {
                            const isChecked = field.value?.includes(role.id) || false;
                            const isCurrentActive = role.id === user.activeRole?.id;
                            
                            return (
                              <FormItem
                                key={role.id}
                                className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      handleRoleToggle(role.id, checked as boolean);
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="font-medium">
                                    {role.name}
                                    {isCurrentActive && (
                                      <Badge variant="outline" className="ml-2">
                                        Current Active
                                      </Badge>
                                    )}
                                  </FormLabel>
                                  <FormDescription className="text-sm">
                                    {role.description || `${role.userCount} users`}
                                  </FormDescription>
                                </div>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Active Account
                    </FormLabel>
                    <FormDescription>
                      If unchecked, the user will not be able to access the system.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  'Update User'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}