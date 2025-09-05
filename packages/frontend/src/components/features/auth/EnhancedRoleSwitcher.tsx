'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { 
  UserCheck, 
  Heart, 
  Shield, 
  User, 
  Settings,
  ChevronDown,
  Check,
  Clock,
  Key
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { AdminRole, MultiRoleUserSession } from '../../../../../../shared/types/admin';
import { toast } from '@/components/ui/use-toast';

interface EnhancedRoleSwitcherProps {
  currentUser: MultiRoleUserSession | null;
  onRoleSwitch: (roleId: string) => Promise<void>;
  className?: string;
}

const roleIcons = {
  ASSESSOR: UserCheck,
  RESPONDER: Heart,
  COORDINATOR: Shield,
  DONOR: User,
  ADMIN: Settings,
} as const;

const roleDescriptions = {
  ASSESSOR: 'Conduct rapid assessments and collect field data',
  RESPONDER: 'Plan and execute humanitarian responses',
  COORDINATOR: 'Oversee operations and coordinate resources',
  DONOR: 'Provide resources and track contributions',
  ADMIN: 'System administration and user management',
} as const;

const roleColors = {
  ASSESSOR: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  RESPONDER: 'bg-green-100 text-green-800 hover:bg-green-200',
  COORDINATOR: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
  DONOR: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
  ADMIN: 'bg-red-100 text-red-800 hover:bg-red-200',
} as const;

export function EnhancedRoleSwitcher({ 
  currentUser, 
  onRoleSwitch,
  className = '' 
}: EnhancedRoleSwitcherProps) {
  const { data: session, update } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchingToRole, setSwitchingToRole] = useState<string | null>(null);

  if (!currentUser || !currentUser.canSwitchRoles || currentUser.availableRoles.length <= 1) {
    return null;
  }

  const handleRoleSwitch = async (role: AdminRole) => {
    if (role.id === currentUser.activeRole.id) {
      setIsOpen(false);
      return;
    }

    setIsSwitching(true);
    setSwitchingToRole(role.id);

    try {
      await onRoleSwitch(role.id);
      
      // Update the session with new active role
      await update({
        ...session,
        user: {
          ...session?.user,
          activeRole: role.name,
          role: role.name
        }
      });

      toast({
        title: "Role Switched",
        description: `You are now operating as ${role.name}`,
        variant: "default"
      });

      setIsOpen(false);
    } catch (error) {
      console.error('Role switch error:', error);
      toast({
        title: "Switch Failed",
        description: error instanceof Error ? error.message : "Failed to switch roles",
        variant: "destructive"
      });
    } finally {
      setIsSwitching(false);
      setSwitchingToRole(null);
    }
  };

  const activeRole = currentUser.activeRole;
  const ActiveRoleIcon = roleIcons[activeRole.name as keyof typeof roleIcons] || User;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`h-auto p-2 ${className}`}
          disabled={isSwitching}
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <ActiveRoleIcon className="h-4 w-4" />
              <span className="font-medium">{activeRole.name}</span>
            </div>
            {currentUser.availableRoles.length > 1 && (
              <>
                <Badge variant="secondary" className="text-xs">
                  {currentUser.availableRoles.length} roles
                </Badge>
                <ChevronDown className="h-3 w-3" />
              </>
            )}
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Switch Role
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Choose your active role for this session
            </p>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-1">
              {currentUser.availableRoles.map((role) => {
                const RoleIcon = roleIcons[role.name as keyof typeof roleIcons] || User;
                const isActive = role.id === activeRole.id;
                const isSwitchingToThis = switchingToRole === role.id;
                
                return (
                  <Button
                    key={role.id}
                    variant="ghost"
                    className={`w-full justify-start h-auto p-3 ${
                      isActive ? roleColors[role.name as keyof typeof roleColors] : ''
                    }`}
                    onClick={() => handleRoleSwitch(role)}
                    disabled={isSwitching}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        {isSwitchingToThis ? (
                          <Clock className="h-4 w-4 animate-spin" />
                        ) : (
                          <RoleIcon className="h-4 w-4" />
                        )}
                        <div className="text-left">
                          <div className="font-medium text-sm">{role.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {roleDescriptions[role.name as keyof typeof roleDescriptions] || 'System role'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {role.permissions && role.permissions.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Key className="h-3 w-3 mr-1" />
                            {role.permissions.length}
                          </Badge>
                        )}
                        {isActive && (
                          <Badge variant="secondary" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>

            <Separator className="my-3" />
            
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center justify-between">
                <span>Current Session:</span>
                <span className="font-medium">{activeRole.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Available Roles:</span>
                <span className="font-medium">{currentUser.availableRoles.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

// Hook to manage role switching functionality
export function useRoleSwitcher() {
  const { data: session, update } = useSession();
  const [userSession, setUserSession] = useState<MultiRoleUserSession | null>(null);

  // Fetch current user role information
  useEffect(() => {
    const fetchUserRoleInfo = async () => {
      if (!session?.user?.id) return;

      try {
        const response = await fetch(`/api/v1/admin/users/${session.user.id}/active-role`);
        if (!response.ok) throw new Error('Failed to fetch user roles');

        const data = await response.json();
        if (data.success) {
          setUserSession({
            userId: session.user.id,
            availableRoles: data.data.availableRoles,
            activeRole: data.data.activeRole,
            canSwitchRoles: data.data.canSwitchRoles
          });
        }
      } catch (error) {
        console.error('Failed to fetch user role info:', error);
      }
    };

    fetchUserRoleInfo();
  }, [session?.user?.id]);

  const switchRole = async (roleId: string) => {
    if (!session?.user?.id) {
      throw new Error('User session not found');
    }

    const response = await fetch(`/api/v1/admin/users/${session.user.id}/active-role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        roleId,
        reason: 'User switched active role'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to switch roles');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Role switch failed');
    }

    // Update local state
    if (userSession) {
      setUserSession({
        ...userSession,
        activeRole: data.data.activeRole
      });
    }

    return data.data;
  };

  return {
    userSession,
    switchRole,
    refetchUserRoles: () => {
      // Re-fetch user role information
      if (session?.user?.id) {
        // Trigger useEffect by updating a dependency
        setUserSession(null);
      }
    }
  };
}