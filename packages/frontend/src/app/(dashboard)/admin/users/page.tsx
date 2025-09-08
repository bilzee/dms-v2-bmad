'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminUser, UserListFilters } from '@dms/shared/types/admin';
import { UserList } from '@/components/features/admin/users/UserList';
import { CreateUserModal } from '@/components/features/admin/users/CreateUserModal';
import { BulkImportModal } from '@/components/features/admin/users/BulkImportModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Upload, Download, Activity } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  recentUsers: number;
  usersByRole: Record<string, number>;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<UserListFilters>({
    limit: 50,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [totalCount, setTotalCount] = useState(0);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [bulkImportModalOpen, setBulkImportModalOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (filters.search) queryParams.set('search', filters.search);
      if (filters.role) queryParams.set('role', filters.role);
      if (filters.isActive !== undefined) queryParams.set('isActive', filters.isActive.toString());
      if (filters.organization) queryParams.set('organization', filters.organization);
      if (filters.limit) queryParams.set('limit', filters.limit.toString());
      if (filters.offset) queryParams.set('offset', filters.offset.toString());
      if (filters.sortBy) queryParams.set('sortBy', filters.sortBy);
      if (filters.sortOrder) queryParams.set('sortOrder', filters.sortOrder);

      const response = await fetch(`/api/v1/admin/users?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data.users);
        setStats(data.data.stats);
        setTotalCount(data.data.totalCount);
      } else {
        throw new Error(data.message || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleFilterChange = (newFilters: Partial<UserListFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, offset: 0 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, offset: (page - 1) * (prev.limit || 50) }));
  };

  const handleUserCreated = () => {
    setCreateModalOpen(false);
    fetchUsers();
    toast({
      title: 'Success',
      description: 'User created successfully'
    });
  };

  const handleBulkImportCompleted = () => {
    setBulkImportModalOpen(false);
    fetchUsers();
    toast({
      title: 'Success',
      description: 'Bulk import completed successfully'
    });
  };

  const handleExportUsers = async (format: 'csv' | 'json' = 'csv') => {
    try {
      const response = await fetch(`/api/v1/admin/users/export?format=${format}&includeInactive=true`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const contentDisposition = response.headers.get('content-disposition');
      const fileName = contentDisposition?.match(/filename="(.+)"/)?.[1] || `users-export.${format}`;
      
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: 'User data exported successfully'
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Error',
        description: 'Failed to export user data',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportUsers('csv')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkImportModalOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Import
          </Button>
          <Button onClick={() => setCreateModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Activity className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
              <Activity className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.inactiveUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New This Month</CardTitle>
              <UserPlus className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.recentUsers}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Role Distribution */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Users by Role</CardTitle>
            <CardDescription>Distribution of users across different roles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.usersByRole).map(([role, count]) => (
                <Badge key={role} variant="secondary">
                  {role}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User List */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Users</TabsTrigger>
          <TabsTrigger value="active">Active Only</TabsTrigger>
          <TabsTrigger value="inactive">Inactive Only</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <UserList
            users={users}
            loading={loading}
            totalCount={totalCount}
            filters={filters}
            onFilterChange={handleFilterChange}
            onPageChange={handlePageChange}
            onUserUpdated={fetchUsers}
          />
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <UserList
            users={users.filter(u => u.isActive)}
            loading={loading}
            totalCount={stats?.activeUsers || 0}
            filters={{ ...filters, isActive: true }}
            onFilterChange={handleFilterChange}
            onPageChange={handlePageChange}
            onUserUpdated={fetchUsers}
          />
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          <UserList
            users={users.filter(u => !u.isActive)}
            loading={loading}
            totalCount={stats?.inactiveUsers || 0}
            filters={{ ...filters, isActive: false }}
            onFilterChange={handleFilterChange}
            onPageChange={handlePageChange}
            onUserUpdated={fetchUsers}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateUserModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleUserCreated}
      />

      <BulkImportModal
        open={bulkImportModalOpen}
        onClose={() => setBulkImportModalOpen(false)}
        onSuccess={handleBulkImportCompleted}
      />
    </div>
  );
}