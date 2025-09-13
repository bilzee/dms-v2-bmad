# NEXT_REDIRECT and Session State Fixes - Technical Implementation Instructions

## Issues Identified Through Server Log Analysis

After comprehensive testing and web research of the authentication errors, three critical technical issues have been identified that prevent proper authentication functionality:

1. **NEXT_REDIRECT Error in Authentication Flow** - Server logs show consistent `NEXT_REDIRECT` errors
2. **Session State Loading Failure** - Session tokens created but client-side session not updating
3. **API Route 404 Errors** - `/api/v1/session/role` returns 404 despite correct file structure

## Root Cause Analysis

### Problem 1: NEXT_REDIRECT Error
**Server Error Pattern**:
```
Authentication error: Error: NEXT_REDIRECT
    at getRedirectError (webpack-internal:///(rsc)/../../node_modules/.pnpm/next@14.2.5.../dist/client/components/redirect.js:49:19)
    at redirect (webpack-internal:///(rsc)/../../node_modules/.pnpm/next@14.2.5.../dist/client/components/redirect.js:60:11)
    at $$ACTION_1 (webpack-internal:///(rsc)/./src/app/auth/signin/page.tsx:346:70)
```

**Root Cause**: Lines 73-81 in `packages/frontend/src/app/auth/signin/page.tsx` wrap the `redirect()` function in a try-catch block, which prevents Next.js from properly handling redirects in server actions.

**Technical Explanation**: NEXT_REDIRECT is not an actual error but Next.js's internal mechanism for handling redirects in server actions. Wrapping it in try-catch prevents proper redirect handling.

### Problem 2: Session State Not Loading
**Symptom**: Authentication succeeds, session tokens are created, but client-side session state doesn't update without manual refresh.

**Root Cause**: Lines 33-43 in `packages/frontend/src/app/page.tsx` use `window.location.reload()` instead of NextAuth's proper session update mechanism.

### Problem 3: API Route 404 Errors  
**Server Error Pattern**:
```
GET /api/v1/session/role 404 in 663ms
prisma:query SELECT "public"."users"... (queries succeed but route returns 404)
```

**Root Cause**: Despite correct Next.js 14 App Router file structure, route compilation or import resolution issues prevent proper routing.

## Implementation Instructions

### Fix 1: Resolve NEXT_REDIRECT Error

**File**: `packages/frontend/src/app/auth/signin/page.tsx`

**Current Problematic Code** (lines 57-82):
```typescript
form
  action={async (formData) => {
    "use server";
    try {
      const result = await signIn("credentials", {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        redirectTo: searchParams.callbackUrl || '/',
        redirect: false, // Prevent automatic redirect to handle errors
      });
      
      // Handle authentication result
      if (result?.error) {
        // Redirect back to sign-in with error parameter
        redirect(`/auth/signin?error=${encodeURIComponent(result.error)}&email=${encodeURIComponent(formData.get("email") as string)}`);
      } else {
        // Success - redirect to intended destination with session refresh
        const redirectUrl = searchParams.callbackUrl || '/';
        redirect(`${redirectUrl}?authSuccess=true`); // THIS CAUSES NEXT_REDIRECT ERROR
      }
    } catch (error) {
      console.error('Authentication error:', error);
      // Redirect back to sign-in with generic error
      redirect(`/auth/signin?error=${encodeURIComponent('Authentication failed. Please try again.')}`);
    }
  }}
```

**Replace with this corrected implementation**:
```typescript
form
  action={async (formData) => {
    "use server";
    try {
      const result = await signIn("credentials", {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        redirectTo: searchParams.callbackUrl || '/',
        redirect: false,
      });
      
      // Handle authentication errors
      if (result?.error) {
        redirect(`/auth/signin?error=${encodeURIComponent(result.error)}&email=${encodeURIComponent(formData.get("email") as string)}`);
        return; // Exit early for error cases
      }
    } catch (error) {
      // Handle NEXT_REDIRECT specifically - DON'T CATCH IT
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        throw error; // Re-throw to let Next.js handle the redirect
      }
      
      // Only catch actual authentication errors
      redirect(`/auth/signin?error=${encodeURIComponent('Authentication failed. Please try again.')}`);
      return;
    }
    
    // Success case - redirect WITHOUT try-catch wrapper
    const redirectUrl = searchParams.callbackUrl || '/';
    redirect(`${redirectUrl}?authSuccess=true`);
  }}
```

**Key Changes**:
1. Move successful redirect OUTSIDE of try-catch block
2. Properly handle NEXT_REDIRECT by re-throwing it
3. Add early returns to prevent execution flow issues

### Fix 2: Proper Session State Update

**File**: `packages/frontend/src/app/page.tsx`

