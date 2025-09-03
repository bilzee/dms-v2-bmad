'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserCheck, Heart, Shield, User, Settings } from 'lucide-react'

interface UserRole {
  id: string;
  name: 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN';
  permissions: any[];
  isActive: boolean;
}

interface MultiRoleSelectorProps {
  availableRoles: UserRole[];
  onRoleSelect: (role: UserRole) => void;
  selectedRole?: UserRole;
  isLoading?: boolean;
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
  ASSESSOR: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
  RESPONDER: 'bg-green-50 border-green-200 hover:bg-green-100',
  COORDINATOR: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
  DONOR: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
  ADMIN: 'bg-red-50 border-red-200 hover:bg-red-100',
} as const;

export function MultiRoleSelector({ 
  availableRoles, 
  onRoleSelect, 
  selectedRole,
  isLoading = false 
}: MultiRoleSelectorProps) {
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-center">Select Your Role</CardTitle>
        <p className="text-sm text-gray-600 text-center">
          You have access to multiple roles. Choose the role for this session.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {availableRoles.map((role) => {
          const RoleIcon = roleIcons[role.name];
          const isSelected = selectedRole?.id === role.id;
          const colorClass = roleColors[role.name];
          
          return (
            <Button
              key={role.id}
              variant="outline"
              className={`w-full h-auto p-4 ${colorClass} ${
                isSelected ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => onRoleSelect(role)}
              disabled={isLoading}
              onMouseEnter={() => setHoveredRole(role.id)}
              onMouseLeave={() => setHoveredRole(null)}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <RoleIcon className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">{role.name}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {roleDescriptions[role.name]}
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <Badge variant="secondary" className="ml-2">
                    Selected
                  </Badge>
                )}
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}