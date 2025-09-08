'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Users,
  Key,
  Settings,
  RotateCcw
} from 'lucide-react';
import { PermissionMatrix as PermissionMatrixType, AdminRole, RolePermission } from '@dms/shared/types/admin';

interface PermissionMatrixProps {
  matrix: PermissionMatrixType;
  onRefresh: () => void;
  isLoading?: boolean;
}

interface MatrixFilters {
  search: string;
  resource: string;
  role: string;
  permissionStatus: 'all' | 'granted' | 'denied';
}

export function PermissionMatrix({ matrix, onRefresh, isLoading = false }: PermissionMatrixProps) {
  const [filters, setFilters] = useState<MatrixFilters>({
    search: '',
    resource: 'all',
    role: 'all',
    permissionStatus: 'all'
  });

  const [compactView, setCompactView] = useState(false);

  // Get unique resources for filtering
  const resources = useMemo(() => {
    const uniqueResources = Array.from(new Set(matrix.permissions.map(p => p.resource)));
    return uniqueResources.sort();
  }, [matrix.permissions]);

  // Filter permissions based on search and filters
  const filteredPermissions = useMemo(() => {
    return matrix.permissions.filter(permission => {
      const searchMatch = filters.search === '' || 
        permission.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        permission.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
        permission.resource.toLowerCase().includes(filters.search.toLowerCase()) ||
        permission.action.toLowerCase().includes(filters.search.toLowerCase());

      const resourceMatch = filters.resource === 'all' || permission.resource === filters.resource;

      return searchMatch && resourceMatch;
    });
  }, [matrix.permissions, filters]);

  // Filter roles based on filters
  const filteredRoles = useMemo(() => {
    return matrix.roles.filter(role => {
      if (filters.role !== 'all' && role.id !== filters.role) {
        return false;
      }

      if (filters.permissionStatus !== 'all' && filteredPermissions.length > 0) {
        const hasGrantedPermissions = filteredPermissions.some(permission => 
          matrix.matrix[role.id]?.[permission.id]
        );
        const hasDeniedPermissions = filteredPermissions.some(permission => 
          !matrix.matrix[role.id]?.[permission.id]
        );

        if (filters.permissionStatus === 'granted' && !hasGrantedPermissions) {
          return false;
        }
        if (filters.permissionStatus === 'denied' && !hasDeniedPermissions) {
          return false;
        }
      }

      return true;
    });
  }, [matrix.roles, matrix.matrix, filters, filteredPermissions]);

  const resetFilters = () => {
    setFilters({
      search: '',
      resource: 'all',
      role: 'all',
      permissionStatus: 'all'
    });
  };

  const getPermissionCount = (roleId: string, permissions: RolePermission[]) => {
    return permissions.filter(permission => matrix.matrix[roleId]?.[permission.id]).length;
  };

  const renderMatrixHeader = () => (
    <div className="sticky top-0 bg-background border-b z-10">
      <div className="flex">
        <div className="w-64 p-4 border-r font-medium">
          Permissions ({filteredPermissions.length})
        </div>
        {filteredRoles.map((role) => (
          <div key={role.id} className="min-w-32 p-4 border-r text-center">
            <div className="font-medium text-sm mb-1">{role.name}</div>
            <Badge variant="secondary" className="text-xs">
              {getPermissionCount(role.id, filteredPermissions)}/{filteredPermissions.length}
            </Badge>
            <div className="text-xs text-muted-foreground mt-1">
              <Users className="h-3 w-3 inline mr-1" />
              {role.userCount}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMatrixRow = (permission: RolePermission) => (
    <div key={permission.id} className="flex border-b hover:bg-muted/50">
      <div className="w-64 p-4 border-r">
        <div className="space-y-1">
          <div className="font-medium text-sm">{permission.name}</div>
          <div className="text-xs text-muted-foreground">
            {permission.description}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="px-1 py-0">
              {permission.resource}
            </Badge>
            <Badge variant="outline" className="px-1 py-0">
              {permission.action}
            </Badge>
          </div>
        </div>
      </div>
      {filteredRoles.map((role) => {
        const hasPermission = matrix.matrix[role.id]?.[permission.id];
        return (
          <div key={role.id} className="min-w-32 p-4 border-r flex items-center justify-center">
            {hasPermission ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400" />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderCompactMatrix = () => {
    const groupedByResource = filteredPermissions.reduce((acc, permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = [];
      }
      acc[permission.resource].push(permission);
      return acc;
    }, {} as Record<string, RolePermission[]>);

    return (
      <div className="space-y-6">
        {Object.entries(groupedByResource).map(([resource, permissions]) => (
          <Card key={resource}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-5 w-5" />
                {resource.charAt(0).toUpperCase() + resource.slice(1)}
                <Badge variant="secondary">{permissions.length} permissions</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                {permissions.map((permission) => (
                  <div key={permission.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium text-sm">{permission.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {permission.description}
                        </div>
                      </div>
                      <Badge variant="outline">{permission.action}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {filteredRoles.map((role) => {
                        const hasPermission = matrix.matrix[role.id]?.[permission.id];
                        return (
                          <div
                            key={role.id}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                              hasPermission 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            }`}
                          >
                            {hasPermission ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {role.name}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permission Matrix
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompactView(!compactView)}
            >
              <Settings className="h-4 w-4 mr-2" />
              {compactView ? 'Table View' : 'Compact View'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search permissions..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resource">Resource</Label>
            <Select value={filters.resource} onValueChange={(value) => setFilters(prev => ({ ...prev, resource: value }))}>
              <SelectTrigger id="resource">
                <SelectValue placeholder="All resources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {resources.map((resource) => (
                  <SelectItem key={resource} value={resource}>
                    {resource.charAt(0).toUpperCase() + resource.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={filters.role} onValueChange={(value) => setFilters(prev => ({ ...prev, role: value }))}>
              <SelectTrigger id="role">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {matrix.roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Permission Status</Label>
            <Select value={filters.permissionStatus} onValueChange={(value: any) => setFilters(prev => ({ ...prev, permissionStatus: value }))}>
              <SelectTrigger id="status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Permissions</SelectItem>
                <SelectItem value="granted">Granted Only</SelectItem>
                <SelectItem value="denied">Denied Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filter Summary and Reset */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredPermissions.length} permissions × {filteredRoles.length} roles
          </div>
          {(filters.search || filters.resource !== 'all' || filters.role !== 'all' || filters.permissionStatus !== 'all') && (
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Reset Filters
            </Button>
          )}
        </div>

        {/* Matrix Display */}
        {filteredPermissions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No permissions found</p>
            <p className="text-sm">Try adjusting your search criteria</p>
          </div>
        ) : compactView ? (
          <ScrollArea className="h-[600px]">
            {renderCompactMatrix()}
          </ScrollArea>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <ScrollArea className="h-[600px] w-full">
              <div className="min-w-fit">
                {renderMatrixHeader()}
                <div>
                  {filteredPermissions.map(renderMatrixRow)}
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}