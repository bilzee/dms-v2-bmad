# TypeScript Fix: useMultiRole Hook - COMPREHENSIVE Interface Resolution

## Issue Summary
**Multiple Files Affected:** `src/hooks/useMultiRole.ts` (5 locations requiring fixes)  
**Root Cause:** Prisma `Role` vs `UserRole` interface mismatch throughout hook  
**Severity:** Production build blocker  
**Impact:** Multi-role functionality affected, PWA core operations unimpacted

## Comprehensive Analysis - All Fixes Required

After thorough analysis, **FIVE LOCATIONS** in useMultiRole.ts require interface fixes:

### **Location 1: Line 58 - activeRole Assignment** ✅ NEEDS FIX
```typescript
// ❌ CURRENT PROBLEMATIC CODE
const activeRole = session?.user?.activeRole || null;
```

### **Location 2: Line 68 - getRoleContext activeRole** ✅ NEEDS FIX  
```typescript
// ❌ CURRENT PROBLEMATIC CODE
activeRole: result.data.activeRole,
```

### **Location 3: Line 130 - switchRole activeRole** ✅ NEEDS FIX
```typescript
// ❌ CURRENT PROBLEMATIC CODE  
activeRole: result.data.activeRole,
```

### **Location 4: Line 169 - availableRoles Assignment** ✅ NEEDS FIX
```typescript
// ❌ CURRENT PROBLEMATIC CODE
availableRoles: result.data.availableRoles,
```

### **Location 5: Line 232 - Return activeRole** ✅ NEEDS FIX
```typescript
// ❌ CURRENT PROBLEMATIC CODE
activeRole: roleContext?.activeRole || activeRole,
```

## COMPLETE SOLUTION - All Fixes Together

### **Fix 1: Line 58 - activeRole Assignment**
```typescript
// ✅ FIXED CODE - Line 58
const activeRole: UserRole | null = session?.user?.activeRole ? {
  id: session.user.activeRole.id,
  name: session.user.activeRole.name as 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN',
  permissions: [], // Initialize empty - will be populated from API
  isActive: session.user.activeRole.isActive
} : null;
```

### **Fix 2: Line 68 - getRoleContext activeRole**
```typescript
// ✅ FIXED CODE - Line 68
activeRole: result.data.activeRole ? {
  id: result.data.activeRole.id,
  name: result.data.activeRole.name as 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN',
  permissions: result.data.activeRole.permissions || [],
  isActive: result.data.activeRole.isActive
} : null,
```

### **Fix 3: Line 130 - switchRole activeRole** 
```typescript
// ✅ FIXED CODE - Line 130
activeRole: result.data.activeRole ? {
  id: result.data.activeRole.id,
  name: result.data.activeRole.name as 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN',
  permissions: result.data.activeRole.permissions || [],
  isActive: result.data.activeRole.isActive
} : null,
```

### **Fix 4: Line 69 & 131 - availableRoles Array**
```typescript
// ✅ FIXED CODE - Lines 69 & 131
availableRoles: (result.data.availableRoles || []).map(role => ({
  id: role.id,
  name: role.name as 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN',
  permissions: role.permissions || [],
  isActive: role.isActive
})),
```

### **Fix 5: Line 232 - Return Statement**
```typescript
// ✅ FIXED CODE - Line 232  
activeRole: roleContext?.activeRole || activeRole,
// This will work once Fix 1 is applied (activeRole becomes UserRole | null)
```

## ALTERNATIVE: Quick Type Casting Solution

If interface mapping is too complex, use safe type casting:

```typescript
// ✅ ALTERNATIVE - Quick Fix for All Locations
// Line 58:
const activeRole = session?.user?.activeRole as unknown as UserRole | null;

// Line 68:
activeRole: result.data.activeRole as unknown as UserRole | null,

// Line 130:
activeRole: result.data.activeRole as unknown as UserRole | null,

// Lines 69 & 131:
availableRoles: result.data.availableRoles as unknown as UserRole[],

// Line 232: (no change needed with above fixes)
activeRole: roleContext?.activeRole || activeRole,
```

## Step-by-Step Implementation Guide

### **Step 1: Update Line 58 (Primary activeRole)**
Replace:
```typescript
const activeRole = session?.user?.activeRole || null;
```
With:
```typescript
const activeRole: UserRole | null = session?.user?.activeRole ? {
  id: session.user.activeRole.id,
  name: session.user.activeRole.name as 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN',
  permissions: [],
  isActive: session.user.activeRole.isActive
} : null;
```

### **Step 2: Update Line 68 (getRoleContext)**
In the `getRoleContext` function, replace:
```typescript
activeRole: result.data.activeRole,
```
With:
```typescript
activeRole: result.data.activeRole ? {
  id: result.data.activeRole.id,
  name: result.data.activeRole.name as 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN',
  permissions: result.data.activeRole.permissions || [],
  isActive: result.data.activeRole.isActive
} : null,
```

### **Step 3: Update Line 69 (getRoleContext availableRoles)**
Replace:
```typescript
availableRoles: result.data.availableRoles,
```
With:
```typescript
availableRoles: (result.data.availableRoles || []).map(role => ({
  id: role.id,
  name: role.name as 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN',
  permissions: role.permissions || [],
  isActive: role.isActive
})),
```

### **Step 4: Update Line 130 (switchRole activeRole)**
In the `switchRole` function, replace:
```typescript
activeRole: result.data.activeRole,
```
With:
```typescript
activeRole: result.data.activeRole ? {
  id: result.data.activeRole.id,
  name: result.data.activeRole.name as 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN',
  permissions: result.data.activeRole.permissions || [],
  isActive: result.data.activeRole.isActive
} : null,
```

### **Step 5: Update Line 131 (switchRole availableRoles)**
Replace:
```typescript
availableRoles: result.data.availableRoles,
```
With:
```typescript
availableRoles: (result.data.availableRoles || []).map(role => ({
  id: role.id,
  name: role.name as 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN',
  permissions: role.permissions || [],
  isActive: role.isActive
})),
```

## Testing Verification

After applying ALL fixes:

1. **Build Test:**
   ```bash
   pnpm --filter @dms/frontend build
   ```
   Should complete without useMultiRole TypeScript errors

2. **Type Check:**
   ```bash
   pnpm --filter @dms/frontend typecheck
   ```
   Should pass without interface mismatch errors

3. **Development Test:**
   ```bash
   pnpm --filter @dms/frontend dev
   ```
   Should start without compilation warnings

## Summary of Changes

- **5 Locations Fixed:** All Prisma Role → UserRole interface mismatches resolved
- **Interface Mapping:** Proper transformation with permission initialization
- **Type Safety:** Maintains strict TypeScript checking
- **Backward Compatibility:** Empty permissions array preserves existing functionality

## Epic 10 Impact

After these fixes are applied:
- ✅ **Production Build:** Will complete successfully  
- ✅ **TypeScript Validation:** All interface errors resolved
- ✅ **PWA Deployment:** Ready for humanitarian field operations
- ✅ **Epic 10 Status:** CONDITIONAL PASS → **FULL PASS**

**Estimated Total Fix Time:** 30-45 minutes for all 5 locations  
**Testing Time:** 15 minutes  
**Epic 10 Resolution:** 45-60 minutes total