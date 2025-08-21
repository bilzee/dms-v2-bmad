import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OfflineQueueItem, RapidAssessment } from '@dms/shared';

interface OfflineState {
  isOnline: boolean;
  queue: OfflineQueueItem[];
  pendingAssessments: RapidAssessment[];
  
  // Actions
  setOnlineStatus: (status: boolean) => void;
  addToQueue: (item: Omit<OfflineQueueItem, 'id' | 'createdAt' | 'retryCount'>) => void;
  removeFromQueue: (id: string) => void;
  updateQueueItem: (id: string, updates: Partial<OfflineQueueItem>) => void;
  addPendingAssessment: (assessment: RapidAssessment) => void;
  removePendingAssessment: (id: string) => void;
  clearQueue: () => void;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      isOnline: navigator.onLine,
      queue: [],
      pendingAssessments: [],

      setOnlineStatus: (status: boolean) => {
        set({ isOnline: status });
      },

      addToQueue: (item) => {
        const queueItem: OfflineQueueItem = {
          ...item,
          id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date(),
          retryCount: 0,
        };
        
        set((state) => ({
          queue: [...state.queue, queueItem],
        }));
      },

      removeFromQueue: (id: string) => {
        set((state) => ({
          queue: state.queue.filter(item => item.id !== id),
        }));
      },

      updateQueueItem: (id: string, updates: Partial<OfflineQueueItem>) => {
        set((state) => ({
          queue: state.queue.map(item =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }));
      },

      addPendingAssessment: (assessment: RapidAssessment) => {
        set((state) => ({
          pendingAssessments: [...state.pendingAssessments, assessment],
        }));
      },

      removePendingAssessment: (id: string) => {
        set((state) => ({
          pendingAssessments: state.pendingAssessments.filter(a => a.id !== id),
        }));
      },

      clearQueue: () => {
        set({ queue: [], pendingAssessments: [] });
      },
    }),
    {
      name: 'offline-storage',
      partialize: (state) => ({
        queue: state.queue,
        pendingAssessments: state.pendingAssessments,
      }),
    }
  )
);

// Hook to listen for online/offline events
export function useOnlineStatus() {
  const { setOnlineStatus } = useOfflineStore();

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => setOnlineStatus(true));
    window.addEventListener('offline', () => setOnlineStatus(false));
  }

  return useOfflineStore(state => state.isOnline);
}