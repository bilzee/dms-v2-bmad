# Architect Agent - Critical Infrastructure Implementation Instructions

## 🚨 CRITICAL PROJECT STATUS

### Infrastructure Crisis Overview
The DMS-v2-BMAD project has a **critical architectural sequencing violation** that threatens MVP delivery:

- **Epic 10 (Technical Infrastructure)** was planned as Phase 1 foundation but **never implemented**
- **Stories 3.7, 4.1, 4.2, 5.2, 5.3, 6.1, 8.2, 8.3** have been completed with **entirely mocked backend services**
- **No real database, authentication, API endpoints, or sync infrastructure exists**
- **All frontend components depend on non-existent backend services**

### Current State Analysis
- **Frontend**: Advanced implementation with sophisticated components, forms, and workflows
- **Backend**: 100% mocked - no PostgreSQL database, no API routes, no authentication system
- **Data Persistence**: IndexedDB client-side storage serving as temporary substitute
- **Integration Debt**: Growing complexity of connecting real backend to existing frontend

## ARCHITECT AGENT MISSION

### Primary Objective
Design and plan the **immediate implementation of Epic 10 (Technical Infrastructure)** to provide the missing foundational backend services that all existing stories depend on.

### Key Deliverables Required

#### 1. Backend Implementation Strategy
- **Database Implementation Plan**: PostgreSQL setup with Prisma schema deployment
- **Authentication System Design**: JWT-based auth with role management integration
- **API Endpoint Implementation**: RESTful API matching all mocked endpoints in existing frontend
- **Integration Strategy**: Plan for connecting existing frontend components to real backend services

#### 2. Epic 10 Story Breakdown
Create missing stories for Epic 10 based on user stories:
- **TI-001: Progressive Web App Core** - Service worker, PWA manifest
- **TI-002: Performance Optimization** - Backend performance requirements  
- **TI-003: Security Implementation** - Authentication, encryption, security measures
- **TI-004: Data Backup & Recovery** - Database management and backup procedures

#### 3. Integration Risk Assessment
- **Frontend-Backend Coupling Analysis**: Identify tight coupling points in existing code
- **Mock-to-Real Migration Plan**: Strategy for replacing mocked services with real implementations
- **Breaking Change Assessment**: Potential breaking changes and mitigation strategies
- **Testing Impact**: How backend implementation affects existing test suites

#### 4. Development Sequence Correction
- **Priority Resequencing**: Recommend development order to minimize disruption
- **Dependencies Map**: Clear dependencies between backend infrastructure and existing frontend features
- **Parallel Development Strategy**: How to continue frontend development while building backend
- **Integration Milestones**: Key integration points and validation checkpoints

## CURRENT ARCHITECTURE STATE

### Existing Frontend Implementation
Based on git commits, the following stories are complete with mocked backends:

#### Epic 3: Coordinator Verification (Story 3.7)
- **Frontend**: Bulk operations for verification queues
- **Missing Backend**: Verification workflow API, bulk operation endpoints

#### Epic 4: Smart Synchronization (Stories 4.1, 4.2)  
- **Frontend**: Priority-based sync UI, background sync components
- **Missing Backend**: Sync engine, conflict resolution system, priority queue management

#### Epic 5: Coordination Dashboard (Stories 5.2, 5.3)
- **Frontend**: Dashboard components, performance monitoring
- **Missing Backend**: Real-time data aggregation, performance metrics API

#### Epic 6: Monitoring Dashboard (Story 6.1)
- **Frontend**: Situation display, interactive mapping
- **Missing Backend**: Real-time data feeds, mapping data API

#### Epic 8: Donor Management (Stories 8.2, 8.3)
- **Frontend**: Donor performance tracking, achievement system
- **Missing Backend**: Donor management API, achievement calculation engine

### Database Schema Status
- **Prisma Schema Defined**: Complete schema exists in docs/architecture/8-database-schema.md
- **Database Instance**: **NOT IMPLEMENTED** - no PostgreSQL database running
- **Migrations**: **NOT RUN** - schema exists but not deployed
- **Data Seeding**: **NOT IMPLEMENTED** - no test data or seed scripts

### Technology Stack Implementation Status
From docs/architecture/2-tech-stack.md:

#### ✅ Implemented (Frontend)
- React 18.3.x
- Next.js 14.2.x (frontend only)
- Zustand 4.5.x  
- Shadcn/ui
- TypeScript 5.x

#### ❌ Missing (Backend)
- PostgreSQL database instance
- Prisma database connection and migrations
- JWT authentication system
- API route implementations
- File upload/storage (S3 or local)
- Background job processing
- Real-time event system

## CRITICAL TECHNICAL QUESTIONS

