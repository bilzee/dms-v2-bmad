# Comprehensive Mock-to-Real Data Migration Brownfield Enhancement PRD

## Intro Project Analysis and Context

### Analysis Source
✅ **IDE-based fresh analysis with existing comprehensive documentation**
- Architecture documentation available at docs/architecture/ (complete)
- PRD documentation available at docs/prd/ (complete)  
- QA analysis and handover documentation available

### Current Project State

**Project Purpose**: Disaster Management System (DMS) v2 - A comprehensive PWA-based platform for coordinating disaster response operations across multiple user roles (Admin, Coordinator, Assessor, Responder, Verifier, Donor).

**Current Architecture**: 
- **Frontend**: Next.js 14.2.x PWA with React 18.3.x, Zustand state management, Tailwind CSS
- **Backend**: Node.js 20.x LTS with Next.js API Routes, PostgreSQL 16.x, Prisma ORM
- **Infrastructure**: Offline-first PWA with IndexedDB, Service Workers, Redis caching

**Scale**: 50+ dashboard pages across 6 distinct user roles with complex incident management workflows.

### Available Documentation Analysis
✅ **Complete documentation available**:
- ✅ Tech Stack Documentation (docs/architecture/2-tech-stack.md)
- ✅ Source Tree/Architecture (docs/architecture/3-high-level-architecture.md)  
- ✅ Coding Standards (docs/architecture/13-development-guidelines-for-llm-driven-development.md)
- ✅ API Documentation (docs/architecture/5-api-specification.md)
- ✅ External API Documentation (comprehensive)
- ✅ Technical Debt Documentation (docs/architecture/)
- ✅ QA analysis and handover documentation

### Enhancement Scope Definition

**Enhancement Type**: ✅ **Major Feature Modification** + ✅ **System-wide Data Integration Overhaul**

**Enhancement Description**: 
**Comprehensive replacement of ALL mocked data across the entire DMS system** with real database-sourced data, leveraging the existing realistic dataset of 3 incidents. This includes badges, status indicators, charts, tables, lists, statistics, and any other UI elements currently displaying mock/hardcoded values.

**Excluded from Scope**: 
- `/monitoring` - Badge/status indicators already resolved
- `/monitoring/drill-down` - Badge/status indicators already resolved  
- `/map` - Badge/status indicators already resolved

**Updated Scale**: ~47+ dashboard pages (excluding 3 already-resolved monitoring/map pages)

**Impact Assessment**: ✅ **Major Impact** (architectural changes required)
- System-wide data layer changes across all ~47+ remaining pages
- Database query optimization and API endpoint standardization  
- Frontend data consumption pattern standardization
- Real data modeling and relationship establishment

### Goals and Background Context

**Goals**:
• Replace ALL mock data across the DMS system with real database-sourced data from existing 3-incident dataset
• Restore user trust by displaying realistic, contextually appropriate information
• Improve decision-making capability with reliable data reflecting actual disaster management operations
• Establish professional system credibility for emergency response scenarios
• Leverage existing monitoring/map page implementations as reference patterns for consistency
• Optimize system performance through intelligent data loading and caching strategies

**Background Context**:
Critical user feedback revealed that ALL data-driven UI elements across the DMS system display mock/hardcoded values, severely impacting user trust and decision-making capability. While the system has 3 realistic incidents in the database, the frontend continues to show placeholder content. The monitoring and map pages have been successfully resolved in another branch and serve as reference implementations. This comprehensive migration from mock-to-real data is essential for establishing the credibility needed in disaster management scenarios where accurate information is mission-critical.

**Business Impact**: System-wide transformation from placeholder content to fully functional disaster management platform reflecting actual operational data and workflows.

---

## Requirements

### Functional Requirements

**FR1**: ALL user interface elements across the DMS system displaying mock data must be replaced with real database-sourced data from the existing 3-incident dataset.

**FR2**: All pages must dynamically query and display data related to the 3 realistic incidents currently in the database, ensuring data relationships and dependencies are properly maintained.

**FR3**: Mock data replacement must extend beyond badges to include: charts, statistics, tables, lists, counters, progress indicators, activity feeds, user lists, resource counts, and any other data-driven UI elements.

**FR4**: Data sourcing must leverage existing database relationships and ensure referential integrity across all displayed information (incidents → assessments → responses → verifications → resources).

**FR5**: All data displays must be contextually appropriate to user roles (Admin sees system-wide data, Coordinator sees regional data, etc.) using the 3-incident dataset.

**FR6**: Dynamic data loading must maintain existing performance characteristics while providing real-time or near real-time accuracy where appropriate.

**FR7**: Data visualization components (charts, graphs, dashboards) must reflect actual incident data patterns and trends from the 3-incident dataset.

### Non-Functional Requirements

