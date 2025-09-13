# Authentication Issues - Dev Instructions

## Overview
Multiple critical authentication and navigation issues identified through user testing. This document provides systematic fixes for each issue.

## Issues & Fixes

### ISSUE-001: Landing Page Links Show Error Message
**Problem**: All links on landing page (before authentication) show "missing required error components, refreshing..."

**Root Cause**: Likely missing error boundary components or improper error handling in pre-auth navigation

**Fix Instructions**:
1. **Check Error Boundaries**: 
   ```bash
   # Search for error boundary implementations
   find packages/frontend/src -name "*Error*" -o -name "*error*"
   ```

2. **Examine Layout Components**:
   - Check `packages/frontend/src/app/layout.tsx`
   - Look for missing error boundary wrapping
   - Ensure proper error component imports

3. **Fix Navigation Components**:
   ```typescript
   // In landing page components, wrap navigation links with error boundaries
   import { ErrorBoundary } from '@/components/ErrorBoundary'
   
   <ErrorBoundary fallback={<div>Navigation temporarily unavailable</div>}>
     <NavigationComponent />
   </ErrorBoundary>
   ```

4. **Verify Route Definitions**:
   - Check `packages/frontend/src/app/(auth)/` routes
   - Ensure all pre-auth routes have proper page.tsx files
   - Test each route individually

**Test Command**: 
```bash
# Test pre-auth navigation
pnpm --filter @dms/frontend dev
# Navigate to http://localhost:3000 and test all links
```

### ISSUE-002: Missing Sign Out Functionality
**Problem**: No sign out link/button visible when logged in

**Fix Instructions**:
1. **Add Sign Out Component**:
   ```typescript
   // Create/update header component with sign out
   import { signOut } from 'next-auth/react'
   
   const SignOutButton = () => (
     <button 
       onClick={() => signOut({ callbackUrl: '/' })}
       className="btn btn-secondary"
     >
       Sign Out
     </button>
   )
   ```

2. **Update Navigation Layout**:
   - Add sign out button to main navigation/header
   - Check `packages/frontend/src/components/layout/`
   - Ensure it appears in all authenticated routes

3. **Verify Session Handling**:
   ```typescript
   import { useSession } from 'next-auth/react'
   
   const { data: session } = useSession()
   
   return (
     <nav>
       {session && (
         <>
           <span>Welcome, {session.user.name}</span>
           <SignOutButton />
         </>
       )}
     </nav>
   )
   ```

**Files to Check/Modify**:
- `packages/frontend/src/app/layout.tsx`
- `packages/frontend/src/components/layout/Header.tsx`
- `packages/frontend/src/components/layout/Navigation.tsx`

### ISSUE-003: Admin Dashboard Shows 404 Error
**Problem**: After admin login, user sees "404 | This page cannot be found"

**Fix Instructions**:
1. **Create Missing Route Structure**:
   ```bash
   mkdir -p packages/frontend/src/app/(dashboard)/admin
   ```

2. **Create Admin Dashboard Page**:
   ```typescript
   // packages/frontend/src/app/(dashboard)/admin/page.tsx
   import { Metadata } from 'next'
   
   export const metadata: Metadata = {
     title: 'Admin Dashboard - DMS',
     description: 'Administrative dashboard for disaster management system'
   }
   
   export default function AdminDashboard() {
     return (
       <div className="container mx-auto p-6">
         <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="card">
             <h2>User Management</h2>
             {/* Admin functionality */}
           </div>
           <div className="card">
             <h2>System Settings</h2>
             {/* System configuration */}
           </div>
           <div className="card">
             <h2>Analytics</h2>
             {/* System analytics */}
           </div>
         </div>
       </div>
     )
   }
   ```

