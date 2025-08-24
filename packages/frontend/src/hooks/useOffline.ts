'use client';

import { useEffect, useState } from 'react';
import { useOfflineStore } from '@/stores/offline.store';

export function useOffline() {
  const [isOffline, setIsOffline] = useState(false);
  const { setOnlineStatus } = useOfflineStore();

  useEffect(() => {
    // Set initial status
    const initialStatus = !navigator.onLine;
    setIsOffline(initialStatus);
    setOnlineStatus(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOffline(false);
      setOnlineStatus(true);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setOnlineStatus(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus]);

  return { isOffline };
}