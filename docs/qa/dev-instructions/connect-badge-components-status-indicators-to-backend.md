# Dev Instructions: Connect Badge Components and Status Indicators to Backend

**Priority**: HIGH  
**Complexity**: MEDIUM  
**Estimated Effort**: 3-5 days  
**QA Report Reference**: `docs/qa/reports/badge-components-status-indicators-mock-analysis.md`

---

## 🎯 Objective

Convert all hardcoded badge components (navigation sidebar numbers) and status indicators (feature card metrics) from static mock values to dynamic backend-connected data across all roles.

---

## 📋 Current State Analysis

### Problem Summary
- **100% of navigation badge components** are hardcoded in `role-interfaces.ts`
- **95% of feature card status indicators** are hardcoded in `role-interfaces.ts` 
- **90% of dashboard page metrics** use mock functions with hardcoded values
- No real-time updates or backend synchronization

### Architecture Issues
1. Static hardcoded values in `packages/frontend/src/lib/role-interfaces.ts`
2. No API endpoints for badge/counter data
3. No real-time update mechanism
4. No error handling for failed data fetches
5. No loading states during data fetch

---

## 🏗️ Implementation Strategy

### Phase 1: Backend API Development (Priority)
### Phase 2: Frontend Integration  
### Phase 3: Real-time Updates
### Phase 4: Error Handling & Polish

---

## 📊 Component Inventory & Backend Requirements

### 🔷 **COORDINATOR Role Components**

#### Navigation Badge APIs Required
```typescript
// API Endpoints needed:
GET /api/v1/verification/queue/count        → Assessment Queue: 5
GET /api/v1/verification/responses/count    → Response Queue: 3  
GET /api/v1/verification/assessments/count  → Assessment Reviews: 2
GET /api/v1/incidents/active/count          → Incident Management: 4
GET /api/v1/donors/dashboard/count          → Donor Dashboard: 2
GET /api/v1/coordinator/conflicts/count     → Conflict Resolution: 3
```

#### Feature Card APIs Required  
```typescript
GET /api/v1/assessments/stats               → "12 active"
GET /api/v1/responses/stats                 → "3 planned"  
GET /api/v1/entities/stats                  → "28 locations"
GET /api/v1/coordinator/tools/stats         → "8 pending review"
GET /api/v1/monitoring/alerts/count         → "4 active alerts"
GET /api/v1/incidents/stats                 → "0 active incidents"
```

### 🔷 **ASSESSOR Role Components**

#### Navigation Badge APIs Required
```typescript
GET /api/v1/assessments/pending/health      → Health: 3
GET /api/v1/assessments/pending/wash        → WASH: 1
GET /api/v1/assessments/pending/shelter     → Shelter: 2  
GET /api/v1/assessments/pending/food        → Food: 0
GET /api/v1/assessments/pending/security    → Security: 1
GET /api/v1/assessments/pending/population  → Population: 4
```

#### Dashboard Page APIs Required
```typescript
GET /api/v1/assessments/user/metrics        → All assessor dashboard metrics
// Should return:
{
  myAssessments: number,
  drafts: number,
  pendingReview: number,
  approved: number,
  activeIncidents: number
}
```

### 🔷 **RESPONDER Role Components**

#### Navigation Badge APIs Required
```typescript
GET /api/v1/responses/status-review/count   → Status Review: 2
GET /api/v1/responses/all/count            → All Responses: 1
```

#### Dashboard Page APIs Required
```typescript
GET /api/v1/responses/user/metrics         → All responder dashboard metrics
// Should return:
{
  myResponses: number,
  planned: number, 
  inProgress: number,
  completed: number,
  deliveries: number,
  partialDeliveries: number
}
```

### 🔷 **VERIFIER Role Components**

#### Navigation Badge APIs Required
```typescript
GET /api/v1/verification/queue/pending     → Verification Queue: 3
GET /api/v1/verification/assessments/pending → Assessment Verification: 2
GET /api/v1/verification/responses/pending → Response Verification: 1
```

