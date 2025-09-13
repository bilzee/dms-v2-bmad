# Frontend Mock Data Inventory

## Summary
- **Total Components Audited:** 147
- **Components with Mock Data:** 4 (production code)
- **Mock Data Violations Found:** 4
- **Test Files with Mocks:** 85+ (compliant - test mocks acceptable)

## Detailed Findings

### Component: IncidentReviewQueue
- **Location:** src/components/features/incident/IncidentReviewQueue.tsx:78
- **Mock Data Type:** Object Array
- **Data Structure:** Array of Incident objects with crypto.randomUUID() IDs
- **Current Usage:** Hardcoded in component's useEffect hook for display
- **CLAUDE.md Compliance:** **VIOLATION** - Component-level hardcoded mock data
- **Migration Complexity:** Medium
- **API Endpoint Available:** YES - `/api/v1/incidents` exists
- **Comments:** Contains TODO pointing to correct API endpoint structure

### Component: SeedResponses Data File
- **Location:** src/lib/dev-data/seed-responses.ts
- **Mock Data Type:** Object Array
- **Data Structure:** 3 comprehensive RapidResponse objects (Health, WASH, Food)
- **Current Usage:** Exported for seeding/development purposes
- **CLAUDE.md Compliance:** **VIOLATION** - Should be moved to API endpoint mocking
- **Migration Complexity:** High
- **API Endpoint Available:** YES - `/api/v1/responses/plans` exists
- **Comments:** Well-structured mock data but violates component-level rule

### Component: SampleDataService
- **Location:** src/lib/services/SampleDataService.ts:21
- **Mock Data Type:** Object Array
- **Data Structure:** OfflineQueueItem objects for testing IndexedDB
- **Current Usage:** Service-level mock data generation for testing
- **CLAUDE.md Compliance:** **PARTIAL COMPLIANCE** - Service-level, not component-level
- **Migration Complexity:** Low
- **API Endpoint Available:** YES - `/api/v1/queue` exists
- **Comments:** Better pattern - service handles mocking, not components

### Component: DonorCoordination Hook
- **Location:** src/hooks/useDonorCoordination.ts:85
- **Mock Data Type:** Object Array
- **Data Structure:** CoordinationWorkspaceItem objects
- **Current Usage:** Hardcoded in custom hook for coordination workspace
- **CLAUDE.md Compliance:** **VIOLATION** - Hook-level hardcoded mock data
- **Migration Complexity:** Medium
- **API Endpoint Available:** YES - `/api/v1/coordinator/resources` exists
- **Comments:** Should fetch from API endpoint instead

## Mock Data Patterns Analysis

### Compliant Patterns Found:
1. **Test Files:** 85+ test files use mocks appropriately for testing
2. **SampleDataService:** Service-level abstraction for mock data (better pattern)

### Violation Patterns Found:
1. **Component-Level Hardcoding:** Direct mock arrays in components
2. **Hook-Level Hardcoding:** Mock data embedded in custom hooks
3. **Dev Data Files:** Development seed files that should use API mocking

## Integration Readiness Assessment

### Ready for API Integration:
- **SampleDataService:** Already abstracted, easy to connect to API
- **Test Infrastructure:** Well-isolated test mocks won't interfere

### Requires Migration:
- **IncidentReviewQueue:** Direct component mock → API call migration
- **SeedResponses:** Development seed data → API endpoint mocking
- **DonorCoordination:** Hook mock data → API integration

## Recommendations

1. **Immediate Priority:** Migrate IncidentReviewQueue component mock data
2. **Service Pattern:** Use SampleDataService pattern as template for other mocks
3. **API Integration:** All identified violations have corresponding API endpoints
4. **Testing:** Maintain test mocks - they follow correct patterns