# Story 4.3: Critical Integration Fixes

## Overview
Story 4.3 Conflict Resolution has been implemented with excellent technical sophistication but requires critical integration fixes to make it user-accessible. The core functionality works beautifully in isolation but cannot be accessed by coordinators.

**Current Status:** 75% Complete - Missing UI integration and test configuration fixes

## Priority Issues to Address

### 🔴 CRITICAL: No User Access to Conflict Resolution
**Problem:** ConflictResolver component exists but is not integrated into any coordinator-accessible route.
**Impact:** Functionality is completely inaccessible to end users.

### 🟡 MEDIUM: Test Infrastructure Broken
**Problem:** Jest path resolution and SSR compatibility issues prevent proper testing validation.
**Impact:** Cannot verify conflict resolution functionality works correctly.

---

## Fix Instructions

### 1. Create Coordinator Conflicts Page Route ⚡ HIGH PRIORITY

**File to Create:** `packages/frontend/src/app/(dashboard)/coordinator/conflicts/page.tsx`

```tsx
import { Metadata } from 'next';
import { ConflictResolver } from '@/components/features/sync/ConflictResolver';

export const metadata: Metadata = {
  title: 'Conflict Resolution | Coordinator Dashboard',
  description: 'Resolve sync conflicts for assessments and responses',
};

export default function ConflictsPage() {
  // TODO: Get actual coordinator ID from session/auth
  const coordinatorId = 'coordinator-1'; // Replace with actual auth implementation
  
  return (
    <div className="container mx-auto py-6">
      <ConflictResolver 
        coordinatorId={coordinatorId}
        className="max-w-7xl mx-auto"
      />
    </div>
  );
}
```

### 2. Add Conflict Resolution to Coordinator Dashboard

**File to Edit:** `packages/frontend/src/app/(dashboard)/coordinator/dashboard/page.tsx`

Add the following section to the existing dashboard:

```tsx
// Add this import at the top
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

// Add this section within the existing dashboard layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Existing cards... */}
  
  {/* Add this new Conflict Resolution card */}
  <Card>
    <CardHeader>
      <div className="flex items-center space-x-2">
        <AlertTriangle className="h-5 w-5 text-orange-500" />
        <CardTitle>Conflict Resolution</CardTitle>
      </div>
      <CardDescription>
        Resolve data conflicts from offline sync operations
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span>Pending Conflicts:</span>
          <span className="font-semibold text-orange-600">3</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Critical:</span>
          <span className="font-semibold text-red-600">1</span>
        </div>
        <Link href="/coordinator/conflicts">
          <Button className="w-full mt-3">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Resolve Conflicts
          </Button>
        </Link>
      </div>
    </CardContent>
  </Card>
</div>
```

### 3. Add Navigation Menu Item

**File to Edit:** `packages/frontend/src/components/layouts/Sidebar.tsx`

Add conflict resolution to the coordinator navigation menu:

```tsx
// Find the coordinator navigation items and add:
{
  title: 'Conflict Resolution',
  href: '/coordinator/conflicts',
  icon: AlertTriangle,
  description: 'Resolve sync conflicts'
},
```

### 4. Fix Jest Path Resolution Configuration ⚡ HIGH PRIORITY

**File to Edit:** `packages/frontend/jest.config.js`

Update the Jest configuration to properly handle path aliases:

```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    // Fix path alias resolution for @/ imports
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mock CSS modules and static assets
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': 'jest-transform-stub',
  },
  // Ignore Next.js build files and node_modules
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  // Add support for TypeScript and JSX
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  // Global test setup for mocking browser APIs
  setupFiles: ['<rootDir>/src/test/jest.setup.js'],
};

module.exports = createJestConfig(customJestConfig);
```

### 5. Create Jest Browser API Mocks

**File to Create:** `packages/frontend/src/test/jest.setup.js`

```javascript
// Mock browser APIs that don't exist in Node.js test environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true,
});
```

### 6. Fix SSR Window Undefined Issues ⚡ HIGH PRIORITY

**File to Edit:** `packages/frontend/src/lib/sync/ConnectivityDetector.ts`

Fix the SSR compatibility issue:

