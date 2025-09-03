# Phase 2: API Migration - Dev Agent Instructions

## 🚨 MASS API ENDPOINT MIGRATION
**Previous Agent**: QA Agent (Phase 1 Validation - PASSED)
**Mission**: Replace 189 mocked API endpoints with real database implementations
**Duration**: Days 4-10
**Dependencies**: Completed Phase 1 foundation (database, auth, service layer)

## MIGRATION STRATEGY
**Systematic Mock-to-Real Replacement** - Preserve all existing API contracts while connecting to real PostgreSQL backend through the established DatabaseService layer.

## REFERENCE DOCUMENTS
- **Architecture**: `/docs/architecture.md` (Implementation patterns and service layer)
- **Database Schema**: Deployed Prisma schema in Supabase
- **Service Layer**: `packages/frontend/src/lib/services/DatabaseService.ts` (from Phase 1)

## MIGRATION PRIORITIES

### Priority 1: Core Entity Endpoints (Days 4-5)
**Critical for frontend functionality:**

1. **Incident Management** (8 endpoints):
   - `packages/frontend/src/app/api/v1/incidents/route.ts`
   - `packages/frontend/src/app/api/v1/incidents/[id]/route.ts`
   - `packages/frontend/src/app/api/v1/incidents/[id]/status/route.ts`
   - `packages/frontend/src/app/api/v1/incidents/[id]/timeline/route.ts`
   - `packages/frontend/src/app/api/v1/incidents/[id]/entities/route.ts`
   - `packages/frontend/src/app/api/v1/incidents/[id]/entities/[entityId]/route.ts`
   - `packages/frontend/src/app/api/v1/incidents/from-assessment/route.ts`

2. **Entity Management** (4 endpoints):
   - `packages/frontend/src/app/api/v1/entities/route.ts`
   - `packages/frontend/src/app/api/v1/entities/[id]/route.ts`

3. **Assessment Operations** (6 endpoints):
   - Core assessment CRUD operations
   - Verification status management
   - Queue operations

### Priority 2: Epic 9 User Management (Days 6-7)
**New endpoints for admin functionality:**

1. **User CRUD Operations**:
   - `packages/frontend/src/app/api/v1/users/route.ts` - Create/list users
   - `packages/frontend/src/app/api/v1/users/[id]/route.ts` - Get/update/delete user
   - `packages/frontend/src/app/api/v1/users/[id]/roles/route.ts` - Role assignment

2. **Permission Management**:
   - `packages/frontend/src/app/api/v1/permissions/route.ts` - List/create permissions
   - `packages/frontend/src/app/api/v1/roles/[role]/permissions/route.ts` - Role permission assignment

3. **Admin Dashboard Data**:
   - `packages/frontend/src/app/api/v1/admin/users/stats/route.ts` - User statistics
   - `packages/frontend/src/app/api/v1/admin/system/audit/route.ts` - Audit trail

### Priority 3: Story 8.3 Achievement System (Day 8)
**Verification-based achievement endpoints:**

1. **Achievement Core**:
   - `packages/frontend/src/app/api/v1/donors/achievements/verification-based/route.ts`
   - `packages/frontend/src/app/api/v1/donors/achievements/calculate/route.ts`
   - `packages/frontend/src/app/api/v1/donors/achievements/rules/route.ts`

2. **Verification Integration**:
   - `packages/frontend/src/app/api/v1/verification/responses/[id]/stamp/route.ts`
   - Enhance existing verification endpoints with achievement triggers

### Priority 4: Remaining Endpoints (Days 9-10)
**Complete the migration:**
- Sync system endpoints (Epic 4)
- Monitoring dashboard endpoints (Epic 6) 
- Donor management endpoints (Epic 8)
- All remaining utility endpoints

## MIGRATION IMPLEMENTATION PATTERN

### Standard Migration Process
For each endpoint file:

1. **Locate mock data section:**
```typescript
// BEFORE: Mock data arrays
const mockIncidents = [
  { id: '1', name: 'Mock Incident', ... }
];
```

2. **Replace with DatabaseService call:**
```typescript
// AFTER: Real database call
const incidents = await DatabaseService.getIncidents(filters);
```

3. **Update error handling:**
```typescript
// Use unified error handling pattern
try {
  const result = await DatabaseService.operation();
  return NextResponse.json({
    success: true,
    data: result,
    message: 'Operation successful',
    timestamp: new Date().toISOString(),
  });
} catch (error) {
  return this.handleApiError(error);
}
```

4. **Validate against existing tests:**
```bash
pnpm --filter frontend test [endpoint-test-file]
```

## EPIC 9 SPECIFIC IMPLEMENTATION

### User Management Service Methods
**Required DatabaseService methods for Epic 9:**