**NFR1**: Database queries for real data must be optimized to handle concurrent access across all user roles without performance degradation.

**NFR2**: Data loading must implement intelligent caching strategies to minimize database load while ensuring data freshness.

**NFR3**: Real data integration must maintain offline-first PWA capabilities with appropriate data synchronization strategies.

**NFR4**: System must gracefully handle scenarios where real data is insufficient (fewer than expected incidents/responses) with appropriate fallbacks.

**NFR5**: All real data implementations must support the existing 6 user roles with appropriate data filtering and permissions.

### Compatibility Requirements

**CR1**: **Database Schema Compatibility**: All real data queries must work with existing PostgreSQL schema and 3-incident dataset without requiring data model changes.

**CR2**: **API Layer Compatibility**: Real data integration must enhance existing API endpoints without breaking current functionality.

**CR3**: **Frontend Component Compatibility**: Real data must integrate with existing React components, Zustand state management, and UI patterns.

**CR4**: **User Role Compatibility**: Real data display must respect existing authentication and authorization patterns across all 6 user roles.

---

## Technical Constraints and Integration Requirements

### Existing Technology Stack

**Languages**: TypeScript/JavaScript (Node.js 20.x LTS, React 18.3.x)
**Frameworks**: Next.js 14.2.x (App Router), Tailwind CSS 3.4.x, Shadcn/ui
**Database**: PostgreSQL 16.x with Prisma ORM 5.14.x
**Infrastructure**: PWA with Service Workers, IndexedDB (Dexie.js), Redis caching, AWS S3
**External Dependencies**: NextAuth.js 4.24.x, Zustand 4.5.x, React Hook Form 7.51.x, Zod 3.23.x

### Integration Approach

**Database Integration Strategy**: 
- Leverage existing Prisma ORM schema with the 3-incident dataset
- Implement optimized queries using Prisma's relation loading and filtering
- Utilize PostgreSQL JSON support for complex data structures
- Implement connection pooling and query optimization for concurrent access

**API Integration Strategy**:
- Enhance existing Next.js API routes to serve real data instead of mock responses
- Implement data transformation layers to ensure consistent API response formats
- Add intelligent caching with Redis to minimize database queries
- Maintain RESTful patterns while optimizing for PWA offline capabilities

**Frontend Integration Strategy**:
- Replace mock data generators with API calls using existing SWR patterns
- Implement data normalization in Zustand stores for cross-component data sharing
- Enhance loading states and error boundaries for real data scenarios
- Utilize React Hook Form with Zod validation for data integrity

**Testing Integration Strategy**:
- Update existing tests to work with real data instead of mocked responses
- Implement database seeding for consistent test environments
- Add integration tests that validate end-to-end data flow from database to UI
- Maintain existing Jest/Testing Library patterns while handling asynchronous data

### Code Organization and Standards

**File Structure Approach**: 
- Maintain existing Next.js App Router structure
- Organize data fetching hooks in `/hooks` directory following established patterns
- Keep API routes in `/app/api` with logical grouping by domain (incidents, assessments, responses)
- Place data transformation utilities in `/lib/utils` directory

**Naming Conventions**: 
- Follow existing camelCase for JavaScript/TypeScript
- Use descriptive names for real data hooks (e.g., `useIncidentData`, `useRealAssessments`)
- Maintain kebab-case for file names and URL paths
- Prefix API endpoints with version (e.g., `/api/v1/incidents/real`)

**Coding Standards**: 
- Follow existing TypeScript strict mode configuration
- Maintain Prisma-generated types for database consistency
- Use existing ESLint and Prettier configurations
- Implement error handling patterns consistent with existing codebase

**Documentation Standards**: 
- Update existing API documentation to reflect real data endpoints
- Document data relationships and dependencies in the 3-incident dataset
- Maintain JSDoc comments for complex data transformation functions
- Update component stories and examples to use real data

### Deployment and Operations

**Build Process Integration**: 
- Maintain existing Next.js build process with no additional build steps required
- Ensure database migrations are properly handled in deployment pipeline
- Verify that environment variables for database connections are properly configured
- Test that static generation works with real data for appropriate pages

**Deployment Strategy**: 
- Use existing deployment pipeline without modifications
- Implement database health checks before application startup
- Ensure proper connection string configuration for production database
- Maintain existing PWA caching strategies while accommodating real data

**Monitoring and Logging**: 
- Enhance existing logging to include database query performance metrics
- Monitor API response times for real data endpoints
- Implement alerting for database connection issues or query timeouts
- Track user experience metrics for real vs mock data performance

**Configuration Management**: 
- Use existing environment variable patterns for database configuration
- Maintain existing feature flag system for gradual rollout capabilities
- Ensure proper secrets management for database credentials
- Keep existing development/staging/production environment separation