#### Dashboard Page APIs Required
```typescript
GET /api/v1/verification/user/metrics      → All verifier dashboard metrics
// Should return:
{
  pendingVerifications: number,
  assessmentsToReview: number,
  responsesToReview: number,
  approvedToday: number,
  rejectedToday: number,
  flaggedItems: number
}
```

### 🔷 **DONOR Role Components**

#### Navigation Badge APIs Required
```typescript
GET /api/v1/donors/commitments/pending     → Commitments: 1
```

**Note**: Donor role already has partial backend integration via `useDonorStore()`, but APIs return mock data.

### 🔷 **ADMIN Role Components**

#### Navigation Badge APIs Required
```typescript
GET /api/v1/coordinator/conflicts/count    → Conflict Resolution: 3 (shared with Coordinator)
```

#### Dashboard Page APIs Required
```typescript  
GET /api/v1/admin/system/health           → System health metrics
// Should return:
{
  systemHealth: string,
  activeUsers: number,
  securityAlerts: number,
  uptime: string
}
```

---

## 🛠️ Step-by-Step Implementation

### STEP 1: Create Backend API Endpoints

#### 1.1 Assessment Statistics API
Create `packages/frontend/src/app/api/v1/assessments/stats/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth.config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized'] },
        { status: 401 }
      );
    }

    // TODO: Replace with actual database queries
    // For now, return realistic dynamic data
    const stats = {
      totalAssessments: await getAssessmentCount(), 
      activeAssessments: await getActiveAssessmentCount(),
      pendingReview: await getPendingReviewCount(),
      completedToday: await getCompletedTodayCount()
    };

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to fetch assessment stats:', error);
    return NextResponse.json(
      { success: false, errors: ['Failed to fetch assessment statistics'] },
      { status: 500 }
    );
  }
}

// TODO: Implement actual database queries
async function getAssessmentCount(): Promise<number> {
  // Replace with actual Prisma/database query
  return Math.floor(Math.random() * 20) + 10;
}

async function getActiveAssessmentCount(): Promise<number> {
  // Replace with actual query for active assessments
  return Math.floor(Math.random() * 15) + 5;
}

async function getPendingReviewCount(): Promise<number> {
  // Replace with actual query for assessments pending review
  return Math.floor(Math.random() * 10) + 1;
}

async function getCompletedTodayCount(): Promise<number> {
  // Replace with actual query for assessments completed today
  return Math.floor(Math.random() * 8);
}
```

#### 1.2 Verification Queue Count API  
Create `packages/frontend/src/app/api/v1/verification/queue/count/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth.config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized'] },
        { status: 401 }
      );
    }

    // TODO: Replace with actual database queries
    const queueCounts = {
      assessmentQueue: await getAssessmentQueueCount(),
      responseQueue: await getResponseQueueCount(),
      totalPending: await getTotalPendingCount()
    };

    return NextResponse.json({
      success: true,
      data: queueCounts,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to fetch verification queue counts:', error);
    return NextResponse.json(
      { success: false, errors: ['Failed to fetch verification queue counts'] },
      { status: 500 }
    );
  }
}

// TODO: Implement actual database queries  
async function getAssessmentQueueCount(): Promise<number> {
  // Replace with actual query for assessments in verification queue
  return Math.floor(Math.random() * 10) + 1;
}

async function getResponseQueueCount(): Promise<number> {
  // Replace with actual query for responses in verification queue  
  return Math.floor(Math.random() * 8) + 1;
}

async function getTotalPendingCount(): Promise<number> {
  // Replace with actual query for total pending verification items
  return Math.floor(Math.random() * 15) + 5;
}
```

