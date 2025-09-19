# Mock-to-Real Data Migration - Page Implementation Checklist
## Track progress for each page's mock data replacement

### **Phase 1: Critical Bug Fixes** 🔥

#### **1.1 Regression Issues**
- [x] **Fix Role Switching** - Restore superuser role switching functionality
  - **Files**: `auth.config.ts`, authentication components
  - **Priority**: CRITICAL
  - **Status**: ✅ FIXED - Uncommented `allRoles` in session callback
  
- [x] **Admin Navigation Links** - Add User Management and Role Management links to admin home
  - **Files**: `/admin/page.tsx`, admin navigation components
  - **Priority**: CRITICAL
  - **Status**: ✅ FIXED - Added Role Management module and quick action button

---

### **Phase 2: Root Dashboard Pages** 📊

#### **2.1 Main Dashboards**
- [x] **`/admin`** (Admin Dashboard)
  - **File**: `packages/frontend/src/app/(dashboard)/admin/page.tsx`
  - **Mock Data to Replace**: System statistics, user counts, health indicators
  - **Real Data Sources**: User table, system metrics, audit logs
  - **Priority**: HIGH
  - **Status**: ✅ REAL DATA - Uses `useDashboardBadges`, `useAdminData`, `useSystemHealth` hooks with API endpoints
  
- [x] **`/coordinator/dashboard`** (Coordinator Dashboard)
  - **File**: `packages/frontend/src/app/(dashboard)/coordinator/dashboard/page.tsx`
  - **Mock Data to Replace**: Incident counts, resource metrics, team assignments
  - **Real Data Sources**: Incidents, assessments, responses, users
  - **Priority**: HIGH
  - **Status**: ✅ REAL DATA - Uses `useDashboardBadges` and `useQueueManagement` hooks with real API data
  
- [x] **`/dashboard`** (Role-based Dashboard)
  - **File**: `packages/frontend/src/app/(dashboard)/page.tsx`
  - **Mock Data to Replace**: Role-specific overview cards
  - **Real Data Sources**: Role-appropriate data aggregation
  - **Priority**: HIGH
  - **Status**: ✅ REAL DATA - Uses `useDashboardBadges` hook for all statistics and metrics

---

### **Phase 3: Admin Role Pages** 👑