### Risk Assessment and Mitigation

**Technical Risks**:
- Database performance degradation with multiple concurrent users accessing real data
- Insufficient data in 3-incident dataset for comprehensive testing across all user scenarios
- Complex data relationships causing circular dependencies or N+1 query problems
- PWA offline synchronization complexity with real data updates

**Integration Risks**:
- Existing components assuming mock data patterns may break with real data structures
- API response format changes required for real data may impact existing frontend code
- Authentication and authorization complexities with real data access across 6 user roles
- Caching invalidation strategies needed for real data that changes over time

**Deployment Risks**:
- Database migration issues when transitioning from mock to real data endpoints
- Performance bottlenecks during initial real data loading across all pages
- Service worker cache conflicts between mock and real data responses
- Rollback complexity if real data integration causes system instability

**Mitigation Strategies**:
- Implement comprehensive database indexing and query optimization before rollout
- Create database seeding scripts to expand the 3-incident dataset for testing scenarios
- Use feature flags to enable gradual migration from mock to real data page by page
- Implement circuit breaker patterns to fall back to cached data during database issues
- Establish comprehensive monitoring and alerting before production deployment
- Create detailed rollback procedures including cache clearing and endpoint switching

---

## Epic and Story Structure

### Epic Approach

**Epic Structure Decision**: **Single comprehensive epic** with systematic story sequencing to minimize risk to existing system functionality.

**Rationale**: This system-wide mock-to-real data migration requires careful coordination across all pages to ensure consistent patterns and minimize risk. All mock data replacement shares the same underlying database and API patterns, with cross-page dependencies that benefit from unified coordination.

---

## Epic 1: Comprehensive Mock-to-Real Data Migration

**Epic Goal**: Transform the DMS system from displaying mock/hardcoded data to utilizing the existing 3-incident database dataset across all user interfaces, establishing professional credibility and enabling reliable disaster management decision-making.

**Integration Requirements**: Seamless integration with existing Next.js/PostgreSQL/Prisma architecture while maintaining PWA offline capabilities, user role-based data filtering, and system performance standards.

### Story 1.1: Database Foundation and API Infrastructure
As a **System Administrator**,
I want **optimized database queries and API endpoints for real data access**,
so that **the system can efficiently serve real data to all user roles without performance degradation**.

#### Acceptance Criteria
1. Database indexing optimized for common query patterns across incidents, assessments, responses
2. API endpoints enhanced to serve real data with appropriate role-based filtering
3. Query performance benchmarked and optimized for concurrent access scenarios
4. Caching strategies implemented with Redis for frequently accessed data
5. Database connection pooling configured for production load

#### Integration Verification
- **IV1**: All existing API endpoints continue to function without breaking changes
- **IV2**: Database schema remains unchanged and backward compatible
- **IV3**: Performance benchmarks show no degradation in API response times

### Story 1.2: Shared Data Hooks and Components Foundation
As a **Frontend Developer**,
I want **reusable data fetching hooks and components for real data**,
so that **consistent patterns can be applied across all pages efficiently**.

#### Acceptance Criteria
1. Custom hooks created for common data patterns (useIncidents, useAssessments, useResponses)
2. Shared components updated to handle real data loading states and errors
3. Zustand store patterns established for cross-component data sharing
4. TypeScript types aligned with Prisma-generated database schemas
5. SWR configuration optimized for real data caching and revalidation

#### Integration Verification
- **IV1**: Existing component interfaces remain unchanged
- **IV2**: Mock data hooks can coexist during transition period
- **IV3**: PWA offline synchronization continues to function properly

### Story 1.3: Admin Dashboard Real Data Integration
As an **Admin User**,
I want **all dashboard elements to display real data from the 3-incident dataset**,
so that **I can make informed system-wide management decisions based on actual operations**.

#### Acceptance Criteria
1. All admin dashboard charts, statistics, and tables display real incident data
2. User management sections show actual user counts and activity
3. System health indicators reflect real database and API status
4. Resource allocation displays show actual resources from 3 incidents
5. Performance metrics dashboards show real system usage data

#### Integration Verification
- **IV1**: Existing admin functionality (user management, settings) remains intact
- **IV2**: Admin permissions and access controls continue to function
- **IV3**: Dashboard loading performance meets existing benchmarks

### Story 1.4: Coordinator Dashboard Real Data Integration
As a **Coordinator User**,
I want **all coordination dashboards to display real incident and resource data**,
so that **I can effectively coordinate disaster response operations using accurate information**.

#### Acceptance Criteria
1. Incident overview panels show real incident status and progress
2. Resource coordination views display actual available resources
3. Team assignment interfaces show real responder availability and assignments
4. Communication feeds display actual incident-related messages and updates
5. Geographic views integrate with real incident location data

