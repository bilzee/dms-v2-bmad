import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

interface UserRole {
  name: string;
}

const { auth } = NextAuth(authConfig);

// Define role-based route access control
const ROUTE_PERMISSIONS = {
  '/coordinator': ['COORDINATOR', 'ADMIN'],
  '/responder': ['RESPONDER', 'ADMIN'],
  '/assessor': ['ASSESSOR', 'ADMIN'], 
  '/donor': ['DONOR', 'ADMIN'],
  '/verifier': ['VERIFIER', 'ADMIN'],
  '/admin': ['ADMIN'],
  
  // API routes protection
  '/api/v1/coordinator': ['COORDINATOR', 'ADMIN'],
  '/api/v1/verification': ['VERIFIER', 'ADMIN'],
  '/api/v1/admin': ['ADMIN'],
  '/api/v1/donors': ['DONOR', 'COORDINATOR', 'ADMIN'],
  '/api/v1/incidents': ['ASSESSOR', 'COORDINATOR', 'ADMIN'],
  '/api/v1/responses': ['RESPONDER', 'COORDINATOR', 'ADMIN'],
};

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Skip auth check for public routes and ALL API routes (let API routes handle their own auth)
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/') ||  // Skip ALL API routes - they handle their own auth
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  // Only apply middleware to page routes, not API routes
  // This fixes 307 redirect issues on API endpoints
  
  // Redirect to login if not authenticated
  if (!req.auth?.user) {
    const loginUrl = new URL('/auth/signin', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check role-based access for page routes only
  const userRole = req.auth.user.role;
  const userRoles = req.auth.user.roles?.map((r: any) => r.name) || [userRole] || [];
  
  // Also check allRoles and activeRole as fallbacks
  const allRoles = (req.auth.user as any)?.allRoles || [];
  const activeRoleName = (req.auth.user as any)?.activeRole?.name;
  
  // Combine all possible role sources
  const allUserRoles = [...userRoles, ...allRoles];
  if (activeRoleName && !allUserRoles.includes(activeRoleName)) {
    allUserRoles.push(activeRoleName);
  }

  // Find matching route permission (excluding API routes)
  const matchedRoute = Object.keys(ROUTE_PERMISSIONS).find(route => 
    pathname.startsWith(route) && !route.startsWith('/api/')
  );

  if (matchedRoute) {
    const allowedRoles = ROUTE_PERMISSIONS[matchedRoute as keyof typeof ROUTE_PERMISSIONS];
    const hasAccess = allUserRoles.some((role: string) => allowedRoles.includes(role));

    if (!hasAccess) {
      // Redirect to unauthorized page or dashboard based on their role
      const dashboardUrl = new URL('/dashboard?error=access-denied', req.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (all API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)  
     * - favicon.ico (favicon file)
     * - auth (auth pages)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|auth).*)',
  ],
};