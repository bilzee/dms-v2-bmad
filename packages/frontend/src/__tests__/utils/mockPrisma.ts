/**
 * Centralized Prisma Client Mock System
 * 
 * Provides a comprehensive, reusable Prisma Client mock that can be used
 * across all tests to avoid "browser environment" errors and ensure consistent
 * test behavior for database operations.
 * 
 * Usage:
 * ```typescript
 * import { createMockPrisma } from '@/__tests__/utils/mockPrisma';
 * 
 * jest.mock('@/lib/prisma', () => ({
 *   default: createMockPrisma()
 * }));
 * ```
 */

export const createMockPrisma = () => {
  // Create mock data stores
  const stores = {
    user: new Map(),
    userActivity: new Map(),
    securityEvent: new Map(),
    systemMetrics: new Map(),
    performanceMetrics: new Map(),
    assessment: new Map(),
    incident: new Map(),
    response: new Map(),
    entity: new Map(),
    role: new Map(),
    permission: new Map(),
    syncConflict: new Map(),
    queueJob: new Map(),
    notification: new Map(),
  };

  // Helper to generate realistic timestamps
  const generateTimestamp = () => new Date();

  // Helper to generate mock IDs
  const generateId = () => `mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // Create comprehensive mock client
  const mockPrisma = {
    // User operations
    user: {
      findUnique: jest.fn(async (args) => {
        if (args?.where?.id) return stores.user.get(args.where.id) || null;
        if (args?.where?.email) {
          for (const user of stores.user.values()) {
            if ((user as any).email === args.where.email) return user;
          }
        }
        return null;
      }),
      findMany: jest.fn(async () => Array.from(stores.user.values())),
      create: jest.fn(async (args) => {
        const user = {
          id: generateId(),
          createdAt: generateTimestamp(),
          updatedAt: generateTimestamp(),
          ...args.data
        };
        stores.user.set(user.id, user);
        return user;
      }),
      update: jest.fn(async (args) => {
        const existing = stores.user.get(args.where.id);
        if (!existing) throw new Error('User not found');
        const updated = { ...existing, ...args.data, updatedAt: generateTimestamp() };
        stores.user.set(args.where.id, updated);
        return updated;
      }),
      delete: jest.fn(async (args) => {
        const user = stores.user.get(args.where.id);
        if (!user) throw new Error('User not found');
        stores.user.delete(args.where.id);
        return user;
      }),
      count: jest.fn(async () => stores.user.size),
    },

    // User Activity operations
    userActivity: {
      findMany: jest.fn(async (args) => {
        let results = Array.from(stores.userActivity.values());
        
        // Apply basic filtering
        if (args?.where) {
          if (args.where.userId) {
            results = results.filter((activity: any) => activity.userId === args.where.userId);
          }
          if (args.where.eventType) {
            results = results.filter((activity: any) => activity.eventType === args.where.eventType);
          }
          if (args.where.module) {
            results = results.filter((activity: any) => activity.module === args.where.module);
          }
          if (args.where.timestamp?.gte) {
            results = results.filter((activity: any) => activity.timestamp >= args.where.timestamp.gte);
          }
        }

        // Apply pagination
        if (args?.skip) {
          results = results.slice(args.skip);
        }
        if (args?.take) {
          results = results.slice(0, args.take);
        }

        return results;
      }),
      create: jest.fn(async (args) => {
        const activity = {
          id: generateId(),
          timestamp: generateTimestamp(),
          ...args.data
        };
        stores.userActivity.set(activity.id, activity);
        return activity;
      }),
      createMany: jest.fn(async (args) => {
        let count = 0;
        for (const data of args.data) {
          const activity = {
            id: generateId(),
            timestamp: generateTimestamp(),
            ...data
          };
          stores.userActivity.set(activity.id, activity);
          count++;
        }
        return { count };
      }),
      count: jest.fn(async (args) => {
        let results = Array.from(stores.userActivity.values());
        
        // Apply same filtering logic as findMany
        if (args?.where) {
          if (args.where.userId) {
            results = results.filter((activity: any) => activity.userId === args.where.userId);
          }
          if (args.where.eventType) {
            results = results.filter((activity: any) => activity.eventType === args.where.eventType);
          }
        }
        
        return results.length;
      }),
      groupBy: jest.fn(async (args) => {
        const results = Array.from(stores.userActivity.values());
        const groups = new Map();
        
        for (const activity of results) {
          const key = (activity as any)[args.by[0]];
          if (!groups.has(key)) {
            groups.set(key, { [args.by[0]]: key, _count: { [args.by[0]]: 0 } });
          }
          groups.get(key)._count[args.by[0]]++;
        }
        
        return Array.from(groups.values());
      }),
      findFirst: jest.fn(async (args) => {
        const results = Array.from(stores.userActivity.values());
        
        // Apply filtering
        let filtered = results;
        if (args?.where) {
          if (args.where.module) {
            filtered = filtered.filter((activity: any) => activity.module === args.where.module);
          }
        }
        
        // Apply ordering
        if (args?.orderBy?.timestamp) {
          filtered.sort((a: any, b: any) => {
            const aTime = new Date(a.timestamp).getTime();
            const bTime = new Date(b.timestamp).getTime();
            return args.orderBy.timestamp === 'desc' ? bTime - aTime : aTime - bTime;
          });
        }
        
        return filtered[0] || null;
      }),
    },

    // Security Event operations
    securityEvent: {
      create: jest.fn(async (args) => {
        const event = {
          id: generateId(),
          timestamp: generateTimestamp(),
          ...args.data
        };
        stores.securityEvent.set(event.id, event);
        return event;
      }),
      createMany: jest.fn(async (args) => {
        let count = 0;
        for (const data of args.data) {
          const event = {
            id: generateId(),
            timestamp: generateTimestamp(),
            ...data
          };
          stores.securityEvent.set(event.id, event);
          count++;
        }
        return { count };
      }),
      findMany: jest.fn(async () => Array.from(stores.securityEvent.values())),
    },

    // System Metrics operations
    systemMetrics: {
      findMany: jest.fn(async (args) => {
        let results = Array.from(stores.systemMetrics.values());
        
        if (args?.where?.timestamp?.gte) {
          results = results.filter((metric: any) => metric.timestamp >= args.where.timestamp.gte);
        }
        
        if (args?.orderBy?.timestamp) {
          results.sort((a: any, b: any) => {
            const aTime = new Date(a.timestamp).getTime();
            const bTime = new Date(b.timestamp).getTime();
            return args.orderBy.timestamp === 'desc' ? bTime - aTime : aTime - bTime;
          });
        }
        
        if (args?.take) {
          results = results.slice(0, args.take);
        }
        
        return results;
      }),
      create: jest.fn(async (args) => {
        const metric = {
          id: generateId(),
          timestamp: generateTimestamp(),
          ...args.data
        };
        stores.systemMetrics.set(metric.id, metric);
        return metric;
      }),
    },

    // Performance Metrics operations
    performanceMetrics: {
      create: jest.fn(async (args) => {
        const metric = {
          id: generateId(),
          timestamp: generateTimestamp(),
          ...args.data
        };
        stores.performanceMetrics.set(metric.id, metric);
        return metric;
      }),
      findMany: jest.fn(async () => Array.from(stores.performanceMetrics.values())),
    },

    // Generic operations for other entities
    assessment: {
      findMany: jest.fn(async () => Array.from(stores.assessment.values())),
      create: jest.fn(async (args) => {
        const item = {
          id: generateId(),
          createdAt: generateTimestamp(),
          ...args.data
        };
        stores.assessment.set(item.id, item);
        return item;
      }),
      findUnique: jest.fn(async (args) => stores.assessment.get(args.where.id) || null),
      update: jest.fn(async (args) => {
        const existing = stores.assessment.get(args.where.id);
        if (!existing) throw new Error('Assessment not found');
        const updated = { ...existing, ...args.data, updatedAt: generateTimestamp() };
        stores.assessment.set(args.where.id, updated);
        return updated;
      }),
    },

    incident: {
      findMany: jest.fn(async () => Array.from(stores.incident.values())),
      create: jest.fn(async (args) => {
        const item = {
          id: generateId(),
          createdAt: generateTimestamp(),
          ...args.data
        };
        stores.incident.set(item.id, item);
        return item;
      }),
      findUnique: jest.fn(async (args) => stores.incident.get(args.where.id) || null),
    },

    response: {
      findMany: jest.fn(async () => Array.from(stores.response.values())),
      create: jest.fn(async (args) => {
        const item = {
          id: generateId(),
          createdAt: generateTimestamp(),
          ...args.data
        };
        stores.response.set(item.id, item);
        return item;
      }),
      findUnique: jest.fn(async (args) => stores.response.get(args.where.id) || null),
    },

    // Utility methods
    $transaction: jest.fn(async (operations) => {
      // Simple transaction simulation - execute all operations
      const results = [];
      for (const operation of operations) {
        if (typeof operation === 'function') {
          results.push(await operation(mockPrisma));
        } else {
          results.push(await operation);
        }
      }
      return results;
    }),

    $disconnect: jest.fn(async () => Promise.resolve()),
    $connect: jest.fn(async () => Promise.resolve()),

    // Utility for tests to clear all data
    $reset: () => {
      for (const store of Object.values(stores)) {
        store.clear();
      }
    },

    // Utility for tests to seed data
    $seed: (table: string, data: any[]) => {
      if (stores[table as keyof typeof stores]) {
        for (const item of data) {
          const id = item.id || generateId();
          stores[table as keyof typeof stores].set(id, { id, ...item });
        }
      }
    },

    // Utility for tests to get store contents
    $getStore: (table: string) => {
      return stores[table as keyof typeof stores];
    },
  };

  return mockPrisma;
};

// Pre-configured mock for common use cases
export const mockPrisma = createMockPrisma();

// Helper to reset all mock data between tests
export const resetMockPrisma = () => {
  mockPrisma.$reset();
  jest.clearAllMocks();
};

// Export type for TypeScript usage
export type MockPrisma = ReturnType<typeof createMockPrisma>;