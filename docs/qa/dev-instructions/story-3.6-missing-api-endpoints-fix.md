# Story 3.6: Missing API Endpoints Implementation

## Issue Summary
Story 3.6 incident management is 95% complete but has **3 missing API endpoints** that prevent the "View Details" functionality and some dashboard statistics from working properly. The following endpoints return 404 errors:

- `/api/v1/incidents/stats` (404) - Used by dashboard refresh
- `/api/v1/incidents/[id]` (404) - Used by "View Details" functionality  
- `/api/v1/incidents/[id]/timeline` (404) - Timeline feature incomplete

## Required API Endpoint Implementations

### 1. Create Missing Stats Endpoint (PRIORITY 1)

**File:** `packages/frontend/src/app/api/v1/incidents/stats/route.ts`

**Implementation using Next.js App Router and Context7 patterns:**

```typescript
import { NextRequest, NextResponse } from 'next/server';

// Mock data for development - replace with actual database queries in production
const MOCK_INCIDENTS = [
  {
    id: 'incident-1',
    name: 'Adamawa Landslide Event',
    type: 'LANDSLIDE',
    severity: 'CATASTROPHIC',
    status: 'ACTIVE',
    date: new Date('2024-01-15'),
    affectedEntityCount: 5,
    assessmentCount: 8,
    responseCount: 3,
    lastUpdated: new Date('2024-01-20')
  },
  {
    id: 'incident-2',
    name: 'Maiduguri Market Fire',
    type: 'FIRE',
    severity: 'MODERATE',
    status: 'CONTAINED',
    date: new Date('2024-02-10'),
    affectedEntityCount: 1,
    assessmentCount: 2,
    responseCount: 1,
    lastUpdated: new Date('2024-02-12')
  },
  {
    id: 'incident-3',
    name: 'Borno State Flood - August 2024',
    type: 'FLOOD',
    severity: 'SEVERE',
    status: 'ACTIVE',
    date: new Date('2024-08-01'),
    affectedEntityCount: 3,
    assessmentCount: 5,
    responseCount: 2,
    lastUpdated: new Date('2024-08-15')
  }
];

export async function GET(request: NextRequest) {
  try {
    // Calculate statistics from mock data
    const stats = {
      totalIncidents: MOCK_INCIDENTS.length,
      activeIncidents: MOCK_INCIDENTS.filter(i => i.status === 'ACTIVE').length,
      highPriorityIncidents: MOCK_INCIDENTS.filter(i => 
        i.severity === 'SEVERE' || i.severity === 'CATASTROPHIC'
      ).length,
      recentlyUpdated: MOCK_INCIDENTS.filter(i => {
        const daysSinceUpdate = Math.abs(Date.now() - i.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceUpdate <= 7;
      }).length,
      byType: MOCK_INCIDENTS.reduce((acc, incident) => {
        acc[incident.type] = (acc[incident.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      bySeverity: MOCK_INCIDENTS.reduce((acc, incident) => {
        acc[incident.severity] = (acc[incident.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byStatus: MOCK_INCIDENTS.reduce((acc, incident) => {
        acc[incident.status] = (acc[incident.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    return NextResponse.json({
      success: true,
      data: {
        stats
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch incident stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch incident statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
```

### 2. Create Missing Individual Incident Detail Endpoint (PRIORITY 1)

**File:** `packages/frontend/src/app/api/v1/incidents/[id]/route.ts`

**Implementation using Dynamic Route Segments:**

