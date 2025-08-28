// Service Worker Background Sync API Type Definitions
// Ref: https://developer.mozilla.org/en-docs/Web/API/Background_Sync_API

interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<any>): void;
}

interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
}

interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

declare global {
  interface ServiceWorkerRegistration {
    readonly sync: SyncManager;
  }
}

interface ServiceWorkerGlobalScope {
  addEventListener(
    type: 'sync',
    listener: (event: SyncEvent) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
}

// Extend global Window interface for browser API checks
declare global {
  interface Window {
    ServiceWorkerRegistration: {
      prototype: ServiceWorkerRegistration;
    };
  }
}

export {};