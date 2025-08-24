# Dev Agent Instructions: Story 1.2 Quality Gate Issues

## Context
Quality gate for Story 1.2 (Media Attachment) identified **CONCERNS** with two medium-severity issues that need resolution. All acceptance criteria are implemented and TypeScript compilation passes, but testing infrastructure needs fixes.

**Gate Reference**: `docs/qa/gates/1.2-media-attachment.yml`

## Issue #1: TEST-001 - Test Environment Configuration

### Problem
Jest test execution fails with EPIPE errors and configuration issues preventing reliable test runs.

### Error Details
```
Error: write EPIPE
  at afterWriteDispatched (node:internal/stream_base_commons:159:15)
  ...
npm error Lifecycle script `test` failed with error:
```

### Required Actions
1. **Fix Jest Configuration**
   - Review `packages/frontend/jest.config.js` for proper configuration
   - Ensure `jest.setup.ts` is correctly configured with testing-library/jest-dom
   - Add proper test environment settings for jsdom

2. **Package.json Script Updates**
   - Add missing `typecheck` script: `"typecheck": "tsc --noEmit"`
   - Verify test scripts are properly configured
   - Ensure all testing dependencies are correctly installed

3. **Test Environment Validation**
   - Run `npm test` to ensure tests execute without EPIPE errors
   - Verify media upload tests can run successfully
   - Confirm mock configurations for getUserMedia and file operations work

### Success Criteria
- `npm test` runs without EPIPE errors
- All existing tests pass
- Media upload component tests execute successfully

## Issue #2: REQ-001 - DOM Validation Warning

### Problem
React DOM validation warning about nested forms in AssessmentForm component:
```
Warning: validateDOMNesting(...): <form> cannot appear as a descendant of <form>.
```

### Root Cause Analysis Required
1. **Investigate Form Structure**
   - Examine `packages/frontend/src/components/features/assessment/AssessmentForm.tsx:48`
   - Check MediaUpload component integration for form nesting
   - Review React Hook Form usage patterns

2. **Component Architecture Review**
   - Verify MediaUpload component doesn't wrap content in unnecessary form tags
   - Ensure form context is properly passed without creating nested forms
   - Check if any UI components (Button, etc.) are inadvertently creating form elements

### Required Actions
1. **Fix Form Nesting**
   - Remove any unnecessary `<form>` tags from MediaUpload or child components
   - Use React Hook Form's `useFormContext` instead of creating new form instances
   - Ensure all form controls use proper field registration without form wrappers

2. **HTML Semantics Validation**
   - Validate proper HTML structure with browser dev tools
   - Ensure accessibility standards are maintained
   - Test form submission functionality after fixes

### Success Criteria
- No DOM validation warnings in console
- Form submission works correctly
- All form controls remain properly connected to React Hook Form
- Accessibility standards maintained

## Implementation Priority
1. **High Priority**: Fix test environment (blocks automated testing)
2. **Medium Priority**: Resolve DOM validation warning (affects code quality)

## Testing Requirements
After fixes:
1. Run `npm test` - should execute without errors
2. Run `npm run typecheck` - should pass cleanly  
3. Test media upload functionality manually
4. Verify no console warnings during form interaction

## Quality Gate Update
Once both issues are resolved:
1. Re-run quality assessment
2. Update gate status from CONCERNS to PASS
3. Document resolution in `docs/qa/gates/1.2-media-attachment.yml`

## Files to Focus On
- `packages/frontend/jest.config.js`
- `packages/frontend/jest.setup.ts` 
- `packages/frontend/package.json`
- `packages/frontend/src/components/features/assessment/AssessmentForm.tsx`
- `packages/frontend/src/components/shared/MediaUpload.tsx`
- Test files: `__tests__/components/shared/MediaUpload.test.tsx`