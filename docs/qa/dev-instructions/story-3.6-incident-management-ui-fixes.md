# Story 3.6: Incident Management - Critical UI Integration Fixes

## Issue Summary
**BLOCKING**: Story 3.6 incident management functionality is 75% complete but **not accessible to users** due to missing UI routing and navigation integration. All backend components, API endpoints, and data stores are implemented and tested, but users cannot reach the incident management features.

## Required Actions

### 1. Create Incident Management Page Route (PRIORITY 1)

**Missing File:** `packages/frontend/src/app/(dashboard)/coordinator/incidents/page.tsx`

**Implementation Using Next.js App Router:**

```typescript
// packages/frontend/src/app/(dashboard)/coordinator/incidents/page.tsx
import { IncidentManagementInterface } from '@/components/features/incident/IncidentManagementInterface';

export default function IncidentsPage() {
  return (
    <IncidentManagementInterface 
      coordinatorId="current-coordinator-id"
      coordinatorName="Current Coordinator Name"
    />
  );
}
```

**Next.js App Router Context:**
- Uses file-based routing where the folder structure `(dashboard)/coordinator/incidents/page.tsx` creates the route `/coordinator/incidents`
- The `(dashboard)` is a route group that doesn't affect the URL structure
- `page.tsx` makes the route publicly accessible

### 2. Update Coordinator Dashboard Navigation (PRIORITY 1)

**File to Update:** `packages/frontend/src/app/(dashboard)/coordinator/dashboard/page.tsx`

**Add Incident Management Card:**

```typescript
// Add to the coordinator dashboard main features section
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Existing cards... */}
  
  {/* NEW: Incident Management Card */}
  <Card className="hover:shadow-lg transition-shadow">
    <CardHeader>
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <div>
          <CardTitle>Incident Management</CardTitle>
          <p className="text-sm text-muted-foreground">
            Create and track multi-phase incident responses
          </p>
          <p className="text-xs text-blue-600 font-medium">
            {incidentStats.activeIncidents} active incidents
          </p>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="font-medium text-red-600">{incidentStats.activeIncidents}</span>
          <span className="text-muted-foreground"> Active</span>
        </div>
        <div>
          <span className="font-medium text-orange-600">{incidentStats.highPriorityIncidents}</span>
          <span className="text-muted-foreground"> High Priority</span>
        </div>
      </div>
      <div className="flex gap-2">
        <Link href="/coordinator/incidents" className="flex-1">
          <Button size="sm" className="w-full">
            <Eye className="h-4 w-4 mr-2" />
            Manage Incidents
          </Button>
        </Link>
        <Link href="/coordinator/incidents?action=create" className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            New Incident
          </Button>
        </Link>
      </div>
    </CardContent>
  </Card>
</div>
```

**Required Imports:**
```typescript
import { AlertTriangle, Eye, Plus } from 'lucide-react';
import Link from 'next/link';
```

### 3. Update Sidebar Navigation (PRIORITY 1)

**File to Update:** `packages/frontend/src/components/layouts/Sidebar.tsx`

**Add Incident Management Navigation Item:**

```typescript
// Add to coordinator role navigation items
{role === 'coordinator' && (
  <>
    {/* Existing coordinator items... */}
    
    {/* NEW: Incident Management Navigation */}
    <NavigationItem
      icon={AlertTriangle}
      label="Incident Management"
      href="/coordinator/incidents"
      badge={incidentStats?.activeIncidents}
      badgeVariant="destructive"
    />
  </>
)}
```

### 4. Add Quick Action Creation Support (OPTIONAL)

**File to Update:** `packages/frontend/src/app/(dashboard)/coordinator/incidents/page.tsx`

**Support Direct Creation via URL Params:**

```typescript
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { IncidentManagementInterface } from '@/components/features/incident/IncidentManagementInterface';
import { useIncidentForms } from '@/stores/incident.store';

export default function IncidentsPage() {
  const searchParams = useSearchParams();
  const { openCreationForm } = useIncidentForms();
  
  useEffect(() => {
    // Support ?action=create URL parameter for direct incident creation
    if (searchParams.get('action') === 'create') {
      openCreationForm();
    }
  }, [searchParams, openCreationForm]);

  return (
    <IncidentManagementInterface 
      coordinatorId="current-coordinator-id"
      coordinatorName="Current Coordinator Name"
    />
  );
}
```

