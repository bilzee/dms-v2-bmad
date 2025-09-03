# Dev Instructions: Story 8.3 Critical Path Fix

**QA Agent**: Quinn (Test Architect)  
**Date**: 2025-09-03  
**Priority**: CRITICAL - Single path mismatch preventing navigation functionality  
**Issue Type**: URL path correction required

## OUTSTANDING WORK BY DEV AGENT ✅

The dev agent has successfully implemented **95% of the required fixes**:

### ✅ CONFIRMED COMPLETED:
1. **Navigation Integration**: Achievement & Leaderboard items added to DONOR role sidebar
2. **Verification Workflow**: VerificationStamp component integrated in monitoring response pages  
3. **Component Fixes**: All achievement components have `"use client"` directives
4. **E2E Test Updates**: Navigation tests added to verify complete user workflows
5. **Missing Pages**: Leaderboard page created and properly structured

## 🚨 FINAL CRITICAL ISSUE

**ONE PATH MISMATCH DISCOVERED**:

**Problem**: Navigation URLs don't match actual page locations
- **Navigation Points To**: `/donor/achievements` & `/donor/leaderboard`
- **Actual Page Locations**: `/dashboard/donor/achievements` & `/dashboard/donor/leaderboard`

**Impact**: Sidebar navigation results in 404 errors despite successful integration

## SIMPLE FIX REQUIRED (5 minutes)

**File to Modify**: `packages/frontend/src/hooks/useRoleNavigation.ts`

**Lines 334 & 341**: Update href paths to include `/dashboard` prefix:

### Before:
```typescript
{
  icon: 'Award', 
  label: 'Achievements', 
  href: '/donor/achievements',        // ❌ WRONG PATH
  badge: 0,
  requiredPermissions: ['donations:track']
},
{
  icon: 'Trophy', 
  label: 'Leaderboard', 
  href: '/donor/leaderboard',         // ❌ WRONG PATH
  badge: 0,
  requiredPermissions: ['donations:track']
}
```

### After:
```typescript
{
  icon: 'Award', 
  label: 'Achievements', 
  href: '/dashboard/donor/achievements',   // ✅ CORRECT PATH
  badge: 0,
  requiredPermissions: ['donations:track']
},
{
  icon: 'Trophy', 
  label: 'Leaderboard', 
  href: '/dashboard/donor/leaderboard',    // ✅ CORRECT PATH
  badge: 0,
  requiredPermissions: ['donations:track']
}
```

## VERIFICATION STEPS:

After this simple fix:
1. Start dev server: `pnpm --filter @dms/frontend dev`
2. Navigate to `/dashboard/donor` (or login as DONOR role)
3. Click "Achievements" in sidebar → Should navigate to achievement page
4. Click "Leaderboard" in sidebar → Should navigate to leaderboard page
5. Run e2e tests: `pnpm --filter @dms/frontend test:e2e story-8.3-verification-based-achievement-system.e2e.test.ts`

## EXPECTED RESULTS AFTER FIX:

- ✅ All navigation links work correctly
- ✅ E2E tests pass completely  
- ✅ Complete user workflow functional from sidebar → achievement pages
- ✅ Story 8.3 fully integrated and production-ready

## TIME TO COMPLETION: 5 MINUTES

This is the final missing piece - all other integration work has been completed successfully by the dev agent.