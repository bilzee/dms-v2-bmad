# DMS v2 Analytics Dashboard Enhancement - Brownfield Architecture

## Document Metadata

* **Template:** Brownfield Enhancement Architecture v2.0
* **Version:** 1.0
* **Date:** September 10, 2025
* **Author:** Winston (BMad-Method Architect)
* **Status:** Complete
* **Enhancement Type:** New Feature Addition - Analytics Dashboard with 3-Panel Layout
* **Output File:** docs/architecture/analytics-dashboard-enhancement-architecture.md

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Existing Project Analysis](#2-existing-project-analysis)
3. [Enhancement Scope and Integration Strategy](#3-enhancement-scope-and-integration-strategy)
4. [Tech Stack Alignment](#4-tech-stack-alignment)
5. [Component Architecture](#5-component-architecture)
6. [API Design and Integration](#6-api-design-and-integration)
7. [Source Tree Integration](#7-source-tree-integration)
8. [Infrastructure and Deployment Integration](#8-infrastructure-and-deployment-integration)
9. [Coding Standards and Conventions](#9-coding-standards-and-conventions)
10. [Next Steps](#10-next-steps)

---

## 1. Introduction

This document outlines the architectural approach for enhancing **DMS v2** with **analytics dashboard featuring 3-panel monitoring room layout with dynamic cross-panel relationships, real-time data synchronization, and integrated mapping capabilities**. Its primary goal is to serve as the guiding architectural blueprint for AI-driven development of new features while ensuring seamless integration with the existing system.

**Relationship to Existing Architecture:**
This document supplements the existing DMS v2 fullstack architecture by defining how the new analytics dashboard components will integrate with current Next.js 14 App Router patterns, Zustand state management, and shadcn/ui component library. Where conflicts arise between new and existing patterns, this document provides guidance on maintaining consistency while implementing enhancements.

### Change Log

| Change | Date | Version | Description | Author |
|--------|------|---------|-------------|--------|
| Initial Creation | 2025-09-10 | 1.0 | Complete brownfield architecture for analytics dashboard enhancement | Winston (Architect) |

---

## 2. Existing Project Analysis

### Current Project State

- **Primary Purpose:** Humanitarian coordination platform for disaster response in Borno State, Nigeria with offline-first PWA architecture
- **Current Tech Stack:** Next.js 14.2.x App Router, React 18.3.x, Zustand 4.5.x, shadcn/ui, Tailwind CSS 3.4.x, Prisma 5.14.x, PostgreSQL 16.x
- **Architecture Style:** Next.js 14 App Router with Server/Client Components, offline-first PWA with service workers, microservices-ready API routes
- **Deployment Method:** Vercel/AWS serverless deployment with Docker containerization for development

### Available Documentation

- ✅ Complete fullstack architecture v2.0 with comprehensive tech stack documentation
- ✅ Sharded PRD v4 with detailed functional requirements and user stories  
- ✅ Coding standards and development guidelines for LLM-driven development
- ✅ Testing strategy with Jest, Playwright, and integration testing patterns
- ✅ Component architecture patterns using shadcn/ui and Radix UI foundations

### Identified Constraints

- **Performance**: <3s load times, <15% memory increase, 1920x1080+ monitor optimization
- **Offline-First**: Must maintain PWA capabilities and IndexedDB caching patterns
- **State Management**: Must integrate with existing Zustand store patterns (`monitoring.store.ts`, `incident.store.ts`, etc.)
- **Component Consistency**: Must use established shadcn/ui and Radix UI component library
- **API Integration**: Must leverage existing monitoring API patterns without modification
- **Route Structure**: Must integrate with App Router `(dashboard)` group and existing authentication

---

## 3. Enhancement Scope and Integration Strategy

### Enhancement Overview

**Enhancement Type:** New Feature Addition - Secondary Analytics Dashboard  
**Scope:** 3-panel full-screen dashboard (`/analytics-dashboard`) with cross-panel relationships, real-time synchronization, and integrated mapping  
**Integration Impact:** Moderate - New route addition using existing patterns, no modifications to existing monitoring dashboard or core functionality

### Integration Approach

**Code Integration Strategy:** New App Router page at `/app/(dashboard)/analytics-dashboard/page.tsx` following established Client Component patterns, integrating with existing layout and authentication middleware

**Database Integration:** Consume existing data through established API endpoints (`/api/v1/monitoring/*`, `/api/v1/incidents/*`) with new endpoints only when current ones cannot provide required aggregated data  

**API Integration:** Leverage existing monitoring API patterns with same 25-second refresh intervals and connection status management, extending current `/api/v1/monitoring/` namespace for analytics-specific endpoints

**UI Integration:** Use established shadcn/ui components (Card, Badge, Button, Select) and Tailwind CSS patterns, maintaining visual consistency with existing monitoring dashboard design language

### Compatibility Requirements

- **Existing API Compatibility:** No modifications to current monitoring endpoints; new `/api/v1/monitoring/analytics/*` endpoints only when existing data aggregation insufficient
- **Database Schema Compatibility:** Zero schema changes required - analytics dashboard consumes existing incident, assessment, response, and entity data through current Prisma models
- **UI/UX Consistency:** Maintain existing shadcn/ui component library usage, Tailwind CSS utility classes, and established dashboard layout patterns from current monitoring interface
- **Performance Impact:** Target <3s load time maintaining existing 25-second refresh patterns, memory usage increase capped at <15% through efficient Zustand state management

---

## 4. Tech Stack Alignment

### Existing Technology Stack

| Category | Current Technology | Version | Usage in Enhancement | Notes |
|----------|-------------------|---------|---------------------|--------|
| **Framework** | Next.js | 14.2.x | App Router page structure, Server/Client Components | Analytics dashboard page follows established patterns |
| **UI Library** | React | 18.3.x | Component architecture with hooks | Client Components for interactive panels |
| **State Management** | Zustand | 4.5.x | Cross-panel communication, real-time updates | New `analytics.store.ts` following existing patterns |
| **Component Library** | shadcn/ui | Latest | All UI components (Card, Badge, Button, Select) | Maximum reuse of existing component library |
| **Styling** | Tailwind CSS | 3.4.x | All styling and responsive design | Consistent utility classes and design tokens |
| **Forms** | React Hook Form | 7.51.x | Dropdown selections and filters | Panel selection controls |
| **Validation** | Zod | 3.23.x | API response validation | Analytics data validation |
| **Maps** | Leaflet | 1.9.x | Interactive map in center panel | Existing offline mapping capabilities |
| **Offline Storage** | Dexie.js | 4.0.x | Analytics data caching | PWA offline capabilities maintained |
| **API Framework** | Next.js API Routes | 14.2.x | New analytics endpoints | Extension of existing `/api/v1/monitoring/` structure |
| **Database** | PostgreSQL + Prisma | 16.x + 5.14.x | Existing data models consumption | Zero schema changes required |

### New Technology Additions

**✅ No new technologies required** - The analytics dashboard enhancement leverages 100% of existing technology stack without introducing additional dependencies, ensuring consistency and minimizing bundle size impact.

---

## 5. Component Architecture

### New Components

#### **AnalyticsDashboard (Main Page Component)**
**Responsibility:** Main dashboard page container managing 3-panel layout and cross-panel state coordination  
**Integration Points:** App Router page at `/analytics-dashboard`, integrates with existing dashboard layout and authentication

**Key Interfaces:**
- Zustand `analytics.store.ts` for cross-panel state management
- Existing authentication middleware for route protection

**Dependencies:**
- **Existing Components:** DashboardLayout, authentication middleware, shadcn/ui providers
- **New Components:** LeftPanel, CenterPanel, RightPanel components

**Technology Stack:** Next.js 14 Client Component, Zustand state management, Tailwind CSS Grid layout

#### **LeftPanel (Incident Selection)**
**Responsibility:** Incident selection dropdown and comprehensive incident summary display with population impact data  
**Integration Points:** Existing `/api/v1/incidents` endpoint, incident data models via Prisma

**Key Interfaces:**
- Incident selection state management through analytics store
- Real-time incident data updates via existing patterns

**Dependencies:**
- **Existing Components:** shadcn/ui Select, Card, Badge components
- **New Components:** PopulationImpactSummary, IncidentTimeline components

**Technology Stack:** React functional component with hooks, React Hook Form for selections, Zod validation

#### **CenterPanel (Assessment Breakdown)**
**Responsibility:** Entity selection dropdown, assessment area breakdown with gap analysis, and interactive map integration  
**Integration Points:** Existing assessment and entity APIs, Leaflet map integration

**Key Interfaces:**
- Cross-panel filtering based on left panel incident selection
- Map highlighting coordination with entity selection

**Dependencies:**
- **Existing Components:** shadcn/ui components, existing Leaflet map patterns
- **New Components:** AssessmentAreaBreakdown, InteractiveMap, GapAnalysisView

**Technology Stack:** React with conditional rendering, Leaflet for mapping, existing API integration patterns

#### **RightPanel (Entity Gaps Summary)**
**Responsibility:** Entity gaps summary and quick statistics with color-coded severity indicators  
**Integration Points:** Gap analysis calculations using existing assessment-to-response comparison logic

**Key Interfaces:**
- Dynamic updates based on left panel incident selection
- Color-coding system consistent with existing DMS severity indicators

**Dependencies:**
- **Existing Components:** shadcn/ui Badge, Card, existing severity calculation utilities
- **New Components:** EntityGapsGrid, QuickStatistics, SeverityIndicators

**Technology Stack:** React with conditional styling, Tailwind CSS for color-coding, existing data transformation patterns

### Cross-Panel Communication Strategy

- **Incident selection in LeftPanel** triggers entity filtering in CenterPanel, with filter options including "All Entities" plus individual affected entities
- **Incident selection in LeftPanel** triggers entity filtering in RightPanel for gaps summary and statistics
- **Entity selection in CenterPanel** triggers map highlighting to show selected entity or all entities based on dropdown selection
- **All state changes flow through analytics.store.ts** for predictable state management

### Component Interaction Diagram

```mermaid
graph TB
    AD[AnalyticsDashboard] --> LP[LeftPanel]
    AD --> CP[CenterPanel]
    AD --> RP[RightPanel]
    AD --> AS[analytics.store.ts]
    
    LP --> AS
    LP --> IAPI[/api/v1/incidents]
    LP --> PIS[PopulationImpactSummary]
    LP --> IT[IncidentTimeline]
    
    CP --> AS
    CP --> AAB[AssessmentAreaBreakdown]
    CP --> IM[InteractiveMap]
    CP --> GAV[GapAnalysisView]
    CP --> AAPI[/api/v1/assessments]
    
    RP --> AS
    RP --> EGG[EntityGapsGrid]
    RP --> QS[QuickStatistics]
    RP --> SI[SeverityIndicators]
    
    AS --> RT[Real-time Updates]
    RT --> NAPI[Notification System]
    
    %% Cross-panel relationships
    LP -.->|Incident Selection| CP
    LP -.->|Incident Selection| RP
    CP -.->|Entity Selection| IM
    
    style AD fill:#e1f5fe
    style AS fill:#f3e5f5
    style LP fill:#e8f5e8
    style CP fill:#fff3e0
    style RP fill:#fce4ec
```

---

## 6. API Design and Integration

### API Integration Strategy

**API Integration Strategy:** Extend existing `/api/v1/monitoring/` namespace with analytics-specific endpoints that provide aggregated data views while consuming the same underlying data sources  
**Authentication:** Integrate with existing NextAuth.js middleware - analytics endpoints automatically inherit current session-based authentication patterns  
**Versioning:** No versioning changes required - new endpoints follow established v1 API structure and patterns

### New API Endpoints

#### **GET /api/v1/monitoring/analytics/incidents/{id}/summary**
- **Method:** GET
- **Endpoint:** `/api/v1/monitoring/analytics/incidents/{id}/summary`
- **Purpose:** Comprehensive incident summary including population impact, timeline, and aggregate statistics for left panel display
- **Integration:** Aggregates data from existing incident, assessment, and population data without modifying underlying APIs

**Request:**
```json
{
  "incidentId": "string",
  "includePopulationData": true,
  "includeTimeline": true,
  "includeAggregates": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "incident": {
      "id": "string",
      "title": "string",
      "status": "ACTIVE | CONTAINED | RESOLVED",
      "declarationDate": "2025-09-10T00:00:00Z",
      "currentDate": "2025-09-10T12:00:00Z",
      "duration": {
        "days": 5,
        "hours": 3,
        "formatted": "Active for 5 days, 3 hours"
      }
    },
    "populationImpact": {
      "livesLost": 0,
      "injured": 12,
      "displaced": 1500,
      "housesAffected": 350
    },
    "aggregates": {
      "affectedEntities": 8,
      "totalAffectedPopulation": 4200,
      "totalAffectedHouseholds": 840
    }
  }
}
```

#### **GET /api/v1/monitoring/analytics/entities/by-incident/{id}**
- **Method:** GET
- **Endpoint:** `/api/v1/monitoring/analytics/entities/by-incident/{id}`
- **Purpose:** Filtered list of entities affected by specific incident for center panel dropdown (including "All Entities" option)
- **Integration:** Filters existing entity data by incident relationships using established data models

**Request:**
```json
{
  "incidentId": "string",
  "includeAll": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "entities": [
      {
        "id": "all",
        "name": "All Affected Entities",
        "type": "aggregate"
      },
      {
        "id": "entity-1",
        "name": "Maiduguri Metropolitan",
        "type": "LGA",
        "coordinates": [11.8311, 13.1511]
      }
    ],
    "totalCount": 8
  }
}
```

#### **GET /api/v1/monitoring/analytics/assessments/breakdown**
- **Method:** GET
- **Endpoint:** `/api/v1/monitoring/analytics/assessments/breakdown`
- **Purpose:** Assessment area breakdown with gap analysis for center panel display
- **Integration:** Combines existing assessment and response data to calculate gaps by area (Health, WASH, Food, Shelter, Security)

**Request:**
```json
{
  "incidentId": "string",
  "entityId": "string | all",
  "assessmentAreas": ["Health", "WASH", "Food", "Shelter", "Security"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "assessmentAreas": [
      {
        "area": "Health",
        "latestAssessment": {
          "timestamp": "2025-09-10T10:00:00Z",
          "severity": "CRITICAL",
          "details": "Medical facilities overwhelmed"
        },
        "gapAnalysis": {
          "responseGap": true,
          "unmetNeeds": 75,
          "responseTimestamp": "2025-09-10T08:00:00Z",
          "gapSeverity": "HIGH"
        }
      }
    ]
  }
}
```

#### **GET /api/v1/monitoring/analytics/entities/gaps-summary**
- **Method:** GET
- **Endpoint:** `/api/v1/monitoring/analytics/entities/gaps-summary`
- **Purpose:** Entity gaps summary and quick statistics with color-coded severity indicators for right panel
- **Integration:** Aggregates gap analysis across all assessment areas per entity using existing severity calculation logic

**Request:**
```json
{
  "incidentId": "string",
  "entityIds": ["string"] 
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "entityGaps": [
      {
        "entityId": "entity-1",
        "entityName": "Maiduguri Metropolitan",
        "assessmentAreas": {
          "Health": "red",
          "WASH": "yellow", 
          "Food": "green",
          "Shelter": "red",
          "Security": "yellow"
        }
      }
    ],
    "quickStatistics": {
      "overallSeverity": {
        "Health": "red",
        "WASH": "yellow",
        "Food": "green", 
        "Shelter": "red",
        "Security": "yellow"
      },
      "totalCriticalGaps": 12,
      "totalModerateGaps": 8,
      "totalMinimalGaps": 5
    }
  }
}
```

### Gap Analysis Data Structure

**Core Approach:**
- **Boolean Foundation**: `responseGap: true/false` as the primary indicator based on boolean assessment questions
- **Optional Severity Classification**: `gapSeverity: "HIGH" | "MEDIUM" | "LOW"` calculated only when numeric assessment data is available
- **Flexible Implementation**: System supports both boolean-only gaps and severity-classified gaps depending on assessment question types

**Color-Coded Display Logic:**
- **Boolean-only gaps**: `responseGap: true` → Red, `responseGap: false` → Green
- **Numeric gaps with severity**: 
  - `gapSeverity: "HIGH"` → Red
  - `gapSeverity: "MEDIUM"` → Yellow  
  - `gapSeverity: "LOW"` → Green
- **Fallback**: When numeric data exists but severity not calculated, use `responseGap` boolean for color-coding

---

## 7. Source Tree Integration

### Existing Project Structure

```plaintext
packages/frontend/src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # Existing dashboard layout
│   │   ├── page.tsx                      # Dashboard home
│   │   ├── monitoring/
│   │   │   └── page.tsx                  # Current monitoring dashboard
│   │   ├── admin/
│   │   │   ├── monitoring/page.tsx       # Admin monitoring
│   │   │   ├── roles/page.tsx           # Role management
│   │   │   └── users/page.tsx           # User management
│   │   └── coordinator/
│   ├── api/v1/
│   │   ├── monitoring/                   # Existing monitoring APIs
│   │   ├── incidents/                    # Existing incident APIs
│   │   └── assessments/                  # Existing assessment APIs
│   └── auth/
├── components/
│   ├── ui/                              # shadcn/ui components
│   ├── features/
│   │   ├── monitoring/                   # Existing monitoring components
│   │   ├── assessment/                   # Assessment components
│   │   └── incident/                     # Incident components
│   └── layouts/
└── stores/
    ├── monitoring.store.ts              # Existing monitoring state
    ├── incident.store.ts                # Incident state
    └── offline.store.ts                 # Offline state
```

### New File Organization

```plaintext
packages/frontend/src/
├── app/
│   ├── (dashboard)/
│   │   ├── analytics-dashboard/          # New analytics dashboard route
│   │   │   └── page.tsx                  # Main analytics dashboard page
│   ├── api/v1/
│   │   ├── monitoring/
│   │   │   └── analytics/                # New analytics API namespace
│   │   │       ├── incidents/
│   │   │       │   └── [id]/
│   │   │       │       └── summary/
│   │   │       │           └── route.ts # Incident summary endpoint
│   │   │       ├── entities/
│   │   │       │   ├── by-incident/
│   │   │       │   │   └── [id]/
│   │   │       │   │       └── route.ts # Entities by incident
│   │   │       │   └── gaps-summary/
│   │   │       │       └── route.ts     # Entity gaps summary
│   │   │       └── assessments/
│   │   │           └── breakdown/
│   │   │               └── route.ts     # Assessment breakdown
├── components/
│   ├── features/
│   │   └── analytics/                    # New analytics components
│   │       ├── AnalyticsDashboard.tsx    # Main dashboard component
│   │       ├── LeftPanel.tsx             # Incident selection panel
│   │       ├── CenterPanel.tsx           # Assessment breakdown panel
│   │       ├── RightPanel.tsx            # Entity gaps panel
│   │       ├── PopulationImpactSummary.tsx
│   │       ├── IncidentTimeline.tsx
│   │       ├── AssessmentAreaBreakdown.tsx
│   │       ├── InteractiveMap.tsx        # Map integration
│   │       ├── GapAnalysisView.tsx
│   │       ├── EntityGapsGrid.tsx
│   │       ├── QuickStatistics.tsx
│   │       └── SeverityIndicators.tsx
└── stores/
    └── analytics.store.ts                # New analytics state management
```

### Integration Guidelines

- **File Naming:** Follow existing kebab-case for routes (`analytics-dashboard`) and PascalCase for React components (`AnalyticsDashboard.tsx`)
- **Folder Organization:** New analytics components grouped under `/components/features/analytics/` following existing feature-based organization pattern
- **Import/Export Patterns:** Use existing barrel exports and absolute imports with `@/` prefix consistent with current codebase patterns

---

## 8. Infrastructure and Deployment Integration

### Existing Infrastructure

**Current Deployment:** Vercel serverless deployment with AWS backup, Docker containerization for local development  
**Infrastructure Tools:** GitHub Actions CI/CD, Datadog/CloudWatch monitoring, Redis caching, PostgreSQL database  
**Environments:** Development (local Docker), Staging (Vercel preview), Production (Vercel with AWS services)

### Enhancement Deployment Strategy

**Deployment Approach:** Zero-infrastructure changes required - analytics dashboard deploys as part of existing Next.js application bundle through established Vercel pipeline  
**Infrastructure Changes:** No new infrastructure components needed - leverages existing PostgreSQL, Redis, and API route infrastructure  
**Pipeline Integration:** Analytics dashboard follows existing GitHub Actions workflow with automated testing, build validation, and Vercel deployment

### Rollback Strategy

**Rollback Method:** Git-based rollback through Vercel dashboard or GitHub revert, analytics dashboard can be disabled via feature flag if needed  
**Risk Mitigation:** New route isolation prevents impact on existing monitoring functionality, separate API namespace allows selective endpoint rollback  
**Monitoring:** Existing Datadog/CloudWatch monitoring automatically covers new analytics endpoints and performance metrics

---

## 9. Coding Standards and Conventions

### Existing Standards Compliance

**Code Style:** TypeScript with strict mode, ESLint with Next.js configuration, Prettier formatting  
**Linting Rules:** Existing ESLint configuration with React hooks, TypeScript, and Next.js specific rules  
**Testing Patterns:** Jest for unit tests, Playwright for E2E testing, React Testing Library for component tests  
**Documentation Style:** JSDoc for functions, README files for major features, inline comments for complex logic

### Enhancement-Specific Standards

- **Cross-Panel Communication:** All state changes must flow through analytics.store.ts - no direct component-to-component communication
- **API Response Validation:** All analytics API responses validated with Zod schemas following existing patterns
- **Component Isolation:** Analytics dashboard components must not import from other feature directories to maintain separation
- **Performance Budgets:** Analytics dashboard bundle size capped at 150KB gzipped to maintain page load performance

### Critical Integration Rules

- **Existing API Compatibility:** No modifications to existing monitoring, incident, or assessment API endpoints
- **Database Integration:** Analytics queries must use existing Prisma models without schema modifications
- **Error Handling:** Analytics components use established error boundary patterns and Sentry error logging
- **Logging Consistency:** Analytics actions logged using existing logging patterns with appropriate log levels

---

## 10. Next Steps

### Story Manager Handoff

The analytics dashboard enhancement is ready for story implementation following the established brownfield PRD at `docs/prd/analytics-dashboard-enhancement.md`. Key implementation requirements:

**Reference Documents:**
- This architecture document for technical implementation guidance
- Brownfield PRD with detailed functional requirements and story breakdown
- Existing DMS architecture v2.0 for established patterns and constraints

**Integration Requirements Validated:**
- Next.js 14 App Router patterns with `(dashboard)` route group integration
- Zustand state management following established `monitoring.store.ts` patterns
- shadcn/ui component consistency with existing monitoring dashboard
- API integration extending current `/api/v1/monitoring/` namespace
- Real-time update patterns maintaining 25-second refresh intervals

**Existing System Constraints:**
- Zero database schema modifications required
- No changes to existing monitoring APIs or endpoints
- Performance budget: <3s load time, <15% memory increase
- Full-screen optimization for 1920x1080+ monitoring room displays

**First Story Implementation:**
Begin with **Story 1.1: Foundation Dashboard Layout** to establish basic 3-panel structure before adding interactive functionality. This minimizes integration risk and provides solid foundation for subsequent panel development.

**Integration Checkpoints:**
- Verify authentication middleware integration after route creation
- Validate dashboard layout consistency with existing monitoring interface
- Confirm responsive behavior maintains existing breakpoint patterns
- Test PWA offline functionality preservation

### Developer Handoff

**Architecture Reference:** This document provides complete technical implementation guidance based on actual DMS v2 project analysis and validated integration patterns

**Integration Requirements:** 
- Follow established Next.js 14 App Router component patterns identified in existing monitoring dashboard
- Use existing Zustand state management patterns from `monitoring.store.ts` for cross-panel communication
- Leverage established shadcn/ui component library and Tailwind CSS styling approach
- Extend existing API endpoint structure under `/api/v1/monitoring/analytics/` namespace

**Key Technical Decisions:**
- **State Management:** New `analytics.store.ts` following existing Zustand patterns with persist middleware
- **Component Architecture:** Client Components with `'use client'` directive for panel interactivity
- **API Integration:** Extension of existing monitoring endpoints rather than separate API structure
- **Performance Optimization:** Bundle size capping and efficient state management to maintain existing performance characteristics

**Compatibility Requirements:**
- **Database Integration:** Use existing Prisma models without schema modifications - all analytics data comes from current incident, assessment, response, and entity tables
- **Authentication:** Analytics routes automatically inherit existing NextAuth.js session validation
- **PWA Integration:** Analytics dashboard must support existing service worker patterns and offline capabilities
- **Real-time Updates:** Integrate with established 25-second refresh patterns and notification systems

**Implementation Sequencing:**
1. **Foundation Layout** (Story 1.1) - Establish 3-panel structure and routing
2. **Left Panel** (Story 1.2) - Incident selection and summary with existing API integration
3. **Center Panel** (Story 1.3) - Assessment breakdown and entity filtering
4. **Right Panel** (Story 1.4) - Entity gaps and statistics with color-coding
5. **Map Integration** (Story 1.5) - Leaflet map integration with highlighting
6. **Real-time Sync** (Story 1.6) - Live data updates and performance optimization

This sequential approach minimizes risk to existing functionality while building comprehensive analytics capabilities that integrate seamlessly with established DMS v2 infrastructure.

---

## Technical Implementation Summary

**Technology Foundation:** Next.js 14 App Router, Zustand state management, shadcn/ui components, existing monitoring API patterns  
**Integration Approach:** Brownfield enhancement using 100% existing technology stack with zero new dependencies  
**Performance Optimization:** Full-screen monitoring room displays, <3s load times, efficient cross-panel state management  
**Risk Mitigation:** Component isolation, API namespace extension, progressive enhancement allowing rollback without affecting existing operations

This architecture ensures the analytics dashboard enhancement delivers comprehensive monitoring room capabilities while maintaining seamless integration with existing DMS v2 infrastructure and performance standards.