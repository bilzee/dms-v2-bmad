// lib/type-helpers.ts
// Centralized helper functions for TypeScript type safety and consistency

/**
 * Permission access helper that handles both direct and nested permission patterns
 */
export function getPermissionProperty(
  permission: any,
  property: 'id' | 'name' | 'description' | 'resource' | 'action' | 'isActive'
): string | boolean {
  // Handle nested permission object (from RolePermission.permission)
  if (permission.permission && typeof permission.permission === 'object') {
    return permission.permission[property] || getDefaultPermissionValue(property);
  }
  
  // Handle direct permission object
  if (permission[property] !== undefined) {
    return permission[property];
  }
  
  return getDefaultPermissionValue(property);
}

function getDefaultPermissionValue(property: string): string | boolean {
  switch (property) {
    case 'id':
      return 'unknown-permission';
    case 'name':
      return 'Unknown Permission';
    case 'description':
      return 'No description available';
    case 'resource':
      return 'UNKNOWN';
    case 'action':
      return 'READ';
    case 'isActive':
      return true;
    default:
      return 'unknown';
  }
}

/**
 * Safe role count accessor that handles _count relation or defaults
 */
export function getRoleUserCount(role: any): number {
  if (role._count?.users) {
    return role._count.users;
  }
  if (role.userCount !== undefined) {
    return role.userCount;
  }
  return 0;
}

/**
 * Transforms role permissions to consistent format
 */
export function formatRolePermissions(permissions: any[]): Array<{
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  isActive: boolean;
}> {
  if (!Array.isArray(permissions)) {
    return [];
  }
  
  return permissions.map(p => ({
    id: getPermissionProperty(p, 'id') as string,
    name: getPermissionProperty(p, 'name') as string,
    description: getPermissionProperty(p, 'description') as string,
    resource: getPermissionProperty(p, 'resource') as string,
    action: getPermissionProperty(p, 'action') as string,
    isActive: getPermissionProperty(p, 'isActive') as boolean
  }));
}

/**
 * Formats role for admin responses with consistent structure
 */
export function formatAdminRole(role: any): {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissions: Array<{
    id: string;
    name: string;
    description: string;
    resource: string;
    action: string;
    isActive: boolean;
  }>;
  isActive: boolean;
} {
  return {
    id: role.id,
    name: role.name,
    description: `System role with ${role.permissions?.length || 0} permissions`,
    userCount: getRoleUserCount(role),
    permissions: formatRolePermissions(role.permissions || []),
    isActive: role.isActive !== false
  };
}

/**
 * Safe user property accessor with defaults
 */
export function getUserProperty(user: any, property: string, defaultValue: any = null): any {
  if (user && user[property] !== undefined) {
    return user[property];
  }
  return defaultValue;
}

/**
 * Creates consistent API response format
 */
export function createApiResponse<T>(
  success: boolean,
  data: T | null = null,
  message?: string,
  errors?: string[]
): {
  success: boolean;
  data: T | null;
  message?: string;
  errors?: string[];
  timestamp: string;
} {
  const response: any = {
    success,
    timestamp: new Date().toISOString()
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  if (message) {
    response.message = message;
  }
  
  if (errors && errors.length > 0) {
    response.errors = errors;
  }
  
  return response;
}

/**
 * Type-safe error response creator
 */
export function createErrorResponse(
  message: string,
  errors: string[] = [],
  statusCode: number = 500
): {
  response: {
    success: false;
    data: null;
    message: string;
    errors: string[];
    timestamp: string;
  };
  status: number;
} {
  return {
    response: {
      success: false as const,
      data: null,
      message: message,
      errors: errors,
      timestamp: new Date().toISOString()
    },
    status: statusCode
  };
}

/**
 * Handles missing database tables gracefully
 */
export function handleMissingTable<T>(
  operation: () => Promise<T>,
  tableName: string,
  fallbackValue: T
): Promise<T> {
  return operation().catch(error => {
    if (error.message?.includes(`Table '${tableName}' doesn't exist`) ||
        error.message?.includes(`relation "${tableName}" does not exist`)) {
      console.warn(`Table ${tableName} not found, using fallback value`);
      return fallbackValue;
    }
    throw error;
  });
}