```typescript
import { NextRequest, NextResponse } from 'next/server';

// Mock incident data - replace with database queries in production
const MOCK_INCIDENT_DETAILS = {
  'incident-1': {
    id: 'incident-1',
    name: 'Adamawa Landslide Event',
    type: 'LANDSLIDE',
    subType: 'Soil Movement',
    source: 'NEMA Field Report',
    severity: 'CATASTROPHIC',
    status: 'ACTIVE',
    date: new Date('2024-01-15'),
    description: 'Major landslide affecting multiple communities in Adamawa State',
    coordinates: {
      latitude: 9.3265,
      longitude: 12.3984
    },
    affectedEntityCount: 5,
    assessmentCount: 8,
    responseCount: 3,
    lastUpdated: new Date('2024-01-20'),
    affectedEntityIds: ['entity-1', 'entity-2', 'entity-3', 'entity-4', 'entity-5'],
    preliminaryAssessmentIds: ['prelim-1', 'prelim-2'],
    actionItems: [
      {
        id: 'action-1',
        description: 'Deploy emergency response team to affected area',
        assignedTo: 'coordinator-1',
        dueDate: new Date('2024-01-22'),
        status: 'IN_PROGRESS',
        priority: 'HIGH'
      },
      {
        id: 'action-2',
        description: 'Establish temporary shelter for displaced families',
        assignedTo: 'coordinator-2',
        dueDate: new Date('2024-01-25'),
        status: 'PENDING',
        priority: 'HIGH'
      }
    ],
    timeline: [
      {
        id: 'timeline-1',
        type: 'STATUS_CHANGE',
        timestamp: new Date('2024-01-15T08:00:00Z'),
        coordinatorId: 'coord-1',
        coordinatorName: 'John Doe',
        description: 'Incident created and marked as ACTIVE',
        metadata: { previousStatus: null, newStatus: 'ACTIVE' }
      },
      {
        id: 'timeline-2',
        type: 'ENTITY_LINKED',
        timestamp: new Date('2024-01-16T10:30:00Z'),
        coordinatorId: 'coord-2',
        coordinatorName: 'Jane Smith',
        description: 'Linked 5 affected entities to incident',
        metadata: { entityCount: 5 }
      }
    ]
  },
  'incident-2': {
    id: 'incident-2',
    name: 'Maiduguri Market Fire',
    type: 'FIRE',
    severity: 'MODERATE',
    status: 'CONTAINED',
    date: new Date('2024-02-10'),
    description: 'Fire outbreak at Maiduguri central market',
    coordinates: {
      latitude: 11.8469,
      longitude: 13.1571
    },
    affectedEntityCount: 1,
    assessmentCount: 2,
    responseCount: 1,
    lastUpdated: new Date('2024-02-12'),
    affectedEntityIds: ['entity-6'],
    preliminaryAssessmentIds: ['prelim-3'],
    actionItems: [],
    timeline: [
      {
        id: 'timeline-3',
        type: 'STATUS_CHANGE',
        timestamp: new Date('2024-02-10T14:00:00Z'),
        coordinatorId: 'coord-1',
        coordinatorName: 'John Doe',
        description: 'Incident created and marked as ACTIVE',
        metadata: { previousStatus: null, newStatus: 'ACTIVE' }
      },
      {
        id: 'timeline-4',
        type: 'STATUS_CHANGE',
        timestamp: new Date('2024-02-12T09:00:00Z'),
        coordinatorId: 'coord-1',
        coordinatorName: 'John Doe',
        description: 'Fire contained, status updated to CONTAINED',
        metadata: { previousStatus: 'ACTIVE', newStatus: 'CONTAINED' }
      }
    ]
  },
  'incident-3': {
    id: 'incident-3',
    name: 'Borno State Flood - August 2024',
    type: 'FLOOD',
    severity: 'SEVERE',
    status: 'ACTIVE',
    date: new Date('2024-08-01'),
    description: 'Severe flooding in multiple LGAs of Borno State',
    coordinates: {
      latitude: 11.8333,
      longitude: 13.15
    },
    affectedEntityCount: 3,
    assessmentCount: 5,
    responseCount: 2,
    lastUpdated: new Date('2024-08-15'),
    affectedEntityIds: ['entity-7', 'entity-8', 'entity-9'],
    preliminaryAssessmentIds: ['prelim-4', 'prelim-5'],
    actionItems: [
      {
        id: 'action-3',
        description: 'Provide emergency water and sanitation support',
        assignedTo: 'coordinator-3',
        dueDate: new Date('2024-08-18'),
        status: 'PENDING',
        priority: 'MEDIUM'
      }
    ],
    timeline: [
      {
        id: 'timeline-5',
        type: 'STATUS_CHANGE',
        timestamp: new Date('2024-08-01T06:00:00Z'),
        coordinatorId: 'coord-3',
        coordinatorName: 'Ahmed Hassan',
        description: 'Flood incident reported and marked as ACTIVE',
        metadata: { previousStatus: null, newStatus: 'ACTIVE' }
      }
    ]
  }
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate incident ID
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Incident ID is required'
      }, { status: 400 });
    }

    // Fetch incident details from mock data
    const incident = MOCK_INCIDENT_DETAILS[id as keyof typeof MOCK_INCIDENT_DETAILS];

    if (!incident) {
      return NextResponse.json({
        success: false,
        error: 'Incident not found',
        details: `No incident found with ID: ${id}`
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        incident
      }
    }, { status: 200 });

  } catch (error) {
    console.error(`Failed to fetch incident ${await params.then(p => p.id)}:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch incident details',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