#### 1.3 Incident Statistics API
Create `packages/frontend/src/app/api/v1/incidents/active/count/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/auth.config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, errors: ['Unauthorized'] },
        { status: 401 }
      );
    }

    // TODO: Replace with actual database queries
    const incidentCounts = {
      activeIncidents: await getActiveIncidentCount(),
      highPriority: await getHighPriorityIncidentCount(),
      recentlyUpdated: await getRecentlyUpdatedCount()
    };

    return NextResponse.json({
      success: true,
      data: incidentCounts,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to fetch incident counts:', error);
    return NextResponse.json(
      { success: false, errors: ['Failed to fetch incident counts'] },
      { status: 500 }
    );
  }
}

// TODO: Implement actual database queries
async function getActiveIncidentCount(): Promise<number> {
  // Replace with actual query for active incidents
  return Math.floor(Math.random() * 8) + 1;
}

async function getHighPriorityIncidentCount(): Promise<number> {
  // Replace with actual query for high priority incidents
  return Math.floor(Math.random() * 5);
}

async function getRecentlyUpdatedCount(): Promise<number> {
  // Replace with actual query for recently updated incidents
  return Math.floor(Math.random() * 6) + 1;
}
```

### STEP 2: Create Data Fetching Hooks

#### 2.1 Assessment Statistics Hook
Create `packages/frontend/src/hooks/useAssessmentStats.ts`:

```typescript
import { useState, useEffect } from 'react';
import useSWR from 'swr';

interface AssessmentStats {
  totalAssessments: number;
  activeAssessments: number;
  pendingReview: number;
  completedToday: number;
}

interface UseAssessmentStatsReturn {
  stats: AssessmentStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

export const useAssessmentStats = (refreshInterval = 30000): UseAssessmentStatsReturn => {
  const { data, error, mutate } = useSWR(
    '/api/v1/assessments/stats',
    fetcher,
    { 
      refreshInterval,
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  );

  return {
    stats: data?.success ? data.data : null,
    loading: !error && !data,
    error: error?.message || (data?.success === false ? data.errors?.[0] : null),
    refetch: mutate
  };
};
```

#### 2.2 Verification Queue Hook
Create `packages/frontend/src/hooks/useVerificationQueue.ts`:

```typescript
import useSWR from 'swr';

interface VerificationQueueCounts {
  assessmentQueue: number;
  responseQueue: number;
  totalPending: number;
}

interface UseVerificationQueueReturn {
  counts: VerificationQueueCounts | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

export const useVerificationQueue = (refreshInterval = 10000): UseVerificationQueueReturn => {
  const { data, error, mutate } = useSWR(
    '/api/v1/verification/queue/count',
    fetcher,
    { 
      refreshInterval,
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  );

  return {
    counts: data?.success ? data.data : null,
    loading: !error && !data,
    error: error?.message || (data?.success === false ? data.errors?.[0] : null),
    refetch: mutate
  };
};
```

#### 2.3 Dashboard Badge Hook (Universal)
Create `packages/frontend/src/hooks/useDashboardBadges.ts`:

```typescript
import useSWR from 'swr';
import { useRoleContext } from '@/components/providers/RoleContextProvider';

interface BadgeData {
  [key: string]: number;
}

interface UseDashboardBadgesReturn {
  badges: BadgeData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

export const useDashboardBadges = (refreshInterval = 15000): UseDashboardBadgesReturn => {
  const { activeRole } = useRoleContext();
  const roleName = activeRole?.name?.toLowerCase();

  const { data, error, mutate } = useSWR(
    roleName ? `/api/v1/dashboard/badges/${roleName}` : null,
    fetcher,
    { 
      refreshInterval,
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  );

  return {
    badges: data?.success ? data.data : null,
    loading: !error && !data,
    error: error?.message || (data?.success === false ? data.errors?.[0] : null),
    refetch: mutate
  };
};
```

### STEP 3: Modify Role Interfaces for Dynamic Data

#### 3.1 Update NavigationItem Interface
Modify `packages/frontend/src/lib/role-interfaces.ts`:

```typescript
export interface NavigationItem {
  icon: string;
  label: string;
  href: string;
  badge?: number;
  badgeKey?: string; // NEW: Key for dynamic badge lookup
  badgeVariant?: 'default' | 'secondary' | 'destructive';
  requiredPermissions?: string[];
}

export interface FeatureCard {
  title: string;
  description: string;
  icon: any; // React component type
  actions: FeatureAction[];
  stats: { 
    count: number; 
    label: string;
    countKey?: string; // NEW: Key for dynamic count lookup
  };
  bgColor: string;
  borderColor: string;
  iconColor: string;
}
```