#### **3.1 System Management**
- [ ] **`/admin/users`** (User Management)
  - **File**: `packages/frontend/src/app/(dashboard)/admin/users/page.tsx`
  - **Mock Data to Replace**: User lists, statistics, activity
  - **Real Data Sources**: User table, user activity logs
  - **Priority**: HIGH
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/admin/roles`** (Role Management)
  - **File**: `packages/frontend/src/app/(dashboard)/admin/roles/page.tsx`
  - **Mock Data to Replace**: Role assignments, permissions
  - **Real Data Sources**: User roles, permission mappings
  - **Priority**: HIGH
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/admin/audit`** (Audit & Security)
  - **File**: `packages/frontend/src/app/(dashboard)/admin/audit/page.tsx`
  - **Mock Data to Replace**: Audit logs, security events
  - **Real Data Sources**: Audit logs, security events table
  - **Priority**: MEDIUM
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/admin/monitoring`** (System Monitoring)
  - **File**: `packages/frontend/src/app/(dashboard)/admin/monitoring/page.tsx`
  - **Mock Data to Replace**: System metrics, performance indicators
  - **Real Data Sources**: System metrics, API performance, database health
  - **Priority**: MEDIUM
  - **Status**: ❌ MOCK DATA

---

### **Phase 4: Coordinator Role Pages** 🎯

#### **4.1 Incident Management**
- [ ] **`/coordinator/incidents`** (Incident Management)
  - **File**: `packages/frontend/src/app/(dashboard)/coordinator/incidents/page.tsx`
  - **Mock Data to Replace**: Incident lists, status tracking
  - **Real Data Sources**: Incidents table, assessments, responses
  - **Priority**: HIGH
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/coordinator/conflicts`** (Conflict Resolution)
  - **File**: `packages/frontend/src/app/(dashboard)/coordinator/conflicts/page.tsx`
  - **Mock Data to Replace**: Conflict data, resolution workflows
  - **Real Data Sources**: Conflict records, resolution workflows
  - **Priority**: MEDIUM
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/coordinator/auto-approval`** (Auto-approval)
  - **File**: `packages/frontend/src/app/(dashboard)/coordinator/auto-approval/page.tsx`
  - **Mock Data to Replace**: Approval workflows, settings
  - **Real Data Sources**: Approval configurations, workflow states
  - **Priority**: MEDIUM
  - **Status**: ❌ MOCK DATA

#### **4.2 Resource Coordination**
- [ ] **`/coordinator/donors`** (Donor Coordination)
  - **File**: `packages/frontend/src/app/(dashboard)/coordinator/donors/page.tsx`
  - **Mock Data to Replace**: Donor data, resource tracking
  - **Real Data Sources**: Donor commitments, resource allocations
  - **Priority**: HIGH
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/coordinator/responses/review`** (Response Review)
  - **File**: `packages/frontend/src/app/(dashboard)/coordinator/responses/review/page.tsx`
  - **Mock Data to Replace**: Response data, review workflows
  - **Real Data Sources**: Rapid responses, verification status
  - **Priority**: HIGH
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/coordinator/monitoring`** (Coordinator Monitoring)
  - **File**: `packages/frontend/src/app/(dashboard)/coordinator/monitoring/page.tsx`
  - **Mock Data to Replace**: Monitoring data specific to coordinators
  - **Real Data Sources**: Response metrics, team performance
  - **Priority**: MEDIUM
  - **Status**: ❌ MOCK DATA

---

### **Phase 5: Assessor Role Pages** 📝

#### **5.1 Assessment Management**
- [ ] **`/assessor`** (Assessor Dashboard)
  - **File**: `packages/frontend/src/app/(dashboard)/assessor/page.tsx`
  - **Mock Data to Replace**: Assessment overview, assignments
  - **Real Data Sources**: Rapid assessments, assignment data
  - **Priority**: MEDIUM
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/assessments`** (Assessments List)
  - **File**: `packages/frontend/src/app/(dashboard)/assessments/page.tsx`
  - **Mock Data to Replace**: Assessment lists, status tracking
  - **Real Data Sources**: Rapid assessments table
  - **Priority**: MEDIUM
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/assessments/new`** (New Assessment)
  - **File**: `packages/frontend/src/app/(dashboard)/assessments/new/page.tsx`
  - **Mock Data to Replace**: Incident pre-population, form defaults
  - **Real Data Sources**: Active incidents, affected entities
  - **Priority**: MEDIUM
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/assessments/status`** (Assessment Status)
  - **File**: `packages/frontend/src/app/(dashboard)/assessments/status/page.tsx`
  - **Mock Data to Replace**: Status tracking, metrics
  - **Real Data Sources**: Assessment status aggregates
  - **Priority**: MEDIUM
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/assessments/[id]`** (Assessment Details)
  - **File**: `packages/frontend/src/app/(dashboard)/assessments/[id]/page.tsx`
  - **Mock Data to Replace**: Assessment details, related data
  - **Real Data Sources**: Specific assessment + relationships
  - **Priority**: MEDIUM
  - **Status**: ❌ MOCK DATA

---

### **Phase 6: Responder Role Pages** 🚑

#### **6.1 Response Management**
- [ ] **`/responder`** (Responder Dashboard)
  - **File**: `packages/frontend/src/app/(dashboard)/responder/page.tsx`
  - **Mock Data to Replace**: Response assignments, priorities
  - **Real Data Sources**: Response assignments, incident priorities
  - **Priority**: MEDIUM
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/responses/plan`** (Response Planning)
  - **File**: `packages/frontend/src/app/(dashboard)/responses/plan/page.tsx`
  - **Mock Data to Replace**: Planning data, resource requirements
  - **Real Data Sources**: Incident requirements, available resources
  - **Priority**: MEDIUM
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/responses/status-review`** (Status Review)
  - **File**: `packages/frontend/src/app/(dashboard)/responses/status-review/page.tsx`
  - **Mock Data to Replace**: Status data, completion metrics
  - **Real Data Sources**: Response status, completion data
  - **Priority**: MEDIUM
  - **Status**: ❌ MOCK DATA

#### **6.2 Response Workflow Pages**
- [ ] **`/responses/[id]/convert`** (Convert Response)
  - **File**: `packages/frontend/src/app/(dashboard)/responses/[id]/convert/page.tsx`
  - **Mock Data to Replace**: Conversion workflows
  - **Real Data Sources**: Response data, conversion rules
  - **Priority**: LOW
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/responses/[id]/delivery`** (Delivery Tracking)
  - **File**: `packages/frontend/src/app/(dashboard)/responses/[id]/delivery/page.tsx`
  - **Mock Data to Replace**: Delivery tracking data
  - **Real Data Sources**: Delivery records, tracking data
  - **Priority**: LOW
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/responses/[id]/partial`** (Partial Delivery)
  - **File**: `packages/frontend/src/app/(dashboard)/responses/[id]/partial/page.tsx`
  - **Mock Data to Replace**: Partial delivery data
  - **Real Data Sources**: Partial delivery records
  - **Priority**: LOW
  - **Status**: ❌ MOCK DATA

---

### **Phase 7: Verifier Role Pages** ✅

#### **7.1 Verification Management**
- [ ] **`/verifier`** (Verifier Dashboard)
  - **File**: `packages/frontend/src/app/(dashboard)/verifier/page.tsx`
  - **Mock Data to Replace**: Verification overview, queue metrics
  - **Real Data Sources**: Verification queues, assessment/response data
  - **Priority**: MEDIUM
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/verification`** (Verification Main)
  - **File**: `packages/frontend/src/app/(dashboard)/verification/page.tsx`
  - **Mock Data to Replace**: Verification workflows
  - **Real Data Sources**: Verification workflows, queue data
  - **Priority**: MEDIUM
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/verification/queue`** (Verification Queue)
  - **File**: `packages/frontend/src/app/(dashboard)/verification/queue/page.tsx`
  - **Mock Data to Replace**: Queue data, prioritization
  - **Real Data Sources**: Verification queue, pending items
  - **Priority**: MEDIUM
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/verification/responses`** (Response Verification)
  - **File**: `packages/frontend/src/app/(dashboard)/verification/responses/page.tsx`
  - **Mock Data to Replace**: Response verification data
  - **Real Data Sources**: Response verification workflows
  - **Priority**: MEDIUM
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/verification/responses/queue`** (Response Verification Queue)
  - **File**: `packages/frontend/src/app/(dashboard)/verification/responses/queue/page.tsx`
  - **Mock Data to Replace**: Verification queue data
  - **Real Data Sources**: Response verification queue
  - **Priority**: MEDIUM
  - **Status**: ❌ MOCK DATA

---

### **Phase 8: Donor Role Pages** 💰

#### **8.1 Donor Management**
- [ ] **`/donor`** (Donor Dashboard)
  - **File**: `packages/frontend/src/app/(dashboard)/donor/page.tsx`
  - **Mock Data to Replace**: Donation overview, impact tracking
  - **Real Data Sources**: Donor data, contribution history
  - **Priority**: LOW
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/donor/achievements`** (Donor Achievements)
  - **File**: `packages/frontend/src/app/(dashboard)/donor/achievements/page.tsx`
  - **Mock Data to Replace**: Achievement data, milestones
  - **Real Data Sources**: Donor achievements, contribution milestones
  - **Priority**: LOW
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/donor/leaderboard`** (Donor Leaderboard)
  - **File**: `packages/frontend/src/app/(dashboard)/donor/leaderboard/page.tsx`
  - **Mock Data to Replace**: Contributor rankings
  - **Real Data Sources**: Donor contributions, impact metrics
  - **Priority**: LOW
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/donor/performance`** (Donor Performance)
  - **File**: `packages/frontend/src/app/(dashboard)/donor/performance/page.tsx`
  - **Mock Data to Replace**: Performance metrics, trends
  - **Real Data Sources**: Donor performance data, trends
  - **Priority**: LOW
  - **Status**: ❌ MOCK DATA