```

### 3. Create Missing Timeline Endpoint (PRIORITY 2)

**File:** `packages/frontend/src/app/api/v1/incidents/[id]/timeline/route.ts`

**Implementation for Timeline History:**

```typescript
import { NextRequest, NextResponse } from 'next/server';

// Mock timeline data - replace with database queries in production
const MOCK_TIMELINES = {
  'incident-1': [
    {
      id: 'timeline-1',
      type: 'STATUS_CHANGE',
      timestamp: new Date('2024-01-15T08:00:00Z'),
      coordinatorId: 'coord-1',
      coordinatorName: 'John Doe',
      description: 'Incident created and marked as ACTIVE',
      metadata: { previousStatus: null, newStatus: 'ACTIVE' }
    },
    {
      id: 'timeline-2',
      type: 'ENTITY_LINKED',
      timestamp: new Date('2024-01-16T10:30:00Z'),
      coordinatorId: 'coord-2',
      coordinatorName: 'Jane Smith',
      description: 'Linked 5 affected entities to incident',
      metadata: { entityCount: 5 }
    },
    {
      id: 'timeline-3',
      type: 'ASSESSMENT_ADDED',
      timestamp: new Date('2024-01-17T14:15:00Z'),
      coordinatorId: 'coord-1',
      coordinatorName: 'John Doe',
      description: 'New preliminary assessment added',
      metadata: { assessmentId: 'prelim-1', assessmentType: 'PRELIMINARY' }
    },
    {
      id: 'timeline-4',
      type: 'NOTE_ADDED',
      timestamp: new Date('2024-01-20T16:45:00Z'),
      coordinatorId: 'coord-3',
      coordinatorName: 'Ahmed Hassan',
      description: 'Updated response coordination strategy',
      metadata: { note: 'Coordinating with local authorities for evacuation support' }
    }
  ],
  'incident-2': [
    {
      id: 'timeline-3',
      type: 'STATUS_CHANGE',
      timestamp: new Date('2024-02-10T14:00:00Z'),
      coordinatorId: 'coord-1',
      coordinatorName: 'John Doe',
      description: 'Incident created and marked as ACTIVE',
      metadata: { previousStatus: null, newStatus: 'ACTIVE' }
    },
    {
      id: 'timeline-4',
      type: 'STATUS_CHANGE',
      timestamp: new Date('2024-02-12T09:00:00Z'),
      coordinatorId: 'coord-1',
      coordinatorName: 'John Doe',
      description: 'Fire contained, status updated to CONTAINED',
      metadata: { previousStatus: 'ACTIVE', newStatus: 'CONTAINED' }
    }
  ],
  'incident-3': [
    {
      id: 'timeline-5',
      type: 'STATUS_CHANGE',
      timestamp: new Date('2024-08-01T06:00:00Z'),
      coordinatorId: 'coord-3',
      coordinatorName: 'Ahmed Hassan',
      description: 'Flood incident reported and marked as ACTIVE',
      metadata: { previousStatus: null, newStatus: 'ACTIVE' }
    },
    {
      id: 'timeline-6',
      type: 'ENTITY_LINKED',
      timestamp: new Date('2024-08-02T11:20:00Z'),
      coordinatorId: 'coord-3',
      coordinatorName: 'Ahmed Hassan',
      description: 'Linked 3 affected communities to incident',
      metadata: { entityCount: 3 }
    }
  ]
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate incident ID
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Incident ID is required'
      }, { status: 400 });
    }

    // Fetch timeline from mock data
    const timeline = MOCK_TIMELINES[id as keyof typeof MOCK_TIMELINES];

    if (!timeline) {
      return NextResponse.json({
        success: false,
        error: 'Timeline not found',
        details: `No timeline found for incident ID: ${id}`
      }, { status: 404 });
    }

    // Sort timeline events by timestamp (newest first)
    const sortedTimeline = [...timeline].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Generate status history from timeline events
    const statusHistory = timeline
      .filter(event => event.type === 'STATUS_CHANGE')
      .map((event, index, statusEvents) => {
        const nextEvent = statusEvents[index + 1];
        const duration = nextEvent 
          ? `${Math.round((new Date(nextEvent.timestamp).getTime() - new Date(event.timestamp).getTime()) / (1000 * 60 * 60 * 24))} days`
          : 'Ongoing';

        return {
          status: event.metadata.newStatus,
          changedAt: event.timestamp,
          changedBy: event.coordinatorName,
          notes: event.description,
          duration
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        incidentId: id,
        timeline: sortedTimeline,
        statusHistory
      }
    }, { status: 200 });

  } catch (error) {
    console.error(`Failed to fetch timeline for incident ${await params.then(p => p.id)}:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch incident timeline',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
```

## Next.js App Router Best Practices Applied

### 1. Dynamic Route Handling
```typescript
// Using proper Next.js 15+ async params pattern
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // Correctly awaiting params promise
  // ... rest of implementation
}
```

### 2. Error Handling
```typescript
try {
  // API logic
  return NextResponse.json({ success: true, data }, { status: 200 });
} catch (error) {
  console.error('API Error:', error);
  return NextResponse.json({
    success: false,
    error: 'Operation failed',
    details: error instanceof Error ? error.message : 'Unknown error'
  }, { status: 500 });
}
```

### 3. Response Format Consistency
All endpoints return responses in the format expected by the existing incident store:
```typescript
{
  success: boolean;
  data?: any;
  error?: string;
  details?: string;
}
```

## Testing Instructions

### 1. Test Stats Endpoint
```bash
curl http://localhost:3000/api/v1/incidents/stats
```

### 2. Test Individual Incident Endpoint
```bash
curl http://localhost:3000/api/v1/incidents/incident-1
curl http://localhost:3000/api/v1/incidents/incident-2  
curl http://localhost:3000/api/v1/incidents/incident-3
```

### 3. Test Timeline Endpoint
```bash
curl http://localhost:3000/api/v1/incidents/incident-1/timeline
```

### 4. Test Error Cases
```bash
# Non-existent incident
curl http://localhost:3000/api/v1/incidents/nonexistent-id

# Invalid timeline
curl http://localhost:3000/api/v1/incidents/invalid-id/timeline
```

## Expected Results After Implementation

1. ✅ Dashboard statistics refresh without 404 errors
2. ✅ "View Details" buttons work and show incident details
3. ✅ Timeline functionality accessible from incident interface
4. ✅ Error states properly handled with user-friendly messages
5. ✅ Story 3.6 elevated from 95% to 100% completion

## Implementation Priority

1. **MUST HAVE:** Stats and individual incident endpoints (enables core functionality)
2. **SHOULD HAVE:** Timeline endpoint (completes the feature set)
3. **NICE TO HAVE:** Additional error handling and validation enhancements

## Files to Create

```
packages/frontend/src/app/api/v1/incidents/
├── stats/
│   └── route.ts                    # NEW: Statistics endpoint
└── [id]/
    ├── route.ts                    # NEW: Individual incident details
    └── timeline/
        └── route.ts                # NEW: Timeline endpoint
```

## Quality Checklist

- [ ] All endpoints return proper HTTP status codes
- [ ] Response format matches existing API patterns  
- [ ] Error handling includes user-friendly messages
- [ ] TypeScript types are properly defined
- [ ] Mock data is comprehensive and realistic
- [ ] Dynamic route parameters properly handled
- [ ] Endpoints tested with various scenarios

## Migration Path to Production

Replace mock data implementations with actual database queries:

```typescript
// Replace this:
const MOCK_INCIDENTS = [...]

// With this:
const incidents = await prisma.incident.findMany({
  include: {
    affectedEntities: true,
    preliminaryAssessments: true,
    // ... other relations
  }
});
```

This implementation follows Next.js App Router best practices and will resolve all remaining 404 errors, bringing Story 3.6 to 100% completion.