#### 3.2 Update COORDINATOR Role with Badge Keys
```typescript
COORDINATOR: {
  navigationSections: [
    {
      title: 'Verification Dashboard',
      items: [
        { 
          icon: 'ClipboardList', 
          label: 'Assessment Queue', 
          href: '/verification/queue', 
          badge: 5,  // fallback value
          badgeKey: 'assessmentQueue', // NEW: dynamic key
          requiredPermissions: ['verification:read']
        },
        { 
          icon: 'BarChart3', 
          label: 'Response Queue', 
          href: '/verification/responses/queue', 
          badge: 3,  // fallback value  
          badgeKey: 'responseQueue', // NEW: dynamic key
          requiredPermissions: ['verification:read']
        },
        // ... continue for all navigation items
      ]
    }
  ],
  featureCards: [
    {
      title: 'Assessments',
      description: 'Create and manage rapid assessments for disaster situations',
      icon: ClipboardList,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      actions: [
        { label: 'View All Assessments', href: '/assessments' },
        { label: 'Create New Assessment', href: '/assessments/new', variant: 'outline' },
        { label: 'View Status Dashboard', href: '/assessments/status', variant: 'ghost' }
      ],
      stats: { 
        count: 12,  // fallback value
        label: 'active',
        countKey: 'activeAssessments' // NEW: dynamic key
      }
    },
    // ... continue for all feature cards
  ]
}
```

### STEP 4: Update Navigation Hook for Dynamic Data

#### 4.1 Modify useRoleNavigation Hook  
Update `packages/frontend/src/hooks/useRoleNavigation.ts`:

```typescript
import { useMemo, useCallback } from 'react';
import { useRoleContext } from '@/components/providers/RoleContextProvider';
import { getRoleInterface } from '@/lib/role-interfaces';
import { useSession } from 'next-auth/react';
import { useDashboardBadges } from './useDashboardBadges'; // NEW

export const useRoleNavigation = () => {
  const { activeRole, permissions, hasPermission } = useRoleContext();
  const { data: session } = useSession();
  const { badges, loading: badgesLoading } = useDashboardBadges(); // NEW
  
  const currentRole = activeRole?.name || session?.user?.role || session?.user?.activeRole?.name || 'ASSESSOR';
  const roleInterface = getRoleInterface(currentRole);

  const navigationSections = useMemo(() => {
    if (!roleInterface) return [];

    return roleInterface.navigationSections
      .map(section => ({
        ...section,
        items: section.items
          .filter(item => {
            if (!item.requiredPermissions) return true;
            return item.requiredPermissions.every(permission => {
              const [resource, action] = permission.split(':');
              return hasPermission(resource, action);
            });
          })
          .map(item => ({
            ...item,
            // NEW: Use dynamic badge if available, fallback to static
            badge: (item.badgeKey && badges?.[item.badgeKey] !== undefined) 
              ? badges[item.badgeKey] 
              : item.badge
          }))
      }))
      .filter(section => section.items.length > 0);
  }, [roleInterface, hasPermission, badges]);

  // ... rest of hook implementation
};
```

### STEP 5: Update Dashboard Pages for Dynamic Data

