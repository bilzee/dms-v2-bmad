# Story 5.3: System Performance Monitoring - Test Fixes

## Status
Ready for Implementation

## Issue Summary
Story 5.3 implementation is functional and well-structured, but has minor test issues that need fixing:

1. **React Act Warnings**: Components have async state updates not wrapped in `act()` 
2. **Duplicate Element Testing**: UserActivityMonitor test fails due to multiple ASSESSOR badges
3. **Test Timing Issues**: Some tests have timing-related warnings

## Dev Agent Instructions

### Primary Tasks

#### 1. Fix React Testing Library Act Warnings
**Files to modify:**
- `packages/frontend/src/__tests__/components/features/monitoring/PerformanceMetrics.test.tsx`
- `packages/frontend/src/__tests__/components/features/monitoring/UserActivityMonitor.test.tsx`

**Issue:** State updates in async functions trigger React warnings about `act()` wrapping.

**Solution using Context7 React Testing Library patterns:**
```typescript
import { act, waitFor } from '@testing-library/react';

// Wrap async state updates in act()
it('updates metrics at specified intervals', async () => {
  jest.useFakeTimers();
  
  render(<PerformanceMetrics refreshInterval={5000} />);

  await waitFor(() => {
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  // Wrap timer advancement in act()
  await act(async () => {
    jest.advanceTimersByTime(5000);
  });

  await waitFor(() => {
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  jest.useRealTimers();
});
```

#### 2. Fix UserActivityMonitor Duplicate Element Test
**File:** `packages/frontend/src/__tests__/components/features/monitoring/UserActivityMonitor.test.tsx`

**Issue:** Test "shows role breakdown correctly" fails because multiple ASSESSOR badges exist.

**Solution using React Testing Library best practices:**
```typescript
it('shows role breakdown correctly', async () => {
  render(<UserActivityMonitor refreshInterval={1000} />);

  await waitFor(() => {
    expect(screen.getByText('Role Breakdown')).toBeInTheDocument();
  });

  // Use getAllByText for multiple elements
  const assessorBadges = screen.getAllByText('ASSESSOR');
  expect(assessorBadges.length).toBeGreaterThan(0);
  
  // Or test within specific containers
  const roleBreakdownSection = screen.getByText('Role Breakdown').closest('div');
  expect(within(roleBreakdownSection).getByText('ASSESSOR')).toBeInTheDocument();
});
```

#### 3. Fix Test Timing and State Management
**Apply to all monitoring component tests:**

```typescript
// Add proper cleanup and act wrapping
import { act, cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  jest.clearAllTimers();
});

// Wrap all async operations
const fetchAndUpdateComponent = async () => {
  await act(async () => {
    await fetchMetrics(); // or other async operations
  });
};
```

### Technical Implementation Notes

#### Context7 React Testing Library Best Practices:
1. **Use `waitFor()` for async assertions** instead of arbitrary delays
2. **Wrap timer operations in `act()`** to prevent React warnings
3. **Use `getAllBy*` queries** when multiple elements are expected
4. **Test within specific containers** using `within()` to avoid ambiguity
5. **Properly clean up timers and state** in `afterEach()` hooks

#### Test Structure Pattern:
```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup mocks
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
  });

  it('should handle async operations correctly', async () => {
    render(<Component />);
    
    await act(async () => {
      // Trigger async operations
    });
    
    await waitFor(() => {
      // Assert expected results
    });
  });
});
```

### Validation Requirements

#### Before Completion:
1. **Run all monitoring component tests:** `pnpm --filter @dms/frontend test monitoring`
2. **Verify no React act warnings** in test output
3. **Ensure all tests pass** without timing issues
4. **Check component functionality** remains unchanged

#### Success Criteria:
- ✅ All monitoring component tests pass (15/15 for UserActivityMonitor, 10/10 for PerformanceMetrics)
- ✅ No React act warnings in console output
- ✅ Test execution time under 30 seconds per component
- ✅ Components maintain existing functionality

### Reference Documentation
- React Testing Library act patterns: Use Context7 `/testing-library/react-testing-library` documentation
- Test structure follows patterns from existing assessment tests in codebase
- Maintain consistency with Stories 5.1-5.2 testing approaches

### File Locations
**Test files to fix:**
- `packages/frontend/src/__tests__/components/features/monitoring/PerformanceMetrics.test.tsx`
- `packages/frontend/src/__tests__/components/features/monitoring/UserActivityMonitor.test.tsx`

**Reference for patterns:**
- Look at existing working tests in `packages/frontend/src/__tests__/` for established patterns
- Check `packages/frontend/jest.config.js` for test configuration
- Review other component tests for act() usage examples

## Notes
- Story 5.3 implementation is otherwise excellent and matches all acceptance criteria
- These are minor test quality improvements, not functional issues
- Component UI and functionality work correctly in browser testing