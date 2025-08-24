'use client';

import { Badge } from '@/components/ui/badge';
import { useOffline } from '@/hooks/useOffline';
import { useOfflineStore } from '@/stores/offline.store';

export function ConnectionStatusHeader() {
  const { isOffline } = useOffline();
  const queue = useOfflineStore(state => state.queue);
  
  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-muted/50">
      {!isOffline ? (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-humanitarian-green rounded-full" />
          <span className="text-xs">Online</span>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-status-offline rounded-full animate-pulse" />
          <span className="text-xs">Offline Mode</span>
          {queue.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {queue.length} queued
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}