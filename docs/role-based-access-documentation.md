# Streamlined Role-Based Access Design

## Overview

This document provides the optimized role-based access control design for the DMS system. Each role has specialized, non-overlapping access patterns designed for maximum efficiency and clear responsibility boundaries.

**⚠️ IMPLEMENTATION STATUS**: This documentation has been reviewed against the actual codebase implementation (September 2025) and updated to reflect only available features and endpoints.

## System Roles

1. **ASSESSOR** - Field Data Collection Specialist
2. **RESPONDER** - Response Execution Specialist  
3. **VERIFIER** - Quality Assurance Specialist
4. **COORDINATOR** - Operations Oversight Manager
5. **ADMIN** - System Administration Specialist
6. **DONOR** - Contribution Management Specialist

---

## ASSESSOR Role

**Primary Function:** Field-focused assessment creation and entity management.

### Navigation Pane Links

#### Assessment Creation
- **Health Assessment** - `/assessments/new?type=HEALTH`
  - Permission: `assessments:create`
  - Badge: 3 pending health assessments
- **WASH Assessment** - `/assessments/new?type=WASH`
  - Permission: `assessments:create`
  - Badge: 1 pending WASH assessment
- **Shelter Assessment** - `/assessments/new?type=SHELTER`
  - Permission: `assessments:create`
  - Badge: 2 pending shelter assessments
- **Food Assessment** - `/assessments/new?type=FOOD`
  - Permission: `assessments:create`
  - Badge: 0 pending food assessments
- **Security Assessment** - `/assessments/new?type=SECURITY`
  - Permission: `assessments:create`
  - Badge: 1 pending security assessment
- **Population Assessment** - `/assessments/new?type=POPULATION`
  - Permission: `assessments:create`
  - Badge: 4 pending population assessments
- **Emergency Report** - `/assessments/new?type=PRELIMINARY`
  - Permission: `assessments:create`
  - Quick access to emergency assessments

#### My Work
- **My Assessments** - `/assessments?filter=mine`
  - Permission: `assessments:read`
  - Personal assessment tracking
- **All Assessments** - `/assessments`
  - Permission: `assessments:read`
  - View all assessments
- **Entities** - `/entities`
  - Permission: `entities:read`
  - Entity management

#### Synchronization
- **Queue Status** - `/queue`
  - Permission: `queue:read`
  - Field connectivity monitoring

### Landing Page Feature Cards

#### My Assessments
- **Description:** Track and manage your field assessments
- **Actions:**
  - View My Assessments → `/assessments?filter=mine`
  - Create New Assessment → `/assessments/new` (outline variant)
  - View All Assessments → `/assessments` (ghost variant)
- **Stats:** Dynamic count for my active assessments (key: `myAssessments`, fallback: 8)

#### Field Tools
- **Description:** Field-specific tools and offline capabilities
- **Actions:**
  - Queue Status → `/queue`
  - View Entities → `/entities` (outline variant)
- **Stats:** Dynamic offline readiness percentage (key: `offlineReadiness`, fallback: 95%)

### API Endpoints Accessible

#### Assessment Management
- `GET /api/v1/assessments?filter=mine` - Personal assessments
- `GET /api/v1/assessments` - All assessments
- `POST /api/v1/assessments/[id]/feedback` - Assessment feedback
- `POST /api/v1/assessments/[id]/resubmit` - Assessment resubmission
- `GET /api/v1/assessments/stats` - Assessment statistics
- `GET /api/v1/assessments/status` - Assessment status

#### Entity Management
- `GET /api/v1/entities` - Entity listings
- `GET /api/v1/incidents/[id]/entities/[entityId]` - Specific entities

#### Synchronization
- `GET /api/v1/queue` - Queue status
- `POST /api/v1/queue/[id]/retry` - Retry sync operations
- `GET /api/v1/queue/summary` - Queue summary

### Permissions
- `assessments:read`, `assessments:write`, `assessments:create`
- `entities:read`, `entities:write`
- `queue:read`

---

## RESPONDER Role

