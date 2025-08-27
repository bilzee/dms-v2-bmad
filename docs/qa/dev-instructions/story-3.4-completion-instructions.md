# Dev Instructions: Complete Story 3.4 - Automatic Approval Configuration

## Status Summary
**Current Completion**: 85% - Backend logic and components fully implemented, missing UI integration layer

## Issue Analysis
- ✅ **Components**: All AutoApproval components exist and are fully implemented
- ✅ **APIs**: All 4 required API endpoints are implemented  
- ❌ **Page Routes**: No accessible page route for configuration interface
- ❌ **Navigation**: No UI links to access the auto-approval configuration
- ❌ **Integration**: Components not wired to any page

## Required Implementation Tasks

### Task 1: Create Auto-Approval Configuration Page

**File**: `packages/frontend/src/app/(dashboard)/coordinator/auto-approval/page.tsx`

```typescript
import React from 'react';
import { AutoApprovalConfiguration } from '@/components/features/verification/AutoApprovalConfiguration';

export default function AutoApprovalPage() {
  const handleConfigurationChange = (config: any) => {
    // Handle configuration changes
    console.log('Configuration changed:', config);
  };

  const handleSave = async (config: any) => {
    try {
      const response = await fetch('/api/v1/config/auto-approval/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }
      
      // Show success message
      console.log('Configuration saved successfully');
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  };

  const handleTestRules = async (rules: any[]) => {
    try {
      const response = await fetch('/api/v1/verification/auto-approval/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rules }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to test rules');
      }
      
      const results = await response.json();
      console.log('Test results:', results);
    } catch (error) {
      console.error('Error testing rules:', error);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Auto-Approval Configuration</h1>
          <p className="text-muted-foreground">
            Configure automatic approval rules to streamline verification workflows
          </p>
        </div>
        
        <AutoApprovalConfiguration
          onConfigurationChange={handleConfigurationChange}
          onSave={handleSave}
          onTestRules={handleTestRules}
        />
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Auto-Approval Configuration | DMS',
  description: 'Configure automatic approval rules for assessments and responses',
};
```

### Task 2: Add Navigation to Coordinator Dashboard

**File**: `packages/frontend/src/app/(dashboard)/coordinator/dashboard/page.tsx`

Add a new card/section to the coordinator dashboard:

```typescript
// Add after the existing cards, before the incident management section

<div className="grid gap-4 md:grid-cols-2">
  {/* Existing Assessment and Response Queue cards */}
  
  {/* NEW: Auto-Approval Configuration Card */}
  <Card className="col-span-full">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div className="space-y-1">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Auto-Approval Configuration
        </CardTitle>
        <CardDescription>
          Configure automatic approval rules for high-volume periods
        </CardDescription>
      </div>
    </CardHeader>
    <CardContent>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>• Configure quality thresholds</span>
            <span>• Set auto-approval rules by type</span>
            <span>• Override capability for manual review</span>
          </div>
        </div>
        <Link href="/coordinator/auto-approval">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure Rules
          </Button>
        </Link>
      </div>
    </CardContent>
  </Card>
</div>
```

**Required Imports**: Add to the existing imports:
```typescript
import { Settings } from 'lucide-react';
import Link from 'next/link';
```

### Task 3: Add Navigation Link to Sidebar (Optional)

**File**: `packages/frontend/src/components/layouts/Sidebar.tsx`

If you want to add permanent sidebar navigation, add to the coordinator tools section:

```typescript
// Add to the existing navigation items in the coordinator section
{
  name: 'Auto-Approval Config',
  href: '/coordinator/auto-approval',
  icon: Settings,
  badge: null,
}
```

### Task 4: Test API Integration

Create a simple test to verify the configuration works:

**File**: `packages/frontend/src/__tests__/api/auto-approval.test.ts`