**Required Imports for Client Component:**
```typescript
'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
```

### 5. Fetch Incident Stats for Dashboard (PRIORITY 2)

**File to Update:** Coordinator dashboard component

**Add Incident Stats Fetching:**

```typescript
// Add to existing data fetching logic
const [incidentStats, setIncidentStats] = useState({
  activeIncidents: 0,
  highPriorityIncidents: 0,
  totalIncidents: 0
});

useEffect(() => {
  const fetchIncidentStats = async () => {
    try {
      const response = await fetch('/api/v1/incidents?page=1&pageSize=1');
      const data = await response.json();
      
      if (data.success) {
        setIncidentStats({
          activeIncidents: data.data.stats.activeIncidents,
          highPriorityIncidents: data.data.stats.highPriorityIncidents,
          totalIncidents: data.data.stats.totalIncidents
        });
      }
    } catch (error) {
      console.error('Failed to fetch incident stats:', error);
    }
  };

  fetchIncidentStats();
}, []);
```

## Next.js App Router Best Practices

### File-Based Routing Structure
```
app/
├── (dashboard)/
│   └── coordinator/
│       ├── dashboard/
│       │   └── page.tsx           # /coordinator/dashboard
│       └── incidents/
│           └── page.tsx           # /coordinator/incidents (NEW)
```

### Link Component Usage
```typescript
// Correct Next.js App Router Link usage
import Link from 'next/link';

<Link href="/coordinator/incidents">
  <Button>Manage Incidents</Button>
</Link>

// NOT this (dynamic href not supported in App Router):
<Link href={{ pathname: '/coordinator/[section]', query: { section: 'incidents' } }}>
```

### Dynamic Route Access
```typescript
// If you need dynamic routes later, use this pattern:
// app/coordinator/incidents/[id]/page.tsx

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  
  return <IncidentDetailView incidentId={id} />;
}
```

## Testing Verification Steps

### 1. Route Accessibility Test
```bash
# Start development server
pnpm dev

# Navigate to http://localhost:3000/coordinator/incidents
# Should display the incident management interface
```

### 2. Navigation Integration Test
```bash
# 1. Go to /coordinator/dashboard
# 2. Look for incident management card
# 3. Click "Manage Incidents" button
# 4. Should navigate to /coordinator/incidents
# 5. Verify sidebar shows "Incident Management" link
```

### 3. Direct Creation Test
```bash
# Navigate to: http://localhost:3000/coordinator/incidents?action=create
# Should open incident creation form automatically
```

## Implementation Priority

1. **MUST HAVE (Blocking):** Create page route file
2. **MUST HAVE (Blocking):** Add dashboard navigation card
3. **SHOULD HAVE:** Update sidebar navigation
4. **NICE TO HAVE:** Support URL parameter creation
5. **NICE TO HAVE:** Add incident stats to dashboard

## Files to Create/Modify

### New Files:
- `packages/frontend/src/app/(dashboard)/coordinator/incidents/page.tsx`

### Modified Files:
- `packages/frontend/src/app/(dashboard)/coordinator/dashboard/page.tsx`
- `packages/frontend/src/components/layouts/Sidebar.tsx`

## Quality Checklist

- [ ] Route accessible at `/coordinator/incidents`
- [ ] Navigation cards work correctly
- [ ] Sidebar navigation updated
- [ ] Role-based access control maintained
- [ ] No TypeScript errors
- [ ] Incident stats display correctly
- [ ] Direct creation URL parameter works

## Expected Outcome

After implementing these fixes:
- ✅ Users can access incident management via `/coordinator/incidents`
- ✅ Clear navigation path from coordinator dashboard
- ✅ Sidebar navigation includes incident management
- ✅ Story 3.6 functionality becomes 100% accessible to end users
- ✅ All acceptance criteria remain fulfilled with full UI integration

This will elevate Story 3.6 from **75% complete** to **100% complete** and ready for Done status.