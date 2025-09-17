# DMS v2 Analytics Dashboard Enhancement - Brownfield PRD

## Document Metadata

* **Template:** Brownfield Enhancement PRD v2.0
* **Version:** 1.0
* **Date:** September 10, 2025
* **Author:** John (BMad-Method Product Manager)
* **Status:** Complete
* **Enhancement Type:** New Feature Addition - Secondary Analytics Dashboard
* **Output File:** docs/prd/analytics-dashboard-enhancement.md

---

## Table of Contents

1. [Intro Project Analysis and Context](#1-intro-project-analysis-and-context)
2. [Requirements](#2-requirements)
3. [Epic and Story Structure](#3-epic-and-story-structure)

---

## 1. Intro Project Analysis and Context

### Existing Project Overview

**Analysis Source**: IDE-based fresh analysis + Existing comprehensive PRD documentation

**Current Project State**: 
The DMS v2 is a humanitarian coordination platform for disaster response in Borno State, Nigeria. It's a Progressive Web App with offline-first architecture serving Assessors, Responders, Coordinators, and Donors. The system already includes one monitoring dashboard (Epic 6) focused on situation awareness and real-time operational data.

### Available Documentation Analysis

✅ **Tech Stack Documentation** (Complete architecture document available)  
✅ **Source Tree/Architecture** (Comprehensive fullstack architecture v2.0)  
✅ **Coding Standards** (Defined in architecture documentation)  
✅ **API Documentation** (189 API endpoints documented)  
✅ **External API Documentation** (Integration patterns defined)  
⚠️ **UX/UI Guidelines** (May need UX-Expert input for design consistency)  
✅ **Technical Debt Documentation** (Architecture includes development guidelines)

**Documentation Status**: Excellent foundation - using existing comprehensive project analysis from architecture v2.0 and PRD v4.

### Enhancement Scope Definition

**Enhancement Type**: ✅ **New Feature Addition** - Secondary analytics-focused monitoring dashboard

**Enhancement Description**: 
A new analytics-focused monitoring dashboard featuring a 3-panel layout with interactive visualizations and an integrated map showing assessments, responses, and gap analysis. This dashboard will complement the existing operational monitoring dashboard (Epic 6) by providing analytical insights and visual data representation optimized for monitoring room displays.

**Impact Assessment**: ✅ **Moderate Impact** - New feature addition using existing backend data infrastructure with some frontend integration points

### Goals and Background Context

**Goals:**
• Provide analytical visualization of disaster response data through interactive components and color-coded indicators
• Integrate geographic visualization showing assessment coverage and response gaps  
• Create complementary analytics dashboard to existing operational monitoring
• Leverage existing backend data without requiring new data collection
• Enhance situational awareness through visual data representation optimized for full-screen monitoring room displays

**Background Context:**
The existing DMS v2 system has comprehensive data collection and one operational monitoring dashboard. However, there's a need for analytical visualization that helps coordinators and stakeholders understand patterns, trends, and gaps in disaster response through a dedicated 3-panel analytics interface with integrated mapping. This enhancement builds on the solid technical foundation while adding visual intelligence capabilities.

### Change Log

| Change | Date | Version | Description | Author |
|--------|------|---------|-------------|--------|
| Initial Creation | 2025-09-10 | 1.0 | Complete brownfield PRD for analytics dashboard enhancement | John (PM) |

---

## 2. Requirements

### Functional Requirements

**FR1**: The analytics dashboard shall display a 3-panel layout optimized for dedicated monitor viewing without vertical scrolling, maintaining consistency with existing DMS UI patterns and full-screen dashboard design principles.

**FR2**: The dashboard shall integrate existing UI components (shadcn/ui, Radix UI) and styling patterns to render visual indicators, statistics, and color-coded elements without requiring additional chart libraries.

**FR3**: The center panel shall display an interactive map at the bottom showing all affected entities with highlighting capabilities for selected entities, positioned below existing center panel content to provide geographic context for assessments and gap analysis.

**FR4**: The dashboard shall implement dynamic component relationships where:
- Left panel: Incident selection dropdown controls all incident summary components below it
- Center panel: Affected entity dropdown (filtered by selected incident) controls assessment and gap analysis components below it
- Cross-panel relationship: Affected entities available for selection in the center panel are filtered to only those affected by the incident selected in the left panel
- Interactive map: Always shows all affected entities but highlights selected entity/entities based on center panel selection

**FR5**: The dashboard shall consume existing backend data through established API endpoints, with new API endpoints created only when existing ones cannot provide required data without modification.

**FR6**: The dashboard shall provide real-time data refresh capabilities with automatic updates when new assessments, responses, or incidents are recorded in the system.

**FR7**: The dashboard shall be accessible to all system users without role-based data filtering, simplifying initial implementation and reducing complexity.

**FR8**: The dashboard shall include export functionality for charts and data summaries to support stakeholder reporting and decision-making processes.

**FR9**: The left panel shall display incident declaration date, current date, and calculated duration showing how long the incident has been active/contained/resolved with clear time progression indicators, plus comprehensive population impact and aggregate statistics.

### Non-Functional Requirements

**NFR1**: The dashboard shall render completely within monitor viewport dimensions without requiring vertical scrolling, optimized for dedicated monitoring room displays with minimum 1920x1080 resolution support.

**NFR2**: The dashboard shall load within 3 seconds on typical connectivity conditions and maintain existing system performance characteristics without exceeding current memory usage by more than 15%.

**NFR3**: The dashboard shall maintain offline viewing capabilities for cached data, consistent with the PWA's offline-first architecture principles.

**NFR4**: The dashboard shall integrate seamlessly with existing authentication, routing, and state management patterns without requiring architectural changes.

### Compatibility Requirements

**CR1**: **Existing API Compatibility**: Dashboard must consume data through current monitoring API endpoints without modifications; new API endpoints will be created only when existing ones cannot provide required data functionality.

**CR2**: **UI Component Consistency**: Dashboard must use established shadcn/ui and Radix UI components to maintain visual and behavioral consistency with existing interfaces.

**CR3**: **No Additional Chart Dependencies**: Dashboard must utilize existing HTML/CSS styling and icon systems without introducing additional visualization libraries.

**CR4**: **PWA Integration**: Dashboard must support existing service worker functionality, caching strategies, and offline synchronization patterns.

---

## 3. Epic and Story Structure

### Epic Approach

**Epic Structure Decision**: **Single Comprehensive Epic** with rationale:

Your analytics dashboard enhancement represents a cohesive feature set that integrates tightly with existing monitoring infrastructure. The dynamic panel relationships, cross-component dependencies, and shared technical foundation make this naturally suited for a single epic approach because:

- **Unified User Experience**: The 3-panel dashboard with cascading relationships functions as one integrated interface
- **Shared Technical Foundation**: All components use the same UI libraries and monitoring APIs
- **Interdependent Features**: Panel relationships and data filtering create strong coupling between components
- **Brownfield Integration**: Enhancement builds incrementally on existing monitoring system without major architectural splits

## Epic 1: Analytics Dashboard Enhancement

**Epic Goal**: Deliver a comprehensive 3-panel analytics dashboard optimized for monitoring room displays, providing incident overview, assessment analysis, and entity status visualization using existing DMS infrastructure.

**Integration Requirements**: Must leverage existing UI components, monitoring APIs, and styling patterns while implementing dynamic cross-panel relationships and real-time data synchronization without disrupting current system operations.

### Story 1.1: Foundation Dashboard Layout

As a **Coordinator**,  
I want **a responsive 3-panel dashboard layout optimized for full-screen monitors**,  
so that **I can view all analytical information simultaneously without scrolling in the monitoring room**.

#### Acceptance Criteria
1. Dashboard renders in 3-panel layout (left, center, right) optimized for 1920x1080+ displays
2. All panels are fully visible without vertical scrolling
3. Layout maintains existing DMS UI consistency and shadcn/ui component patterns
4. Navigation integration works with existing routing and authentication
5. Responsive behavior maintained for tablet/mobile fallback access

#### Integration Verification
- **IV1**: Existing DMS navigation, authentication, and layout patterns remain functional
- **IV2**: Dashboard integrates with existing PWA service worker and caching strategies  
- **IV3**: Performance metrics show no degradation in existing monitoring dashboard loading times

### Story 1.2: Left Panel - Incident Selection with Comprehensive Summary

As a **Coordinator**,  
I want **to select active incidents and view comprehensive incident summary including timeline, population impact, and aggregate statistics**,  
so that **I can understand the full scope and duration of incident impact for strategic decision-making**.

#### Acceptance Criteria
1. Incident dropdown populated from existing incident APIs showing active/contained/resolved incidents
2. Selected incident displays declaration date, current date, and calculated duration in human-readable format
3. **Population Impact Summary** displays data from population and preliminary assessments:
   - Lives lost count
   - Injured count  
   - Displaced persons count
   - Houses affected count
4. **Aggregate Incident Information** shows:
   - Number of affected entities
   - Total affected population
   - Total affected households
5. All summary data updates when different incident is selected
6. Visual formatting ensures readability within left panel space constraints

#### Integration Verification
- **IV1**: Population and preliminary assessment data APIs remain unmodified
- **IV2**: Incident aggregate calculations align with existing assessment data structures
- **IV3**: Summary data accuracy maintained with existing assessment validation patterns

### Story 1.3: Center Panel - Assessment Area Breakdown with Gap Analysis

As a **Coordinator**,  
I want **to view detailed assessment areas (Health, WASH, Food, Shelter, Security) with latest assessments and gap analysis side-by-side for selected entities**,  
so that **I can analyze specific needs and response gaps for each critical area**.

#### Acceptance Criteria
1. Affected entity dropdown filters based on selected incident from left panel
2. Assessment area breakdown shows each area (Health, WASH, Food, Shelter, Security, etc.) with:
   - Latest assessment data with timestamp on the left
   - Gap analysis (latest response vs latest assessment) on the right
3. **Space management**: If all assessment areas don't fit with interactive map below, implement selection mechanism to choose which areas to display
4. Loading states displayed during cross-panel data fetching
5. Clear visual distinction between assessment data and gap analysis columns

#### Integration Verification
- **IV1**: Assessment area data structures remain compatible with existing assessment workflows
- **IV2**: Gap analysis calculations align with existing response-to-assessment comparison logic
- **IV3**: Assessment area filtering doesn't interfere with existing data validation patterns

### Story 1.4: Right Panel - Entity Gaps Summary and Quick Statistics

As a **Coordinator**,  
I want **to view Entity Gaps Summary and Quick Statistics with color-coded assessment area indicators**,  
so that **I can quickly assess overall situation severity and entity-specific conditions at a glance**.

#### Acceptance Criteria
1. **Entity Gaps Summary section** displays affected entities (based on selected incident) with color-coded icons for each assessment area (Health, WASH, Food, Shelter, Security)
2. **Quick Statistics section** shows overall incident statistics with assessment area icons color-coded by severity (red/yellow/green)
3. Color coding indicates gap severity: Red (critical gaps), Yellow (moderate gaps), Green (minimal/no gaps)
4. Both sections update dynamically based on incident selection from left panel
5. Visual hierarchy optimized for quick scanning and situational awareness
6. Icons/indicators maintain readability within right panel space constraints

#### Integration Verification
- **IV1**: Gap severity calculations align with existing assessment-to-response comparison logic
- **IV2**: Entity gap analysis uses established assessment data structures
- **IV3**: Color-coding system remains consistent with existing DMS severity indicators

### Story 1.5: Interactive Map Integration

As a **Coordinator**,  
I want **an interactive map at the bottom of the center panel showing all affected entities with highlighting for selected entities**,  
so that **I can visualize geographic context of assessments, responses, and coverage gaps**.

#### Acceptance Criteria
1. Map displays at bottom of center panel without requiring panel scrolling
2. All affected entities shown as map markers/layers regardless of selection
3. Selected entity (or all entities) highlighted with distinct visual treatment
4. Map updates highlighting based on center panel entity selection
5. Map shows assessment locations, response coverage, and gap analysis overlays
6. Map integration maintains existing geographic data patterns

#### Integration Verification
- **IV1**: Map functionality doesn't interfere with existing geographic features in DMS
- **IV2**: Geographic data APIs continue serving existing mapping needs uninterrupted
- **IV3**: Map rendering performance doesn't impact overall dashboard responsiveness

### Story 1.6: Real-time Data Synchronization

As a **Coordinator**,  
I want **dashboard data to automatically refresh when new assessments, responses, or incidents are recorded**,  
so that **I maintain current situational awareness without manual refresh actions**.

#### Acceptance Criteria
1. Dashboard subscribes to real-time data updates using existing patterns
2. Charts, maps, and summary components update automatically with new data
3. Update indicators show when fresh data is loaded
4. Graceful handling of temporary connectivity loss with retry logic
5. Update frequency balances real-time needs with performance considerations

#### Integration Verification
- **IV1**: Real-time updates don't interfere with existing notification and sync systems
- **IV2**: Data update patterns maintain consistency with existing PWA offline strategies
- **IV3**: Update frequency and resource usage remain within acceptable system limits

---

## Technical Implementation Summary

**Technology Stack**: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Radix UI
**Chart Libraries**: None required - using HTML/CSS styling for all visual indicators
**APIs**: Existing monitoring endpoints + new endpoints only when necessary
**Performance**: Full-screen optimization, no vertical scrolling, <3s load times
**Integration**: Brownfield approach maintaining existing patterns and dependencies

**Risk Mitigation**: Story sequence minimizes integration complexity by building foundation first, then adding panel functionality incrementally, with cross-panel relationships and advanced features implemented last.

This PRD provides comprehensive guidance for implementing a monitoring room optimized analytics dashboard that complements existing DMS functionality while maintaining system integrity and performance standards.