**Current Problematic Code** (around lines 33-43):
```typescript
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('authSuccess') === 'true') {
    // Remove the authSuccess parameter from URL
    const newUrl = window.location.pathname;
    window.history.replaceState({}, '', newUrl);
    
    // Force page reload for session refresh
    window.location.reload(); // THIS DOESN'T WORK PROPERLY
  }
}, [session]);
```

**Replace with NextAuth proper session update**:

1. **Update imports** at the top of the file:
```typescript
import { useSession } from 'next-auth/react' // Make sure this import exists
```

2. **Update component hook usage**:
```typescript
// Replace: const { data: session } = useSession();
// With:
const { data: session, status, update } = useSession();
```

3. **Replace the problematic useEffect**:
```typescript
// Handle post-authentication session refresh
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('authSuccess') === 'true') {
    // Clean URL first
    const newUrl = window.location.pathname;
    window.history.replaceState({}, '', newUrl);
    
    // Force session update instead of page reload
    if (status !== 'loading') {
      update().then(() => {
        console.log('Session updated after authentication');
      }).catch((error) => {
        console.error('Session update failed:', error);
      });
    }
  }
}, [status, update]); // Remove session from dependencies to avoid infinite loops
```

**Key Changes**:
1. Use NextAuth's `update()` method instead of page reload
2. Wait for session to finish loading before updating
3. Remove session from dependency array to prevent infinite loops

### Fix 3: API Route Debugging and Cache Clear

**Step 1**: Clear Next.js compilation cache
```bash
cd packages/frontend
rm -rf .next
```

**Step 2**: Add debugging to API route

**File**: `packages/frontend/src/app/api/v1/session/role/route.ts`

**Add at the very top of the file** (after imports):
```typescript
// Force this route to be dynamic (already present)
export const dynamic = 'force-dynamic';

// Add route loading confirmation
console.log('API route registered: /api/v1/session/role');
```

**Add debugging to GET function** (line 14):
```typescript
export async function GET(request: NextRequest) {
  console.log('GET /api/v1/session/role - Route handler called');
  
  try {
    console.log('Attempting to get session...');
    const session = await auth();
    console.log('Session result:', session ? 'Found' : 'Not found');
    
    // ... rest of existing function
  } catch (error) {
    console.error('API route error details:', error);
    // ... existing error handling
  }
}
```

**Step 3**: Verify import paths are resolving
Check that these imports work correctly:
- `import { auth } from '@/auth';`
- `import prisma from '@/lib/prisma';`
- `import { formatRolePermissions } from '@/lib/type-helpers';`

If any imports fail, the route won't compile properly.

## Testing Instructions

### Test 1: NEXT_REDIRECT Error Resolution
1. Start fresh dev server: `pnpm dev`
2. Navigate to `/auth/signin`
3. Sign in with `superuser@test.com / superuser123`
4. **Expected**: No NEXT_REDIRECT error in server console
5. **Expected**: Redirect to `/?authSuccess=true` occurs smoothly

### Test 2: Session State Update
1. After successful sign-in from Test 1
2. **Expected**: Page shows personalized greeting immediately (no manual refresh)
3. **Expected**: Role-specific features appear automatically
4. Check browser console for "Session updated after authentication" message

### Test 3: API Route 404 Resolution
1. Sign in as any user
2. Check server console for "API route registered: /api/v1/session/role"
3. Check server console for "GET /api/v1/session/role - Route handler called"
4. **Expected**: No more `GET /api/v1/session/role 404` errors
5. **Expected**: SuperUser role switching works

### Test 4: Multi-Role User Testing
1. Sign in as `superuser@test.com / superuser123`
2. **Expected**: See "Super User (Multi-Role)" in greeting
3. Use role dropdown to switch to COORDINATOR
4. **Expected**: Page updates with COORDINATOR features
5. **Expected**: No API 404 errors during role switching

## Success Criteria

✅ **No NEXT_REDIRECT errors** in server console during authentication  
✅ **No manual refresh required** after sign-in  
✅ **Session state loads immediately** with personalized greeting  
✅ **API endpoint returns 200** instead of 404  
✅ **Role switching functional** for SuperUser accounts  
✅ **All user roles accessible** without authentication barriers  

## Rollback Plan

If issues occur:
1. Revert `packages/frontend/src/app/auth/signin/page.tsx` to original try-catch structure
2. Revert `packages/frontend/src/app/page.tsx` to original useEffect with reload
3. Remove debugging console.log statements from API route
4. Clear `.next` cache and restart dev server

## Technical Notes

- **NEXT_REDIRECT Pattern**: This is the correct way to handle redirects in Next.js 14 server actions
- **NextAuth Session Update**: Using `update()` is the recommended pattern for session synchronization
- **API Route Debugging**: Console logs will help identify if the route is compiling and executing properly

These fixes address the core technical issues preventing authentication functionality across all user roles.