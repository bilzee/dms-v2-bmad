# 9\. Frontend Architecture Details

## State Management with Zustand

```typescript
// stores/offline.store.ts
// LLM Note: This is the primary store for offline functionality

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { db } from '@/lib/offline/db';
import { RapidAssessment, RapidResponse } from '@/shared/types/entities';

interface OfflineState {
  isOffline: boolean;
  queueSize: number;
  syncInProgress: boolean;
  lastSyncTime: Date | null;
  conflictCount: number;
  
  // Actions
  setOfflineStatus: (status: boolean) => void;
  queueAssessment: (assessment: RapidAssessment) => Promise<void>;
  queueResponse: (response: RapidResponse) => Promise<void>;
  startSync: () => Promise<void>;
  resolveConflict: (entityId: string, resolution: 'local' | 'remote') => Promise<void>;
  clearQueue: () => Promise<void>;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      isOffline: !navigator.onLine,
      queueSize: 0,
      syncInProgress: false,
      lastSyncTime: null,
      conflictCount: 0,
      
      setOfflineStatus: (status) => set({ isOffline: status }),
      
      queueAssessment: async (assessment) => {
        try {
          // Store in IndexedDB with offline ID
          await db.assessments.add({
            ...assessment,
            syncStatus: 'PENDING',
            offlineId: assessment.id,
          });
          
          // Add to sync queue
          await db.syncQueue.add({
            type: 'ASSESSMENT',
            action: 'CREATE',
            data: assessment,
            priority: 'NORMAL',
            retryCount: 0,
            createdAt: new Date(),
          });
          
          set((state) => ({ queueSize: state.queueSize + 1 }));
        } catch (error) {
          console.error('Failed to queue assessment:', error);
          throw error;
        }
      },
      
      queueResponse: async (response) => {
        // Similar to queueAssessment
        try {
          await db.responses.add({
            ...response,
            syncStatus: 'PENDING',
            offlineId: response.id,
          });
          
          await db.syncQueue.add({
            type: 'RESPONSE',
            action: 'CREATE',
            data: response,
            priority: 'NORMAL',
            retryCount: 0,
            createdAt: new Date(),
          });
          
          set((state) => ({ queueSize: state.queueSize + 1 }));
        } catch (error) {
          console.error('Failed to queue response:', error);
          throw error;
        }
      },
      
      startSync: async () => {
        if (get().syncInProgress) return;
        
        set({ syncInProgress: true });
        
        try {
          const queueItems = await db.syncQueue
            .where('retryCount')
            .below(5)
            .toArray();
          
          for (const item of queueItems) {
            try {
              const response = await fetch('/api/v1/sync/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  changes: \\\[item],
                  syncToken: localStorage.getItem('syncToken'),
                }),
              });
              
              if (response.ok) {
                await db.syncQueue.delete(item.id);
                set((state) => ({ queueSize: Math.max(0, state.queueSize - 1) }));
              } else if (response.status === 409) {
                // Conflict detected
                set((state) => ({ conflictCount: state.conflictCount + 1 }));
              } else {
                // Retry later
                await db.syncQueue.update(item.id, {
                  retryCount: item.retryCount + 1,
                  lastAttempt: new Date(),
                });
              }
            } catch (error) {
              // Network error - retry later
              console.error('Sync failed for item:', item.id, error);
            }
          }
          
          set({ 
            lastSyncTime: new Date(),
            syncInProgress: false,
          });
        } catch (error) {
          console.error('Sync failed:', error);
          set({ syncInProgress: false });
        }
      },
      
      resolveConflict: async (entityId, resolution) => {
        // Implement conflict resolution
        const conflict = await db.conflicts.get(entityId);
        if (!conflict) return;
        
        if (resolution === 'local') {
          // Keep local version
          await fetch('/api/v1/sync/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entityId,
              resolution: 'local',
              data: conflict.localData,
            }),
          });
        } else {
          // Accept remote version
          await db.assessments.update(entityId, conflict.remoteData);
        }
        
        await db.conflicts.delete(entityId);
        set((state) => ({ conflictCount: Math.max(0, state.conflictCount - 1) }));
      },
      
      clearQueue: async () => {
        await db.syncQueue.clear();
        set({ queueSize: 0 });
      },
    }),
    {
      name: 'offline-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);
```

## Offline Database Setup (Dexie.js)

