# CRITICAL FIX: Prisma Edge Runtime Incompatibility

## 🚨 CRITICAL ISSUE IDENTIFIED

**Current Status**: Authentication system is completely broken due to Prisma queries in session callback.

**Server Error**: 
```
JWTSessionError: PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in ``).
```

**Root Cause**: The implemented solution added database queries in the `session` callback, which runs in **Edge Runtime/Middleware context** where Prisma Client cannot execute.

## Immediate Fix Required

### Step 1: Remove Database Queries from Session Callback

**File**: `packages/frontend/src/auth.config.ts`

**Replace the session callback (lines 213-260) with this safe version:**

```typescript
async session({ session, token }) {
  // Ensure consistent session structure for all roles
  if (token && session.user) {
    session.user.id = token.id as string;
    
    // CRITICAL: NO DATABASE QUERIES IN SESSION CALLBACK 
    // (Edge Runtime incompatible with Prisma Client)
    
    // Use token data only - database sync happens elsewhere
    session.user.roles = token.roles as any[] || [];
    session.user.activeRole = token.activeRole as any;
    session.user.role = (token.activeRole as any)?.name || token.role || 'ASSESSOR';
    session.user.permissions = token.permissions as any[] || [];
    session.user.allRoles = token.allRoles as string[] || [];
  }
  return session;
},
```

### Step 2: Move Database Sync to API Route Level

**The proper pattern for NextAuth + Prisma is:**

1. **Session callback**: Use only token data (Edge Runtime safe)
2. **API routes**: Handle database queries and updates  
3. **Role switching**: API routes update both database AND token

### Step 3: Enhanced Token Management in JWT Callback

**Update the JWT callback to better persist role information:**

```typescript
jwt({ token, user, trigger, session }) {
  // Handle session updates for role switching
  if (trigger === "update" && session?.user) {
    // When role switching, merge the new role data into token
    if (session.user.activeRole) {
      token.activeRole = session.user.activeRole;
      token.role = session.user.activeRole.name;
    }
    if (session.user.roles) {
      token.roles = session.user.roles;
    }
    if (session.user.permissions) {
      token.permissions = session.user.permissions;
    }
    if (session.user.allRoles) {
      token.allRoles = session.user.allRoles;
    }
    return token;
  }
  
  // Persist role information in JWT for new logins
  if (user) {
    token.id = user.id;
    token.roles = (user as any).roles || [];
    token.activeRole = (user as any).activeRole || null;
    token.permissions = (user as any).permissions || [];
    token.allRoles = (user as any).allRoles || [];
  }
  return token;
},
```

### Step 4: Update Role Switching Hook

**File**: `packages/frontend/src/hooks/useMultiRole.ts`

**Update the session update call in switchRole function (after line 203):**

```typescript
// Update NextAuth session with complete role information
await update({
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
    permissions: result.data.activeRole.permissions || [],
    allRoles: result.data.availableRoles.map((r: any) => r.name)
  }
});
```

## Why This Happens

1. **NextAuth v5** runs session callbacks in Edge Runtime for performance
2. **Prisma Client** cannot execute in browser/Edge environments  
3. **Database queries** must happen in API routes (Node.js runtime)
4. **Session callbacks** should only use token data (serializable, Edge-safe)

## Testing After Fix

1. **Clear Next.js cache**: `rm -rf packages/frontend/.next`
2. **Restart dev server**: `pnpm dev`  
3. **Check logs**: No more JWTSessionError messages
4. **Test login**: Should work without authentication errors
5. **Test role switching**: Should work through API routes

## Expected Flow After Fix

1. **Login**: `signIn` callback creates user in database, returns user data
2. **JWT callback**: Persists user data in token (Edge Runtime safe)
3. **Session callback**: Uses only token data (no database queries)
4. **Role switching**: API route updates database, then updates token via `update()`
5. **Session refresh**: Session callback uses updated token data

This follows NextAuth's recommended architecture for database + JWT sessions in production environments.

## Verification

After implementing this fix:

✅ **No JWTSessionError messages** in server logs  
✅ **Authentication works** without middleware crashes  
✅ **Role switching works** through API route + token update pattern  
✅ **Database sync happens** in proper Node.js runtime context  
✅ **Session state** remains consistent across page refreshes  

This fix addresses the fundamental Edge Runtime incompatibility that was breaking the entire authentication system.