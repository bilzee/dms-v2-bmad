// Custom Service Worker for Background Sync
// This worker handles background sync events and coordinates with the main app

// Disable Workbox dev logs for cleaner console
self.__WB_DISABLE_DEV_LOGS = true;

// Background sync tags
const SYNC_TAGS = {
  HIGH: 'background-sync-high',
  NORMAL: 'background-sync-normal', 
  LOW: 'background-sync-low',
  CONNECTIVITY: 'connectivity-recovery-sync'
};

// Store for sync data
const SYNC_STORE_NAME = 'background-sync-store';
const SYNC_QUEUE_NAME = 'background-sync-queue';

/**
 * Initialize the service worker
 */
self.addEventListener('install', (event) => {
  console.log('Background sync service worker installing...');
  self.skipWaiting();
});

/**
 * Activate event handler
 */
self.addEventListener('activate', (event) => {
  console.log('Background sync service worker activated');
  event.waitUntil(self.clients.claim());
});

/**
 * Background sync event handler
 */
self.addEventListener('sync', (event) => {
  console.log('Background sync event triggered:', event.tag);
  
  switch (event.tag) {
    case SYNC_TAGS.HIGH:
      event.waitUntil(handleBackgroundSync('HIGH'));
      break;
    case SYNC_TAGS.NORMAL:
      event.waitUntil(handleBackgroundSync('NORMAL'));
      break;
    case SYNC_TAGS.LOW:
      event.waitUntil(handleBackgroundSync('LOW'));
      break;
    case SYNC_TAGS.CONNECTIVITY:
      event.waitUntil(handleConnectivityRecoverySync());
      break;
    default:
      console.warn('Unknown background sync tag:', event.tag);
  }
});

/**
 * Message handler for communication with main app
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'REGISTER_BACKGROUND_SYNC':
      handleSyncRegistration(event, payload);
      break;
    case 'PAUSE_BACKGROUND_SYNC':
      handleSyncPause(event);
      break;
    case 'RESUME_BACKGROUND_SYNC':
      handleSyncResume(event);
      break;
    case 'GET_SYNC_STATUS':
      handleGetSyncStatus(event);
      break;
    default:
      console.warn('Unknown message type:', type);
  }
});

/**
 * Handle background sync for a specific priority level
 */
async function handleBackgroundSync(priority) {
  try {
    // Notify main app that background sync is starting
    await notifyClients({
      type: 'BACKGROUND_SYNC_START',
      payload: { priority }
    });

    // Get sync items for this priority level
    const syncItems = await getSyncItemsByPriority(priority);
    
    if (syncItems.length === 0) {
      console.log(`No ${priority} priority items to sync`);
      return;
    }

    console.log(`Starting background sync for ${syncItems.length} ${priority} priority items`);

    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    const errors = [];

    // Process items sequentially to avoid overwhelming the network
    for (const item of syncItems) {
      try {
        await syncItem(item);
        succeeded++;
        
        // Notify progress
        await notifyClients({
          type: 'BACKGROUND_SYNC_PROGRESS',
          payload: {
            priority,
            processed: processed + 1,
            total: syncItems.length,
            succeeded,
            failed,
            currentItem: item
          }
        });
        
      } catch (error) {
        failed++;
        errors.push(`${item.id}: ${error.message}`);
        console.error(`Background sync failed for item ${item.id}:`, error);
      }
      
      processed++;
      
      // Small delay between items to prevent overwhelming
      if (processed < syncItems.length) {
        await sleep(100);
      }
    }

    // Notify completion
    await notifyClients({
      type: 'BACKGROUND_SYNC_COMPLETE',
      payload: {
        priority,
        processed,
        succeeded,
        failed,
        errors,
        completedAt: new Date().toISOString()
      }
    });

    console.log(`Background sync completed for ${priority} priority: ${succeeded} succeeded, ${failed} failed`);

  } catch (error) {
    console.error('Background sync error:', error);
    
    await notifyClients({
      type: 'BACKGROUND_SYNC_ERROR',
      payload: {
        priority,
        error: error.message
      }
    });
  }
}

/**
 * Handle connectivity recovery sync
 */
