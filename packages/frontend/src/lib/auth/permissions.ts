interface UserRole {
  id: string;
  name: 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN';
  permissions: Permission[];
  isActive: boolean;
}

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
}

export const ROLE_PERMISSIONS = {
  ASSESSOR: {
    assessments: ['create', 'read', 'update'],
    entities: ['read'],
    responses: ['read'],
    media: ['create', 'read'],
  },
  RESPONDER: {
    assessments: ['read'],
    responses: ['create', 'read', 'update'],
    entities: ['read'],
    media: ['create', 'read'],
  },
  COORDINATOR: {
    assessments: ['read', 'verify', 'approve', 'reject'],
    responses: ['read', 'verify', 'approve', 'reject'],
    entities: ['create', 'read', 'update'],
    incidents: ['create', 'read', 'update'],
    users: ['read'],
    media: ['read'],
  },
  DONOR: {
    responses: ['read'],
    commitments: ['create', 'read', 'update'],
    entities: ['read'],
    performance: ['read'],
  },
  ADMIN: {
    users: ['create', 'read', 'update', 'delete'],
    roles: ['create', 'read', 'update', 'delete'],
    system: ['read', 'update', 'configure'],
    audit: ['read'],
    '*': ['*'], // Admin has all permissions
  },
} as const;

export function hasPermission(
  userRoles: UserRole[],
  resource: string,
  action: string
): boolean {
  return userRoles.some(role => {
    if (role.name === 'ADMIN') {
      return true; // Admin has all permissions
    }
    
    const rolePermissions = ROLE_PERMISSIONS[role.name];
    if (!rolePermissions) return false;
    
    const resourcePermissions = rolePermissions[resource as keyof typeof rolePermissions];
    if (!resourcePermissions) return false;
    
    return resourcePermissions.includes(action) || resourcePermissions.includes('*');
  });
}

export function canAccessEntity(
  userRoles: UserRole[],
  entityType: 'assessment' | 'response' | 'incident' | 'entity' | 'user'
): boolean {
  const resourceMap = {
    'assessment': 'assessments',
    'response': 'responses',
    'incident': 'incidents',
    'entity': 'entities',
    'user': 'users'
  };
  
  return hasPermission(userRoles, resourceMap[entityType], 'read');
}

export function getAccessibleRoles(
  userRoles: UserRole[],
  targetResource: string
): string[] {
  return userRoles
    .filter(role => hasPermission([role], targetResource, 'read'))
    .map(role => role.name);
}

export function validateCrossRoleAccess(
  userRoles: UserRole[],
  targetEntityId: string,
  targetEntityType: string,
  action: string
): { allowed: boolean; reason?: string } {
  // Admin can access everything
  if (userRoles.some(role => role.name === 'ADMIN')) {
    return { allowed: true };
  }

  const hasBasicAccess = canAccessEntity(userRoles, targetEntityType as any);
  if (!hasBasicAccess) {
    return { 
      allowed: false, 
      reason: `No access to ${targetEntityType} entities` 
    };
  }

  // Check specific action permissions
  const hasActionPermission = hasPermission(userRoles, targetEntityType, action);
  if (!hasActionPermission) {
    return { 
      allowed: false, 
      reason: `No permission to ${action} ${targetEntityType} entities` 
    };
  }

  return { allowed: true };
}