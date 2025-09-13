# Priority Task List - Mock Data Migration

## P0 Critical Tasks

### 1. IncidentReviewQueue Component Migration - 3 hours
**File:** `src/components/features/incident/IncidentReviewQueue.tsx:78`
**Issue:** Component-level hardcoded mock incidents array
**Risk Level:** HIGH - Core incident management functionality
**Business Impact:** Critical user workflow affected
**Migration Steps:**
- Replace hardcoded `mockIncidents` array with API call to `/api/v1/incidents`
- Update useEffect hook to use async fetch pattern
- Handle loading states and error conditions
- Remove TODO comments after implementation
**Dependencies:** None
**Testing Required:** Unit tests for API integration, E2E test for incident queue

### 2. DonorCoordination Hook Migration - 4 hours
**File:** `src/hooks/useDonorCoordination.ts:85`
**Issue:** Hook-level hardcoded workspace items
**Risk Level:** HIGH - Donor coordination core functionality
**Business Impact:** Affects resource allocation workflows
**Migration Steps:**
- Replace `mockWorkspaceItems` with API call to `/api/v1/coordinator/resources/allocate`
- Implement proper error handling and loading states
- Update hook return types if needed
- Ensure workspace data consistency
**Dependencies:** Verify API endpoint data structure matches mock
**Testing Required:** Hook testing, integration tests for coordination features

## P1 High Priority Tasks

### 3. SeedResponses Data Architecture Migration - 6 hours
**File:** `src/lib/dev-data/seed-responses.ts`
**Issue:** Development seed data violates CLAUDE.md principles
**Risk Level:** MEDIUM - Development workflow impact
**Business Impact:** Affects development team productivity
**Migration Steps:**
- Move seed data to API endpoint mocking layer
- Implement Mock Service Worker (MSW) configuration
- Create development environment data seeding
- Update development setup documentation
**Dependencies:** MSW library installation and configuration
**Testing Required:** Development environment validation, team workflow testing

### 4. SampleDataService Integration Enhancement - 2 hours
**File:** `src/lib/services/SampleDataService.ts:21`
**Issue:** Service-level mock data should integrate with API
**Risk Level:** LOW - Already follows better patterns
**Business Impact:** Testing and development efficiency
**Migration Steps:**
- Connect service to actual API endpoints `/api/v1/queue`
- Maintain backward compatibility for testing
- Add configuration flag for mock vs real data
- Update service documentation
**Dependencies:** None
**Testing Required:** Service integration tests, queue functionality validation

## P2 Medium Priority Tasks

### 5. Mock Service Worker (MSW) Implementation - 8 hours
**Scope:** Project-wide mocking infrastructure
**Issue:** Centralized API-level mocking needed for CLAUDE.md compliance
**Risk Level:** MEDIUM - Architecture improvement
**Business Impact:** Long-term development efficiency and compliance
**Migration Steps:**
- Install and configure MSW for development environment
- Create mock handlers for all endpoints used by migrated components
- Set up environment-based mocking configuration
- Create developer documentation for MSW usage
**Dependencies:** Team alignment on MSW adoption
**Testing Required:** Full development workflow validation

### 6. Development Environment Configuration - 4 hours
**Scope:** Environment setup and documentation
**Issue:** Standardize mock data handling across development environments
**Risk Level:** LOW - Process improvement
**Business Impact:** Team consistency and onboarding efficiency
**Migration Steps:**
- Create environment configuration for mock vs real API
- Update development setup documentation
- Create developer guidelines for mock data patterns
- Implement configuration validation
**Dependencies:** MSW implementation completion
**Testing Required:** New developer onboarding process validation

## P3 Low Priority Tasks

### 7. Legacy Mock Pattern Cleanup - 3 hours
**Scope:** Codebase cleanup and documentation
**Issue:** Remove outdated patterns and improve code quality
**Risk Level:** LOW - Code quality improvement
**Business Impact:** Maintenance efficiency
**Migration Steps:**
- Remove unused mock data files
- Update code comments and documentation
- Standardize import patterns
- Create mock data usage guidelines
**Dependencies:** All P0-P1 tasks completed
**Testing Required:** Regression testing to ensure no functionality broken

## Risk Assessment & Mitigation Strategies

### High-Risk Items:
1. **IncidentReviewQueue Migration**
   - **Risk:** Critical user workflow disruption
   - **Mitigation:** Implement behind feature flag, gradual rollout
   - **Rollback Plan:** Keep original mock data in separate branch

2. **DonorCoordination Migration**
   - **Risk:** Resource allocation workflow breaks
   - **Mitigation:** Thorough API endpoint validation before migration
   - **Rollback Plan:** Service layer abstraction allows quick mock fallback

### Medium-Risk Items:
1. **SeedResponses Architecture Change**
   - **Risk:** Development team workflow disruption
   - **Mitigation:** Parallel implementation, team training
   - **Rollback Plan:** Maintain existing development patterns during transition

### Technical Debt Assessment:
- **Current State:** 4 CLAUDE.md violations identified
- **Post-Migration:** 0 violations expected
- **Code Quality Impact:** Significant improvement in API integration patterns
- **Maintenance Burden:** Reduced through standardized patterns

## Timeline & Resource Allocation

### Sprint 1 (1 week): P0 Critical Tasks
- Days 1-2: IncidentReviewQueue migration
- Days 3-4: DonorCoordination hook migration
- Day 5: Testing and validation

### Sprint 2 (1 week): P1 High Priority Tasks
- Days 1-3: SeedResponses architecture migration
- Days 4-5: SampleDataService enhancement

### Sprint 3 (1 week): P2 Medium Priority Tasks
- Days 1-4: MSW implementation
- Day 5: Development environment configuration

**Total Estimated Effort:** 30 hours (3 weeks at 50% allocation)
**Recommended Team Size:** 1 senior developer + 1 QA engineer for validation

## Success Criteria

### Completion Indicators:
- [ ] All 4 CLAUDE.md violations resolved
- [ ] API integration tests passing
- [ ] Development workflow documentation updated
- [ ] Team trained on new patterns
- [ ] Performance baseline maintained

### Quality Gates:
- [ ] No regression in existing functionality
- [ ] API integration patterns standardized
- [ ] Mock data centralized at API level
- [ ] Development environment stability maintained
- [ ] Code review approval for all changes

## Handoff to Dev Agent

**Ready for Implementation:** All tasks have clear specifications, API endpoints confirmed available, and risk mitigation strategies defined.

**Key Handoff Items:**
1. Detailed migration steps for each component
2. API endpoint mapping and validation
3. Risk mitigation strategies and rollback plans
4. Testing requirements and success criteria
5. Timeline and resource allocation recommendations