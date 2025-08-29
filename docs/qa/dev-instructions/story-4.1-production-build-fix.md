# Story 4.1 Production Build Fix Instructions

## Issue: Production Build Blocked by Module Path Error

**Status**: Critical - Blocks production build  
**Affected**: `packages/frontend/src/app/api/v1/sync/priority/queue/route.ts:10`  
**Error**: `Module not found: Can't resolve '../../../../../../../../backend/src/lib/queue/syncProcessor'`

## Root Cause Analysis

Based on web search and Context7 research, this is a common Next.js monorepo issue where:
1. Dynamic imports across packages require careful path resolution
2. Module resolution fails when relative paths span package boundaries
3. Next.js build process cannot statically resolve the backend import path

## Fix Solutions (in order of preference)

### Solution 1: Configure Next.js for Monorepo Module Resolution ⭐ **RECOMMENDED**

**File**: `packages/frontend/next.config.js`

Add `outputFileTracingRoot` configuration to include backend modules in build tracing:

```javascript
const path = require('path')

module.exports = {
  webpack: (config, { isServer }) => {
    // ... existing config
  },
  
  // Add monorepo root for file tracing
  outputFileTracingRoot: path.join(__dirname, '../../'),
  
  // Ensure backend package is transpiled
  transpilePackages: ['@dms/shared', '@dms/backend'], // Add @dms/backend if it exists
  
  // ... existing config
}
```

### Solution 2: Fix Import Path Resolution

**File**: `packages/frontend/src/app/api/v1/sync/priority/queue/route.ts`

**Current problematic line 10**:
```typescript
const { getPriorityQueueStats, syncQueue } = await import('../../../../../../../../backend/src/lib/queue/syncProcessor');
```

**Fix Option A - Correct Relative Path**:
```typescript
const { getPriorityQueueStats, syncQueue } = await import('../../../../../../../backend/src/lib/queue/syncProcessor');
```

**Fix Option B - Use Workspace Alias (if configured)**:
```typescript
const { getPriorityQueueStats, syncQueue } = await import('@dms/backend/src/lib/queue/syncProcessor');
```

### Solution 3: Create Workspace Package Reference

**File**: `packages/backend/package.json`

Ensure the backend has proper exports:

```json
{
  "name": "@dms/backend",
  "exports": {
    ".": "./index.js",
    "./lib/queue/syncProcessor": "./src/lib/queue/syncProcessor.js"
  }
}
```

**File**: `packages/frontend/package.json`

Add backend as workspace dependency:

```json
{
  "dependencies": {
    "@dms/backend": "workspace:*"
  }
}
```

## Additional TypeScript Build Fixes

### Fix Node.js Types Issue in Shared Package

**Status**: ✅ Already resolved by adding `@types/node`

The TypeScript compilation errors in `packages/shared` have been resolved by adding `@types/node` dependency.

## Implementation Steps

1. **Apply Solution 1** (monorepo configuration):
   ```bash
   # Edit packages/frontend/next.config.js
   # Add outputFileTracingRoot configuration
   ```

2. **Test the build**:
   ```bash
   cd /path/to/project
   pnmp build
   ```

3. **If Solution 1 fails, apply Solution 2**:
   ```bash
   # Fix the import path in the API route
   # Test build again
   ```

4. **Verify production build**:
   ```bash
   pnpm --filter @dms/frontend build
   ```

## Related Research Findings

### Next.js Documentation References
- **Module Resolution**: Next.js requires explicit configuration for monorepo setups
- **Dynamic Imports**: Path must be statically analyzable or use proper aliases
- **OutputFileTracingRoot**: Essential for including files outside Next.js app directory

### Common Patterns from Context7
- **TranspilePackages**: Modern replacement for `next-transpile-modules`
- **Path Aliases**: Use `paths` in tsconfig.json with matching webpack aliases
- **Workspace Dependencies**: Proper package.json configuration crucial for module resolution

## Verification Checklist

- [ ] Build completes without module resolution errors
- [ ] API endpoint can dynamically import backend modules
- [ ] BullMQ integration works in development
- [ ] Production build includes all necessary backend files
- [ ] No runtime errors when accessing priority queue endpoint

## Fallback: Mock Implementation

If dynamic imports continue to fail, implement server-side only logic:

```typescript
// In API route
let queueData = null;
if (process.env.NODE_ENV === 'production') {
  // Use external service call or mock data
  queueData = await fetchQueueFromExternalAPI();
} else {
  // Development: use dynamic import
  const backend = await import('@dms/backend/lib/queue/syncProcessor');
  queueData = await backend.getPriorityQueueStats();
}
```

## Priority

**HIGH** - This fix is required for production deployment. The build cannot complete without resolving the module path issue.

---

*Generated based on web search findings and Next.js Context7 documentation analysis*