### 1. Database Implementation Strategy
- **Environment Setup**: How to provision PostgreSQL for development/production?
- **Migration Strategy**: How to deploy existing Prisma schema?
- **Data Migration**: How to migrate any existing IndexedDB data to PostgreSQL?
- **Connection Management**: Database connection pooling and configuration?

### 2. Authentication Architecture
- **JWT Implementation**: Token generation, validation, refresh strategy?
- **Role Management**: How to implement the Role enum and UserRole relationships?
- **Session Management**: Session model implementation and cleanup?
- **Security Standards**: Password hashing, token security, rate limiting?

### 3. API Endpoint Implementation
- **Endpoint Inventory**: Catalog all mocked API endpoints referenced in frontend code
- **Implementation Priority**: Which endpoints are critical for immediate frontend integration?
- **Data Validation**: Zod schema implementation for API request/response validation
- **Error Handling**: Standardized error responses and handling

### 4. Sync Infrastructure Design
- **Sync Engine Architecture**: How to implement the priority-based sync system?
- **Conflict Resolution**: Technical implementation of merge conflict handling?
- **Offline Queue Management**: How to process offline-created entities when they sync?
- **Real-time Updates**: WebSocket or polling strategy for live updates?

## INTEGRATION STRATEGY CONSIDERATIONS

### Mock-to-Real Migration Approach
1. **Incremental Replacement**: Replace mocked services one epic at a time?
2. **Big Bang Integration**: Implement complete backend then integrate all at once?
3. **Hybrid Approach**: Core services first, then feature-specific endpoints?

### Existing Frontend Compatibility
- **API Contract Preservation**: Ensure new backend matches existing frontend expectations
- **State Management Impact**: How backend changes affect Zustand store implementations
- **Component Updates**: Minimal changes to existing components during integration

### Testing Strategy Impact
- **Mock Replacement**: How to update test suites from mocked to integrated testing?
- **Integration Testing**: New test requirements for frontend-backend integration
- **E2E Testing**: How backend implementation affects existing E2E tests

## RECOMMENDED IMMEDIATE ACTIONS

### Phase 1: Assessment & Planning (Days 1-2)
1. **Frontend API Analysis**: Catalog all mocked endpoints and their expected behaviors
2. **Database Setup Planning**: Environment provisioning and migration strategy
3. **Authentication Design**: Security model and implementation approach
4. **Integration Roadmap**: Sequenced plan for backend implementation and frontend integration

### Phase 2: Foundation Implementation (Days 3-7)
1. **Database Deployment**: PostgreSQL setup and Prisma schema deployment
2. **Core Authentication**: JWT system and basic user management
3. **Essential API Endpoints**: Critical endpoints for existing frontend features
4. **Basic Integration Testing**: Validate frontend-backend connectivity

### Phase 3: Feature Integration (Days 8-14)
1. **Epic-by-Epic Integration**: Systematic replacement of mocked services
2. **Sync Infrastructure**: Implementation of sync engine and conflict resolution
3. **Performance Optimization**: Backend performance tuning for frontend requirements
4. **Security Hardening**: Complete security implementation and testing

## SUCCESS CRITERIA

### Technical Milestones
- [ ] PostgreSQL database running with deployed Prisma schema
- [ ] JWT authentication system with role management
- [ ] All mocked API endpoints replaced with real implementations
- [ ] Frontend components successfully integrated with real backend
- [ ] Sync engine operational with conflict resolution
- [ ] Security measures implemented and tested

### Quality Gates
- [ ] All existing frontend functionality preserved during integration
- [ ] Performance requirements met (sub-3 second load times)
- [ ] Security audit passes for authentication and data protection
- [ ] Integration tests pass for all epic implementations
- [ ] E2E tests updated and passing with real backend

## ARCHITECT AGENT GUIDANCE

### Key Architecture Documents to Reference
- `/docs/architecture/8-database-schema.md` - Complete Prisma schema
- `/docs/architecture/2-tech-stack.md` - Technology requirements
- `/docs/architecture/5-api-specification.md` - API design patterns
- `/docs/prd/epic-prioritization-development-sequence.md` - Original sequencing plan

### BMad Agent Collaboration
- **PM Agent**: Timeline and resource planning for backend implementation
- **Dev Agent**: Technical implementation of backend services
- **QA Agent**: Integration testing and quality validation
- **SM Agent**: Story creation for Epic 10 breakdown

### Critical Decision Points
1. **Development Environment Strategy**: Docker containers vs local setup?
2. **Deployment Architecture**: Cloud provider selection and infrastructure as code?
3. **Data Migration Approach**: How to handle existing IndexedDB data?
4. **Integration Testing Strategy**: Parallel development vs sequential integration?

---

**URGENT**: This infrastructure gap is a **project-blocking issue** that requires immediate architectural attention and course correction to prevent MVP delivery failure.