Here are the specific instructions for the Dev Agent to fix the critical issues found
  in Story 2.1:

  Dev Agent Fix Instructions - Story 2.1 Critical Bugs

  Priority 1: Fix Infinite Re-render Loop (BLOCKING)

  File: packages/frontend/src/components/features/response/ResponsePlanningForm.tsx

  Root Cause: Lines 136-147 in handleResponseTypeChange function create circular state
  updates between React Hook Form and Zustand store.

  Required Changes:

  1. Wrap handleResponseTypeChange in useCallback:
  const handleResponseTypeChange = useCallback((newType: ResponseType) => {
    setActiveResponseType(newType);
    setValue('responseType', newType);
    setValue('data', getDefaultResponseData(newType));

    if (currentDraft) {
      updateDraft(currentDraft.id, {
        responseType: newType,
        data: getDefaultResponseData(newType),
      });
    }
  }, [setValue, currentDraft, updateDraft]); // Add proper dependencies

  2. Fix auto-save useEffect dependencies (lines 127-133):
  useEffect(() => {
    if (isDirty) {
      const autoSaveInterval = setInterval(() => {
        performAutoSave();
      }, 10000);
      return () => clearInterval(autoSaveInterval);
    }
  }, [isDirty, performAutoSave]);

  3. Memoize expensive operations:
  const defaultResponseData = useMemo(() => getDefaultResponseData(activeResponseType),
  [activeResponseType]);

  4. Separate form initialization from updates:
  - Move form default values setup outside of useEffect hooks
  - Prevent setValue calls during render phase

  Priority 2: Add Error Boundary (HIGH)

  Create new file:
  packages/frontend/src/components/features/response/ResponsePlanningErrorBoundary.tsx

  'use client';

  import React from 'react';
  import { Button } from '@/components/ui/button';

  interface Props {
    children: React.ReactNode;
  }

  interface State {
    hasError: boolean;
    error?: Error;
  }

  export class ResponsePlanningErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
      return {
        hasError: true,
        error,
      };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      console.error('Response Planning Form Error:', error, errorInfo);
    }

    render() {
      if (this.state.hasError) {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full 
  text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center 
  justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Response Planning Error
              </h2>
              <p className="text-gray-600 mb-6">
                Something went wrong with the response planning form. Please try
  refreshing the page.
              </p>
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Refresh Page
              </Button>
            </div>
          </div>
        );
      }

      return this.props.children;
    }
  }

  Update: packages/frontend/src/app/(dashboard)/responses/plan/page.tsx

  Wrap ResponsePlanningForm with error boundary:
  import { ResponsePlanningErrorBoundary } from
  '@/components/features/response/ResponsePlanningErrorBoundary';

  // In the return statement:
  <ResponsePlanningErrorBoundary>
    <ResponsePlanningForm
      initialResponseType={initialResponseType}
      initialEntityId={initialEntityId}
      initialAssessmentId={initialAssessmentId}
      onSave={handlePlanSaved}
      onCancel={handleCancel}
    />
  </ResponsePlanningErrorBoundary>

  Priority 3: Add Runtime Error Tests (HIGH)

  Create new file: packages/frontend/src/components/features/response/__tests__/Response
  PlanningForm.runtime.test.tsx

  import { render, screen, fireEvent, waitFor } from '@testing-library/react';
  import { ResponsePlanningForm } from '../ResponsePlanningForm';
  import { ResponseType } from '@dms/shared';

  // Mock console.error to catch React warnings
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  describe('ResponsePlanningForm Runtime Stability', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should not cause infinite re-renders when switching response types', async () =>
   {
      render(<ResponsePlanningForm initialResponseType={ResponseType.HEALTH} />);

      const washTab = screen.getByRole('button', { name: /WASH/i });

      // Click the tab and verify no infinite loop errors
      fireEvent.click(washTab);

      await waitFor(() => {
        expect(console.error).not.toHaveBeenCalledWith(
          expect.stringMatching(/Maximum update depth exceeded/)
        );
      }, { timeout: 2000 });
    });

    it('should handle rapid tab switching without errors', async () => {
      render(<ResponsePlanningForm initialResponseType={ResponseType.HEALTH} />);

      const tabs = [
        screen.getByRole('button', { name: /WASH/i }),
        screen.getByRole('button', { name: /Shelter/i }),
        screen.getByRole('button', { name: /Food/i }),
        screen.getByRole('button', { name: /Health/i }),
      ];

      // Rapidly switch between tabs
      for (const tab of tabs) {
        fireEvent.click(tab);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await waitFor(() => {
        expect(console.error).not.toHaveBeenCalledWith(
          expect.stringMatching(/Warning.*update depth/)
        );
      });
    });
  });

  Priority 4: Review Zustand Store Patterns (MEDIUM)

  File: packages/frontend/src/stores/response.store.ts

  Check for:
  - Ensure updateDraft function doesn't trigger unnecessary re-renders
  - Add proper state comparison to prevent unnecessary updates
  - Verify persist middleware isn't causing update cycles

  Testing Instructions

  After making fixes:

  1. Manual Testing:
  cd packages/frontend
  pnpm dev
  # Navigate to http://localhost:3002/responses/plan
  # Click all response type tabs - should be smooth with no console errors
  2. Run Tests:
  pnpm test ResponsePlanningForm.runtime.test.tsx
  pnpm test ResponsePlanningForm.test.tsx
  3. Performance Check:
    - Open React DevTools Profiler
    - Record interaction while switching tabs
    - Verify no excessive re-renders

  Success Criteria

  ✅ All tabs switch smoothly without console errors✅ No "Maximum update depth 
  exceeded" warnings✅ Form remains responsive during interactions✅ Auto-save works 
  without causing loops✅ All existing tests continue to pass

  Re-submission for QA

  Once fixed, update the story status and request QA re-review with:
  - Confirmation that infinite loop is resolved
  - Evidence of successful manual testing
  - All new tests passing
  - Performance profiling results if available