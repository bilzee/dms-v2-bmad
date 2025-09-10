'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { useIncidentForms } from '@/stores/incident.store';

// Epic 10: Dynamic import for performance optimization - Heavy incident management interface
const IncidentManagementInterface = dynamic(
  () => import('@/components/features/incident/IncidentManagementInterface').then(mod => ({ default: mod.IncidentManagementInterface })),
  { 
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading incident management...</p>
        </div>
      </div>
    ),
    ssr: false 
  }
);

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