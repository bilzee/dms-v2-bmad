# Definitive Role Switching Architectural Fix - Complete Solution

## Root Cause Analysis

After extensive research and analysis, the fundamental issue is **architectural disconnection between NextAuth sessions and database state**:

1. **NextAuth creates sessions** for test users defined in `auth.config.ts`
2. **These users don't exist in the database** when API routes query them
3. **API routes fail** with "User not found" errors
4. **Current fixes patch symptoms** (dynamic user creation in API routes) instead of fixing the root cause

## Critical Flaw in Current Implementation

The dev agent's current approach has a **fatal role ID mismatch**:

- **API creates role IDs**: `admin-role-superuser-user-id` (route.ts:124)  
- **Frontend sends role IDs**: `admin-role` (auth.config.ts:165)
- **Result**: Role lookups will ALWAYS fail

## The Proper Architectural Solution

Fix the authentication layer itself, not the API layer.

---

## Implementation Instructions

### Step 1: Add Prisma Adapter to NextAuth

**File**: `packages/frontend/src/auth.config.ts`

**Add Prisma adapter import and configuration:**

```typescript
import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";

export const authConfig = {
  // Add Prisma adapter
  adapter: PrismaAdapter(prisma),
  
  providers: [
    // ... existing providers
  ],
  
  callbacks: {
    // Add signIn callback for database synchronization
    async signIn({ user, account, profile }) {
      console.log('SignIn callback triggered:', { 
        userId: user.id, 
        email: user.email, 
        accountType: account?.type 
      });

      // For credentials provider, ensure test users exist in database
      if (account?.type === "credentials") {
        await ensureTestUserExists(user);
      }
      
      return true;
    },
    
    jwt({ token, user, trigger, session }) {
      // Handle session updates for all user types
      if (trigger === "update") {
        return { ...token, ...session };
      }
      
      // Persist role information in JWT
      if (user) {
        token.id = user.id;
        token.roles = (user as any).roles || [];
        token.activeRole = (user as any).activeRole || null;
        token.permissions = (user as any).permissions || [];
        token.allRoles = (user as any).allRoles || [];
      }
      return token;
    },
    
    async session({ session, token }) {
      // Ensure consistent session structure for all roles
      if (token && session.user) {
        session.user.id = token.id as string;
        
        // Get fresh user data from database to sync roles
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          include: { 
            roles: {
              include: { permissions: true }
            }
          },
        });
        
        if (dbUser) {
          const activeRole = dbUser.roles.find(role => role.id === dbUser.activeRoleId);
          
          session.user.roles = dbUser.roles.map(role => ({
            id: role.id,
            name: role.name,
            isActive: role.id === dbUser.activeRoleId,
            createdAt: role.createdAt || new Date(),
            updatedAt: role.updatedAt || new Date()
          }));
          
          session.user.activeRole = activeRole ? {
            id: activeRole.id,
            name: activeRole.name,
            isActive: true,
            createdAt: activeRole.createdAt || new Date(),
            updatedAt: activeRole.updatedAt || new Date()
          } : null;
          
          session.user.role = activeRole?.name || 'ASSESSOR';
          session.user.permissions = activeRole?.permissions || [];
          session.user.allRoles = dbUser.roles.map(r => r.name);
        } else {
          // Fallback to token data if database query fails
          session.user.roles = token.roles as any[] || [];
          session.user.activeRole = token.activeRole as any;
          session.user.role = (token.activeRole as any)?.name || token.role || 'ASSESSOR';
          session.user.permissions = token.permissions as any[] || [];
          session.user.allRoles = token.allRoles as string[] || [];
        }
      }
      return session;
    },
    
    // ... existing redirect callback
  },
  
  // ... rest of config
} satisfies NextAuthConfig;

// Helper function to ensure test users exist in database
async function ensureTestUserExists(authUser: any) {
  const testUsers = [
    {
      id: "admin-user-id",
      name: "Test Admin",
      email: "admin@test.com",
      roles: ["ADMIN"]
    },
    {
      id: "coordinator-user-id", 
      name: "Test Coordinator",
      email: "coordinator@test.com",
      roles: ["COORDINATOR"]
    },
    {
      id: "assessor-user-id",
      name: "Test Assessor", 
      email: "assessor@test.com",
      roles: ["ASSESSOR"]
    },
    {
      id: "responder-user-id",
      name: "Test Responder",
      email: "responder@test.com", 
      roles: ["RESPONDER"]
    },
    {
      id: "verifier-user-id",
      name: "Test Verifier",
      email: "verifier@test.com",
      roles: ["VERIFIER"]
    },
    {
      id: "donor-user-id",
      name: "Test Donor",
      email: "donor@test.com",
      roles: ["DONOR"]
    },
    {
      id: "superuser-user-id",
      name: "Super User (Multi-Role)", 
      email: "superuser@test.com",
      roles: ["ADMIN", "COORDINATOR", "ASSESSOR", "RESPONDER", "VERIFIER", "DONOR"]
    }
  ];

  const testUser = testUsers.find(tu => tu.email === authUser.email);
  
  if (testUser) {
    console.log('Ensuring test user exists in database:', testUser.email);
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: testUser.id }
    });
    
    if (!existingUser) {
      console.log('Creating test user in database:', testUser.email);
      
      // Create user in transaction
      await prisma.$transaction(async (tx) => {
        // Create user
        const createdUser = await tx.user.create({
          data: {
            id: testUser.id,
            name: testUser.name,
            email: testUser.email,
            isActive: true
          }
        });

        // Create roles with consistent IDs that match frontend expectations
        const createdRoles = [];
        for (const roleName of testUser.roles) {
          const roleId = `${roleName.toLowerCase()}-role`; // Consistent with auth.config.ts
          
          const role = await tx.role.create({
            data: {
              id: roleId,
              name: roleName,
              isActive: true,
              userId: createdUser.id,
              permissions: {
                create: [] // Empty permissions for now - can be populated later
              }
            }
          });
          
          createdRoles.push(role);
        }
        
        // Set first role as active
        if (createdRoles.length > 0) {
          await tx.user.update({
            where: { id: createdUser.id },
            data: { activeRoleId: createdRoles[0].id }
          });
        }
      });
      
      console.log(`✅ Test user created in database: ${testUser.email}`);
    } else {
      console.log('Test user already exists in database:', testUser.email);
    }
  }
}
```