#### 5.1 Update Assessor Dashboard
Modify `packages/frontend/src/app/(dashboard)/assessor/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ClipboardList, Plus, Eye, MapPin, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useAssessmentStats } from '@/hooks/useAssessmentStats' // NEW

interface AssessorMetrics {
  myAssessments: number
  drafts: number
  pendingReview: number
  approved: number
  activeIncidents: number
}

export default function AssessorDashboard() {
  // NEW: Use dynamic data hook instead of mock function
  const { stats, loading, error, refetch } = useAssessmentStats();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <Button variant="outline" size="sm" onClick={refetch} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // NEW: Use dynamic stats instead of hardcoded values
  const metrics = stats ? {
    myAssessments: stats.totalAssessments,
    drafts: stats.drafts || Math.floor(Math.random() * 5), // temporary fallback
    pendingReview: stats.pendingReview,
    approved: stats.approved || Math.floor(Math.random() * 10), // temporary fallback
    activeIncidents: stats.activeIncidents || Math.floor(Math.random() * 5) // temporary fallback
  } : null;

  if (!metrics) {
    return <div>No data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header - unchanged */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assessor Dashboard</h1>
          <p className="text-muted-foreground">
            Create and manage rapid assessments for disaster situations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/assessments/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Assessment
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Overview - NOW DYNAMIC */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Assessments</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.myAssessments}</div>
            <p className="text-xs text-muted-foreground">Total created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <Badge variant="secondary">{metrics.drafts}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.drafts}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingReview}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        {/* Continue with other cards... */}
      </div>

      {/* Quick Actions - unchanged */}
      {/* ... rest of component unchanged */}
    </div>
  )
}
```

### STEP 6: Add Error Handling & Loading States

#### 6.1 Create Loading Skeleton Component
Create `packages/frontend/src/components/ui/skeleton-badge.tsx`:

```typescript
import { Badge } from '@/components/ui/badge';

interface SkeletonBadgeProps {
  loading?: boolean;
  error?: string | null;
  value?: number;
  fallback?: number;
}

export function SkeletonBadge({ loading, error, value, fallback = 0 }: SkeletonBadgeProps) {
  if (loading) {
    return (
      <div className="h-5 w-6 bg-gray-200 animate-pulse rounded"></div>
    );
  }

  if (error) {
    return (
      <Badge variant="destructive" className="h-5 text-xs" title={`Error: ${error}`}>
        !
      </Badge>
    );
  }

  const displayValue = value !== undefined ? value : fallback;
  
  return (
    <Badge 
      variant={value !== undefined ? "default" : "secondary"} 
      className="h-5 text-xs"
      title={value === undefined ? "Using fallback data" : undefined}
    >
      {displayValue}
    </Badge>
  );
}
```

#### 6.2 Update Sidebar Component with Loading States
Modify `packages/frontend/src/components/layouts/Sidebar.tsx`:

```typescript
// Add to imports
import { SkeletonBadge } from '@/components/ui/skeleton-badge';

// In the navigation items map function:
{section.items.map((item) => {
  const iconName = typeof item.icon === 'string' ? item.icon : 'ClipboardList';
  const Icon = iconMap[iconName as keyof typeof iconMap] || ClipboardList;
  const isActive = pathname === item.href;
  const isAuthorized = isAuthorizedForRoute(item.href);
  
  if (!isAuthorized) {
    return null;
  }
  
  return (
    <Link key={item.href} href={item.href}>
      <div className={cn(
        "mx-2 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150",
        isActive 
          ? "bg-blue-100 text-blue-700 border border-blue-200 shadow-sm" 
          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
        !isOpen && "justify-center"
      )}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        {isOpen && (
          <>
            <span className="flex-1">{item.label}</span>
            {(item.badge > 0 || item.badgeKey) && (
              <SkeletonBadge 
                loading={badgesLoading}
                error={badgesError}
                value={item.badge}
                fallback={0}
              />
            )}
          </>
        )}
      </div>
    </Link>
  )
})}
```

---

## 🧪 Testing Requirements

### Unit Tests Required
1. **API Endpoint Tests**: Test all new `/api/v1/*/count` endpoints
2. **Hook Tests**: Test `useAssessmentStats`, `useVerificationQueue`, etc.
3. **Component Tests**: Test badge rendering with loading/error states
4. **Integration Tests**: Test end-to-end badge updates

### Test Files to Create
```
packages/frontend/src/hooks/__tests__/useAssessmentStats.test.ts
packages/frontend/src/hooks/__tests__/useVerificationQueue.test.ts  
packages/frontend/src/hooks/__tests__/useDashboardBadges.test.ts
packages/frontend/src/app/api/v1/assessments/stats/__tests__/route.test.ts
packages/frontend/src/components/ui/__tests__/skeleton-badge.test.tsx
```

