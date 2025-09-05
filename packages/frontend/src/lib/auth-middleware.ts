import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Middleware function to check admin access
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
    
    if (token.role !== 'ADMIN') {
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

// Helper to get current user from token
export async function getCurrentUser(request: NextRequest) {
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  })
  
  return token ? {
    id: token.id as string,
    name: token.name as string,
    email: token.email as string,
    role: token.role as string
  } : null
}

// Helper to check if user has specific role
export async function hasRole(request: NextRequest, role: string) {
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  })
  
  return token?.role === role || false
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