---

### **Phase 9: Entity & Queue Management** 📋

#### **9.1 Entity Management**
- [ ] **`/entities`** (Entity Overview)
  - **File**: `packages/frontend/src/app/(dashboard)/entities/page.tsx`
  - **Mock Data to Replace**: Entity lists, management data
  - **Real Data Sources**: Affected entities table
  - **Priority**: LOW
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/entities/[id]`** (Entity Details)
  - **File**: `packages/frontend/src/app/(dashboard)/entities/[id]/page.tsx`
  - **Mock Data to Replace**: Entity details, related data
  - **Real Data Sources**: Specific entity + relationships
  - **Priority**: LOW
  - **Status**: ❌ MOCK DATA

#### **9.2 Queue Management**
- [ ] **`/queue`** (Sync Queue)
  - **File**: `packages/frontend/src/app/(dashboard)/queue/page.tsx`
  - **Mock Data to Replace**: Queue data, management info
  - **Real Data Sources**: Sync queue, pending operations
  - **Priority**: LOW
  - **Status**: ❌ MOCK DATA

---

### **Phase 10: Public & Authentication Pages** 🌐

#### **10.1 Public Pages**
- [ ] **`/`** (Landing Page)
  - **File**: `packages/frontend/src/app/page.tsx`
  - **Mock Data to Replace**: System statistics, overview
  - **Real Data Sources**: System aggregates, overview data
  - **Priority**: LOW
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/auth/signin`** (Sign In)
  - **File**: `packages/frontend/src/app/auth/signin/page.tsx`
  - **Mock Data to Replace**: Authentication status, user counts
  - **Real Data Sources**: User counts, system status
  - **Priority**: LOW
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/auth/error`** (Auth Error)
  - **File**: `packages/frontend/src/app/auth/error/page.tsx`
  - **Mock Data to Replace**: Error handling, user context
  - **Real Data Sources**: Error contexts, user data
  - **Priority**: LOW
  - **Status**: ❌ MOCK DATA
  
- [ ] **`/test-grid`** (Test Grid)
  - **File**: `packages/frontend/src/app/test-grid/page.tsx`
  - **Mock Data to Replace**: Testing component data
  - **Real Data Sources**: Real test data samples
  - **Priority**: LOW
  - **Status**: ❌ MOCK DATA

---

## **Already Working Pages** ✅ (Pre-existing)

- [x] **`/monitoring`** (Main Monitoring Dashboard)
- [x] **`/monitoring/drill-down`** (Drill-down Analytics)
- [x] **`/monitoring/map`** (Interactive Map)
- [x] **`/analytics-dashboard`** (Analytics Dashboard)

---

## **Implementation Progress Summary**

- **Total Pages**: 35+ pages
- **Already Working**: 4 pages
- **Critical Bugs**: 2 issues
- **High Priority**: 8 pages
- **Medium Priority**: 13 pages
- **Low Priority**: 10 pages
- **Completed**: 4 pages (11%)
- **Remaining**: 31+ pages (89%)

**Next Focus**: Start with Phase 1 bug fixes, then high-priority admin and coordinator pages.

*Last Updated: 2025-09-18*