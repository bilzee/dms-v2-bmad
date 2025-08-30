# Story 5.2 Critical Fixes - Dev Instructions

## Overview
Story 5.2 (Donor Coordination & Resource Planning) has been implemented with excellent UI/UX components but has critical backend integration issues preventing functionality. The implementation is **95% complete** from a frontend perspective but **completely non-functional** due to API failures.

## Critical Issues Found

### 1. Missing Type Export - `CommitmentStatus`
**Error**: `CommitmentStatus` is not exported from `@dms/shared`
**Location**: `/api/v1/coordinator/resources/available/route.ts:23`
**Impact**: API route compilation failure

**Fix Required**:
1. Check `/packages/shared/types/entities.ts` for `CommitmentStatus` enum
2. If missing, add the enum based on usage in the API route:
   ```typescript
   export enum CommitmentStatus {
     PLANNED = 'PLANNED',
     IN_PROGRESS = 'IN_PROGRESS', 
     DELIVERED = 'DELIVERED',
     CANCELLED = 'CANCELLED'
   }
   ```
3. Ensure it's exported in the main shared types index file

### 2. Circular JSON Reference in Donor API
**Error**: `Converting circular structure to JSON --> starting at object with constructor 'Object' | property 'commitments' -> object with constructor 'Array' | index 0 -> object with constructor 'Object' --- property 'donor' closes the circle`
**Location**: `/api/v1/donors/route.ts:230` (JSON.stringify call)
**Impact**: 500 errors on donor data fetching

**Root Cause**: Mock data structure includes circular references:
```typescript
// PROBLEMATIC: Donor contains commitments, commitments contain donor reference
mockDonors.forEach(donor => {
  donor.commitments = mockCommitments.filter(c => c.donorId === donor.id);
  // Each commitment already has: { donor: Donor } - creates circular reference
});
```

**Fix Required** (Choose ONE approach):

#### Option A: Remove Circular References (Recommended)
Remove the circular `donor` property from commitment objects before serialization:
```typescript
// In /api/v1/donors/route.ts around line 126-128
mockDonors.forEach(donor => {
  donor.commitments = mockCommitments
    .filter(c => c.donorId === donor.id)
    .map(commitment => {
      // Remove circular reference - exclude donor property
      const { donor: _, ...commitmentWithoutDonor } = commitment;
      return commitmentWithoutDonor;
    });
});
```

#### Option B: Use Custom JSON Serialization
Install and use a library that handles circular references:
```bash
npm install flatted
```

Then in the API route:
```typescript
import { stringify } from 'flatted';

// Replace NextResponse.json(response) with:
return new NextResponse(stringify(response), {
  status: 200,
  headers: { 'Content-Type': 'application/json' }
});
```

### 3. React Hydration Mismatch
**Error**: Multiple "Text content did not match server-rendered HTML" warnings
**Location**: Client-side hydration errors
**Impact**: React development warnings and potential UI inconsistencies

**Fix Required**:
1. Check for any timestamp or date formatting differences between server/client
2. Ensure all mock data uses consistent date formats
3. Review any conditional rendering that might differ between server and client

**Common Solutions**:
- Use `suppressHydrationWarning={true}` on timestamp displays
- Format dates consistently in both server and client contexts
- Consider using `useEffect` for client-only dynamic content

## Implementation Verification

### Files Successfully Implemented ✅
- **Dashboard Page**: `/coordinator/donors/page.tsx` - Complete with tabs, real-time refresh
- **Components**: All 4 required components exist and are well-implemented
  - `DonorList.tsx` - Full filtering/sorting functionality
  - `ResourceAvailabilityGrid.tsx` - Complete resource management
  - `CoordinationWorkspace.tsx` - Full workspace with conflict resolution
  - `DonorPerformanceChart.tsx` - Performance visualization
- **Custom Hook**: `useDonorCoordination.ts` - Proper state management
- **API Endpoints**: Both endpoints created (but not functional due to issues above)

### Acceptance Criteria Status
- ✅ **AC 1**: Real-time donor commitment status - UI complete, API broken
- ✅ **AC 2**: Available donation resources - Complete implementation
- ✅ **AC 3**: Coordination interface - Full workspace functionality  
- ✅ **AC 4**: Collaboration tools - Notes/messaging system ready
- ✅ **AC 5**: Resource planning tracking - Complete allocation interface

## Testing Instructions
After fixes are applied:

1. **Verify API Endpoints**:
   ```bash
   curl http://localhost:3000/api/v1/donors
   curl http://localhost:3000/api/v1/coordinator/resources/available
   ```
   Both should return 200 status with proper JSON data (not 500 errors)

2. **Test UI Functionality**:
   - Navigate to `/coordinator/donors`
   - Verify all 4 tabs load without errors
   - Check that donor data populates in the Donors tab
   - Confirm resource data shows in Resources tab
   - Test workspace functionality in Coordination tab

3. **Validate Real-time Updates**:
   - Verify 25-second auto-refresh works without errors
   - Check console for clean operation (no 500 errors)

## Priority
**CRITICAL - All issues must be fixed before story can be considered complete.**

The frontend implementation is excellent and follows all architectural patterns correctly. The issues are purely backend integration problems that prevent the feature from functioning.

## Estimated Fix Time
- Issue 1 (Missing export): 5 minutes
- Issue 2 (Circular reference): 15 minutes  
- Issue 3 (Hydration): 10 minutes
**Total**: ~30 minutes for experienced developer