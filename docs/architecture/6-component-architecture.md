# 6\. Component Architecture

## LLM Development Notes

Components follow a strict hierarchy with clear separation of concerns. Each component has a single responsibility and explicit props interface.

## Frontend Component Organization

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth layout group
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/         # Dashboard layout group
│   │   ├── layout.tsx       # Dashboard layout with role-based nav
│   │   ├── assessments/
│   │   ├── responses/
│   │   ├── verification/
│   │   └── monitoring/
│   └── api/                 # API routes
│       └── v1/
├── components/              # React components
│   ├── ui/                 # Shadcn/ui components (don't modify)
│   ├── features/           # Feature-specific components
│   │   ├── assessment/
│   │   │   ├── AssessmentForm.tsx
│   │   │   ├── AssessmentList.tsx
│   │   │   └── AssessmentCard.tsx
│   │   ├── response/
│   │   ├── verification/
│   │   └── sync/
│   │       ├── SyncIndicator.tsx
│   │       ├── SyncQueue.tsx
│   │       └── ConflictResolver.tsx
│   ├── layouts/           # Layout components
│   │   ├── DashboardLayout.tsx
│   │   ├── MobileNav.tsx
│   │   └── RoleSwither.tsx
│   └── shared/            # Shared components
│       ├── OfflineIndicator.tsx
│       ├── GPSCapture.tsx
│       ├── MediaUpload.tsx
│       └── ErrorBoundary.tsx
├── lib/                    # Utility libraries
│   ├── offline/           # Offline functionality
│   │   ├── db.ts         # Dexie.js setup
│   │   ├── sync.ts       # Sync engine
│   │   └── queue.ts      # Queue management
│   ├── auth/             # Authentication
│   ├── api/              # API client
│   └── utils/            # Utilities
├── hooks/                 # Custom React hooks
│   ├── useOffline.ts
│   ├── useSync.ts
│   ├── useRole.ts
│   └── useGPS.ts
├── stores/               # Zustand stores
│   ├── auth.store.ts
│   ├── offline.store.ts
│   ├── sync.store.ts
│   └── ui.store.ts
└── shared/               # Shared with backend
    └── types/
```

## Component Template Pattern

```typescript
// LLM Note: Every feature component follows this exact pattern
// components/features/assessment/AssessmentForm.tsx

'use client';

import { FC, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useOfflineStore } from '@/stores/offline.store';
import { useAuthStore } from '@/stores/auth.store';
import { AssessmentType, RapidAssessment } from '@/shared/types/entities';
import { generateOfflineId } from '@/lib/utils';

// Define props interface explicitly
export interface AssessmentFormProps {
  type: AssessmentType;
  entityId: string;
  onSubmit?: (data: RapidAssessment) => void;
  onCancel?: () => void;
}

// Define form schema
const AssessmentFormSchema = z.object({
  type: z.enum(\\\['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION']),
  data: z.object({}).passthrough(),
  mediaAttachments: z.array(z.any()).optional(),
});

type FormData = z.infer<typeof AssessmentFormSchema>;

/\\\*\\\*
 \\\* AssessmentForm Component
 \\\* 
 \\\* LLM Implementation Notes:
 \\\* - Always handle offline state
 \\\* - Validate data before submission
 \\\* - Queue for sync if offline
 \\\* - Show clear feedback to user
 \\\*/
export const AssessmentForm: FC<AssessmentFormProps> = ({
  type,
  entityId,
  onSubmit,
  onCancel,
}) => {
  const { isOffline, queueAssessment } = useOfflineStore();
  const { user } = useAuthStore();
  
  const form = useForm<FormData>({
    resolver: zodResolver(AssessmentFormSchema),
    defaultValues: {
      type,
      data: {},
      mediaAttachments: \\\[],
    },
  });
  
  const handleSubmit = useCallback(async (data: FormData) => {
    try {
      const assessment: RapidAssessment = {
        id: generateOfflineId(),
        ...data,
        affectedEntityId: entityId,
        assessorId: user!.id,
        assessorName: user!.name,
        date: new Date(),
        verificationStatus: 'PENDING',
        syncStatus: isOffline ? 'PENDING' : 'SYNCING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      if (isOffline) {
        await queueAssessment(assessment);
        // Show success toast
      } else {
        // Submit to API
      }
      
      onSubmit?.(assessment);
    } catch (error) {
      // Handle error with user feedback
    }
  }, \\\[isOffline, entityId, user, queueAssessment, onSubmit]);
  
  // Auto-save draft every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const formData = form.getValues();
      localStorage.setItem(`draft-${type}-${entityId}`, JSON.stringify(formData));
    }, 30000);
    
    return () => clearInterval(interval);
  }, \\\[form, type, entityId]);
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/\\\* Dynamic form fields based on assessment type \\\*/}
        {/\\\* LLM: Generate type-specific fields here \\\*/}
        
        <div className="flex gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {isOffline ? 'Save Offline' : 'Submit'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
};
```

---
