/**
 * Jest Manual Mock for Prisma Client - Self-Contained Version
 * 
 * This mock is completely self-contained and doesn't import any utilities
 * that might accidentally import the real Prisma client.
 */

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
};

// Helper functions
const generateTimestamp = () => new Date();
const generateId = () => `mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// Create the mock Prisma client
const mockPrismaClient = {
  // User Activity operations (most commonly used in tests)
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
      }

      // Apply pagination
      if (args?.skip) results = results.slice(args.skip);
      if (args?.take) results = results.slice(0, args.take);

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

    count: jest.fn(async () => stores.userActivity.size),

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
      let results = Array.from(stores.userActivity.values());
      
      if (args?.where?.module) {
        results = results.filter((activity: any) => activity.module === args.where.module);
      }
      
      return results[0] || null;
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
      
      if (args?.take) results = results.slice(0, args.take);
      
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

  // Transaction support
  $transaction: jest.fn(async (operations) => {
    const results = [];
    for (const operation of operations) {
      if (typeof operation === 'function') {
        results.push(await operation(mockPrismaClient));
      } else {
        results.push(await operation);
      }
    }
    return results;
  }),

  // Connection methods
  $disconnect: jest.fn(async () => Promise.resolve()),
  $connect: jest.fn(async () => Promise.resolve()),

  // Utility methods for tests
  $reset: () => {
    for (const store of Object.values(stores)) {
      store.clear();
    }
  },

  $seed: (table: string, data: any[]) => {
    if (stores[table as keyof typeof stores]) {
      for (const item of data) {
        const id = item.id || generateId();
        stores[table as keyof typeof stores].set(id, { id, ...item });
      }
    }
  },
};

// Default export
export default mockPrismaClient;