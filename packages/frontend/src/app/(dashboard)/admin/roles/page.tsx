'use client';

import React, { useState, useEffect } from 'react';

// Force this page to be dynamic since it depends on user authentication and admin data
export const dynamic = 'force-dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Users, 
  Search, 
  Filter, 
  Settings,
  UserCheck,
  Key,
  Activity,
  TrendingUp
} from 'lucide-react';

// Import our new components
import { PermissionMatrix } from '@/components/features/admin/roles/PermissionMatrix';
import { RoleAssignmentModal } from '@/components/features/admin/roles/RoleAssignmentModal';
import { BulkRoleAssignment } from '@/components/features/admin/roles/BulkRoleAssignment';
import { 
  AdminRole, 
  AdminUser, 
  PermissionMatrixResponse,
  UserListResponse,
  RoleAssignmentRequest,
  BulkRoleAssignmentRequest
} from '@dms/shared/types/admin';
import { toast } from '@/components/ui/use-toast';

interface RoleStats {
  totalRoles: number;
  activeRoles: number;
  totalPermissions: number;
  totalAssignments: number;
}

export default function RoleManagementPage() {
  const [permissionMatrix, setPermissionMatrix] = useState<any>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<RoleStats>({
    totalRoles: 0,
    activeRoles: 0,
    totalPermissions: 0,
    totalAssignments: 0
  });

  // Modal states
  const [isRoleAssignmentModalOpen, setIsRoleAssignmentModalOpen] = useState(false);
  const [isBulkAssignmentModalOpen, setIsBulkAssignmentModalOpen] = useState(false);

  // Fetch permission matrix
  const fetchPermissionMatrix = async () => {
    try {
      const response = await fetch('/api/v1/admin/permissions/matrix');
      if (!response.ok) throw new Error('Failed to fetch permission matrix');
      
      const data: PermissionMatrixResponse = await response.json();
      if (data.success) {
        setPermissionMatrix(data.data.matrix);
        
        // Update stats from matrix data
        setStats({
          totalRoles: data.data.matrix.roles.length,
          activeRoles: data.data.matrix.roles.filter(r => r.isActive).length,
          totalPermissions: data.data.matrix.permissions.length,
          totalAssignments: 0 // Will be calculated from matrix data
        });
      }
    } catch (error) {
      console.error('Failed to fetch permission matrix:', error);
      toast({
        title: "Error",
        description: "Failed to load permission matrix",
        variant: "destructive"
      });
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/v1/admin/users?limit=100');
      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data: UserListResponse = await response.json();
      if (data.success) {
        setUsers(data.data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    }
  };

  // Initial data fetch
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchPermissionMatrix(),
        fetchUsers()
      ]);
      setIsLoading(false);
    };
    
    loadData();
  }, []);

  // Handle role assignment
  const handleRoleAssignment = async (userId: string, request: RoleAssignmentRequest) => {
    const response = await fetch(`/api/v1/admin/users/${userId}/roles`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to assign roles');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Role assignment failed');
    }

    // Refresh data
    await Promise.all([fetchUsers(), fetchPermissionMatrix()]);
    return data;
  };

  // Handle bulk role assignment
  const handleBulkRoleAssignment = async (request: BulkRoleAssignmentRequest) => {
    const response = await fetch('/api/v1/admin/users/bulk-roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to assign roles');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Bulk role assignment failed');
    }

    // Refresh data
    await Promise.all([fetchUsers(), fetchPermissionMatrix()]);
    return data;
  };

  // Filter users based on search
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.roles.some(role => role.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleUserSelect = (user: AdminUser) => {
    setSelectedUsers(prev => 
      prev.find(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user]
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
          <p className="text-muted-foreground">
            Manage user roles and permissions across the system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsBulkAssignmentModalOpen(true)}
            disabled={selectedUsers.length === 0}
            variant={selectedUsers.length > 0 ? "default" : "outline"}
          >
            <Users className="h-4 w-4 mr-2" />
            Bulk Assign ({selectedUsers.length})
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRoles}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeRoles} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              {users.filter(u => (u as any).isActive !== false).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permissions</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPermissions}</div>
            <p className="text-xs text-muted-foreground">
              System-wide permissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssignments}</div>
            <p className="text-xs text-muted-foreground">
              Role-permission links
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="matrix" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
          <TabsTrigger value="users">User Assignments</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix">
          {permissionMatrix && (
            <PermissionMatrix
              matrix={permissionMatrix}
              onRefresh={fetchPermissionMatrix}
              isLoading={isLoading}
            />
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          {/* User Search and Filter */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                User Role Assignments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {selectedUsers.length > 0 && (
                  <Badge variant="secondary">
                    {selectedUsers.length} selected
                  </Badge>
                )}
              </div>

              {/* User List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-muted/50 ${
                      selectedUsers.find(u => u.id === user.id) ? 'bg-muted border-primary' : ''
                    }`}
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.name}</span>
                        <Badge variant={(user as any).isActive !== false ? "secondary" : "outline"}>
                          {(user as any).isActive !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {user.roles.map((role) => (
                          <Badge key={role.id} variant="outline" className="text-xs">
                            {role.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUser(user);
                          setIsRoleAssignmentModalOpen(true);
                        }}
                      >
                        Manage Roles
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Role Assignment Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Activity Log</p>
                <p className="text-sm">Role assignment activity will be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <RoleAssignmentModal
        isOpen={isRoleAssignmentModalOpen}
        onClose={() => {
          setIsRoleAssignmentModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        availableRoles={permissionMatrix?.roles || []}
        onRoleAssignment={handleRoleAssignment}
      />

      <BulkRoleAssignment
        isOpen={isBulkAssignmentModalOpen}
        onClose={() => {
          setIsBulkAssignmentModalOpen(false);
          setSelectedUsers([]);
        }}
        selectedUsers={selectedUsers}
        availableRoles={permissionMatrix?.roles || []}
        onBulkAssignment={handleBulkRoleAssignment}
      />
    </div>
  );
}