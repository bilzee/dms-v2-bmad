# Unified Role Switching Fix - Revert Complex Detection Logic

## Problem Statement

The SuperUser session update detection approach failed because:
1. Session detection logic is unreliable due to timing and structure issues
2. Creates unnecessary code complexity with dual paths
3. Still results in API 404 errors when detection fails
4. Makes debugging more difficult with multiple code paths

## Solution: Use Unified API Approach for All Users

**Revert the complex SuperUser detection logic and use the same API endpoint method for all users, then fix the underlying database/session ID mismatch issue.**

## Implementation Instructions

### Step 1: Revert useMultiRole.ts to Simple API-Only Approach

**File**: `packages/frontend/src/hooks/useMultiRole.ts`

**Replace the entire `switchRole` callback (lines 125-281) with this simplified version:**

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
    
    // Single unified approach: Use API endpoint for ALL users
    console.log('Using unified API endpoint method for role switching');
    
    const response = await fetch('/api/v1/session/role', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        roleId
      }),
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
      setError(result.error || 'Failed to switch role');
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

### Step 2: Remove Helper Function

**Remove the `generateRoleId` helper function (lines 112-123) entirely** since it's no longer needed.

### Step 3: Fix the Root Cause - Database Session ID Mismatch

The real issue is that the session user ID doesn't match the database user ID. Let's add debugging to identify the mismatch:

**File**: `packages/frontend/src/app/api/v1/session/role/route.ts`

**Add enhanced debugging after line 22:**

```typescript
export async function GET(request: NextRequest) {
  console.log('GET /api/v1/session/role - Route handler called');
  
  try {
    console.log('Attempting to get session...');
    const session = await auth();
    console.log('Session result:', session ? 'Found' : 'Not found');
    console.log('Session details:', {
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userName: session?.user?.name
    });
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Querying database for user ID:', session.user.id);

    // Get user with roles from database by ID
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        roles: {
          include: {
            permissions: true
          }
        }
      },
    });

    console.log('Database user query result:', user ? 'User found' : 'User NOT found');
    console.log('Database user details:', user ? {
      id: user.id,
      email: user.email,
      name: user.name,
      rolesCount: user.roles?.length || 0
    } : 'No user data');

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // ... rest of function
  }
}
```

**Add the same debugging to the PUT method (lines 83-94)**.

### Step 4: Create Mock Database Users

The issue is likely that the test users from `auth.config.ts` don't exist in the database. We need to create them:

**Option A: Add database seeding for test users**

Create a simple script to add test users to database:

```typescript
// Create file: packages/frontend/src/scripts/seedTestUsers.ts
import prisma from '@/lib/prisma';

const testUsers = [
  {
    id: "superuser-user-id",
    name: "Super User (Multi-Role)", 
    email: "superuser@test.com",
    roles: ["ADMIN", "COORDINATOR", "ASSESSOR", "RESPONDER", "VERIFIER", "DONOR"]
  },
  // ... other test users
];

async function seedTestUsers() {
  for (const testUser of testUsers) {
    await prisma.user.upsert({
      where: { email: testUser.email },
      create: {
        id: testUser.id,
        name: testUser.name,
        email: testUser.email,
        // Create roles and relationships
      },
      update: {}
    });
  }
}

seedTestUsers().catch(console.error);
```

**Option B: Modify API to handle test users dynamically**

Or modify the API route to detect test users and create them dynamically if they don't exist.

## Testing Instructions

### Test 1: Verify Unified Approach
1. Sign in as `superuser@test.com / superuser123`
2. Check console logs for:
   ```
   Role switching debug: { sessionUserId: "superuser-user-id", ... }
   Using unified API endpoint method for role switching
   ```
3. Attempt role switching
4. Check console for database debugging info

### Test 2: Database ID Matching
1. Check console logs for session ID vs database ID
2. Verify they match exactly
3. If they don't match, that's the root cause

### Test 3: All Users Work the Same
1. Test with regular users (admin@test.com, etc.)
2. Verify same code path is used
3. Should all work consistently

## Expected Outcome

✅ **Single unified code path** for all users  
✅ **Detailed debugging logs** to identify session/database ID mismatch  
✅ **Same behavior** for SuperUser and regular users  
✅ **Either all users work or all fail consistently** - making debugging easier  
✅ **Root cause identification** of database vs session ID mismatch  

## Benefits

1. **Simplified codebase** - no complex detection logic
2. **Easier debugging** - single code path to troubleshoot  
3. **Consistent behavior** - all users work the same way
4. **Root cause focus** - fixes the actual database issue instead of working around it

Once this is implemented, if role switching still fails, we'll know the exact cause is the session/database ID mismatch, and we can fix that specific issue for ALL users at once.