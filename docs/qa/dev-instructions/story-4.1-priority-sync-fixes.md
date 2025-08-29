# Story 4.1: Priority-Based Sync - Implementation Fixes

## Status
Story 4.1 is **~70% complete** with core logic implemented but UI integration and backend processing incomplete.

## Issues Found

### 1. Component Test Failures (PriorityRuleManager)
**Issue**: Tests failing with "Found multiple elements with the same text" error when using `getByText('ASSESSMENT')`.

**Root Cause**: Multiple DOM elements contain the same text content causing React Testing Library to throw errors when using `getBy*` queries.

**Solution - Use Web Search Results**:
```typescript
// Instead of:
screen.getByText('ASSESSMENT')

// Use one of these approaches:
// 1. Use getAllBy for multiple expected elements:
const assessmentElements = screen.getAllByText('ASSESSMENT');
expect(assessmentElements[0]).toBeInTheDocument();

// 2. Use queryAllBy for nullable results:
const elements = screen.queryAllByText('ASSESSMENT');

// 3. Use within() to scope queries to specific containers:
const container = screen.getByTestId('priority-rules-list');
within(container).getByText('ASSESSMENT');

// 4. Prefer *ByRole queries with name option:
screen.getByRole('button', { name: /assessment/i });

// 5. Add data-testid attributes for unique targeting:
// In component: <div data-testid="assessment-rule-1">ASSESSMENT</div>
screen.getByTestId('assessment-rule-1');
```

**Files to Fix**:
- `packages/frontend/__tests__/components/features/sync/PriorityRuleManager.test.tsx`

### 2. Backend BullMQ Priority Processing Missing
**Issue**: BullMQ queue is not configured for priority-based processing. Jobs are processed in FIFO order instead of priority order.

**Solution - Use Context7 BullMQ Documentation**:

#### Update Queue Configuration:
```typescript
// packages/backend/src/lib/queue/processor.ts
import { Queue, Worker } from 'bullmq';

// Configure queue to handle prioritized jobs
const syncQueue = new Queue('sync-queue', {
  connection: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    // Enable priority processing
    priority: 50, // Default priority for jobs without explicit priority
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
  },
});
```

#### Add Priority-Based Job Processing:
```typescript
// When adding jobs to the queue:
await syncQueue.add('sync-item', queueItem.data, {
  priority: queueItem.priorityScore, // Use calculated priority score (0-100)
  jobId: queueItem.id, // Ensure idempotency
});

// Worker configuration for priority processing:
const syncWorker = new Worker('sync-queue', async (job) => {
  console.log(`Processing job ${job.id} with priority ${job.opts.priority}`);
  
  // Process the sync job
  const result = await processSyncItem(job.data);
  
  return result;
}, {
  connection: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  concurrency: 5, // Process up to 5 jobs concurrently
});
```

#### Priority Queue Methods:
```typescript
// Get prioritized jobs count
const prioritizedCount = await syncQueue.getPrioritizedCount();

// Get prioritized jobs
const prioritizedJobs = await syncQueue.getPrioritized();

// Get counts per priority level
const counts = await syncQueue.getCountsPerPriority([1, 0, 5, 10]);
/*
Returns:
{
  '0': 10,  // Highest priority jobs
  '1': 5,
  '5': 3,
  '10': 2
}
*/
```

**Key BullMQ Priority Rules**:
- Lower numbers = higher priority (0 is highest)
- Jobs without priority are processed before prioritized jobs
- Jobs with same priority processed in FIFO order
- Priority range: 0 to 2^21 (2,097,151)

### 3. UI Integration Missing
**Issue**: Priority sync components exist but aren't integrated into the main queue interface.

**Solution**: 
1. Add priority management tabs to `/queue` page
2. Create navigation links to priority components
3. Integrate PriorityQueueVisualization into main queue view

#### Update Queue Page:
```typescript
// packages/frontend/src/app/queue/page.tsx
import { PriorityQueueVisualization } from '@/components/features/sync/PriorityQueueVisualization';
import { PriorityRuleManager } from '@/components/features/sync/PriorityRuleManager';

// Add tabs to queue page:
const QueuePage = () => {
  const [activeTab, setActiveTab] = useState('queue');
  
  return (
    <div className="container mx-auto p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="queue">Sync Queue</TabsTrigger>
          <TabsTrigger value="priority">Priority View</TabsTrigger>
          <TabsTrigger value="rules">Priority Rules</TabsTrigger>
        </TabsList>
        
        <TabsContent value="queue">
          {/* Existing queue content */}
        </TabsContent>
        
        <TabsContent value="priority">
          <PriorityQueueVisualization />
        </TabsContent>
        
        <TabsContent value="rules">
          <PriorityRuleManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};
```

### 4. Store Integration Enhancement
**Issue**: Sync store needs to properly handle priority queue updates.

**Solution**:
```typescript
// packages/frontend/src/stores/sync.store.ts
// Add priority queue actions:
interface SyncStore {
  // ... existing state
  priorityQueue: PriorityQueueItem[];
  priorityRules: PriorityRule[];
  
  // Actions
  loadPriorityQueue: () => Promise<void>;
  recalculatePriorities: () => Promise<void>;
  overridePriority: (itemId: string, newPriority: number, justification: string) => Promise<void>;
}
```

## Implementation Priority Order

1. **High Priority**: Fix component tests (1-2 hours)
2. **High Priority**: Implement BullMQ priority processing (4-6 hours)
3. **Medium Priority**: Integrate UI components into queue page (2-3 hours)
4. **Low Priority**: Enhance store with priority actions (1-2 hours)

## Testing Strategy

### Component Tests:
- Use `getAllByText` or `within()` for multiple elements
- Add `data-testid` attributes for unique element targeting
- Use `*ByRole` queries with name options when possible

### Integration Tests:
- Test priority calculation with AutomaticPriorityAssigner
- Verify BullMQ processes jobs in priority order
- Test manual priority overrides through API

### Performance Tests:
- Verify priority queue processing handles 10,000+ items efficiently
- Test priority recalculation performance
- Ensure real-time updates don't overwhelm the client

## Files to Modify

### High Priority:
- `packages/frontend/__tests__/components/features/sync/PriorityRuleManager.test.tsx`
- `packages/backend/src/lib/queue/processor.ts` (create/update)
- `packages/frontend/src/app/queue/page.tsx`

### Medium Priority:
- `packages/frontend/src/stores/sync.store.ts`
- `packages/frontend/src/components/layouts/Sidebar.tsx` (add priority queue nav)

## Commands to Run After Implementation

```bash
# Run tests
pnpm --filter @dms/frontend test PriorityRuleManager.test.tsx
pnpm --filter @dms/frontend test AutomaticPriorityAssigner.test.ts

# Run type checking
pnpm --filter @dms/frontend typecheck

# Run linting
pnpm --filter @dms/frontend lint
```

## Success Criteria

✅ All component tests pass without "multiple elements" errors  
✅ BullMQ processes jobs in priority order (health emergencies first)  
✅ Priority queue visualization accessible from main navigation  
✅ Manual priority overrides work through UI  
✅ API endpoints return proper priority queue data  
✅ Performance tests pass for large queue datasets  

## Context7 and Web Search References Used

- **Web Search**: React Testing Library multiple elements solutions (2025)
- **Context7**: BullMQ priority queue configuration and processing patterns
- **BullMQ Docs**: Priority system (0 = highest, lower numbers = higher priority)
- **BullMQ API**: `getPrioritized()`, `getCountsPerPriority()`, priority job options