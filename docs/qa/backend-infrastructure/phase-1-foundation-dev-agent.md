# Phase 1: Foundation Deployment - Dev Agent Instructions

## 🚨 CRITICAL PROJECT STATUS
**Priority**: PROJECT-BLOCKING INFRASTRUCTURE CRISIS
**Urgency**: IMMEDIATE - MVP delivery at risk
**Problem**: 189 sophisticated frontend API endpoints with 100% mocked backends
**Solution**: Emergency backend infrastructure deployment

## AGENT MISSION
Deploy the missing foundational backend services to resolve the architectural crisis and enable real database-backed operations.

## REFERENCE DOCUMENTS
- **Primary**: `/docs/architecture.md` (Version 2.0 - Emergency Backend Infrastructure Update)
- **Database Schema**: `/docs/architecture/8-database-schema.md` (Complete Prisma schema)
- **Tech Stack**: `/docs/architecture/2-tech-stack.md` (Technology requirements)

## PHASE 1 OBJECTIVES (Days 1-3)
1. **Database Infrastructure**: Deploy PostgreSQL with existing Prisma schema
2. **Authentication System**: Implement NextAuth.js with multi-role support (Epic 9)
3. **Core Service Layer**: Create DatabaseService with repository pattern
4. **Critical API Endpoints**: Replace highest-priority mocked endpoints with real implementations

## DETAILED IMPLEMENTATION TASKS

### Task 1: Database Infrastructure Setup
```bash
# 1.1 Supabase Project Setup
npx supabase init
supabase start
supabase db push  # Deploy existing Prisma schema from packages/frontend/prisma/schema.prisma

# 1.2 Prisma Client Generation
cd packages/frontend
npx prisma generate

# 1.3 Environment Configuration
cp .env.example .env.local
# Configure DATABASE_URL with Supabase connection string
```

**Validation**: 
- Database schema deployed successfully
- Prisma client connects without errors
- All tables and indexes created correctly

### Task 2: Authentication System (Epic 9 Foundation)
**Files to Create:**
- `packages/frontend/src/lib/auth/authOptions.ts` - NextAuth.js configuration
- `packages/frontend/src/app/api/auth/[...nextauth]/route.ts` - Auth API route
- `packages/frontend/src/middleware.ts` - Route protection middleware

**Critical Requirements:**
- Multi-role user support (ASSESSOR, RESPONDER, COORDINATOR, DONOR, ADMIN)
- JWT session management with 24-hour expiry
- Role-based route protection
- Session persistence for PWA offline capability

**Implementation Pattern:**
```typescript
// Epic 9: Multi-role authentication
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        // Validate against PostgreSQL users table
        // Support multi-role assignment
        // Return user with roles and permissions
      }
    })
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      // Include role information in JWT
      if (user) {
        token.roles = user.roles;
        token.permissions = user.permissions;
      }
      return token;
    },
    session: async ({ session, token }) => {
      // Pass role info to session
      session.user.roles = token.roles;
      session.user.permissions = token.permissions;
      return session;
    }
  }
}
```

### Task 3: Database Service Layer
**File to Create:** `packages/frontend/src/lib/services/DatabaseService.ts`

**Critical Pattern - Repository Implementation:**
```typescript
export class DatabaseService {
  private static prisma = new PrismaClient();

  // Epic 9: User Management
  static async createUser(userData: CreateUserData): Promise<User> {
    return await this.prisma.user.create({
      data: {
        ...userData,
        password: await bcrypt.hash(userData.password, 12),
        roles: {
          create: userData.roles.map(role => ({
            role,
            permissions: { connect: await this.getDefaultPermissions(role) }
          }))
        }
      },
      include: { roles: { include: { permissions: true } } }
    });
  }

  // Replace mocked incident data
  static async getIncidents(filters: IncidentFilters): Promise<Incident[]> {
    return await this.prisma.incident.findMany({
      where: this.buildIncidentFilter(filters),
      include: { affectedEntities: true, preliminaryAssessments: true },
      orderBy: { date: 'desc' }
    });
  }

  // Story 8.3: Achievement calculation
  static async calculateAchievements(responseId: string): Promise<DonorAchievement[]> {
    // Implementation per architecture document
  }
}
```

### Task 4: Priority API Endpoint Migration
**Target Endpoints (Replace with real DB calls):**
1. `/api/v1/incidents/route.ts` - Core incident management
2. `/api/v1/entities/route.ts` - Affected entity management  
3. `/api/v1/users/route.ts` - Epic 9 user management
4. `/api/v1/donors/achievements/route.ts` - Story 8.3 achievement system

**Migration Pattern:**
```typescript
// BEFORE (mocked)
const mockData = [...];
return NextResponse.json({ success: true, data: mockData });

// AFTER (real database)
const realData = await DatabaseService.getEntities(filters);
return NextResponse.json({ success: true, data: realData });
```

## CRITICAL SUCCESS CRITERIA
- [ ] Supabase PostgreSQL running with deployed Prisma schema
- [ ] NextAuth.js authentication working with multi-role support
- [ ] DatabaseService repository pattern implemented
- [ ] At least 4 critical API endpoints connected to real database
- [ ] Frontend successfully connects to real backend without errors
- [ ] All existing tests still pass with real backend

## COMMON ERROR PREVENTION
- **Use `pnmp` not `npm`** (workspace configuration issue)
- **Avoid TypeScript enum imports in API routes** - use string literals instead
- **Database connection**: Ensure DATABASE_URL includes proper SSL configuration for Supabase
- **Authentication**: Test multi-role assignment and role switching functionality

## HANDOFF TO NEXT AGENT
After Phase 1 completion, handoff to **QA Agent** with:
- Database deployment status
- Authentication system validation results  
- List of migrated API endpoints
- Any integration issues discovered