```typescript
/**
 * Setup event listeners for online/offline detection
 * Only runs on client-side to avoid SSR issues
 */
private setupOnlineOfflineListeners(): void {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    console.warn('ConnectivityDetector: Skipping event listeners on server-side');
    return;
  }

  window.addEventListener('online', () => {
    this.lastConnectedTime = new Date();
    this.updateConnectivityStatus();
  });

  window.addEventListener('offline', () => {
    this.lastDisconnectedTime = new Date();
    this.updateConnectivityStatus();
  });

  // Also check if navigator exists (additional safety)
  if (typeof navigator !== 'undefined') {
    // Set initial state based on navigator.onLine
    this.isOnline = navigator.onLine;
  }
}

/**
 * Initialize connectivity detection with SSR safety
 */
public initializeDetection(): void {
  // Only initialize on client-side
  if (typeof window === 'undefined') {
    // Set default offline state for SSR
    this.isOnline = false;
    return;
  }

  this.updateConnectivityStatus();
  this.setupOnlineOfflineListeners();
  this.startPeriodicChecks();
}
```

### 7. Create Toast Mock for Tests

**File to Create:** `packages/frontend/src/components/ui/__mocks__/use-toast.ts`

```typescript
export const toast = jest.fn();
export const useToast = () => ({ toast });
```

### 8. Update ConflictResolver Test Configuration

**File to Edit:** `packages/frontend/src/components/features/sync/__tests__/ConflictResolver.test.tsx`

Fix the test imports and mocking:

```typescript
// Update the mock paths
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
  useToast: () => ({ toast: jest.fn() })
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/coordinator/conflicts',
}));
```

---

## Testing Validation

After implementing these fixes, validate with:

### 1. UI Access Test
```bash
# Start dev server
npm run dev

# Navigate to http://localhost:3000/coordinator/conflicts
# Verify ConflictResolver interface loads without errors
```

### 2. Component Test Validation
```bash
# Run specific test
pnpm test ConflictResolver.test.tsx

# Should pass without jest path resolution errors
```

### 3. SyncEngine Test Validation
```bash
# Run core logic tests
pnpm test SyncEngine.test.ts

# Target: 15+ passing tests (improvement from current 13/19)
```

---

## Expected Outcomes

### ✅ **BEFORE FIXES:**
- ConflictResolver component exists but inaccessible ❌
- Coordinator dashboard has no conflicts section ❌
- Jest tests fail due to path resolution ❌
- SSR errors with window undefined ❌

### ✅ **AFTER FIXES:**
- Coordinators can access `/coordinator/conflicts` route ✅
- Dashboard shows conflict resolution card with navigation ✅
- All component tests pass without configuration errors ✅
- SSR compatibility resolved, no window errors ✅

---

## Technical References

### Next.js App Router Routing:
- **File Convention:** `app/(dashboard)/coordinator/conflicts/page.tsx` creates route `/coordinator/conflicts`
- **Dynamic Imports:** Use `dynamic()` with `ssr: false` for client-only components if needed
- **Metadata:** Export `metadata` object for SEO and page titles

### Jest Path Mapping Best Practices:
- **Pattern:** `'^@/(.*)$': '<rootDir>/src/$1'` for @ alias resolution  
- **Module Directories:** Include `<rootDir>/` for relative imports
- **Transform:** Use `next/babel` preset for proper Next.js compatibility

### SSR Safety Patterns:
- **Check:** `typeof window !== 'undefined'` before using window
- **UseEffect:** Move browser-only code to useEffect hooks
- **Conditional Rendering:** Use client-side state to avoid hydration mismatches

---

## Time Estimate

**Total Estimated Time:** 6-8 hours
- Route creation and integration: 2-3 hours
- Jest configuration fixes: 2-3 hours  
- SSR compatibility fixes: 1-2 hours
- Testing and validation: 1 hour

---

## Success Criteria

1. ✅ Coordinators can navigate to conflict resolution from dashboard
2. ✅ ConflictResolver interface loads without errors
3. ✅ All component tests pass (target: 100% pass rate)
4. ✅ SyncEngine tests improve (target: 15+ passing tests)
5. ✅ No SSR window undefined errors in console
6. ✅ Navigation menu includes "Conflict Resolution" item

**Final Validation:** A coordinator should be able to access the conflict resolution interface, view pending conflicts, and successfully resolve them with proper audit trail creation - all without any console errors or test failures.