#### Integration Verification
- **IV1**: Existing coordination workflows (assignment, communication) remain functional
- **IV2**: Role-based data filtering shows appropriate coordinator-level information
- **IV3**: Real-time updates continue to function with WebSocket integration

### Story 1.5: Assessor Dashboard Real Data Integration
As an **Assessor User**,
I want **assessment workflows to display and process real incident data**,
so that **I can conduct accurate damage assessments based on actual incident information**.

#### Acceptance Criteria
1. Assessment forms pre-populate with real incident context and details
2. Assessment history displays actual completed assessments from the dataset
3. Damage reporting interfaces show real incident impact data
4. Assessment assignment views show actual assigned incidents
5. Assessment status tracking reflects real workflow states

#### Integration Verification
- **IV1**: Existing assessment form functionality and validation remain intact
- **IV2**: Assessment submission and approval workflows continue to function
- **IV3**: Assessment data relationships maintain referential integrity

### Story 1.6: Responder Dashboard Real Data Integration
As a **Responder User**,
I want **response dashboards to show real incident assignments and response data**,
so that **I can execute effective disaster response based on actual operational requirements**.

#### Acceptance Criteria
1. Response assignment views display real incident tasks and priorities
2. Resource request interfaces show actual available resources and inventory
3. Response progress tracking reflects real response activities and completion status
4. Team coordination views show actual team member assignments and status
5. Field reporting interfaces integrate with real incident and assessment data

#### Integration Verification
- **IV1**: Existing response workflows (task completion, reporting) remain functional
- **IV2**: Response assignment and notification systems continue to function
- **IV3**: Mobile PWA functionality maintains offline response capabilities

### Story 1.7: Verifier Dashboard Real Data Integration
As a **Verifier User**,
I want **verification workflows to process real response and assessment data**,
so that **I can validate disaster response activities using accurate operational information**.

#### Acceptance Criteria
1. Verification queue displays real assessments and responses requiring verification
2. Verification forms show complete context from real incident, assessment, and response data
3. Verification status tracking reflects real verification workflow states
4. Quality assurance dashboards show actual verification metrics and trends
5. Approval workflows integrate with real data relationships and dependencies

#### Integration Verification
- **IV1**: Existing verification approval workflows remain intact
- **IV2**: Verification notification and escalation systems continue to function
- **IV3**: Verification audit trails maintain data integrity and traceability

### Story 1.8: Donor Dashboard Real Data Integration
As a **Donor User**,
I want **donation and resource dashboards to reflect real incident needs and contributions**,
so that **I can make informed donation decisions based on actual disaster response requirements**.

#### Acceptance Criteria
1. Resource need displays show actual requirements from the 3-incident dataset
2. Donation tracking interfaces show real contribution history and impact
3. Resource matching displays connect real needs with available donor resources
4. Impact reporting shows actual outcomes from donor contributions
5. Communication interfaces display real incident updates and thank you messages

#### Integration Verification
- **IV1**: Existing donation processing and tracking workflows remain functional
- **IV2**: Donor communication and notification systems continue to function
- **IV3**: Resource allocation and distribution tracking maintains accuracy

### Story 1.9: Homepage and Navigation Real Data Integration
As **Any System User**,
I want **homepage features and navigation elements to display real system data**,
so that **I have an accurate overview of current disaster response operations**.

#### Acceptance Criteria
1. Homepage feature cards display real incident statistics and system activity
2. Navigation badges show actual counts for notifications, tasks, and alerts
3. System status indicators reflect real operational state and health
4. Quick access panels show real recent activities and priority items
5. Search and filtering features work with real data across all content types

#### Integration Verification
- **IV1**: Existing navigation functionality and user flows remain intact
- **IV2**: Authentication and role-based access controls continue to function properly
- **IV3**: PWA installation and offline functionality maintain existing capabilities

### Story 1.10: Performance Optimization and System Integration
As a **System Administrator**,
I want **the real data system to perform optimally under production load**,
so that **users experience fast, reliable access to disaster management information**.

#### Acceptance Criteria
1. All pages load with real data within existing performance benchmarks
2. Database query optimization eliminates N+1 queries and reduces response times
3. Caching strategies minimize database load while ensuring data freshness
4. Error handling provides graceful degradation when database issues occur
5. System monitoring and alerting covers real data performance and availability

#### Integration Verification
- **IV1**: All existing functionality continues to work with real data implementation
- **IV2**: PWA performance and offline synchronization meet existing standards
- **IV3**: System scalability maintains capacity for expected user load growth

---

## Change Log

| Change | Date | Version | Description | Author |
|--------|------|---------|-------------|---------|
| Initial PRD Creation | 2025-09-17 | 1.0 | Comprehensive Mock-to-Real Data Migration PRD created based on QA handover and system analysis | PM Agent (John) |