3. **Fix Post-Login Redirect**:
   - Check `packages/frontend/src/middleware.ts`
   - Update role-based redirect logic:
   ```typescript
   const roleRedirects = {
     ADMIN: '/admin',
     ASSESSOR: '/assessor', 
     RESPONDER: '/responder',
     COORDINATOR: '/coordinator',
     VERIFIER: '/verifier'
   }
   ```

4. **Create All Missing Dashboard Routes**:
   ```bash
   # Create dashboard structure
   mkdir -p packages/frontend/src/app/(dashboard)/{admin,assessor,responder,coordinator,verifier}
   
   # Create page.tsx for each role
   for role in admin assessor responder coordinator verifier; do
     cp packages/frontend/src/app/(dashboard)/admin/page.tsx packages/frontend/src/app/(dashboard)/$role/page.tsx
   done
   ```

### ISSUE-004: Role Definition & Verifier User Confusion
**Problem**: Verifier user exists but coordinators should be the only verifiers

**Fix Instructions**:
1. **Review Role Architecture**:
   - Examine business requirements for verifier role
   - Determine if separate VERIFIER role is needed
   - Check if coordinator role should handle verification

2. **Option A - Remove Verifier Role**:
   ```typescript
   // In packages/frontend/src/auth.config.ts
   // Remove verifier user from testUsers array
   const testUsers = [
     // ... keep admin, assessor, responder, coordinator
     // Remove verifier entry
   ]
   ```

3. **Option B - Clarify Verifier Role**:
   ```typescript
   // Add role hierarchy/permissions
   const rolePermissions = {
     COORDINATOR: ['coordinate', 'verify', 'manage_donors'],
     VERIFIER: ['verify_only'], // Limited verification role
   }
   ```

4. **Update Documentation**:
   - Document role definitions clearly
   - Update user guide with role responsibilities
   - Clarify coordinator vs verifier distinction

## Middleware & Auth Configuration Updates

### Update Middleware for Proper Routing
```typescript
// packages/frontend/src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  const { pathname } = request.nextUrl

  // Define role-based routing
  const roleRoutes = {
    ADMIN: '/admin',
    ASSESSOR: '/assessor',
    RESPONDER: '/responder', 
    COORDINATOR: '/coordinator',
    VERIFIER: '/verifier'
  }

  // Redirect authenticated users to proper dashboard
  if (token && pathname === '/') {
    const userRole = token.activeRole?.name || token.role
    const dashboardPath = roleRoutes[userRole] || '/assessor'
    return NextResponse.redirect(new URL(dashboardPath, request.url))
  }

  // Protect dashboard routes
  if (pathname.startsWith('/(dashboard)')) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

## Testing Commands

```bash
# Run type checking
pnpm --filter @dms/frontend run typecheck

# Run linting  
pnpm --filter @dms/frontend run lint

# Build to verify no compilation errors
pnpm --filter @dms/frontend build

# Start dev server for testing (runs on port 3003 due to port conflicts)
pnmp run dev

# Manual testing workflow after fixes:
# 1. Navigate to http://localhost:3003
# 2. Test all landing page links (no error messages should appear)
# 3. Click Sign In button
# 4. Try each user role login:
#    - admin@test.com / admin123 (should redirect to /admin, not 404)
#    - assessor@test.com / assessor123
#    - responder@test.com / responder123  
#    - coordinator@test.com / coordinator123
#    - verifier@test.com / verifier123
# 5. Verify sign-out button is visible and functional for each user
# 6. Test role-appropriate dashboard content loads