**Primary Function:** Response execution with enhanced situational awareness.

### Navigation Pane Links

#### Response Planning
- **Plan Response** - `/responses/plan`
  - Permission: `responses:plan`
  - Response planning interface
- **My Responses** - `/responses?filter=mine`
  - Permission: `responses:read`
  - Personal response tracking

#### Delivery Tracking
- **Status Review** - `/responses/status-review`
  - Permission: `responses:track`
  - Delivery progress tracking
- **Delivery Management** - `/responses/[id]/delivery`
  - Permission: `responses:track`
  - Detailed delivery tracking

#### Situational Awareness
- **Assessment Overview** - `/assessments`
  - Permission: `assessments:read`
  - Summary view of relevant assessments

### Landing Page Feature Cards

#### Response Management
- **Description:** Plan and execute response operations
- **Actions:**
  - Plan New Response → `/responses/plan`
  - Status Review → `/responses/status-review` (outline variant)
- **Stats:** Dynamic count for my active responses (key: `myActiveResponses`, fallback: 5)

#### Situational Awareness
- **Description:** Assessment overview and coordination
- **Actions:**
  - Assessment Summary → `/assessments`
- **Stats:** Dynamic count for active assessments (key: `activeAssessments`, fallback: 12)

### API Endpoints Accessible

#### Response Management
- `GET /api/v1/responses/plan` - Response planning
- `GET /api/v1/responses?filter=mine` - Personal responses
- `GET /api/v1/responses/plans` - Response plans
- `GET /api/v1/responses/plans/[id]` - Specific response plans
- `GET /api/v1/responses/[id]/feedback` - Response feedback
- `POST /api/v1/responses/[id]/resubmit` - Response resubmission
- `GET /api/v1/responses/[id]/delivery` - Delivery tracking
- `GET /api/v1/responses/[id]/tracking` - Tracking information
- `POST /api/v1/responses/[id]/complete` - Complete responses
- `GET /api/v1/responses/status-review` - Status review

#### Situational Awareness
- `GET /api/v1/assessments` - Assessment data
- `GET /api/v1/entities` - Entity information

### Permissions
- `responses:read`, `responses:write`, `responses:plan`, `responses:track`
- `assessments:read`, `entities:read`

---

## VERIFIER Role

**Primary Function:** Quality assurance workflows with queue management.

### Navigation Pane Links

#### Verification Queues
- **Assessment Queue** - `/verification/assessments/queue`
  - Permission: `verification:review`
  - Badge: 5 pending assessments
- **Response Queue** - `/verification/responses/queue`
  - Permission: `verification:review`
  - Badge: 3 pending responses
- **Main Dashboard** - `/verification`
  - Permission: `verification:read`
  - Verification overview

### Landing Page Feature Cards

#### Verification Queues
- **Description:** Manage verification workflows and priorities
- **Actions:**
  - Assessment Queue → `/verification/assessments/queue`
  - Response Queue → `/verification/responses/queue` (outline variant)
  - Verification Dashboard → `/verification` (ghost variant)
- **Stats:** Dynamic count for pending verifications (key: `pendingVerifications`, fallback: 8)

#### Quality Management
- **Description:** Verification processing and quality control
- **Actions:**
  - Verification Dashboard → `/verification`
- **Stats:** Dynamic count for verified today (key: `verifiedToday`, fallback: 12)

### API Endpoints Accessible

#### Verification Management
- `GET /api/v1/verification/assessments/queue` - Assessment verification queue
- `GET /api/v1/verification/responses/queue` - Response verification queue
- `GET /api/v1/verification/queue/count` - Queue count statistics
- `GET /api/v1/verification/auto-approval/stats` - Auto-approval statistics
- `POST /api/v1/verification/assessments/[id]/approve` - Approve assessments
- `POST /api/v1/verification/assessments/[id]/reject` - Reject assessments
- `POST /api/v1/verification/responses/[id]/approve` - Approve responses
- `POST /api/v1/verification/responses/[id]/reject` - Reject responses
- `GET /api/v1/verification/photos/[id]/save-annotations` - Photo annotations

