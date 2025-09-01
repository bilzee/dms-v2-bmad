'use client'

import { ReactNode } from 'react';
import { useRoleContext } from '@/components/providers/RoleContextProvider';
import { useRoleNavigation } from '@/hooks/useRoleNavigation';

interface RoleRestrictedProps {
  children: ReactNode;
  allowedRoles: Array<'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN'>;
  fallback?: ReactNode;
}

interface PermissionRestrictedProps {
  children: ReactNode;
  requiredPermissions: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
}

interface RouteRestrictedProps {
  children: ReactNode;
  route: string;
  fallback?: ReactNode;
}

export function RoleRestricted({ children, allowedRoles, fallback = null }: RoleRestrictedProps) {
  const { activeRole } = useRoleContext();
  
  if (!activeRole || !allowedRoles.includes(activeRole.name)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

export function PermissionRestricted({ 
  children, 
  requiredPermissions, 
  requireAll = true, 
  fallback = null 
}: PermissionRestrictedProps) {
  const { hasPermission } = useRoleContext();
  
  const hasAccess = requireAll
    ? requiredPermissions.every(permission => {
        const [resource, action] = permission.split(':');
        return hasPermission(resource, action);
      })
    : requiredPermissions.some(permission => {
        const [resource, action] = permission.split(':');
        return hasPermission(resource, action);
      });
  
  if (!hasAccess) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

export function RouteRestricted({ children, route, fallback = null }: RouteRestrictedProps) {
  const { isAuthorizedForRoute } = useRoleNavigation();
  
  if (!isAuthorizedForRoute(route)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

interface RoleBasedWrapperProps {
  children: ReactNode;
  roles?: Array<'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN'>;
  permissions?: string[];
  requireAllPermissions?: boolean;
  route?: string;
  fallback?: ReactNode;
}

export function RoleBasedWrapper({ 
  children, 
  roles, 
  permissions, 
  requireAllPermissions = true, 
  route, 
  fallback = null 
}: RoleBasedWrapperProps) {
  let content = <>{children}</>;
  
  if (route) {
    content = (
      <RouteRestricted route={route} fallback={fallback}>
        {content}
      </RouteRestricted>
    );
  }
  
  if (permissions) {
    content = (
      <PermissionRestricted 
        requiredPermissions={permissions} 
        requireAll={requireAllPermissions}
        fallback={fallback}
      >
        {content}
      </PermissionRestricted>
    );
  }
  
  if (roles) {
    content = (
      <RoleRestricted allowedRoles={roles} fallback={fallback}>
        {content}
      </RoleRestricted>
    );
  }
  
  return content;
}

export function RoleSpecificDashboard() {
  const { activeRole } = useRoleContext();
  
  switch (activeRole?.name) {
    case 'ASSESSOR':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-2">Active Assessments</h3>
            <p className="text-2xl font-bold text-blue-600">12</p>
            <p className="text-sm text-gray-500">Pending completion</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-2">Emergency Reports</h3>
            <p className="text-2xl font-bold text-red-600">3</p>
            <p className="text-sm text-gray-500">Require immediate attention</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-2">Entities Assessed</h3>
            <p className="text-2xl font-bold text-green-600">45</p>
            <p className="text-sm text-gray-500">This week</p>
          </div>
        </div>
      );
    
    case 'COORDINATOR':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-2">Verification Queue</h3>
            <p className="text-2xl font-bold text-orange-600">8</p>
            <p className="text-sm text-gray-500">Awaiting review</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-2">Active Incidents</h3>
            <p className="text-2xl font-bold text-red-600">4</p>
            <p className="text-sm text-gray-500">Require coordination</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-2">Donor Commitments</h3>
            <p className="text-2xl font-bold text-blue-600">23</p>
            <p className="text-sm text-gray-500">In progress</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-2">System Conflicts</h3>
            <p className="text-2xl font-bold text-purple-600">2</p>
            <p className="text-sm text-gray-500">Need resolution</p>
          </div>
        </div>
      );
    
    case 'RESPONDER':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-2">Response Plans</h3>
            <p className="text-2xl font-bold text-green-600">7</p>
            <p className="text-sm text-gray-500">Ready for delivery</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-2">In Transit</h3>
            <p className="text-2xl font-bold text-blue-600">15</p>
            <p className="text-sm text-gray-500">Resources being delivered</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-2">Completed Deliveries</h3>
            <p className="text-2xl font-bold text-gray-600">34</p>
            <p className="text-sm text-gray-500">This week</p>
          </div>
        </div>
      );
    
    case 'DONOR':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-2">Active Commitments</h3>
            <p className="text-2xl font-bold text-blue-600">5</p>
            <p className="text-sm text-gray-500">Resources pledged</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-2">Delivery Progress</h3>
            <p className="text-2xl font-bold text-green-600">85%</p>
            <p className="text-sm text-gray-500">Completion rate</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-2">Impact Metrics</h3>
            <p className="text-2xl font-bold text-purple-600">1,247</p>
            <p className="text-sm text-gray-500">People helped</p>
          </div>
        </div>
      );
    
    case 'ADMIN':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-2">Active Users</h3>
            <p className="text-2xl font-bold text-green-600">156</p>
            <p className="text-sm text-gray-500">Online now</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-2">System Health</h3>
            <p className="text-2xl font-bold text-blue-600">98%</p>
            <p className="text-sm text-gray-500">Uptime</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-2">Data Sync</h3>
            <p className="text-2xl font-bold text-orange-600">2.3s</p>
            <p className="text-sm text-gray-500">Average sync time</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-2">Security Events</h3>
            <p className="text-2xl font-bold text-red-600">0</p>
            <p className="text-sm text-gray-500">This week</p>
          </div>
        </div>
      );
    
    default:
      return (
        <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
          <h3 className="font-semibold text-gray-900 mb-2">Welcome to DMS</h3>
          <p className="text-gray-500">Please select a role to access your dashboard.</p>
        </div>
      );
  }
}