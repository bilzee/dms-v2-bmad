'use client';

import { useState, useEffect } from 'react';
import { OfflineQueueService, QueueFilters } from '@/lib/services/OfflineQueueService';
import type { OfflineQueueItem } from '@dms/shared';

export interface QueueSummary {
  totalItems: number;
  pendingItems: number;
  failedItems: number;
  syncingItems: number;
  highPriorityItems: number;
  lastUpdated: Date;
  oldestPendingItem?: {
    id: string;
    type: string;
    createdAt: Date;
    priority: string;
  };
}

export const useQueueData = (filters?: QueueFilters) => {
  const [items, setItems] = useState<OfflineQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queueService = new OfflineQueueService();

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const queueItems = await queueService.getQueueItems(filters);
      setItems(queueItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch queue items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [JSON.stringify(filters)]);

  const retryItem = async (id: string) => {
    try {
      await queueService.retryQueueItem(id);
      await fetchItems(); // Refresh the data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry item');
    }
  };

  const removeItem = async (id: string) => {
    try {
      await queueService.removeQueueItem(id);
      await fetchItems(); // Refresh the data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item');
    }
  };

  const addItem = async (item: Omit<OfflineQueueItem, 'id'>) => {
    try {
      await queueService.addToQueue(item);
      await fetchItems(); // Refresh the data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    }
  };

  const clearQueue = async () => {
    try {
      await queueService.clearQueue();
      await fetchItems(); // Refresh the data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear queue');
    }
  };

  const processAllPending = async () => {
    try {
      await queueService.processAllPending();
      await fetchItems(); // Refresh the data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process pending items');
    }
  };

  return {
    items,
    loading,
    error,
    retryItem,
    removeItem,
    addItem,
    clearQueue,
    processAllPending,
    refresh: fetchItems,
  };
};

export const useQueueSummary = () => {
  const [summary, setSummary] = useState<QueueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queueService = new OfflineQueueService();

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queueSummary = await queueService.getQueueSummary();
      const pendingItems = await queueService.getQueueItems({ status: 'PENDING' });
      
      // Find oldest pending item
      const oldestPendingItem = pendingItems.length > 0 
        ? pendingItems.reduce((oldest, current) => 
            new Date(current.createdAt) < new Date(oldest.createdAt) ? current : oldest
          )
        : undefined;

      const summary: QueueSummary = {
        totalItems: queueSummary.total,
        pendingItems: queueSummary.pending,
        failedItems: queueSummary.failed,
        syncingItems: queueSummary.syncing,
        highPriorityItems: queueSummary.highPriority,
        lastUpdated: new Date(),
        oldestPendingItem: oldestPendingItem ? {
          id: oldestPendingItem.id,
          type: oldestPendingItem.type,
          createdAt: oldestPendingItem.createdAt,
          priority: oldestPendingItem.priority,
        } : undefined,
      };
      
      setSummary(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch queue summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchSummary, 30000); // Poll every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  return {
    summary,
    loading,
    error,
    refresh: fetchSummary,
  };
};

export const useQueueItem = (id: string | null) => {
  const [item, setItem] = useState<OfflineQueueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queueService = new OfflineQueueService();

  const fetchItem = async () => {
    if (!id) {
      setItem(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const queueItem = await queueService.getQueueItem(id);
      setItem(queueItem);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch queue item');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItem();
  }, [id]);

  const retryItem = async () => {
    if (!id) return;
    
    try {
      await queueService.retryQueueItem(id);
      await fetchItem(); // Refresh the data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry item');
    }
  };

  const removeItem = async () => {
    if (!id) return;
    
    try {
      await queueService.removeQueueItem(id);
      setItem(null); // Item no longer exists
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item');
    }
  };

  return {
    item,
    loading,
    error,
    retryItem,
    removeItem,
    refresh: fetchItem,
  };
};