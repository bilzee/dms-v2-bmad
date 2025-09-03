# Dev Instructions: Story 6.3 Critical Fixes

## Overview
Story 6.3 drill-down capability has been implemented but contains critical runtime errors and test configuration issues that prevent full functionality. This document provides specific instructions to resolve these issues.

## Critical Issues to Fix

### 1. Runtime Error: Missing formatMetricName Function ❌ FIXED
**Status**: ✅ RESOLVED  
**Location**: `packages/frontend/src/components/features/monitoring/DataExportModal.tsx:212`  
**Fix Applied**: Replaced `formatMetricName(column)` with inline string formatting

### 2. API Route Testing Environment Issues ⚠️
**Status**: 🔄 NEEDS FIXING  
**Problem**: API route tests fail due to Next.js environment configuration  
**Error**: `ReferenceError: Request is not defined`  

**Files Affected**:
- `src/__tests__/app/api/v1/monitoring/drill-down/assessments/route.test.ts`
- `src/__tests__/app/api/v1/monitoring/drill-down/responses/route.test.ts`

**Solution Steps**:

1. **Update Jest Configuration** - Add proper environment setup for API route testing:
```typescript
// jest.config.js - Update or add this configuration
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jsdom', // Default for components
  projects: [
    {
      displayName: 'components',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/__tests__/components/**/*.test.{js,ts,tsx}'],
    },
    {
      displayName: 'api-routes',
      testEnvironment: 'node', // Node environment for API routes
      testMatch: ['<rootDir>/src/__tests__/app/api/**/*.test.{js,ts}'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.api.js'],
    },
  ],
}

module.exports = createJestConfig(customJestConfig)
```

2. **Create API Testing Setup File**:
```javascript
// jest.setup.api.js - Create this file
import { TextEncoder, TextDecoder } from 'node:util'

// Polyfill for Node.js environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock Next.js Request/Response if needed
global.Request = global.Request || class MockRequest {
  constructor(url, options = {}) {
    this.url = url
    this.method = options.method || 'GET'
    this.headers = new Headers(options.headers || {})
    this.body = options.body
  }
}

global.Response = global.Response || class MockResponse {
  constructor(body, options = {}) {
    this.body = body
    this.status = options.status || 200
    this.headers = new Headers(options.headers || {})
  }
  
  json() {
    return Promise.resolve(JSON.parse(this.body))
  }
}
```

3. **Alternative: Use next-test-api-route-handler** (Recommended):
```bash
pnpm add -D next-test-api-route-handler
```

Update API route tests to use this library:
```typescript
// Example: assessments/route.test.ts
import { testApiHandler } from 'next-test-api-route-handler'
import * as handler from '@/app/api/v1/monitoring/drill-down/assessments/route'

describe('/api/v1/monitoring/drill-down/assessments', () => {
  it('returns assessment data with filters', async () => {
    await testApiHandler({
      handler,
      url: '/api/v1/monitoring/drill-down/assessments?assessmentTypes=SHELTER',
      test: async ({ fetch }) => {
        const res = await fetch()
        const data = await res.json()
        
        expect(res.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data).toBeInstanceOf(Array)
      },
    })
  })
})
```

### 3. Playwright Configuration Issues ⚠️
**Status**: 🔄 NEEDS FIXING  
**Problem**: Playwright not properly installed/configured  

**Solution Steps**:

1. **Install Playwright**:
```bash
cd packages/frontend
pnpm add -D @playwright/test
npx playwright install
```

2. **Update Playwright Config** - Ensure proper configuration in `playwright.config.ts`:
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './src/e2e/__tests__',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // Allow time for Next.js to start
  },
})
```

3. **Fix Jest/Playwright Conflict** - Update Jest config to exclude E2E tests:
```javascript
// jest.config.js - Add this to exclude E2E tests from Jest
testPathIgnorePatterns: [
  '<rootDir>/.next/',
  '<rootDir>/node_modules/',
  '<rootDir>/src/e2e/', // Exclude E2E tests from Jest
],
```

### 4. Integration Test Syntax Error ⚠️
**Status**: 🔄 NEEDS FIXING  
**Location**: `src/__tests__/integration/drill-down-workflow.integration.test.ts:149`  
**Error**: Expected '>', got 'fallback'

**Fix**: Update JSX syntax in integration test:
```typescript
// Change this:
<React.Suspense fallback={<div>Loading...</div>}>

// To this:
<React.Suspense fallback={<div>Loading...</div>}>
```

## Testing Commands

After implementing fixes, use these commands to verify:

```bash
# Test components (Jest)
pnpm --filter @dms/frontend test DetailedAssessmentView.test.tsx

# Test API routes (Jest with node environment)
pnpm --filter @dms/frontend test src/__tests__/app/api/v1/monitoring/drill-down/

# Run E2E tests (Playwright)
pnpm --filter @dms/frontend exec playwright test

# Run specific E2E test
pnpm --filter @dms/frontend exec playwright test story-6.3-drill-down-capability.e2e.test.ts
```

## Quality Gate Requirements

To pass QA review, ensure:
1. ✅ All component tests pass
2. ✅ All API route tests pass  
3. ✅ All E2E tests pass
4. ✅ No runtime errors in browser console
5. ✅ All acceptance criteria verified through interactive testing

## References
- [Next.js Testing Documentation](https://nextjs.org/docs/pages/guides/testing)
- [Playwright with Next.js Guide](https://nextjs.org/docs/pages/guides/testing/playwright)
- [Next.js API Route Testing Best Practices](https://blog.arcjet.com/testing-next-js-app-router-api-routes/)
- [next-test-api-route-handler NPM Package](https://www.npmjs.com/package/next-test-api-route-handler)

## Priority
**HIGH** - These fixes are blocking Story 6.3 completion and QA approval.