### Step 2: Clean Up API Route - Remove Dynamic User Creation

**File**: `packages/frontend/src/app/api/v1/session/role/route.ts`

**Replace the entire file with simplified version:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { formatRolePermissions } from '@/lib/type-helpers';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

console.log('API route registered: /api/v1/session/role');

const switchRoleSchema = z.object({
  roleId: z.string().min(1, 'Role ID is required')
});

// GET /api/v1/session/role - Get current user's role session information
export async function GET(request: NextRequest) {
  console.log('GET /api/v1/session/role - Route handler called');
  
  try {
    const session = await auth();
    console.log('Session result:', session ? 'Found' : 'Not found');
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Querying database for user ID:', session.user.id);

    // Get user with roles from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        roles: {
          include: { permissions: true }
        }
      },
    });

    console.log('Database user query result:', user ? 'User found' : 'User NOT found');

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found - authentication layer issue' },
        { status: 404 }
      );
    }

    const activeRole = user.roles.find(role => role.id === user.activeRoleId);
    const activePermissions = activeRole?.permissions || [];

    const sessionData = {
      activeRole: activeRole ? {
        id: activeRole.id,
        name: activeRole.name,
        permissions: formatRolePermissions(activePermissions),
        isActive: true
      } : null,
      availableRoles: user.roles.map(role => ({
        id: role.id,
        name: role.name,
        permissions: formatRolePermissions(role.permissions),
        isActive: role.id === user.activeRoleId
      })),
      canSwitchRoles: user.roles.length > 1,
      lastRoleSwitch: (user as any).lastRoleSwitch?.toISOString()
    };

    return NextResponse.json({
      success: true,
      data: sessionData
    });

  } catch (error) {
    console.error('Failed to fetch user session:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// PUT /api/v1/session/role - Switch active role for current user
export async function PUT(request: NextRequest) {
  console.log('PUT /api/v1/session/role - Route handler called');
  
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validationResult = switchRoleSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const { roleId } = validationResult.data;
    console.log('Switching to role ID:', roleId);

    // Get user and verify role access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        roles: {
          include: { permissions: true }
        }
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found - authentication layer issue' },
        { status: 404 }
      );
    }

    const targetRole = user.roles.find(role => role.id === roleId);
    if (!targetRole) {
      console.log('Available role IDs:', user.roles.map(r => r.id));
      console.log('Requested role ID:', roleId);
      return NextResponse.json(
        { success: false, error: 'Role not available for this user' },
        { status: 403 }
      );
    }

    // Update user's active role
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        activeRoleId: roleId,
        lastRoleSwitch: new Date()
      },
      include: { 
        roles: {
          include: { permissions: true }
        }
      }
    });

    // Return updated role data
    const newActiveRole = updatedUser.roles.find(role => role.id === roleId);
    const responseData = {
      activeRole: newActiveRole ? {
        id: newActiveRole.id,
        name: newActiveRole.name,
        permissions: formatRolePermissions(newActiveRole.permissions),
        isActive: true
      } : null,
      availableRoles: updatedUser.roles.map(role => ({
        id: role.id,
        name: role.name,
        permissions: formatRolePermissions(role.permissions),
        isActive: role.id === roleId
      })),
      canSwitchRoles: updatedUser.roles.length > 1,
      lastRoleSwitch: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Failed to switch role:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Step 3: Update useMultiRole Hook for Better Error Handling

**File**: `packages/frontend/src/hooks/useMultiRole.ts`

**Update the switchRole function to handle authentication errors:**

```typescript
const switchRole = useCallback(async (
  roleId: string, 
  roleName: string, 
  currentContext?: { preferences?: Record<string, any>; workflowState?: Record<string, any> }
): Promise<boolean> => {
  const startTime = Date.now();
  setIsLoading(true);
  setError(null);

  try {
    console.log('Role switching debug:', {
      sessionUserId: session?.user?.id,
      sessionUserName: session?.user?.name,
      targetRole: { roleId, roleName }
    });
    
    // Unified API endpoint method for ALL users
    console.log('Using unified API endpoint method for role switching');
    
    const response = await fetch('/api/v1/session/role', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roleId }),
    });

    const result = await response.json();
    
    console.log('API role switch response:', result);

    if (result.success) {
      // Store rollback info
      if (roleContext?.activeRole) {
        rollbackInfoRef.current = {
          previousRoleId: roleContext.activeRole.id,
          timestamp: new Date().toISOString()
        };
      }

      // Update context with new role data
      const newContext = {
        activeRole: result.data.activeRole ? {
          id: result.data.activeRole.id,
          name: result.data.activeRole.name as 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN' | 'VERIFIER',
          permissions: result.data.activeRole.permissions || [],
          isActive: result.data.activeRole.isActive
        } : null,
        availableRoles: (result.data.availableRoles || []).map((role: any) => ({
          id: role.id,
          name: role.name as 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN' | 'VERIFIER',
          permissions: role.permissions || [],
          isActive: role.isActive
        })),
        permissions: result.data.activeRole?.permissions || [],
        sessionData: {
          preferences: currentContext?.preferences || {},
          workflowState: currentContext?.workflowState || {},
          offlineData: false
        },
        canSwitchRoles: result.data.availableRoles.length > 1,
        lastRoleSwitch: new Date().toISOString()
      };
      
      setRoleContext(newContext);
      setPerformanceMs(Date.now() - startTime);
      
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
          })),
          permissions: result.data.activeRole.permissions || []
        }
      });

      // Force page refresh to ensure all components re-render with new role
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
      
      return true;
    } else {
      console.error('API role switch failed:', result);
      
      // Better error messaging
      if (result.error?.includes('authentication layer')) {
        setError('Authentication system error - please sign out and sign in again');
      } else {
        setError(result.error || 'Failed to switch role');
      }
      return false;
    }
  } catch (err) {
    console.error('Role switch error:', err);
    setError('Network error while switching role');
    return false;
  } finally {
    setIsLoading(false);
  }
}, [update, roleContext, session]);
```

---

## Key Benefits of This Architecture

### ✅ **Proper Separation of Concerns**
- Authentication layer handles user/role synchronization
- API layer focuses on business logic only
- No complex patching or workarounds

### ✅ **Consistent Role ID Mapping**
- Role IDs created in `signIn` callback match frontend expectations
- No mismatch between `admin-role` vs `admin-role-superuser-user-id`

### ✅ **Database Synchronization**
- Users created during authentication, not during API calls
- Proper transaction handling prevents race conditions
- Session callbacks keep database and session state in sync

### ✅ **Elimination of Race Conditions**
- Single-threaded user creation during authentication
- No multiple simultaneous API calls creating users
- Proper database transactions

### ✅ **Better Error Handling**
- Clear error messages when authentication layer fails
- Proper fallbacks and recovery mechanisms
- Debugging information preserved

---

## Testing Instructions

### Test 1: Clean Database State
```bash
# Reset database to clean state
pnpm prisma migrate reset --force
pnmp prisma generate
```

### Test 2: Authentication and User Creation
1. Sign in with `superuser@test.com / superuser123`
2. **Expected Console Logs**:
   ```
   SignIn callback triggered: { userId: "superuser-user-id", email: "superuser@test.com" }
   Ensuring test user exists in database: superuser@test.com
   Creating test user in database: superuser@test.com
   ✅ Test user created in database: superuser@test.com
   ```

### Test 3: Role Switching Success
1. After authentication, attempt role switching
2. **Expected Console Logs**:
   ```
   PUT /api/v1/session/role - Route handler called
   Switching to role ID: coordinator-role
   Database user query result: User found
   API role switch response: { success: true, ... }
   ```

### Test 4: Verify All Test Users
1. Test each test user login and role switching
2. All should work consistently with the same code path
3. No "User not found" errors

---

## Success Criteria

✅ **Authentication layer creates users** during sign-in, not API calls  
✅ **Consistent role ID mapping** between auth and database  
✅ **No race conditions** from simultaneous user creation  
✅ **Clean API routes** focused on business logic only  
✅ **All test users work** with identical code paths  
✅ **Proper error handling** with clear diagnostic messages  
✅ **Database synchronization** through NextAuth session callbacks  

This architectural fix addresses the root cause rather than patching symptoms, providing a robust, maintainable solution for role switching.