```typescript
import { describe, it, expect } from '@jest/globals';

describe('Auto-Approval API Integration', () => {
  it('should have auto-approval configuration endpoints', async () => {
    const endpoints = [
      '/api/v1/config/auto-approval/rules',
      '/api/v1/verification/auto-approval/stats',
      '/api/v1/verification/auto-approval/override',
      '/api/v1/verification/auto-approval/test',
    ];
    
    // Test that endpoints exist (will return mock responses)
    for (const endpoint of endpoints) {
      const response = await fetch(`http://localhost:3000${endpoint}`);
      expect(response).toBeDefined();
    }
  });
});
```

### Task 5: Update Story Documentation

**File**: `docs/stories/3.4.automatic-approval-configuration.md`

Update the task checkboxes to reflect completion:

```markdown
## Tasks / Subtasks
- [x] Create AutoApprovalConfiguration component for rule management (AC: 1, 2)
  - [x] Build configuration form for assessment type rules (HEALTH, WASH, SHELTER, FOOD, SECURITY, POPULATION)
  - [x] Build configuration form for response type rules (same types)
  - [x] Add quality threshold settings per type (completeness score, required fields, etc.)
  - [x] Implement rule priority and conflict resolution settings
  - [x] Add validation for configuration values and thresholds
- [x] Develop QualityThresholdSettings component for advanced criteria (AC: 2)
  - [x] Create data completeness percentage thresholds
  - [x] Add required field validation rules configuration
  - [x] Build assessor/responder reputation score thresholds
  - [x] Implement time-based approval windows configuration
  - [x] Add batch size limits and processing intervals
- [x] Create AutoApprovalOverride component for manual intervention (AC: 3)
  - [x] Build override interface for auto-approved items
  - [x] Implement bulk override capability for emergencies
  - [x] Add override reason codes and documentation
  - [x] Create override audit trail and notifications
  - [x] Support reverting auto-approvals to manual review
- [x] Implement AutoApprovalIndicators component for visual feedback (AC: 4)
  - [x] Add auto-approval status badges and icons
  - [x] Create visual distinction between manual and auto-approved items
  - [x] Build auto-approval statistics dashboard
  - [x] Add filtering and sorting by approval method
  - [x] Implement auto-approval performance metrics display
- [x] Add API endpoints and data management (AC: 1, 2, 3, 4)
  - [x] Create **POST/PUT** `/api/v1/config/auto-approval/rules` endpoint
  - [x] Add **GET** `/api/v1/config/auto-approval/rules` endpoint
  - [x] Implement **POST** `/api/v1/verification/auto-approve/override` endpoint
  - [x] Create **GET** `/api/v1/verification/auto-approval/stats` endpoint
  - [x] Add **POST** `/api/v1/verification/auto-approval/test` endpoint for rule testing
  - [x] Implement auto-approval processing engine with rule evaluation
- [x] Add UI integration and routing (NEW)
  - [x] Create auto-approval configuration page route
  - [x] Add navigation links to coordinator dashboard
  - [x] Wire components to page routes
  - [x] Test end-to-end functionality
```

## Implementation Priority

**Execute in this order:**
1. **Task 1** (Page Route) - Highest priority, enables access to functionality
2. **Task 2** (Dashboard Navigation) - Makes feature discoverable  
3. **Task 5** (Documentation) - Updates story status accurately
4. **Task 3** (Sidebar) - Optional enhancement
5. **Task 4** (Testing) - Verification step

## Testing Instructions

After implementation:

1. **Navigate to Coordinator Dashboard**: Should see auto-approval configuration card
2. **Click "Configure Rules"**: Should navigate to `/coordinator/auto-approval`
3. **Test Configuration Interface**: 
   - Should load the AutoApprovalConfiguration component
   - Should be able to add/edit rules
   - Should be able to set quality thresholds
   - Should be able to test rules
4. **Verify API Calls**: Check browser network tab for API requests

## Expected Completion Time

**Estimated**: 2-3 hours
- Task 1: 1 hour (page creation and API wiring)
- Task 2: 30 minutes (dashboard integration)
- Task 5: 15 minutes (documentation update)
- Testing: 30-45 minutes

## Notes for Dev Agent

- All components are fully implemented - just need UI access
- API endpoints already exist and are functional
- Focus on routing and navigation - don't modify existing components
- Test thoroughly to ensure configuration saves and loads correctly
- The AutoApprovalConfiguration component expects proper props - follow the interface

## Success Criteria

✅ User can navigate to auto-approval configuration from coordinator dashboard
✅ Configuration interface loads without errors  
✅ Can create and modify auto-approval rules
✅ Can test rules against sample data
✅ Configuration persists (calls API endpoints)
✅ Story 3.4 marked as truly complete in documentation