### Permissions
- `verification:read`, `verification:review`, `verification:approve`, `responses:verify`

---

## COORDINATOR Role

**Primary Function:** Operations oversight and incident management.

### Navigation Pane Links

#### Coordination Hub
- **Incident Management** - `/coordinator/incidents`
  - Permission: `incidents:manage`
  - Badge: 2 active incidents (destructive variant)
- **Resource Coordination** - `/coordinator/resources`
  - Permission: `resources:coordinate`
  - Resource allocation and planning
- **Donor Coordination** - `/coordinator/donors`
  - Permission: `donors:coordinate`
  - Badge: 4 pending donor activities
- **Auto-Approval Rules** - `/coordinator/auto-approval`
  - Permission: `config:manage`
  - Automated approval configuration

#### Monitoring
- **Situation Display** - `/monitoring`
  - Permission: `monitoring:read`
  - Real-time operational monitoring
- **Interactive Map** - `/monitoring/map`
  - Permission: `monitoring:read`
  - Geographic visualization of entities, assessments, and responses
- **Analytics Dashboard** - `/analytics-dashboard`
  - Permission: `monitoring:read`
  - Advanced analytics interface
- **Drill-Down Analysis** - `/monitoring/drill-down`
  - Permission: `monitoring:read`
  - Detailed data analysis and investigation
- **Coordinator Dashboard** - `/coordinator/monitoring`
  - Permission: `monitoring:read`
  - Coordinator-specific monitoring view

### Landing Page Feature Cards

#### Incident Coordination
- **Description:** Central incident management and coordination
- **Actions:**
  - Manage Incidents → `/coordinator/incidents`
  - Resource Coordination → `/coordinator/resources` (outline variant)
  - Donor Coordination → `/coordinator/donors` (ghost variant)
- **Stats:** Dynamic count for active incidents (key: `activeIncidents`, fallback: 2)

#### Monitoring & Analytics
- **Description:** Real-time monitoring and data analysis
- **Actions:**
  - Situation Display → `/monitoring`
  - Interactive Map → `/monitoring/map` (outline variant)
  - Analytics Dashboard → `/analytics-dashboard` (ghost variant)
- **Stats:** Dynamic monitoring score (key: `monitoringScore`, fallback: 94%)

#### Resource Management
- **Description:** Resource allocation and coordination oversight
- **Actions:**
  - Resource Coordination → `/coordinator/resources`
  - Auto-Approval Rules → `/coordinator/auto-approval` (outline variant)
- **Stats:** Dynamic resource utilization percentage (key: `resourceUtilization`, fallback: 85%)

### API Endpoints Accessible

#### Incident Management
- `GET /api/v1/incidents/[id]/status` - Incident status
- `GET /api/v1/incidents/[id]/timeline` - Incident timeline
- `GET /api/v1/incidents/[id]/entities` - Incident entities

#### Resource Coordination
- `GET /api/v1/coordinator/resources/available` - Available resources
- `POST /api/v1/coordinator/resources/allocate` - Resource allocation

#### Monitoring & Analytics
- `GET /api/v1/monitoring/situation/overview` - Situation overview
- `GET /api/v1/monitoring/situation/gap-analysis` - Gap analysis
- `GET /api/v1/monitoring/situation/incidents` - Incident monitoring
- `GET /api/v1/monitoring/drill-down/entities` - Entity drill-down
- `GET /api/v1/monitoring/drill-down/incidents` - Incident drill-down
- `GET /api/v1/monitoring/drill-down/assessments` - Assessment drill-down
- `GET /api/v1/monitoring/drill-down/responses` - Response drill-down
- `GET /api/v1/monitoring/map/entities` - Map entity data
- `GET /api/v1/monitoring/map/assessments` - Map assessment data
- `GET /api/v1/monitoring/map/responses` - Map response data
- `GET /api/v1/monitoring/analytics/realtime` - Real-time analytics

#### Configuration
- `GET /api/v1/config/auto-approval/rules` - Auto-approval rules