```typescript
// lib/offline/db.ts
// LLM Note: This defines the IndexedDB schema for offline storage

import Dexie, { Table } from 'dexie';
import { RapidAssessment, RapidResponse, AffectedEntity, OfflineQueueItem } from '@/shared/types/entities';

class OfflineDatabase extends Dexie {
  assessments!: Table<RapidAssessment>;
  responses!: Table<RapidResponse>;
  entities!: Table<AffectedEntity>;
  syncQueue!: Table<OfflineQueueItem>;
  conflicts!: Table<any>;
  
  constructor() {
    super('DisasterManagementDB');
    
    this.version(1).stores({
      assessments: 'id, offlineId, affectedEntityId, type, syncStatus, createdAt',
      responses: 'id, offlineId, affectedEntityId, assessmentId, responseType, syncStatus, createdAt',
      entities: 'id, type, lga, ward, \\\[longitude+latitude]',
      syncQueue: '++id, type, action, priority, createdAt',
      conflicts: '++id, entityType, entityId, createdAt',
    });
  }
  
  // Encryption wrapper for sensitive data
  async encryptData(data: any): Promise<string> {
    // LLM: Implement AES-256 encryption using Web Crypto API
    const key = await this.getOrCreateKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(JSON.stringify(data))
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }
  
  async decryptData(encrypted: string): Promise<any> {
    // LLM: Implement decryption
    const key = await this.getOrCreateKey();
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    return JSON.parse(new TextDecoder().decode(decrypted));
  }
  
  private async getOrCreateKey(): Promise<CryptoKey> {
    // LLM: Device-specific key generation
    let keyData = localStorage.getItem('encryptionKey');
    if (!keyData) {
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        \\\['encrypt', 'decrypt']
      );
      const exported = await crypto.subtle.exportKey('jwk', key);
      localStorage.setItem('encryptionKey', JSON.stringify(exported));
      return key;
    }
    
    return crypto.subtle.importKey(
      'jwk',
      JSON.parse(keyData),
      { name: 'AES-GCM' },
      false,
      \\\['encrypt', 'decrypt']
    );
  }
}

export const db = new OfflineDatabase();

// Initialize database on app startup
export async function initializeOfflineDB() {
  try {
    await db.open();
    console.log('Offline database initialized');
    
    // Clean up old sync queue items
    const oldItems = await db.syncQueue
      .where('createdAt')
      .below(new Date(Date.now() - 7 \\\* 24 \\\* 60 \\\* 60 \\\* 1000)) // 7 days old
      .toArray();
    
    if (oldItems.length > 0) {
      await db.syncQueue.bulkDelete(oldItems.map(i => i.id!));
      console.log(`Cleaned up ${oldItems.length} old queue items`);
    }
  } catch (error) {
    console.error('Failed to initialize offline database:', error);
  }
}
```

## Service Worker Configuration

```javascript
// public/sw.js
// LLM Note: Service worker for offline functionality and background sync

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { Queue } from 'workbox-background-sync';

// Precache static assets
precacheAndRoute(self.\\\_\\\_WB\\\_MANIFEST);

// API sync queue for failed requests
const apiQueue = new Queue('api-queue', {
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request);
      } catch (error) {
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  },
});

// Cache strategies for different routes
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/entities'),
  new NetworkFirst({
    cacheName: 'entities-cache',
    networkTimeoutSeconds: 5,
    plugins: \\\[
      new BackgroundSyncPlugin('entities-sync', {
        maxRetentionTime: 24 \\\* 60, // 24 hours
      }),
    ],
  })
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/assessments'),
  new NetworkFirst({
    cacheName: 'assessments-cache',
    networkTimeoutSeconds: 3,
    plugins: \\\[
      {
        fetchDidFail: async ({ request }) => {
          await apiQueue.pushRequest({ request });
        },
      },
    ],
  })
);

// Offline fallback page
registerRoute(
  ({ request }) => request.mode === 'navigate',
  async () => {
    try {
      return await fetch(request);
    } catch (error) {
      return caches.match('/offline.html');
    }
  }
);

// Background sync for assessments and responses
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-assessments') {
    event.waitUntil(syncAssessments());
  } else if (event.tag === 'sync-responses') {
    event.waitUntil(syncResponses());
  }
});

async function syncAssessments() {
  // LLM: Implement sync logic
  const cache = await caches.open('sync-cache');
  const requests = await cache.keys();
  
  for (const request of requests) {
    if (request.url.includes('/assessments')) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
        }
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }
  }
}

async function syncResponses() {
  // Similar to syncAssessments
  const cache = await caches.open('sync-cache');
  const requests = await cache.keys();
  
  for (const request of requests) {
    if (request.url.includes('/responses')) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
        }
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }
  }
}
```

---