# Browser testing required - Playwright MCP has installation issues
# Use manual browser testing instead
```

## Verification Checklist

After implementing fixes:

- [ ] Landing page links work without error messages
- [ ] Sign out button appears for all authenticated users
- [ ] Admin login redirects to proper dashboard (no 404)
- [ ] All role dashboards exist and load properly
- [ ] Role-based access control works correctly
- [ ] Session persistence works after page refresh
- [ ] Cross-role navigation is properly restricted
- [ ] Verifier role definition is clarified/resolved

## Priority Order - UPDATED AFTER CODEBASE ANALYSIS

1. **CRITICAL**: Create missing role dashboard routes (NEW FINDING)
2. **CRITICAL**: Implement post-login redirection logic (NEW FINDING) 
3. **HIGH**: Fix admin 404 error (middleware vs routing issue)
4. **HIGH**: Add sign out functionality 
5. **MEDIUM**: Fix landing page navigation errors
6. **MEDIUM**: Implement role switching UI
7. **LOW**: Resolve verifier role definition

## CRITICAL NEW FINDINGS

### Missing Dashboard Routes
**Analysis shows these routes are defined in middleware but don't exist:**
- `/assessor` - Missing page.tsx
- `/responder` - Missing page.tsx  
- `/verifier` - Missing page.tsx

**Existing Routes:**
- `/admin` - ✅ Exists (but 404 issue)
- `/coordinator` - ✅ Exists and should work
- `/donor` - ✅ Exists but no donor user in auth config

### Root Cause Analysis
The main issue is **architectural mismatch**:
1. **Middleware** expects role-specific routes (`/admin`, `/assessor`, etc.)
2. **Routes** only exist for admin, coordinator, and donor
3. **Post-login flow** has no redirection logic - users stay on sign-in page
4. **Missing routes** cause 404 or fallback to `/dashboard`

## URGENT DEV ACTIONS REQUIRED

### 1. Create Missing Role Dashboard Routes
```bash
# Create missing dashboard directories and pages
mkdir -p packages/frontend/src/app/\(dashboard\)/assessor
mkdir -p packages/frontend/src/app/\(dashboard\)/responder  
mkdir -p packages/frontend/src/app/\(dashboard\)/verifier

