'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wifi } from 'lucide-react';
import { useOffline } from '@/hooks/useOffline';
import { useOfflineStore } from '@/stores/offline.store';

export function OfflineModeAlert() {
  const { isOffline } = useOffline();
  const queue = useOfflineStore(state => state.queue);

  if (!isOffline) return null;

  return (
    <Alert className="border-status-offline bg-orange-50 mb-4">
      <Wifi className="h-4 w-4" />
      <AlertTitle>Offline Mode</AlertTitle>
      <AlertDescription>
        Your work is being saved locally. {queue.length} items will sync when connected.
      </AlertDescription>
    </Alert>
  );
}