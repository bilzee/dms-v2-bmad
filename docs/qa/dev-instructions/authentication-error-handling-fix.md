# Authentication Error Handling Fix - URGENT

## Problem
Server crashes with "Unhandled Runtime Error" when wrong password is entered during sign-in. This prevents proper testing and creates poor user experience.

## Root Cause
The NextAuth `signIn` function in the credentials form throws unhandled exceptions when authentication fails, causing the dev server to crash.

## Fix Implementation

### Step 1: Update Sign-In Page Error Handling

**File**: `packages/frontend/src/app/auth/signin/page.tsx`

**Replace the credentials form action (lines 51-60) with:**

```typescript
<form
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
        // Success - redirect to intended destination
        redirect(searchParams.callbackUrl || '/');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      // Redirect back to sign-in with generic error
      redirect(`/auth/signin?error=${encodeURIComponent('Authentication failed. Please try again.')}`);
    }
  }}
  className="mt-8 space-y-6"
>
```

### Step 2: Add Required Import

**Add to the imports at the top of the file:**

```typescript
import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";
```

### Step 3: Enhanced Error Display

**Update the error display section (around line 28) to show more user-friendly messages:**

```typescript
{searchParams.error && (
  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
    <p className="font-medium">Sign In Failed</p>
    <p className="text-sm mt-1">
      {searchParams.error === 'CredentialsSignin' 
        ? 'Invalid email or password. Please check your credentials and try again.'
        : searchParams.error
      }
    </p>
  </div>
)}
```

### Step 4: Preserve Email Input on Error

**Update the email input field to preserve the email on error:**

```typescript
<input
  id="email"
  name="email"
  type="email"
  required
  defaultValue={searchParams.email || ''} // Preserve email on error
  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
  placeholder="Email address"
/>
```

### Step 5: Update Page Props Type

**Update the page component props to include email parameter:**

```typescript
export default async function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string; email?: string };
}) {
```

## Alternative Fix (Simpler Approach)

If the above approach causes issues, use this simpler client-side error handling:

### Convert to Client Component

**Replace the entire form with client-side handling:**

```typescript
'use client'

import { signIn, getSession } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignInForm({ callbackUrl }: { callbackUrl?: string }) {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password. Please check your credentials and try again.')
      } else {
        // Success - redirect
        router.push(callbackUrl || '/')
      }
    } catch (error) {
      setError('Authentication failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-medium">Sign In Failed</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}
      
      {/* Rest of form fields remain the same */}
      
      <button
        type="submit"
        disabled={isLoading}
        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Signing In...' : 'Sign in with Credentials'}
      </button>
    </form>
  )
}
```

## Testing Instructions

After implementing the fix:

1. **Test Invalid Credentials:**
   - Go to http://localhost:3000/auth/signin
   - Enter wrong email/password combination
   - **Expected**: Should show error message, NOT crash server
   - **Verify**: Server remains running, user can try again

2. **Test Valid Credentials:**
   - Enter correct credentials (e.g., admin@test.com / admin123)
   - **Expected**: Should redirect to home page successfully

3. **Test Empty Fields:**
   - Submit form with empty email/password
   - **Expected**: Browser validation should prevent submission

4. **Test Network Issues:**
   - Temporarily kill dev server, try to sign in
   - **Expected**: Should show network error, not crash

## Priority Level: CRITICAL

This fix must be implemented immediately as:
- Server crashes prevent any authentication testing
- Poor user experience for wrong password scenarios  
- Blocks validation of all other authentication fixes

## Implementation Time: 15 minutes

Choose either the server-side approach (more complex but better UX) or client-side approach (simpler, faster to implement) based on team preference.

## Verification Command

After fix implementation:
```bash
# Start dev server
pnpm run dev

# Test in browser:
# 1. Navigate to http://localhost:3000/auth/signin
# 2. Enter wrong credentials multiple times
# 3. Verify server doesn't crash and shows proper error messages
```