# Copy template from coordinator dashboard
cp -r packages/frontend/src/app/\(dashboard\)/coordinator/* packages/frontend/src/app/\(dashboard\)/assessor/
cp -r packages/frontend/src/app/\(dashboard\)/coordinator/* packages/frontend/src/app/\(dashboard\)/responder/
cp -r packages/frontend/src/app/\(dashboard\)/coordinator/* packages/frontend/src/app/\(dashboard\)/verifier/
```

### 2. Add Missing Test Users (Donor & Super User)
**Update auth.config.ts testUsers array to include:**
```typescript
// In packages/frontend/src/auth.config.ts, update testUsers array:
const testUsers = [
  {
    email: "admin@test.com",
    password: "admin123",
    id: "admin-user-id",
    name: "Test Admin",
    role: "ADMIN"
  },
  {
    email: "assessor@test.com", 
    password: "assessor123",
    id: "assessor-user-id",
    name: "Test Assessor",
    role: "ASSESSOR"
  },
  {
    email: "responder@test.com",
    password: "responder123", 
    id: "responder-user-id",
    name: "Test Responder",
    role: "RESPONDER"
  },
  {
    email: "coordinator@test.com",
    password: "coordinator123",
    id: "coordinator-user-id", 
    name: "Test Coordinator",
    role: "COORDINATOR"
  },
  {
    email: "verifier@test.com",
    password: "verifier123",
    id: "verifier-user-id",
    name: "Test Verifier", 
    role: "VERIFIER"
  },
  // ADD THESE NEW USERS:
  {
    email: "donor@test.com",
    password: "donor123",
    id: "donor-user-id",
    name: "Test Donor",
    role: "DONOR"
  },
  {
    email: "superuser@test.com", 
    password: "superuser123",
    id: "superuser-user-id",
    name: "Super User (Multi-Role)",
    role: "ADMIN", // Primary role
    // Multi-role user with all roles for testing role switching
    allRoles: ["ADMIN", "COORDINATOR", "ASSESSOR", "RESPONDER", "VERIFIER", "DONOR"]
  }
];
```

### 3. Update User Creation Logic for Multi-Role Support
**Modify the authorize function to handle multi-role users:**
```typescript
// In auth.config.ts authorize function, replace the return statement:
if (testUser) {
  // Check if user has multiple roles (for superuser)
  const userRoles = testUser.allRoles || [testUser.role];
  
  return {
    id: testUser.id,
    name: testUser.name,
    email: testUser.email,
    role: testUser.role,
    roles: userRoles.map(roleName => ({ 
      id: `${roleName.toLowerCase()}-role`, 
      name: roleName, 
      isActive: roleName === testUser.role, // Primary role is active by default
      createdAt: new Date(),
      updatedAt: new Date()
    })),
    activeRole: { 
      id: `${testUser.role.toLowerCase()}-role`, 
      name: testUser.role, 
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    permissions: [],
    allRoles: userRoles // Keep track of all available roles
  };
}
```

### 4. Implement Post-Login Redirection
**Add to auth.config.ts callbacks:**
```typescript
// In auth.config.ts callbacks section
callbacks: {
  jwt({ token, user }) {
    if (user) {
      token.id = user.id;
      token.roles = (user as any).roles || [];
      token.activeRole = (user as any).activeRole || null;
      token.permissions = (user as any).permissions || [];
      token.allRoles = (user as any).allRoles || []; // For multi-role users
    }
    return token;
  },
  session({ session, token }) {
    if (token) {
      session.user.id = token.id as string;
      session.user.roles = token.roles as any[] || [];
      session.user.activeRole = token.activeRole as any;
      session.user.role = (token.activeRole as any)?.name || 'ASSESSOR';
      session.user.permissions = token.permissions as any[] || [];
      session.user.allRoles = token.allRoles as string[] || []; // For role switching
    }
    return session;
  },
  // ADD THIS NEW CALLBACK
  async redirect({ url, baseUrl, token }) {
    // Post-login redirection based on role
    if (token?.activeRole) {
      const role = (token.activeRole as any).name;
      const roleRoutes = {
        'ADMIN': '/admin',
        'COORDINATOR': '/coordinator', 
        'ASSESSOR': '/assessor',
        'RESPONDER': '/responder',
        'VERIFIER': '/verifier',
        'DONOR': '/donor'
      };
      
      const dashboardPath = roleRoutes[role as keyof typeof roleRoutes] || '/dashboard';
      return `${baseUrl}${dashboardPath}`;
    }
    
    // Default behavior
    if (url.startsWith(baseUrl)) return url;
    return baseUrl;
  }
},
```

### 3. Fix Admin Dashboard Route Issue
**Check packages/frontend/src/app/(dashboard)/admin/page.tsx exists and is properly exported:**
```typescript
// Ensure proper default export
export default function AdminDashboard() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      {/* Admin content */}
    </div>
  );
}
```

### 4. Role-Specific Dashboard Content
**Customize each dashboard based on role permissions:**

**Assessor Dashboard (`/assessor/page.tsx`):**
- Assessment creation tools
- Incident reporting interface
- Assessment history/drafts

**Responder Dashboard (`/responder/page.tsx`):** 
- Response queue management
- Delivery tracking tools
- Status update interface

**Verifier Dashboard (`/verifier/page.tsx`):**
- Verification queue
- Review/approval tools
- Verification history

**Donor Dashboard (`/donor/page.tsx`):** - Already exists but customize:
- Donation tracking
- Resource contribution history
- Impact metrics

### 6. Implement Role Switching UI Component
**Create role switching component for multi-role users:**
```typescript
// Create packages/frontend/src/components/auth/RoleSwitcher.tsx
import { useSession, signIn } from 'next-auth/react'
import { useState } from 'react'