```typescript
// Epic 9: Complete user management
static async createUser(userData: CreateUserData): Promise<User>
static async updateUser(id: string, updates: Partial<User>): Promise<User>
static async deleteUser(id: string): Promise<void>
static async assignRole(userId: string, role: Role): Promise<UserRole>
static async removeRole(userId: string, role: Role): Promise<void>
static async listUsers(filters: UserFilters): Promise<PaginatedUsers>
static async getUserWithRoles(id: string): Promise<UserWithRoles>

// Permission management
static async createPermission(permission: CreatePermissionData): Promise<Permission>
static async assignPermission(roleId: string, permissionId: string): Promise<void>
static async listPermissions(): Promise<Permission[]>

// Audit trail
static async logUserAction(action: UserAction): Promise<AuditLog>
static async getAuditTrail(filters: AuditFilters): Promise<AuditLog[]>
```

### Admin Middleware Implementation
**File**: `packages/frontend/src/lib/middleware/adminAuth.ts`

```typescript
export async function requireAdminRole(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hasAdminRole = session.user.roles.some(role => 
    role.role === 'ADMIN' && role.isActive
  );

  if (!hasAdminRole) {
    return NextResponse.json({ error: 'Admin role required' }, { status: 403 });
  }

  return null; // Authorization passed
}
```

## STORY 8.3 SPECIFIC IMPLEMENTATION

### Achievement Engine Integration
**File**: `packages/frontend/src/lib/achievements/achievementEngine.ts`

**Critical Integration Points:**
1. **Verification Event Triggers**: Hook achievement calculation into verification workflow
2. **Real-time Calculation**: Achievements calculated immediately when responses verified
3. **Database Integration**: Use existing DonorAchievement and new AchievementRule tables

```typescript
// Story 8.3: Achievement calculation on verification
export class AchievementEngine {
  static async onResponseVerified(responseId: string): Promise<DonorAchievement[]> {
    const response = await DatabaseService.getResponse(responseId);
    if (!response.donorId) return [];

    const rules = await DatabaseService.getActiveAchievementRules();
    const newAchievements = [];

    for (const rule of rules) {
      if (await this.evaluateRule(rule, response)) {
        const achievement = await DatabaseService.createAchievement({
          donorId: response.donorId,
          type: rule.type,
          verificationId: response.verificationId,
          responseId: responseId,
          ...rule.badge
        });
        newAchievements.push(achievement);
      }
    }

    return newAchievements;
  }
}
```

## CRITICAL MIGRATION REQUIREMENTS

### API Contract Preservation
**ABSOLUTELY CRITICAL**: Do not modify existing API response formats
- Maintain exact same JSON structure expected by frontend
- Preserve all query parameters and request body schemas
- Keep same HTTP status codes and error formats

### Database String Literal Pattern
**CRITICAL**: Avoid TypeScript enum imports in API routes
```typescript
// ❌ NEVER DO THIS in API routes
import { CommitmentStatus } from '@dms/shared';
const status = CommitmentStatus.PLANNED;

// ✅ ALWAYS DO THIS instead
const status = 'PLANNED'; // Database enum will validate
```

### Testing Requirements
**After each endpoint migration:**
```bash
# Run existing tests
pnpm --filter frontend test [specific-endpoint-test]

# Verify frontend integration
pnpm dev
# Manual test: Navigate to pages using the migrated endpoint
```

## MIGRATION TRACKING
**Create tracking document:** `docs/qa/backend-infrastructure/migration-progress.md`

Track each endpoint:
- [ ] `/api/v1/incidents/route.ts` - Status: Not Started / In Progress / Complete / Failed
- [ ] `/api/v1/entities/route.ts` - Status: ...
- [ ] [Continue for all 189 endpoints]

## SUCCESS CRITERIA FOR PHASE 2
- [ ] All 189 API endpoints connected to real database
- [ ] Epic 9 user management fully functional
- [ ] Story 8.3 achievement system integrated with verification workflow
- [ ] Zero breaking changes to existing frontend functionality
- [ ] All existing tests pass with real backend
- [ ] Performance requirements met (<500ms API response times)

## COMMON ERRORS TO AVOID
- **Database connection leaks**: Ensure proper Prisma client usage patterns
- **Enum import errors**: Use string literals, not imported enums in API routes
- **Authentication bypass**: Verify all protected endpoints require proper authentication
- **Response format changes**: Maintain exact API contract compatibility

## CRITICAL INTEGRATION TESTING
**End of Phase 2 validation:**
```bash
# Full test suite
pnpm test

# Build verification (Epic 10 requirement)
pnpm --filter frontend build

# E2E testing with real backend
pnpm playwright test

# Performance validation
# Verify <3 second load times with real database
```

## HANDOFF TO NEXT PHASE
**After Phase 2 completion, handoff to QA Agent (Phase 2 Validation) with:**
- Complete migration status report (all 189 endpoints)
- Epic 9 user management validation results
- Story 8.3 achievement system integration status
- Performance testing results
- Any integration issues requiring Phase 3 attention
- Frontend compatibility verification results