### Manual Testing Checklist
- [ ] Navigation badges update in real-time
- [ ] Feature card stats reflect actual data
- [ ] Loading states show during API calls
- [ ] Error states display when APIs fail  
- [ ] Fallback values work when APIs unavailable
- [ ] Different roles show different badge values
- [ ] Data refreshes automatically (polling)
- [ ] Performance acceptable with frequent updates

---

## 🔧 Configuration & Environment

### Required Dependencies
Add to `packages/frontend/package.json`:
```json
{
  "dependencies": {
    "swr": "^2.2.4"
  }
}
```

### Environment Variables
No new environment variables required for basic implementation.

### Next.js Configuration
Ensure API routes are properly configured in `next.config.js` for dynamic rendering.

---

## 🚀 Deployment Considerations

### Performance Optimization
1. **API Caching**: Implement Redis caching for frequently accessed counts
2. **Database Indexing**: Ensure proper indexes for count queries
3. **Rate Limiting**: Prevent excessive API calls from frontend
4. **Batch Endpoints**: Consider single endpoint returning all badge data

### Database Queries Optimization
```sql
-- Example optimized queries to implement:

-- Assessment Queue Count
SELECT COUNT(*) FROM assessments WHERE status = 'PENDING_REVIEW';

-- Active Incidents Count  
SELECT COUNT(*) FROM incidents WHERE status = 'ACTIVE';

-- User-specific Metrics
SELECT 
  COUNT(*) as total_assessments,
  COUNT(CASE WHEN status = 'DRAFT' THEN 1 END) as drafts,
  COUNT(CASE WHEN status = 'PENDING_REVIEW' THEN 1 END) as pending_review
FROM assessments 
WHERE created_by = $userId;
```

### Security Considerations
1. **Authentication**: All badge APIs require valid session
2. **Authorization**: Badge data filtered by user role/permissions
3. **Rate Limiting**: Prevent badge API abuse
4. **Data Sanitization**: Ensure count data is properly validated

---

## 📈 Success Metrics

### Performance Targets
- Badge API response time: < 100ms
- UI update latency: < 200ms after data change
- Error rate: < 1% for badge API calls
- Cache hit rate: > 80% for frequently accessed counts

### User Experience Goals
- Zero loading flicker for badge updates
- Graceful degradation when APIs fail
- Consistent data across all role interfaces
- Real-time updates within 30 seconds of data change

---

## 🔄 Rollback Plan

### Immediate Rollback
If issues occur, temporarily revert to static values by:
1. Setting all `badgeKey` values to `undefined` in `role-interfaces.ts`
2. Disabling SWR hooks with feature flag
3. Return to hardcoded fallback values

### Gradual Rollout
1. **Week 1**: Deploy backend APIs (return test data)
2. **Week 2**: Connect COORDINATOR role badges only  
3. **Week 3**: Connect remaining roles
4. **Week 4**: Enable real-time polling

---

## 📝 Additional Notes

### Related Files to Review
- `packages/frontend/src/components/providers/RoleContextProvider.tsx` - Role context
- `packages/frontend/src/hooks/useMultiRole.ts` - Multi-role handling
- `packages/frontend/src/stores/` - State management patterns
- `packages/shared/src/types/` - Shared TypeScript types

### External Dependencies
- Ensure database schema supports efficient counting queries
- Consider impact on backend performance with frequent badge requests
- Plan for WebSocket integration if real-time updates needed

### Future Enhancements
1. **WebSocket Updates**: Real-time badge updates via WebSocket
2. **Batch API**: Single endpoint for all badge data
3. **Caching Strategy**: Client-side cache with stale-while-revalidate
4. **Analytics**: Track badge click-through rates
5. **Personalization**: User-specific badge preferences

---

**Implementation Priority**: HIGH  
**Estimated Timeline**: 3-5 development days  
**Dependencies**: Database schema, API infrastructure  
**Risk Level**: MEDIUM (significant UI changes)  

---

*This document serves as the complete specification for converting hardcoded badge components and status indicators to backend-connected dynamic data. Follow the implementation steps sequentially and test thoroughly at each phase.*