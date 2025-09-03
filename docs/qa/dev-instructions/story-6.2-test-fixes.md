# Dev Agent Instructions: Story 6.2 Test Execution Fixes

**QA Gate Status:** FAIL  
**Issue:** Test files created but non-functional due to configuration problems  
**Priority:** HIGH - Must fix before story completion

## Context7 Research Required

Before implementing fixes, use Context7 to research:

1. **React-Leaflet Testing Best Practices**:
   - Query: "react-leaflet jest testing mocking L.Icon.Default undefined"
   - Focus: Proper mocking strategies for Leaflet components in Jest environment

2. **Playwright Configuration for Next.js**:
   - Query: "playwright next.js web server configuration timeout"
   - Focus: Web server setup for E2E testing with Next.js dev server

3. **Jest Performance Testing Patterns**:
   - Query: "jest performance testing react components benchmark patterns"
   - Focus: Reliable performance measurement techniques

## Required Fixes

### 1. Performance Test Fix (HIGH PRIORITY)

**File:** `packages/frontend/src/__tests__/performance/InteractiveMapPerformance.test.tsx`

**Issue:** `TypeError: Cannot read properties of undefined (reading 'Default')` at line 24

**Root Cause:** The main map page imports Leaflet and tries to configure L.Icon.Default, but in Jest environment L.Icon.Default is undefined due to mocking.

**Required Fix:**
```typescript
// Add proper Leaflet mocking setup BEFORE importing components that use Leaflet
jest.mock('leaflet', () => ({
  Icon: {
    Default: {
      prototype: {},
      mergeOptions: jest.fn(),
    },
  },
  divIcon: jest.fn(() => ({ iconHtml: 'mock-icon' })),
  // Add any other Leaflet objects used by the components
}));

// Mock the Leaflet CSS import to prevent issues
jest.mock('leaflet/dist/leaflet.css', () => ({}));
```

**Verification Steps:**
1. Run `pnpm --filter @dms/frontend test InteractiveMapPerformance.test.tsx`
2. All performance benchmarks should execute without errors
3. Verify performance thresholds are realistic for testing environment

### 2. E2E Test Fix (HIGH PRIORITY)

**File:** `packages/frontend/src/e2e/__tests__/story-6.2-interactive-mapping.e2e.test.ts`

**Issue:** `Timed out waiting 60000ms from config.webServer`

**Root Cause:** Playwright configuration not properly set up for Next.js dev server or wrong base URL.

**Required Investigation & Fix:**

1. **Check Playwright Configuration:**
   - Examine `packages/frontend/playwright.config.ts` 
   - Verify webServer configuration points to correct dev server
   - Ensure base URL matches the dev server URL

2. **Fix Web Server Setup:**
```typescript
// Expected playwright.config.ts webServer section:
webServer: {
  command: 'pnpm dev',
  port: 3000,
  url: 'http://localhost:3000',
  timeout: 120 * 1000, // 2 minutes for slow startup
  reuseExistingServer: !process.env.CI,
},
```

3. **Update Test Navigation:**
```typescript
// Use absolute URLs instead of relative paths
await page.goto('http://localhost:3000/monitoring/map');
```

**Verification Steps:**
1. Run `pnpm --filter @dms/frontend test:e2e story-6.2-interactive-mapping.e2e.test.ts`
2. All E2E tests should complete successfully
3. Verify interactive map loads and responds to user interactions

### 3. Unit Test Fix (MEDIUM PRIORITY)

**File:** `packages/frontend/src/__tests__/components/features/monitoring/AssessmentMapLayer.test.tsx`

**Issue:** Test expects "Assessments" text that doesn't exist in component

**Required Fix:**
- Review the failing test expectation around line 133-134
- Update test to match actual component output (likely should look for "Assessment Details" instead)
- Ensure all component tests match actual rendered content

## Implementation Standards

### Testing Framework Requirements:
- **Performance Thresholds:** Use realistic benchmarks for CI environment
- **E2E Reliability:** Tests must pass consistently, handle async loading properly  
- **Mocking Strategy:** Follow established patterns from working tests (EntityMapLayer.test.tsx)

### Quality Gates:
- All tests must execute successfully (0 failures)
- Performance tests must complete under reasonable thresholds
- E2E tests must cover all acceptance criteria workflows

## Acceptance Criteria for Fixes

1. ✅ Performance tests execute without mocking errors
2. ✅ E2E tests run successfully with proper web server connection
3. ✅ All unit tests pass (including corrected AssessmentMapLayer test)
4. ✅ Test execution time is reasonable for CI/CD pipeline

## Context7 References Needed

- React-Leaflet testing documentation for proper Jest setup
- Playwright Next.js integration guides for web server configuration
- Jest performance testing best practices for React components

## Post-Fix Verification

After implementing fixes, run full test suite:
```bash
pnpm --filter @dms/frontend test
pnpm --filter @dms/frontend test:e2e
```

All tests should pass before requesting final QA review.