import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Enhanced middleware function to check admin access with multi-role support
export async function requireAdminRole(request: NextRequest) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    })
    
    if (!token) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Authentication required', 
          message: 'Please sign in to access this resource',
          timestamp: new Date().toISOString()
        }, 
        { status: 401 }
      )
    }
    
    // Check if user has ADMIN role among their roles (multi-role support)
    const userRoles = (token.roles as any[])?.map(r => r.name || r) || [token.role as string];
    const hasAdminRole = userRoles.includes('ADMIN');
    
    if (!hasAdminRole) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Insufficient permissions', 
          message: 'Admin role required to access this resource',
          timestamp: new Date().toISOString()
        }, 
        { status: 403 }
      )
    }
    
    // Return null to allow access (attach user info to request if needed)
    return null
  } catch (error) {
    console.error('Auth middleware error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Authentication error', 
        message: 'Unable to verify authentication',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
}

// Helper to get current user from token with multi-role support
export async function getCurrentUser(request: NextRequest) {
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  })
  
  return token ? {
    id: token.id as string,
    name: token.name as string,
    email: token.email as string,
    role: token.role as string, // Current active role
    roles: (token.roles as any[])?.map(r => r.name || r) || [token.role as string], // All available roles
    activeRole: (token.activeRole as any)?.name || token.role as string
  } : null
}

// Helper to check if user has specific role (supports multi-role)
export async function hasRole(request: NextRequest, role: string) {
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  })
  
  if (!token) return false;
  
  const userRoles = (token.roles as any[])?.map(r => r.name || r) || [token.role as string];
  return userRoles.includes(role);
}

// Helper to check if user has any of the specified roles
export async function hasAnyRole(request: NextRequest, roles: string[]) {
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  })
  
  if (!token) return false;
  
  const userRoles = (token.roles as any[])?.map(r => r.name || r) || [token.role as string];
  return roles.some(role => userRoles.includes(role));
}

// Helper to check if user has all specified roles
export async function hasAllRoles(request: NextRequest, roles: string[]) {
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  })
  
  if (!token) return false;
  
  const userRoles = (token.roles as any[])?.map(r => r.name || r) || [token.role as string];
  return roles.every(role => userRoles.includes(role));
}

// Helper to get user's active role
export async function getActiveRole(request: NextRequest) {
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  })
  
  return token?.activeRole as string || token?.role as string || null;
}

// Middleware to require specific role
export async function requireRole(request: NextRequest, requiredRole: string) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    })
    
    if (!token) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Authentication required', 
          message: 'Please sign in to access this resource',
          timestamp: new Date().toISOString()
        }, 
        { status: 401 }
      )
    }
    
    const userRoles = (token.roles as any[])?.map(r => r.name || r) || [token.role as string];
    
    if (!userRoles.includes(requiredRole)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Insufficient permissions', 
          message: `${requiredRole} role required to access this resource`,
          timestamp: new Date().toISOString()
        }, 
        { status: 403 }
      )
    }
    
    return null
  } catch (error) {
    console.error('Auth middleware error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Authentication error', 
        message: 'Unable to verify authentication',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
}

// Middleware to require any of the specified roles
export async function requireAnyRole(request: NextRequest, requiredRoles: string[]) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    })
    
    if (!token) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Authentication required', 
          message: 'Please sign in to access this resource',
          timestamp: new Date().toISOString()
        }, 
        { status: 401 }
      )
    }
    
    const userRoles = (token.roles as any[])?.map(r => r.name || r) || [token.role as string];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Insufficient permissions', 
          message: `One of the following roles required: ${requiredRoles.join(', ')}`,
          timestamp: new Date().toISOString()
        }, 
        { status: 403 }
      )
    }
    
    return null
  } catch (error) {
    console.error('Auth middleware error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Authentication error', 
        message: 'Unable to verify authentication',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
}

// Middleware for any authenticated user (not just admin)
export async function requireAuth(request: NextRequest) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    })
    
    if (!token) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Authentication required', 
          message: 'Please sign in to access this resource',
          timestamp: new Date().toISOString()
        }, 
        { status: 401 }
      )
    }
    
    return null
  } catch (error) {
    console.error('Auth middleware error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Authentication error', 
        message: 'Unable to verify authentication',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
}