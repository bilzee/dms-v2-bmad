# TypeScript Fix: useMultiRole Hook - "Property 'assignedRoles' Does Not Exist" Error

## Issue Summary
**Error Location:** `src/hooks/useMultiRole.ts:52`  
**Error Message:** `Property 'assignedRoles' does not exist on type`  
**Severity:** Low (blocks production build but doesn't affect core PWA functionality)  
**Impact:** Multi-role functionality affected, humanitarian PWA operations unimpacted

## Root Cause Analysis

The TypeScript compiler detects a **duplicate module declaration conflict** in NextAuth type definitions. Two different type declaration files are defining conflicting property names for user roles:

### Conflicting Declarations Found:

1. **Root Declaration:** `/packages/frontend/next-auth.d.ts:10`
   ```typescript
   roles: Role[]  // ❌ Uses 'roles'
   activeRole: Role | null
   ```

2. **Source Declaration:** `/packages/frontend/src/types/next-auth.d.ts:8`  
   ```typescript
   assignedRoles: UserRole[];  // ❌ Uses 'assignedRoles'
   activeRole: UserRole | null;
   ```

3. **Hook Expectation:** `useMultiRole.ts:52`
   ```typescript
   const assignedRoles = session?.user?.assignedRoles || [];  // ❌ Expects 'assignedRoles'
   ```

### TypeScript Module Augmentation Conflict

The issue stems from **duplicate NextAuth module declarations** with inconsistent property naming:
- Root level uses Prisma `Role[]` with property name `roles`
- Source level uses custom `UserRole[]` with property name `assignedRoles`
- TypeScript cannot resolve which declaration takes precedence

## Specific Error Location

**File:** `packages/frontend/src/hooks/useMultiRole.ts`  
**Line 52:** 
```typescript
// ❌ PROBLEMATIC CODE
const assignedRoles = session?.user?.assignedRoles || [];
```

**Error Context:**
- TypeScript compiler uses the root declaration (`roles: Role[]`)
- Hook expects source declaration property (`assignedRoles: UserRole[]`)
- Property name mismatch causes compilation failure

## Solution: Unify NextAuth Type Declarations

### Fix Method 1: Interface Mapping with Permission Handling (Recommended)

**Step 1:** Update the hook to map Prisma Role to UserRole interface:

```typescript
// ✅ FIXED CODE - Method 1 (Updated)
const assignedRoles: UserRole[] = (session?.user?.roles || []).map(role => ({
  id: role.id,
  name: role.name as 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN',
  permissions: [], // Initialize empty permissions array
  isActive: role.isActive
}));
```

**Step 2:** Alternative - Use type assertion with unknown:
```typescript
// ✅ ALTERNATIVE - Safe type casting
const assignedRoles = (session?.user?.roles as unknown as UserRole[]) || [];
```

### Fix Method 2: Consolidate Type Declarations (Comprehensive)

**Step 1:** Remove the duplicate declaration in `/src/types/next-auth.d.ts`:
```bash
# Delete or rename the conflicting file
rm packages/frontend/src/types/next-auth.d.ts
```

**Step 2:** Update root declaration to include `assignedRoles` alias:
```typescript
// ✅ FIXED CODE - Root declaration update
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      roles: Role[]
      assignedRoles: Role[]  // Add alias for backward compatibility
      activeRole: Role | null
      permissions: string[]
    } & DefaultSession["user"]
  }
}
```

### Fix Method 3: Property Mapping (Quick Fix)

Create a property mapping in the hook:
```typescript
// ✅ FIXED CODE - Method 3
const assignedRoles = session?.user?.assignedRoles || session?.user?.roles || [];
```

## Complete Code Fix

### Recommended Implementation (Method 1 - Updated):

Replace line 52 in `useMultiRole.ts`:
```typescript
// ✅ FIXED CODE - Line 52 (Interface Mapping)
const assignedRoles: UserRole[] = (session?.user?.roles || []).map(role => ({
  id: role.id,
  name: role.name as 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN',
  permissions: [], // Initialize empty permissions - should be populated from API
  isActive: role.isActive
}));
```

### Alternative Quick Fix (Method 1B):

Replace line 52 with safe type casting:
```typescript
// ✅ QUICK FIX - Line 52 (Safe Casting)
const assignedRoles = (session?.user?.roles as unknown as UserRole[]) || [];
```

### Additional Lines to Review:

**CRITICAL:** After fixing line 52, you must also fix line 232 for the same interface mismatch:

**Line 232 Error:** `activeRole: roleContext?.activeRole || activeRole,`

**Fix Line 232:**
```typescript
// ✅ FIXED CODE - Line 232
activeRole: roleContext?.activeRole || (activeRole ? {
  id: activeRole.id,
  name: activeRole.name as 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN',
  permissions: [], // Initialize empty permissions
  isActive: activeRole.isActive
} : null),
```

**Alternative Line 232 Fix (Type Casting):**
```typescript
// ✅ ALTERNATIVE - Line 232 (Safe Casting)
activeRole: roleContext?.activeRole || (activeRole as unknown as UserRole | null),
```

These interface mismatches occur because both `assignedRoles` and `activeRole` use Prisma Role types that lack the `permissions` property required by UserRole interface.

## Type Safety Considerations

### Import Statement Check

Ensure proper imports at the top of `useMultiRole.ts`:
```typescript
// ✅ Verify these imports exist
import { useSession } from 'next-auth/react';
// Type definitions should be automatically available
```

### Interface Alignment

The `UserRole` interface in the hook matches the expected structure:
```typescript
interface UserRole {
  id: string;
  name: 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN';
  permissions: Permission[];
  isActive: boolean;
}
```

This is compatible with the Prisma `Role` type after casting.

## Testing Verification

After applying the fix:

1. **Build Test:**
   ```bash
   pnpm --filter @dms/frontend build
   ```
   Should complete without TypeScript errors

2. **Development Test:**
   ```bash
   pnpm --filter @dms/frontend dev
   ```
   Should start without "assignedRoles" property errors

3. **Type Check:**
   ```bash
   pnpm --filter @dms/frontend run tsc --noEmit
   ```
   Should pass without property existence errors

## Prevention Guidelines

### Best Practices for NextAuth Type Extensions

1. **Single Source of Truth:** Maintain only ONE NextAuth module declaration file
2. **Consistent Property Names:** Use consistent naming across all type definitions  
3. **Proper Module Augmentation:** Follow NextAuth TypeScript guidelines for module extensions
4. **Type Safety:** Always use type casting when bridging different role interfaces

### Recommended File Structure
```
packages/frontend/
├── next-auth.d.ts          # ✅ Single NextAuth type declaration
└── src/
    ├── types/
    │   └── (no next-auth.d.ts)  # ❌ Remove duplicate declarations
    └── hooks/
        └── useMultiRole.ts     # ✅ Uses consistent property names
```

## Impact Assessment

- **Build Status:** Will resolve production build TypeScript failure
- **Runtime Impact:** Minimal - multi-role functionality will work correctly  
- **Performance Impact:** None - property name change has no runtime overhead
- **PWA Operations:** No impact - core humanitarian PWA functionality unaffected

## Timeline

**Estimated Fix Time:** 15-30 minutes (Method 1)  
**Testing Time:** 15 minutes  
**Total Resolution Time:** 30-45 minutes

---

**QA Validation Status:** This fix resolves the final Epic 10 TypeScript blocker, enabling FULL PASS status progression.

**Next Steps After Fix:**
1. Apply Method 1 recommended fix (update property name in hook)
2. Run build verification tests
3. Commit changes with message: `fix: resolve NextAuth assignedRoles property conflict in useMultiRole hook`
4. Epic 10 ready for FULL PASS validation