### Permissions
- `incidents:manage`, `resources:coordinate`, `donors:coordinate`
- `monitoring:read`, `config:manage`

---

## ADMIN Role

**Primary Function:** System administration and configuration management.

### Navigation Pane Links

#### User Management
- **User Administration** - `/admin/users`
  - Permission: `users:manage`
  - Complete user lifecycle management
- **Role Management** - `/admin/roles`
  - Permission: `roles:manage`
  - Role assignment and configuration

#### System Monitoring
- **System Monitoring** - `/admin/monitoring`
  - Permission: `system:monitor`
  - Administrative system monitoring
- **Audit Logs** - `/admin/audit`
  - Permission: `audit:read`
  - Security and activity auditing

### Landing Page Feature Cards

#### User & Access Management
- **Description:** Complete user lifecycle and access control management
- **Actions:**
  - Manage Users → `/admin/users`
  - Role Assignment → `/admin/roles` (outline variant)
- **Stats:** Dynamic count for active users (key: `activeUsers`, fallback: 156)

#### System Monitoring
- **Description:** Administrative-level system performance monitoring
- **Actions:**
  - System Monitoring → `/admin/monitoring`
  - Audit Logs → `/admin/audit` (outline variant)
- **Stats:** Dynamic system uptime percentage (key: `systemUptime`, fallback: 99.8%)

### API Endpoints Accessible

#### User Management
- `GET /api/v1/admin/users` - User listings
- `GET /api/v1/admin/users/[id]` - Specific user details
- `POST /api/v1/admin/users/[id]/status` - User status changes
- `GET /api/v1/admin/users/stats` - User statistics
- `GET /api/v1/admin/users/export` - User data export
- `POST /api/v1/admin/users/bulk-import` - Bulk user import
- `POST /api/v1/admin/users/bulk-roles` - Bulk role assignment

#### Role & Permission Management
- `GET /api/v1/admin/roles` - Role definitions
- `GET /api/v1/admin/permissions/matrix` - Permission matrix
- `POST /api/v1/admin/bulk/roles` - Bulk role operations

#### Monitoring & Audit
- `GET /api/v1/admin/monitoring/performance` - Performance metrics
- `GET /api/v1/admin/system/audit` - System audit logs
- `GET /api/v1/admin/audit/activity` - Activity logs
- `GET /api/v1/admin/audit/security-events` - Security events

### Permissions
- `users:manage`, `roles:manage`, `permissions:manage`
- `system:monitor`, `audit:read`, `security:monitor`

---

## DONOR Role

**Primary Function:** Contribution management with comprehensive impact tracking.

### Navigation Pane Links

#### My Contributions
- **Donation Planning** - `/donor/planning`
  - Permission: `donations:plan`
  - Strategic donation planning interface
- **My Commitments** - `/donor/commitments`
  - Permission: `donations:commit`
  - Badge: 3 active commitments
- **Performance Tracking** - `/donor/performance`
  - Permission: `donations:track`
  - Personal performance metrics
- **Achievement Dashboard** - `/donor/achievements`
  - Permission: `donations:track`
  - Achievement and milestone tracking

#### Impact Visibility
- **Impact Overview** - `/donor/impact/overview`
  - Permission: `impact:view`
  - Real-time contribution impact
- **Supported Incidents** - `/donor/impact/incidents`
  - Permission: `impact:view`
  - Direct impact on specific incidents
- **Community Leaderboard** - `/donor/leaderboard`
  - Permission: `donations:track`
  - Community engagement and rankings

### Landing Page Feature Cards

#### Donation Planning
- **Description:** Strategic donation planning with market intelligence
- **Actions:**
  - Plan New Donation → `/donor/planning`
  - View Opportunities → `/donor/opportunities` (outline variant)
- **Stats:** Dynamic count for planned donations (key: `plannedDonations`, fallback: 4)

#### Impact Tracking
- **Description:** Real-time impact visualization and measurement
- **Actions:**
  - Impact Overview → `/donor/impact/overview`
  - Supported Incidents → `/donor/impact/incidents` (outline variant)
