# Dev Instructions: Fix Story 3.1 - Coordinator Dashboard Route

## Issue Summary
**Story 3.1: Assessment Verification Dashboard** navigation fails with 404 error when accessing `/coordinator/dashboard` route.

## QA Test Results
✅ **Verified Navigation Path**: Home → "Verification Dashboard" button  
❌ **Route Status**: 404 - Page not found  
⚠️ **Impact**: Coordinator tools functionality inaccessible  

## Root Cause Analysis
The coordinator dashboard route `/coordinator/dashboard` is missing from the Next.js App Router file structure. The navigation links are present in the home page, but the corresponding page component doesn't exist.

## Required Implementation

### 1. Create Missing Route Structure

Create the following directory structure in the Next.js app directory:

```
packages/frontend/src/app/(dashboard)/coordinator/
├── dashboard/
│   └── page.tsx
├── assessments/
│   └── review/
│       └── page.tsx
└── responses/
    └── review/
        └── page.tsx
```

### 2. Implement Coordinator Dashboard Page

**File**: `packages/frontend/src/app/(dashboard)/coordinator/dashboard/page.tsx`

```tsx
import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

// Dashboard metrics interface
interface DashboardMetrics {
  pendingAssessments: number
  pendingResponses: number
  recentApprovals: number
  flaggedItems: number
}

// Mock data - replace with actual API call
async function getDashboardMetrics(): Promise<DashboardMetrics> {
  // Simulate API call
  return {
    pendingAssessments: 8,
    pendingResponses: 5,
    recentApprovals: 12,
    flaggedItems: 3
  }
}

export default async function CoordinatorDashboard() {
  const metrics = await getDashboardMetrics()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Verification Dashboard</h1>
        <p className="text-muted-foreground">
          Review and approve assessments and responses from field operations
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Assessments</CardTitle>
            <Badge variant="secondary">{metrics.pendingAssessments}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingAssessments}</div>
            <p className="text-xs text-muted-foreground">
              Require verification
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Responses</CardTitle>
            <Badge variant="secondary">{metrics.pendingResponses}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingResponses}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Approvals</CardTitle>
            <Badge variant="default">{metrics.recentApprovals}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.recentApprovals}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged Items</CardTitle>
            <Badge variant="destructive">{metrics.flaggedItems}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.flaggedItems}</div>
            <p className="text-xs text-muted-foreground">
              High priority
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Assessment Queue</CardTitle>
            <p className="text-sm text-muted-foreground">
              Review and approve field assessments
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Emergency assessments</span>
              <Badge variant="destructive">2</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Standard assessments</span>
              <Badge variant="secondary">6</Badge>
            </div>
            <Link href="/coordinator/assessments/review">
              <Button className="w-full">Review Assessments</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Queue</CardTitle>
            <p className="text-sm text-muted-foreground">
              Approve response plans and deliveries
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Planned responses</span>
              <Badge variant="outline">3</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Completed deliveries</span>
              <Badge variant="secondary">2</Badge>
            </div>
            <Link href="/coordinator/responses/review">
              <Button className="w-full">Review Responses</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

### 3. Create Assessment Review Page (Story 3.2)

**File**: `packages/frontend/src/app/(dashboard)/coordinator/assessments/review/page.tsx`

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function AssessmentReview() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assessment Review</h1>
        <p className="text-muted-foreground">
          Review and approve field assessments
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Assessments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Assessment review queue will be implemented here</p>
            <p className="text-sm text-muted-foreground mt-2">
              This corresponds to Story 3.2: Assessment Approval/Rejection
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

### 4. Create Response Review Page (Story 3.3)

**File**: `packages/frontend/src/app/(dashboard)/coordinator/responses/review/page.tsx`

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function ResponseReview() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Response Review</h1>
        <p className="text-muted-foreground">
          Review and approve response plans and deliveries
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Responses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Response review queue will be implemented here</p>
            <p className="text-sm text-muted-foreground mt-2">
              This corresponds to Story 3.3: Response Approval/Rejection
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

### 5. Add Route Metadata (Optional but Recommended)

Add metadata exports to each page for better SEO and navigation:

```tsx
// Add to each page.tsx file
export const metadata = {
  title: 'Coordinator Dashboard | DMS',
  description: 'Assessment and response verification dashboard'
}
```

## Implementation Steps

### Step 1: Create Directory Structure
```bash
cd packages/frontend/src/app/(dashboard)
mkdir -p coordinator/dashboard
mkdir -p coordinator/assessments/review
mkdir -p coordinator/responses/review
```

### Step 2: Create Page Components
Create the page.tsx files in each directory with the code provided above.

### Step 3: Test Navigation
1. Start the development server: `pnpm dev`
2. Navigate to home page: `http://localhost:3004`
3. Click "Verification Dashboard" button
4. Verify the route loads successfully at `/coordinator/dashboard`
5. Test navigation to assessment and response review pages

### Step 4: Validate Routing
Ensure all coordinator routes are accessible:
- ✅ `/coordinator/dashboard`
- ✅ `/coordinator/assessments/review` 
- ✅ `/coordinator/responses/review`

## Next.js App Router Best Practices Applied

1. **File-System Routing**: Using the `app` directory structure for automatic route generation
2. **Server Components**: Pages are async server components for optimal performance
3. **Layouts**: Leveraging the existing `(dashboard)` layout group
4. **Metadata**: Adding page metadata for better SEO
5. **Link Prefetching**: Using `next/link` for client-side navigation

## Testing Checklist

- [ ] `/coordinator/dashboard` route loads without 404 error
- [ ] Dashboard displays metrics and quick action cards
- [ ] Navigation links to assessment and response review work
- [ ] Page renders correctly on desktop and mobile
- [ ] Back navigation from coordinator pages works properly
- [ ] Role-based access can be added later (authentication integration)

## Related Stories

This fix enables the foundation for:
- ✅ **Story 3.1**: Assessment Verification Dashboard (this fix)
- 🔄 **Story 3.2**: Assessment Approval/Rejection (placeholder created)
- 🔄 **Story 3.3**: Response Approval/Rejection (placeholder created)
- 🔄 **Story 3.4**: Automatic Approval Configuration (future integration)

## API Integration Notes

The dashboard currently uses mock data. Future iterations should:
1. Create API endpoints for dashboard metrics
2. Implement real-time updates for pending counts
3. Add authentication/authorization middleware
4. Connect to actual assessment and response data

## Priority: HIGH
This fix resolves a critical navigation issue that blocks access to coordinator functionality and should be implemented immediately to restore full application navigation.