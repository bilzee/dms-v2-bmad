'use client'

import { memo, useState, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useMultiRole } from '@/hooks/useMultiRole'
import { 
  ChevronDown, 
  User, 
  Shield, 
  UserCheck, 
  Heart, 
  Settings, 
  Clock,
  AlertCircle,
  CheckCircle,
  Undo2
} from 'lucide-react'
import { cn } from '@/lib/utils'

const roleIcons = {
  ASSESSOR: UserCheck,
  RESPONDER: Heart,
  COORDINATOR: Shield,
  DONOR: User,
  ADMIN: Settings,
} as const;

const roleColors = {
  ASSESSOR: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
  RESPONDER: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
  COORDINATOR: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
  DONOR: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
  ADMIN: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
} as const;

const roleDarkColors = {
  ASSESSOR: 'bg-blue-500 text-white border-blue-600',
  RESPONDER: 'bg-green-500 text-white border-green-600',
  COORDINATOR: 'bg-purple-500 text-white border-purple-600',
  DONOR: 'bg-orange-500 text-white border-orange-600',
  ADMIN: 'bg-red-500 text-white border-red-600',
} as const;

export const RoleIndicator = memo(function RoleIndicator() {
  const { 
    assignedRoles, 
    activeRole, 
    isMultiRole, 
    switchRole, 
    isLoading, 
    error,
    performanceMs,
    rollbackLastSwitch,
    lastRoleSwitch
  } = useMultiRole();
  
  const [switchingToRole, setSwitchingToRole] = useState<string | null>(null);
  const [showPerformance, setShowPerformance] = useState(false);

  const handleRoleSwitch = useCallback(async (roleId: string, roleName: string) => {
    setSwitchingToRole(roleId);
    const success = await switchRole(roleId, roleName);
    setSwitchingToRole(null);
    
    if (success && performanceMs !== null) {
      setShowPerformance(true);
      setTimeout(() => setShowPerformance(false), 2000);
    }
  }, [switchRole, performanceMs]);

  const handleRollback = useCallback(async () => {
    setSwitchingToRole('rollback');
    await rollbackLastSwitch();
    setSwitchingToRole(null);
  }, [rollbackLastSwitch]);

  if (!activeRole) {
    return null;
  }

  const ActiveRoleIcon = roleIcons[activeRole.name];
  const roleColorClass = roleColors[activeRole.name];
  const roleDarkColorClass = roleDarkColors[activeRole.name];

  if (!isMultiRole) {
    return (
      <div className="flex items-center gap-2">
        <Badge className={cn("flex items-center gap-2 transition-colors duration-150", roleColorClass)} data-testid="role-indicator">
          <ActiveRoleIcon className="w-3 h-3" />
          {activeRole.name}
        </Badge>
        {lastRoleSwitch && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last switch: {new Date(lastRoleSwitch).toLocaleTimeString()}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 h-8 transition-all duration-150 hover:bg-gray-100"
            disabled={isLoading}
            data-testid="role-indicator"
          >
            <Badge className={cn(
              "flex items-center gap-2 transition-all duration-150",
              isLoading ? roleDarkColorClass : roleColorClass
            )}>
              <ActiveRoleIcon className={cn("w-3 h-3", isLoading && "animate-pulse")} />
              {activeRole.name}
              {isLoading && <div className="w-2 h-2 bg-current rounded-full animate-bounce" />}
            </Badge>
            <ChevronDown className={cn("w-3 h-3 transition-transform duration-150", isLoading && "animate-spin")} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" data-testid="role-dropdown">
          {assignedRoles.map((role) => {
            const RoleIcon = roleIcons[role.name];
            const isActive = role.id === activeRole.id;
            const isSwitchingToThis = switchingToRole === role.id;
            
            return (
              <DropdownMenuItem
                key={role.id}
                onClick={() => !isActive && !isLoading && handleRoleSwitch(role.id, role.name)}
                className={cn(
                  "flex items-center gap-2 transition-colors duration-150",
                  isActive && "bg-gray-100 font-medium",
                  !isActive && !isLoading && "hover:bg-gray-50"
                )}
                disabled={isActive || isLoading}
              >
                <RoleIcon className={cn("w-4 h-4", isSwitchingToThis && "animate-pulse")} />
                <span>{role.name}</span>
                <div className="ml-auto flex items-center gap-1">
                  {isActive && (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Active
                    </Badge>
                  )}
                  {isSwitchingToThis && (
                    <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              </DropdownMenuItem>
            );
          })}
          
          {error && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleRollback}
                className="flex items-center gap-2 text-orange-600 hover:bg-orange-50"
                disabled={isLoading || switchingToRole === 'rollback'}
              >
                <Undo2 className={cn("w-4 h-4", switchingToRole === 'rollback' && "animate-pulse")} />
                <span>Rollback Last Switch</span>
                {switchingToRole === 'rollback' && (
                  <div className="w-3 h-3 border border-orange-400 border-t-transparent rounded-full animate-spin ml-auto" />
                )}
              </DropdownMenuItem>
            </>
          )}

          {(performanceMs !== null || error) && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1 text-xs text-gray-500">
                {error && (
                  <div className="flex items-center gap-1 text-red-500 mb-1">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                  </div>
                )}
                {performanceMs !== null && showPerformance && (
                  <div className="flex items-center gap-1 text-green-600">
                    <Clock className="w-3 h-3" />
                    Switch completed in {performanceMs}ms
                  </div>
                )}
                {lastRoleSwitch && (
                  <div className="text-gray-400 mt-1">
                    Last: {new Date(lastRoleSwitch).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});