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