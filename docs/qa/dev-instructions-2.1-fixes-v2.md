# Dev Instructions: Story 2.1 Critical Bug Fixes (v2)

**Based on Context7 research and web search findings for React Hook Form infinite loop solutions**

## Problem Confirmed by QA Review ✅

Using Sequential Thinking and Playwright browser automation, QA agent confirmed:
- ❌ **Critical infinite re-render loop** when clicking WASH response type tab
- ❌ **Hundreds of "Maximum update depth exceeded" console errors**  
- ❌ **Form becomes unusable** - P0 production-blocking issue

## Root Cause Analysis (Context7 + Research)

The infinite loop is caused by **multiple circular dependencies** in `ResponsePlanningForm.tsx`:

### 1. Auto-save Dependencies Issue
**Lines 109-134**: `debouncedAutoSave` useMemo recreates on every render due to unstable dependencies
```typescript
// PROBLEM: Unstable dependencies cause infinite recreation
const debouncedAutoSave = useMemo(() => {
  // ... function logic
}, [currentDraft?.id, isDirty, getValues, updateDraft]); // ← isDirty changes trigger infinite loop
```

### 2. Response Type Handler Issue  
**Lines 153-173**: `handleResponseTypeChange` triggers cascading state updates
```typescript
// PROBLEM: Multiple setValue calls + store updates create render loop
setActiveResponseType(newType);           // Re-render 1
setValue('responseType', newType);        // Re-render 2
setValue('data', defaultData);            // Re-render 3
updateDraft(currentDraft.id, {...});     // Store update → Re-render 4 → Loop continues
```

## Required Fixes (Based on React Hook Form Best Practices)

### 1. Fix Auto-save with Proper Debouncing (CRITICAL P0)

**Install lodash.debounce dependency:**
```bash
cd packages/frontend
pnpm add lodash.debounce @types/lodash.debounce
```

**File**: `packages/frontend/src/components/features/response/ResponsePlanningForm.tsx`

**Add import:**
```typescript
import debounce from 'lodash.debounce';
```

**Replace lines 109-137:**
```typescript
// FIXED: Stable useCallback with proper debouncing
const debouncedAutoSave = useCallback(
  debounce(async () => {
    if (!currentDraft?.id || !isDirty) return;

    setIsAutoSaving(true);
    try {
      const formData = getValues();
      updateDraft(currentDraft.id, {
        ...formData,
        plannedDate: new Date(formData.plannedDate),
      });
      setLastAutoSave(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, 500),
  [currentDraft?.id, updateDraft] // ← Only stable dependencies
);

// Remove the old performAutoSave alias (line 137)
```

### 2. Fix Response Type Handler (CRITICAL P0)

**Replace lines 153-173:**
```typescript
// FIXED: Batch updates to prevent cascading re-renders
const handleResponseTypeChange = useCallback((newType: ResponseType) => {
  // 1. Single state update
  setActiveResponseType(newType);
  
  // 2. Batch form updates with shouldValidate: false to prevent validation triggers
  const defaultData = getDefaultResponseData(newType);
  setValue('responseType', newType, { shouldValidate: false, shouldDirty: false });
  setValue('data', defaultData, { shouldValidate: false, shouldDirty: false });
  
  // 3. Defer store update to next tick to prevent circular updates
  if (currentDraft?.id) {
    setTimeout(() => {
      updateDraft(currentDraft.id, {
        responseType: newType,
        data: defaultData,
      });
    }, 0);
  }
}, [setValue, currentDraft?.id, updateDraft]); // ← Stable dependencies only
```

### 3. Fix Auto-save useEffect (HIGH P1)

**Replace lines 140-147:**
```typescript
// FIXED: Stable dependencies for auto-save interval  
useEffect(() => {
  if (!isDirty) return;

  const autoSaveInterval = setInterval(debouncedAutoSave, 10000);
  return () => clearInterval(autoSaveInterval);
}, [isDirty, debouncedAutoSave]); // ← debouncedAutoSave is now stable
```

### 4. Add Defensive Error Boundary (HIGH P1)

**Create**: `packages/frontend/src/components/features/response/ResponsePlanningErrorBoundary.tsx`
```typescript
'use client';

import React, { ErrorBoundary } from 'react';
import { Button } from '@/components/ui/button';

interface ResponsePlanningErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ResponsePlanningErrorBoundary extends React.Component<
  ResponsePlanningErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ResponsePlanningErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ResponsePlanningForm Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center border border-red-200 bg-red-50 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Response Planning Error
          </h2>
          <p className="text-red-600 mb-4">
            The form encountered an infinite update loop. Please try again.
          </p>
          <div className="space-x-2">
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                this.props.onReset?.();
              }}
              variant="outline"
              size="sm"
            >
              Try Again
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="destructive" 
              size="sm"
            >
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 5. Wrap with Error Boundary

**File**: `packages/frontend/src/app/(dashboard)/responses/plan/page.tsx`

**Add import:**
```typescript
import { ResponsePlanningErrorBoundary } from '@/components/features/response/ResponsePlanningErrorBoundary';
```

**Wrap the form:**
```typescript
export default function ResponsePlanPage() {
  return (
    <ResponsePlanningErrorBoundary>
      <ResponsePlanningForm />
    </ResponsePlanningErrorBoundary>
  );
}
```

## Testing Requirements

### Manual Testing Steps
1. Navigate to `/responses/plan`
2. Click WASH tab - should switch smoothly with no console errors
3. Rapidly click between all response type tabs  
4. Verify auto-save indicators work correctly
5. Check browser CPU usage remains normal

### Automated Test

**File**: `packages/frontend/__tests__/components/response/ResponsePlanningForm.test.tsx`

**Add test case:**
```typescript
describe('Infinite Loop Prevention', () => {
  it('should not trigger infinite re-renders when switching response types', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(<ResponsePlanningForm />);
    
    // Test rapid response type changes
    const washTab = screen.getByRole('button', { name: /wash/i });
    const healthTab = screen.getByRole('button', { name: /health/i });
    
    fireEvent.click(washTab);
    await waitFor(() => expect(washTab).toHaveAttribute('aria-pressed', 'true'));
    
    fireEvent.click(healthTab);
    await waitFor(() => expect(healthTab).toHaveAttribute('aria-pressed', 'true'));
    
    fireEvent.click(washTab);
    await waitFor(() => expect(washTab).toHaveAttribute('aria-pressed', 'true'));
    
    // Verify no infinite loop errors
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Maximum update depth')
    );
    
    consoleSpy.mockRestore();
  });
});
```

## Success Criteria

- [ ] ✅ **No "Maximum update depth exceeded" errors** 
- [ ] ✅ **Response type tabs switch smoothly** without lag
- [ ] ✅ **Auto-save functionality works** without triggering loops  
- [ ] ✅ **Error boundary prevents crashes** if issues occur
- [ ] ✅ **All existing tests pass**
- [ ] ✅ **New infinite loop test passes**
- [ ] ✅ **Normal CPU usage** when using form

## Priority & Timeline

**Priority**: P0 - Production Blocking  
**Estimated Time**: 4-5 hours
**Must Complete**: Within 24 hours

## Expert Insights Applied

✅ **React Hook Form Best Practice**: Use `shouldValidate: false` and `shouldDirty: false` in setValue to prevent validation cascades  
✅ **Context7 Research**: Proper `useCallback` dependency management prevents infinite loops  
✅ **Web Search**: `lodash.debounce` is more reliable than custom debouncing for complex forms  
✅ **Error Boundary Pattern**: Graceful failure recovery for production stability