async function handleConnectivityRecoverySync() {
  try {
    console.log('Handling connectivity recovery sync');
    
    // Get all pending items regardless of priority for connectivity recovery
    const allPendingItems = await getAllPendingSyncItems();
    
    if (allPendingItems.length === 0) {
      return;
    }

    // Prioritize HIGH priority items first
    const sortedItems = allPendingItems.sort((a, b) => {
      const priorityOrder = { HIGH: 3, NORMAL: 2, LOW: 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    });

    // Process only a limited number on connectivity recovery to be conservative
    const itemsToSync = sortedItems.slice(0, 10);
    
    await notifyClients({
      type: 'BACKGROUND_SYNC_START',
      payload: { 
        priority: 'CONNECTIVITY_RECOVERY',
        itemCount: itemsToSync.length
      }
    });

    for (const item of itemsToSync) {
      try {
        await syncItem(item);
      } catch (error) {
        console.error(`Connectivity recovery sync failed for item ${item.id}:`, error);
        // Continue with other items even if one fails
      }
    }

    await notifyClients({
      type: 'BACKGROUND_SYNC_COMPLETE',
      payload: {
        priority: 'CONNECTIVITY_RECOVERY',
        processed: itemsToSync.length,
        completedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Connectivity recovery sync error:', error);
  }
}

/**
 * Sync a single item by making API call
 */
async function syncItem(item) {
  const apiEndpoint = getApiEndpointForItem(item);
  const method = item.action === 'CREATE' ? 'POST' : 
                 item.action === 'UPDATE' ? 'PUT' : 
                 item.action === 'DELETE' ? 'DELETE' : 'POST';
  
  const url = item.action === 'UPDATE' || item.action === 'DELETE' 
    ? `${apiEndpoint}/${item.entityId}` 
    : apiEndpoint;

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: item.action !== 'DELETE' ? JSON.stringify(item.data) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  // Remove from local storage after successful sync
  await removeSyncItem(item.id);
  
  return response.json();
}

/**
 * Get API endpoint for an item type
 */
function getApiEndpointForItem(item) {
  const baseUrl = '/api/v1';
  
  switch (item.type) {
    case 'ASSESSMENT':
      return `${baseUrl}/assessments`;
    case 'RESPONSE':
      return `${baseUrl}/responses`;
    case 'MEDIA':
      return `${baseUrl}/media`;
    case 'INCIDENT':
      return `${baseUrl}/incidents`;
    case 'ENTITY':
      return `${baseUrl}/entities`;
    default:
      throw new Error(`Unknown item type: ${item.type}`);
  }
}

/**
 * Get sync items by priority from IndexedDB
 */
async function getSyncItemsByPriority(priority) {
  try {
    // In a real implementation, this would read from IndexedDB
    // For now, we'll use a simple approach
    const db = await openDB();
    const transaction = db.transaction([SYNC_QUEUE_NAME], 'readonly');
    const store = transaction.objectStore(SYNC_QUEUE_NAME);
    const allItems = await store.getAll();
    
    return allItems.filter(item => 
      item.priority === priority && 
      !item.error && // Don't retry failed items in background sync
      item.retryCount < 3 // Limit retry attempts
    );
  } catch (error) {
    console.error('Failed to get sync items:', error);
    return [];
  }
}

/**
 * Get all pending sync items
 */
async function getAllPendingSyncItems() {
  try {
    const db = await openDB();
    const transaction = db.transaction([SYNC_QUEUE_NAME], 'readonly');
    const store = transaction.objectStore(SYNC_QUEUE_NAME);
    const allItems = await store.getAll();
    
    return allItems.filter(item => !item.error && item.retryCount < 5);
  } catch (error) {
    console.error('Failed to get all pending sync items:', error);
    return [];
  }
}

/**
 * Remove sync item after successful sync
 */
async function removeSyncItem(itemId) {
  try {
    const db = await openDB();
    const transaction = db.transaction([SYNC_QUEUE_NAME], 'readwrite');
    const store = transaction.objectStore(SYNC_QUEUE_NAME);
    await store.delete(itemId);
  } catch (error) {
    console.error('Failed to remove sync item:', error);
  }
}

/**
 * Open IndexedDB for sync storage
 */
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SYNC_STORE_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create sync queue store
      if (!db.objectStoreNames.contains(SYNC_QUEUE_NAME)) {
        const store = db.createObjectStore(SYNC_QUEUE_NAME, { keyPath: 'id' });
        store.createIndex('priority', 'priority', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * Handle sync registration message
 */
async function handleSyncRegistration(event, payload) {
  try {
    const { priority = 'NORMAL', immediate = false } = payload;
    
    // Register for background sync
    if ('serviceWorker' in self && 'sync' in self.ServiceWorkerRegistration.prototype) {
      const tag = SYNC_TAGS[priority] || SYNC_TAGS.NORMAL;
      await self.registration.sync.register(tag);
      
      event.ports[0]?.postMessage({
        type: 'SYNC_REGISTERED',
        payload: { priority, tag, immediate }
      });
    } else {
      throw new Error('Background sync not supported');
    }
  } catch (error) {
    event.ports[0]?.postMessage({
      type: 'SYNC_REGISTRATION_ERROR',
      payload: { error: error.message }
    });
  }
}

/**
 * Handle sync pause message
 */
function handleSyncPause(event) {
  // Set a flag to pause sync operations
  // This would be checked in the sync handlers
  self.syncPaused = true;
  
  event.ports[0]?.postMessage({
    type: 'SYNC_PAUSED',
    payload: { pausedAt: new Date().toISOString() }
  });
}

/**
 * Handle sync resume message
 */
function handleSyncResume(event) {
  // Clear the pause flag
  self.syncPaused = false;
  
  event.ports[0]?.postMessage({
    type: 'SYNC_RESUMED',
    payload: { resumedAt: new Date().toISOString() }
  });
}

/**
 * Handle get sync status message
 */
function handleGetSyncStatus(event) {
  event.ports[0]?.postMessage({
    type: 'SYNC_STATUS',
    payload: {
      isPaused: !!self.syncPaused,
      isOnline: navigator.onLine,
      lastSyncAttempt: self.lastSyncAttempt || null
    }
  });
}

/**
 * Notify all clients with a message
 */
async function notifyClients(message) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage(message);
  });
}

/**
 * Utility sleep function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Network status change handler for immediate sync registration
self.addEventListener('online', () => {
  console.log('Network came online, registering connectivity recovery sync');
  if ('sync' in self.ServiceWorkerRegistration.prototype) {
    self.registration.sync.register(SYNC_TAGS.CONNECTIVITY);
  }
});

console.log('Background sync service worker loaded');