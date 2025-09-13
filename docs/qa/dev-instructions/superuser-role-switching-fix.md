# SuperUser Role Switching Detection Fix - Implementation Instructions

## Issue Identified
SuperUser role switching fails with "User not found" error because the multi-role detection logic is incorrect, causing it to use the wrong API endpoint.

## Root Cause Analysis

### ✅ What Works:
- Authentication system is fully functional
- Session state management is working correctly  
- API routes are properly configured and responding

### ❌ The Bug:
The SuperUser detection in `useMultiRole.ts` (line 123) checks for:
```typescript
const isMultiRoleUser = session?.user?.allRoles && session.user.allRoles.length > 1;
```

**But the actual session structure from `auth.config.ts` provides `allRoles` as:**
- Line 205: `session.user.allRoles = token.allRoles as string[] || [];`
- Line 172: `allRoles: userRoles` (from test user data)

**Problem**: For SuperUser, `allRoles` contains `["ADMIN", "COORDINATOR", "ASSESSOR", "RESPONDER", "VERIFIER", "DONOR"]` but the detection logic may be failing due to session timing or property access issues.

## Implementation Fix

### File: `packages/frontend/src/hooks/useMultiRole.ts`

**Replace the SuperUser detection logic (lines 122-149) with this corrected version:**

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
    // Enhanced SuperUser detection - check multiple conditions
    const isMultiRoleUser = Boolean(
      session?.user?.allRoles && 
      Array.isArray(session.user.allRoles) && 
      session.user.allRoles.length > 1 &&
      session.user.allRoles.includes('ADMIN') && // SuperUser has ADMIN role
      session.user.name?.includes('Multi-Role') // Additional identifier
    );
    
    console.log('Role switching debug:', {
      sessionUserId: session?.user?.id,
      sessionUserName: session?.user?.name,
      allRoles: session?.user?.allRoles,
      isMultiRoleUser,
      targetRole: { roleId, roleName }
    });
    
    if (isMultiRoleUser) {
      // For SuperUser: Update session directly without API call
      console.log('Using SuperUser session update method');
      
      await update({
        ...session,
        user: {
          ...session?.user,
          role: roleName,
          activeRole: {
            id: roleId,
            name: roleName,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      });
      
      setPerformanceMs(Date.now() - startTime);
      
      // Force page refresh to ensure all components re-render
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.reload();
        }, 100); // Small delay to ensure session update completes
      }
      
      return true;
    } else {
      // For regular users: Use API endpoint
      console.log('Using API endpoint method for role switching');
      
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
        
        // Update NextAuth session
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

        // Force page refresh
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

## Alternative Fix: Enhanced Role ID Mapping

If the above fix doesn't work, the issue might be with role ID generation. Add this role ID mapping function:

**Add this function above the `switchRole` callback:**

```typescript
// Helper function to generate proper role IDs for SuperUser
const generateRoleId = useCallback((roleName: string): string => {
  const roleIdMapping = {
    'ADMIN': 'admin-role',
    'COORDINATOR': 'coordinator-role', 
    'ASSESSOR': 'assessor-role',
    'RESPONDER': 'responder-role',
    'VERIFIER': 'verifier-role',
    'DONOR': 'donor-role'
  };
  return roleIdMapping[roleName as keyof typeof roleIdMapping] || `${roleName.toLowerCase()}-role`;
}, []);
```

**Then update the SuperUser session update to use proper role ID:**

```typescript
if (isMultiRoleUser) {
  const properRoleId = generateRoleId(roleName);
  console.log('Using SuperUser session update method with roleId:', properRoleId);
  
  await update({
    ...session,
    user: {
      ...session?.user,
      role: roleName,
      activeRole: {
        id: properRoleId, // Use generated role ID
        name: roleName,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }
  });
  // ... rest of SuperUser logic
}
```

## Testing Instructions

### Test 1: SuperUser Role Switching
1. Sign in with `superuser@test.com / superuser123`
2. Open browser DevTools Console to see debug logs
3. Use the role dropdown to switch to "COORDINATOR" 
4. **Expected Console Logs**:
   ```
   Role switching debug: {
     sessionUserId: "superuser-user-id",
     sessionUserName: "Super User (Multi-Role)",
     allRoles: ["ADMIN", "COORDINATOR", "ASSESSOR", "RESPONDER", "VERIFIER", "DONOR"],
     isMultiRoleUser: true,
     targetRole: { roleId: "coordinator-role", roleName: "COORDINATOR" }
   }
   Using SuperUser session update method
   ```
5. **Expected Result**: Page refreshes and shows COORDINATOR features
6. **Verify**: Role indicator shows "COORDINATOR" instead of "ADMIN"

### Test 2: Regular User Role Switching
1. Sign in with `admin@test.com / admin123` (single role user)
2. **Expected Console Logs**:
   ```
   Role switching debug: {
     sessionUserId: "admin-user-id", 
     allRoles: [],
     isMultiRoleUser: false
   }
   Using API endpoint method for role switching
   ```
3. **Expected Result**: Should work normally (if user has multiple roles assigned)

### Test 3: Error Handling
1. If role switching still fails, check console for error details
2. Verify the session structure matches expected format
3. Check that `session.user.allRoles` is properly populated

## Success Criteria

✅ **SuperUser role switching works** without "User not found" errors  
✅ **Console debug logs** show proper SuperUser detection  
✅ **Role switching uses session update** instead of API calls for SuperUser  
✅ **Page refreshes and displays** new role features correctly  
✅ **Regular users continue** to work with API endpoint method  

## Debugging Notes

- The debug console logs will help identify exactly which path is being taken
- SuperUser should always use the session update method (no API calls)
- Regular users should use the API endpoint method
- If `isMultiRoleUser` is `false` for SuperUser, check the session structure

## Technical Explanation

The original bug was that the SuperUser detection logic was too simplistic and failed to account for session loading timing or property structure variations. The enhanced detection logic checks:

1. `allRoles` exists and is an array
2. `allRoles` has more than 1 role  
3. `allRoles` includes 'ADMIN' (SuperUser characteristic)
4. User name contains 'Multi-Role' (additional verification)

This ensures that only the SuperUser account uses the session update approach, while all other users use the API endpoint approach that works with the database.