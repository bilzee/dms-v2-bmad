# Dev Instructions: Story 1.5 Fixes

## Status: REQUIRES IMMEDIATE FIXES

Story 1.5 failed QA gate due to critical runtime and implementation issues. The following fixes are required before reassessment.

## 🚨 **Critical Runtime Issues (BLOCKING)**

### 1. Missing Dependencies
**Issue**: Application cannot start due to missing `react-hot-toast` dependency.

**Fix Required**:
```bash
cd packages/frontend
pnpm add react-hot-toast
```

**Files to verify**: 
- `packages/frontend/package.json` - ensure react-hot-toast is in dependencies
- `packages/frontend/src/app/layout.tsx:3` - imports Toaster from react-hot-toast

### 2. Workspace Configuration Issues
**Issue**: npm install fails with "Unsupported URL Type workspace:" error.

**Fix Required**:
- Either fix pnpm workspace configuration in root `pnpm-workspace.yaml`
- Or replace `"@dms/shared": "workspace:*"` with specific version in package.json
- Ensure all workspace dependencies resolve correctly

**Test**: Verify `npm run dev` starts without errors

## 🔧 **Implementation Issues (HIGH PRIORITY)**

### 3. Replace Mock Data with Real Backend Integration
**Issue**: API endpoints in `/api/v1/queue/` use hardcoded mock data instead of real database.

**Files requiring changes**:
- `packages/frontend/src/app/api/v1/queue/route.ts:30-60` - Replace mockQueueItems with real IndexedDB queries
- `packages/frontend/src/app/api/v1/queue/[id]/retry/route.ts` - Implement actual retry logic
- `packages/frontend/src/app/api/v1/queue/summary/route.ts` - Connect to real queue data

**Required Implementation**:
```typescript
// Example fix for queue/route.ts
export async function GET(request: NextRequest) {
  try {
    // Remove mock data section (lines 30-60)
    
    // Add real IndexedDB integration
    const queueService = new OfflineQueueService();
    const queueItems = await queueService.getQueueItems(filters);
    
    // Apply server-side filtering and sorting
    const sortedItems = sortQueueItems(queueItems);
    
    return NextResponse.json({
      success: true,
      data: sortedItems,
      total: sortedItems.length,
      filters: filters,
    });
  } catch (error) {
    // existing error handling
  }
}
```

### 4. Implement Real IndexedDB Integration
**Issue**: No actual offline queue persistence implemented.

**Required**:
- Create `OfflineQueueService` class in `packages/frontend/src/lib/services/`
- Extend `packages/frontend/src/lib/offline/db.ts` with queue tables
- Implement real CRUD operations for queue items

**Schema needed**:
```typescript
// Add to db.ts
export interface OfflineQueueTable {
  id: string;
  type: 'ASSESSMENT' | 'RESPONSE' | 'MEDIA' | 'INCIDENT' | 'ENTITY';
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityId?: string;
  data: any;
  retryCount: number;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  createdAt: Date;
  lastAttempt?: Date;
  error?: string;
}
```

### 5. Dashboard Integration
**Issue**: Queue summary widget not integrated into main dashboard.

**Files requiring updates**:
- `packages/frontend/src/app/(dashboard)/page.tsx` - Add QueueSummary component
- `packages/frontend/src/components/layouts/DashboardLayout.tsx` - Add navigation to queue page

## 📋 **Testing Requirements**

After fixes, verify:

1. **Application Startup**:
   ```bash
   cd packages/frontend
   npm run dev
   # Should start without errors on http://localhost:3000
   ```

2. **Queue Functionality**:
   - Navigate to `/queue` page
   - Verify queue items display correctly (with real data, not mock)
   - Test filtering by status, priority, type
   - Test retry button on failed items
   - Test remove button functionality

3. **Integration**:
   - Dashboard should show queue summary widget
   - Navigation should include queue link
   - Real-time updates should work

## 🚦 **Definition of Done**

- [ ] Application starts without dependency errors
- [ ] All API endpoints use real database integration (no mock data)
- [ ] Queue page displays and functions correctly
- [ ] Dashboard integration complete
- [ ] All acceptance criteria met:
  - [ ] Visual queue showing unsync'd assessments ✅
  - [ ] Priority indicators (health emergencies first) ✅ 
  - [ ] Sync status indicators ✅
  - [ ] Manual retry capability ✅

## 📄 **Acceptance Criteria Validation**

**AC1**: Visual queue showing unsync'd assessments
- ✅ UI implemented, ❌ needs real data source

**AC2**: Priority indicators (health emergencies first)  
- ✅ Implemented correctly with red borders and sorting

**AC3**: Sync status indicators
- ✅ Color-coded badges implemented correctly

**AC4**: Manual retry capability
- ✅ UI implemented, ❌ needs functional backend

## 🔄 **Next Steps**

1. Fix dependency issues first (blocking)
2. Replace mock data with real IndexedDB integration
3. Complete dashboard integration
4. Test all functionality end-to-end
5. Request QA re-review when complete

## 📞 **QA Contact**

After implementing fixes, notify QA team for re-testing. All issues must be resolved for gate approval.

**QA Gate Reference**: `docs/qa/gates/1.5-assessment-queue-management.yml`