export function RoleSwitcher() {
  const { data: session, update } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  
  if (!session?.user?.allRoles || session.user.allRoles.length <= 1) {
    return null // Don't show if user doesn't have multiple roles
  }

  const switchRole = async (newRole: string) => {
    setIsLoading(true)
    try {
      // Update the active role
      await update({
        ...session,
        user: {
          ...session.user,
          role: newRole,
          activeRole: {
            id: `${newRole.toLowerCase()}-role`,
            name: newRole,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      })
      
      // Redirect to new role's dashboard
      const roleRoutes = {
        'ADMIN': '/admin',
        'COORDINATOR': '/coordinator', 
        'ASSESSOR': '/assessor',
        'RESPONDER': '/responder',
        'VERIFIER': '/verifier',
        'DONOR': '/donor'
      }
      
      const dashboardPath = roleRoutes[newRole as keyof typeof roleRoutes] || '/dashboard'
      window.location.href = dashboardPath
    } catch (error) {
      console.error('Failed to switch role:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative">
      <select 
        value={session.user.role}
        onChange={(e) => switchRole(e.target.value)}
        disabled={isLoading}
        className="form-select text-sm"
      >
        {session.user.allRoles.map((role: string) => (
          <option key={role} value={role}>
            {role} {role === session.user.role ? '(Active)' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
```

### 7. Add Role Switcher to Header Component
**Update the header component to include role switcher:**
```typescript
// In packages/frontend/src/components/layouts/Header.tsx (or equivalent)
import { RoleSwitcher } from '@/components/auth/RoleSwitcher'
import { signOut, useSession } from 'next-auth/react'

export function Header() {
  const { data: session } = useSession()

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center px-6">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
          {/* Existing header content */}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Connection status, queue status, etc. */}
          
          {/* Add Role Switcher for multi-role users */}
          {session && <RoleSwitcher />}
          
          {/* Add Sign Out Button */}
          {session && (
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              <svg className="w-4 h-4" /* sign out icon *//>
              <span>Sign Out</span>
            </button>
          )}
          
          {/* Keep existing Sign In button for non-authenticated users */}
          {!session && (
            <a href="/auth/signin">
              <button className="flex items-center gap-2 bg-primary text-white px-3 py-2 rounded-md">
                <span>Sign In</span>
              </button>
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
```

## Testing Priority After Fixes

### Single Role Users:
1. **Admin Login** - admin@test.com / admin123 → Should redirect to `/admin` (not 404)
2. **Coordinator Login** - coordinator@test.com / coordinator123 → Should redirect to `/coordinator` 
3. **Assessor Login** - assessor@test.com / assessor123 → Should redirect to `/assessor` (newly created)
4. **Responder Login** - responder@test.com / responder123 → Should redirect to `/responder` (newly created)
5. **Verifier Login** - verifier@test.com / verifier123 → Should redirect to `/verifier` (newly created)
6. **Donor Login** - donor@test.com / donor123 → Should redirect to `/donor` (customize existing)

### Multi-Role User Testing:
7. **Super User Login** - superuser@test.com / superuser123 → Should redirect to `/admin` (primary role)
   - **Role Switcher Test**: Should see dropdown with all 6 roles
   - **Role Switching Test**: Switch to each role and verify redirection
   - **Permission Test**: Verify access to all role-specific features

### Cross-Functionality Testing:
8. **Cross-Role Access** - Admin should access all routes, others restricted appropriately
9. **Sign-Out** - Should work from all dashboards and redirect to landing page
10. **Session Persistence** - Role switching should persist across page refreshes
11. **Unauthorized Access** - Non-admin users blocked from admin routes

## Manual Testing Guide

Use the comprehensive manual testing guide at:
`docs/qa/role-based-authentication-test-guide.md`

This guide provides step-by-step testing instructions for each role without requiring Playwright browser automation.

## Summary - CRITICAL UPDATES ADDED

### NEW REQUIREMENTS ADDED:
1. **Donor User** - donor@test.com / donor123 (requested by user)
2. **Super User** - superuser@test.com / superuser123 (multi-role testing user)
3. **Role Switching UI** - Dropdown component for multi-role users
4. **Enhanced Testing** - Extended test scenarios for 7 total users

### COMPLETE USER ROSTER (7 Total Users):
| User | Email | Password | Type | Roles |
|------|-------|----------|------|-------|
| Admin | admin@test.com | admin123 | Single | ADMIN |
| Assessor | assessor@test.com | assessor123 | Single | ASSESSOR |
| Responder | responder@test.com | responder123 | Single | RESPONDER |
| Coordinator | coordinator@test.com | coordinator123 | Single | COORDINATOR |
| Verifier | verifier@test.com | verifier123 | Single | VERIFIER |
| Donor | donor@test.com | donor123 | Single | DONOR |
| **Super User** | **superuser@test.com** | **superuser123** | **Multi** | **ALL 6 ROLES** |

## Notes for Dev Agent

- **Priority Focus**: Create missing routes FIRST - this solves the core 404 issue
- **Template Approach**: Use coordinator dashboard as template for other roles
- **Multi-Role Implementation**: Implement superuser with role switching capability
- **Incremental Testing**: Test each role after creating its route, then test role switching
- **Role-Specific Features**: Customize dashboard content based on role permissions
- **Role Switcher Component**: Create dropdown UI for multi-role users in header
- **Comprehensive Testing**: Use updated manual testing guide with 7 users
- **Business Logic**: Clarify verifier vs coordinator distinction with product team

## IMPLEMENTATION ORDER:
1. Add donor and superuser to auth.config.ts
2. Create missing dashboard routes (/assessor, /responder, /verifier)
3. Implement post-login redirection logic
4. Create role switcher component
5. Add sign-out functionality to header
6. Test each single-role user individually
7. Test superuser multi-role functionality thoroughly

---

# ⚠️ CRITICAL UPDATE - ADDITIONAL FINDINGS FROM QA AGENT INVESTIGATION

## NEW TECHNICAL ISSUES IDENTIFIED (December 2024)

### ISSUE-005: TypeScript Type Mismatch - VERIFIER Role
**Problem**: `RoleContextProvider.tsx` line 9 defines UserRole type without 'VERIFIER', but `auth.config.ts` and `RoleIndicator.tsx` both include it.

**Impact**: Runtime error "Check the method of 'RoleIndicator'" when signing in as VERIFIER user.

**Immediate Fix Required**:
```typescript
// File: packages/frontend/src/components/providers/RoleContextProvider.tsx
// Line 9 - Update UserRole interface
interface UserRole {
  id: string;
  name: 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN' | 'VERIFIER'; // ADD VERIFIER
  permissions: any[];
  isActive: boolean;
}
```

### ISSUE-006: Missing VERIFIER Navigation Sections
**Problem**: `useRoleNavigation.ts` has no navigation sections defined for VERIFIER role, causing empty navigation pane.

**Fix Required**: Add this navigation section to useRoleNavigation.ts after line 381:
```typescript
{
  title: 'Verification Management',
  roleRestriction: ['VERIFIER'],
  items: [
    { 
      icon: 'CheckCircle', 
      label: 'Verification Queue', 
      href: '/verification/queue', 
      badge: 3,
      requiredPermissions: ['verification:review']
    },
    { 
      icon: 'ClipboardList', 
      label: 'Assessment Verification', 
      href: '/verification/assessments', 
      badge: 2,
      requiredPermissions: ['verification:approve']
    },
    { 
      icon: 'BarChart3', 
      label: 'Response Verification', 
      href: '/verification/responses', 
      badge: 1,
      requiredPermissions: ['responses:verify']
    },
    { 
      icon: 'Archive', 
      label: 'Verification Dashboard', 
      href: '/verification/dashboard', 
      badge: 0,
      requiredPermissions: ['verification:read']
    }
  ]
}
```

Also add CheckCircle to iconMap (line 17-36):
```typescript
const iconMap = {
  // ... existing icons ...
  CheckCircle  // Add this line
};
```

### ISSUE-007: Incorrect Authentication Redirect
**Problem**: `auth.config.ts` redirect callback sends users to non-existent `/dashboard` route instead of home page.

**Fix Required**: Update redirect callback (lines 139-157):
```typescript
async redirect({ url, baseUrl }) {
  // If there's a callback URL in the signin URL, use it
  if (url.includes('/auth/signin') && url.includes('callbackUrl=')) {
    const urlParams = new URL(url);
    const callbackUrl = urlParams.searchParams.get('callbackUrl');
    if (callbackUrl && callbackUrl.startsWith('/')) {
      return `${baseUrl}${callbackUrl}`;
    }
  }
  
  // FIXED: Default redirect to home page instead of /dashboard
  if (url.includes('/auth/signin') || url.includes('/dashboard')) {
    return baseUrl; // Always redirect to home page (/)
  }
  
  // For other redirects, use default behavior
  if (url.startsWith(baseUrl)) return url;
  return baseUrl;
}
```

### ISSUE-008: Session Loading State Missing
**Problem**: Landing page shows "not signed in" appearance immediately after authentication due to session loading delay.

**Fix Required**: Add loading state to `app/page.tsx` around line 29:
```typescript
const { data: session, status } = useSession(); // Add status

// Add loading state
if (status === 'loading') {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
```

### ISSUE-009: Role Switch Session Synchronization
**Problem**: Super User role switching via API doesn't properly update NextAuth session, showing incorrect role in header/navigation.

**Fix Required**: Update `useMultiRole.ts` session update logic (lines 170-179):
```typescript
// Update NextAuth session with complete role information
await update({
  ...session,
  user: {
    ...session?.user,
    activeRole: {
      id: result.data.activeRole.id,
      name: result.data.activeRole.name,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    role: result.data.activeRole.name,
    roles: result.data.availableRoles.map((role: any) => ({
      id: role.id,
      name: role.name,
      isActive: role.isActive,
      createdAt: new Date(),
      updatedAt: new Date()
    }))
  }
});

// Force page refresh to ensure all components re-render with new role
if (typeof window !== 'undefined') {
  window.location.reload();
}
```

## REVISED IMPLEMENTATION PRIORITY ORDER

### IMMEDIATE (Fix Breaking Errors):
1. **Fix VERIFIER Type Definition** - Prevents runtime crashes
2. **Fix Auth Redirect to Home Page** - Prevents 404 after login
3. **Add Session Loading State** - Prevents "not signed in" appearance

### HIGH PRIORITY (Core Functionality):
4. **Add VERIFIER Navigation Sections** - Provides functional navigation
5. **Fix Role Switch Synchronization** - Super User functionality
6. **Create Missing Dashboard Routes** - Per original analysis
7. **Add Sign Out Functionality** - Per original analysis

### MEDIUM PRIORITY (Enhancement):
8. **Create Role Switcher UI Component** - Per original analysis
9. **Customize Role-Specific Dashboards** - Per original analysis

## URGENT ACTIONS FOR DEV AGENT

### Step 1: Fix TypeScript Types (5 minutes)
- Update RoleContextProvider.tsx UserRole interface to include VERIFIER
- This will immediately fix the VERIFIER login crash

### Step 2: Fix Authentication Flow (10 minutes)  
- Update auth.config.ts redirect callback to use home page
- Add session loading state to app/page.tsx
- This will fix the post-login user experience

### Step 3: Add VERIFIER Navigation (15 minutes)
- Add VERIFIER navigation sections to useRoleNavigation.ts
- Add CheckCircle icon to iconMap
- This will provide functional navigation for VERIFIER users

### Step 4: Test Critical Fixes (10 minutes)
- Test VERIFIER login (should not crash)
- Test all role logins (should redirect to home page showing features)
- Test Super User role switching (should update header correctly)

**Total time for critical fixes: ~40 minutes**

After these critical fixes are implemented, proceed with the original comprehensive plan for dashboard routes and enhanced functionality.