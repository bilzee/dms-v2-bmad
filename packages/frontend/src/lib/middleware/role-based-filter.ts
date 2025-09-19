import { NextRequest, NextResponse } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';

// Role-based data access permissions
export const ROLE_DATA_ACCESS = {
  ADMIN: {
    canAccessAllData: true,
    allowedIncidentTypes: [],
    allowedSeverities: [],
    allowedStatuses: []
  },
  COORDINATOR: {
    canAccessAllData: true,
    allowedIncidentTypes: [],
    allowedSeverities: [],
    allowedStatuses: []
  },
  ASSESSOR: {
    canAccessAllData: false,
    allowedIncidentTypes: ['FLOOD', 'FIRE', 'LANDSLIDE', 'CONFLICT', 'EPIDEMIC'],
    allowedSeverities: ['MINOR', 'MODERATE', 'SEVERE'],
    allowedStatuses: ['ACTIVE', 'CONTAINED']
  },
  RESPONDER: {
    canAccessAllData: false,
    allowedIncidentTypes: ['FLOOD', 'FIRE', 'LANDSLIDE', 'CONFLICT'],
    allowedSeverities: ['MODERATE', 'SEVERE', 'CATASTROPHIC'],
    allowedStatuses: ['ACTIVE']
  },
  VERIFIER: {
    canAccessAllData: false,
    allowedIncidentTypes: ['FLOOD', 'FIRE', 'LANDSLIDE', 'CONFLICT', 'EPIDEMIC', 'OTHER'],
    allowedSeverities: ['MINOR', 'MODERATE', 'SEVERE', 'CATASTROPHIC'],
    allowedStatuses: ['ACTIVE', 'CONTAINED']
  },
  DONOR: {
    canAccessAllData: false,
    allowedIncidentTypes: ['FLOOD', 'FIRE', 'LANDSLIDE', 'CONFLICT', 'EPIDEMIC'],
    allowedSeverities: ['MODERATE', 'SEVERE', 'CATASTROPHIC'],
    allowedStatuses: ['ACTIVE', 'CONTAINED']
  }
};

export interface UserContext {
  userId: string;
  userEmail: string;
  userRole: string;
  isActive: boolean;
}

export async function getUserContext(request: NextRequest): Promise<UserContext | null> {
  try {
    // Get user session from NextAuth
    const session = await getSession(request);
    
    if (!session?.user?.email) {
      return null;
    }

    // Get user with active role from database
    const user = await DatabaseService.getUserWithRoles(session.user.id);
    
    if (!user || !user.activeRole) {
      return null;
    }

    return {
      userId: user.id,
      userEmail: user.email || '',
      userRole: user.activeRole.name,
      isActive: user.isActive
    };
  } catch (error) {
    console.error('Error getting user context:', error);
    return null;
  }
}

export function applyRoleBasedFilters(
  userContext: UserContext,
  filters: Record<string, any> = {}
): Record<string, any> {
  const rolePermissions = ROLE_DATA_ACCESS[userContext.userRole as keyof typeof ROLE_DATA_ACCESS];
  
  if (!rolePermissions) {
    throw new Error(`Unknown role: ${userContext.userRole}`);
  }

  // Admin and Coordinator can access all data
  if (rolePermissions.canAccessAllData) {
    return filters;
  }

  // Apply role-based restrictions
  const restrictedFilters = { ...filters };

  // Restrict incident types
  if (rolePermissions.allowedIncidentTypes.length > 0) {
    if (restrictedFilters.type) {
      // If user specified a type, ensure it's in their allowed list
      if (!rolePermissions.allowedIncidentTypes.includes(restrictedFilters.type)) {
        // Return a filter that will return no results
        restrictedFilters.type = 'NONEXISTENT_TYPE';
      }
    } else {
      // Otherwise, restrict to their allowed types
      restrictedFilters.type = { in: rolePermissions.allowedIncidentTypes };
    }
  }

  // Restrict severities
  if (rolePermissions.allowedSeverities.length > 0) {
    if (restrictedFilters.severity) {
      if (!rolePermissions.allowedSeverities.includes(restrictedFilters.severity)) {
        restrictedFilters.severity = 'NONEXISTENT_SEVERITY';
      }
    } else {
      restrictedFilters.severity = { in: rolePermissions.allowedSeverities };
    }
  }

  // Restrict statuses
  if (rolePermissions.allowedStatuses.length > 0) {
    if (restrictedFilters.status) {
      if (!rolePermissions.allowedStatuses.includes(restrictedFilters.status)) {
        restrictedFilters.status = 'NONEXISTENT_STATUS';
      }
    } else {
      restrictedFilters.status = { in: rolePermissions.allowedStatuses };
    }
  }

  return restrictedFilters;
}

export function createRoleBasedFilterMiddleware() {
  return async (request: NextRequest): Promise<{ userContext: UserContext | null; filters: Record<string, any> }> => {
    const userContext = await getUserContext(request);
    
    if (!userContext) {
      return { userContext: null, filters: {} };
    }

    // Parse query parameters from URL
    const { searchParams } = new URL(request.url);
    const filters: Record<string, any> = {};

    // Extract common filter parameters
    const filterParams = ['type', 'severity', 'status', 'dateRange', 'limit', 'offset'];
    filterParams.forEach(param => {
      const value = searchParams.get(param);
      if (value) {
        try {
          if (param === 'dateRange') {
            filters[param] = JSON.parse(value);
          } else if (param === 'limit' || param === 'offset') {
            filters[param] = parseInt(value);
          } else {
            filters[param] = value;
          }
        } catch (error) {
          // If JSON parsing fails, use raw value
          filters[param] = value;
        }
      }
    });

    // Apply role-based restrictions
    const roleBasedFilters = applyRoleBasedFilters(userContext, filters);

    return { userContext, filters: roleBasedFilters };
  };
}

// Helper function to check if user has access to specific resource
export function hasResourceAccess(userContext: UserContext, resourceType: string, resourceId?: string): boolean {
  const rolePermissions = ROLE_DATA_ACCESS[userContext.userRole as keyof typeof ROLE_DATA_ACCESS];
  
  if (!rolePermissions) {
    return false;
  }

  // Admin and Coordinator have full access
  if (rolePermissions.canAccessAllData) {
    return true;
  }

  // For now, implement basic access control
  // This can be extended with more sophisticated logic based on resource ownership
  switch (resourceType) {
    case 'incident':
      return rolePermissions.allowedIncidentTypes.length > 0;
    case 'assessment':
      return userContext.userRole === 'ASSESSOR' || userContext.userRole === 'VERIFIER';
    case 'response':
      return userContext.userRole === 'RESPONDER' || userContext.userRole === 'VERIFIER' || userContext.userRole === 'DONOR';
    case 'donor':
      return userContext.userRole === 'DONOR' || userContext.userRole === 'COORDINATOR';
    default:
      return false;
  }
}

// Session management helper (placeholder - would integrate with NextAuth)
async function getSession(request: NextRequest): Promise<any> {
  // This is a simplified version - in production, use NextAuth getSession
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  // For now, return a mock session
  // In production, validate the token with NextAuth
  return {
    user: {
      id: 'mock-user-id',
      email: 'user@example.com'
    }
  };
}