- **Stats:** Dynamic count for people helped (key: `peopleHelped`, fallback: 1247)

#### Community Engagement
- **Description:** Achievements, leaderboard and community interaction
- **Actions:**
  - View Achievements → `/donor/achievements`
  - Community Leaderboard → `/donor/leaderboard` (outline variant)
- **Stats:** Dynamic count for achievements unlocked (key: `achievementsUnlocked`, fallback: 12)

#### Performance Metrics
- **Description:** Personal donation performance and delivery tracking
- **Actions:**
  - Performance Dashboard → `/donor/performance`
  - Commitment Tracking → `/donor/commitments` (outline variant)
- **Stats:** Dynamic performance score (key: `performanceScore`, fallback: 92%)

### API Endpoints Accessible

#### Donation Management
- `GET /api/v1/donors/profile` - Donor profile
- `GET /api/v1/donors/[id]/commitments` - Donor commitments
- `GET /api/v1/donors` - Donor listings

#### Performance & Impact
- `GET /api/v1/donors/performance` - Performance data
- `GET /api/v1/donors/performance/history` - Historical performance
- `GET /api/v1/donors/performance/export` - Performance export
- `GET /api/v1/donors/impact` - Impact metrics

#### Community & Achievements
- `GET /api/v1/donors/achievements` - Achievement data
- `POST /api/v1/donors/achievements/calculate` - Calculate achievements
- `GET /api/v1/donors/achievements/rules` - Achievement rules
- `GET /api/v1/donors/leaderboard` - Performance leaderboard

### Permissions
- `donations:plan`, `donations:commit`, `donations:track`
- `impact:view`, `achievements:read`, `performance:read`, `community:read`

---

## Shared API Endpoints

### Authentication & Role Management
- `GET /api/auth/[...nextauth]` - Authentication handling
- `GET /api/v1/auth/roles` - Available roles
- `GET /api/v1/auth/role-interface/[roleId]` - Role interface data
- `POST /api/v1/auth/switch-role` - Switch active role

### Synchronization (All Roles)
- `GET /api/v1/sync/background/status` - Sync status
- `GET /api/v1/sync/connectivity-test` - Test connectivity
- `POST /api/v1/sync/queue/add` - Add to sync queue

### Notifications (All Roles)
- `POST /api/v1/notifications/send` - Send notifications
- `POST /api/v1/notifications/[id]/read` - Mark as read
- `GET /api/v1/notifications/role-changes` - Role change notifications

---

## Access Control Implementation

### Permission Structure
Permissions follow the format: `resource:action`
- **Resources:** assessments, responses, entities, verification, monitoring, incidents, users, system, etc.
- **Actions:** read, write, create, approve, manage, configure, monitor, etc.

### Dynamic Badge System
- **badgeKey** - References dynamic count from API
- **badge** - Fallback static value  
- **badgeVariant** - Visual styling (default, secondary, destructive)

### Route Protection
- Permission-based filtering for all navigation items
- Role-specific feature card visibility
- API endpoint access control via role permissions

## Technical Implementation

### File Locations
- **Role Interfaces:** `/packages/frontend/src/lib/role-interfaces.ts`
- **Navigation Hook:** `/packages/frontend/src/hooks/useRoleNavigation.ts`
- **Access Components:** `/packages/frontend/src/components/layouts/RoleBasedNavigation.tsx`

### Key Features
- **Zero duplication** across role navigation
- **Clear specialization** for each role
- **Complete workflow coverage** across all roles
- **Scalable permission system** for future expansion
- **Implementation alignment** - All routes and APIs verified against codebase

## Implementation Notes

**Last Updated:** September 2025  
**Review Status:** ✅ Verified against actual codebase implementation  
**Accuracy:** All navigation paths and API endpoints confirmed to exist  
**Missing Features:** Removed from documentation until implemented  

This streamlined design provides focused, efficient access patterns for each role while maintaining complete system functionality coverage based on the actual implemented features.