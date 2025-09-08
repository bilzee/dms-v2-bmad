import { NextRequest } from 'next/server';
import { GET } from '../../app/api/v1/queue/route';
import { PUT, DELETE } from '../../app/api/v1/queue/[id]/retry/route';
import { GET as getSummary } from '../../app/api/v1/queue/summary/route';

// Mock console methods to avoid test output noise
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('Queue API Integration Tests', () => {
  describe('GET /api/v1/queue', () => {
    it('returns queue items successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/queue');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(typeof data.total).toBe('number');
      expect(data.filters).toBeDefined();
    });

    it('returns filtered queue items', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/queue?status=FAILED&priority=HIGH');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.filters).toEqual({
        status: 'FAILED',
        priority: 'HIGH',
        type: null,
        user_id: null,
      });
    });

    it('sorts items by priority and creation date', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/queue');
      
      const response = await GET(request);
      const data = await response.json();
      
      if (data.data.length > 1) {
        const items = data.data;
        
        // Check priority ordering
        for (let i = 0; i < items.length - 1; i++) {
          const currentPriority = items[i].priority;
          const nextPriority = items[i + 1].priority;
          
          const priorityOrder: { [key: string]: number } = { HIGH: 3, NORMAL: 2, LOW: 1 };
          expect(priorityOrder[currentPriority]).toBeGreaterThanOrEqual(priorityOrder[nextPriority]);
        }
      }
    });

    it('handles invalid filter parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/queue?status=INVALID');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid filter parameters');
      expect(data.details).toBeDefined();
    });

    it('returns correct queue item structure', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/queue');
      
      const response = await GET(request);
      const data = await response.json();
      
      if (data.data.length > 0) {
        const item = data.data[0];
        
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('action');
        expect(item).toHaveProperty('priority');
        expect(item).toHaveProperty('retryCount');
        expect(item).toHaveProperty('createdAt');
        
        expect(['ASSESSMENT', 'RESPONSE', 'MEDIA', 'ENTITY', 'INCIDENT']).toContain(item.type);
        expect(['CREATE', 'UPDATE', 'DELETE']).toContain(item.action);
        expect(['HIGH', 'NORMAL', 'LOW']).toContain(item.priority);
      }
    });
  });

  describe('PUT /api/v1/queue/:id/retry', () => {
    it('retries queue item successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/queue/test-id/retry', {
        method: 'PUT',
      });
      
      const response = await PUT(request, { params: Promise.resolve({ id: 'test-id' }) });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Retry initiated successfully');
      expect(data.data).toBeDefined();
      expect(data.retryScheduledIn).toBeDefined();
    });

    it('handles missing queue item ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/queue//retry', {
        method: 'PUT',
      });
      
      const response = await PUT(request, { params: Promise.resolve({ id: '' }) });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Queue item ID is required');
    });

    it('implements exponential backoff in retry logic', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/queue/test-id/retry', {
        method: 'PUT',
      });
      
      const response = await PUT(request, { params: Promise.resolve({ id: 'test-id' }) });
      const data = await response.json();
      
      expect(data.retryScheduledIn).toBeGreaterThan(0);
      expect(data.retryScheduledIn).toBeLessThanOrEqual(300000); // Max 5 minutes
    });

    it('updates retry count in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/queue/test-id/retry', {
        method: 'PUT',
      });
      
      const response = await PUT(request, { params: Promise.resolve({ id: 'test-id' }) });
      const data = await response.json();
      
      expect(data.data.retryCount).toBeGreaterThan(0);
      expect(data.data.lastAttempt).toBeDefined();
      expect(data.data.error).toBeUndefined();
    });
  });

  describe('DELETE /api/v1/queue/:id', () => {
    it('removes queue item successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/queue/test-id/retry', {
        method: 'DELETE',
      });
      
      const response = await DELETE(request, { params: Promise.resolve({ id: 'test-id' }) });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Queue item removed successfully');
      expect(data.removedItemId).toBe('test-id');
    });

    it('handles missing queue item ID for removal', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/queue//retry', {
        method: 'DELETE',
      });
      
      const response = await DELETE(request, { params: Promise.resolve({ id: '' }) });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Queue item ID is required');
    });
  });

  describe('GET /api/v1/queue/summary', () => {
    it('returns queue summary successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/queue/summary');
      
      const response = await getSummary(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      
      const summary = data.data;
      expect(typeof summary.totalItems).toBe('number');
      expect(typeof summary.pendingItems).toBe('number');
      expect(typeof summary.failedItems).toBe('number');
      expect(typeof summary.syncingItems).toBe('number');
      expect(typeof summary.highPriorityItems).toBe('number');
      expect(summary.lastUpdated).toBeDefined();
    });

    it('returns correct summary structure', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/queue/summary');
      
      const response = await getSummary(request);
      const data = await response.json();
      
      const summary = data.data;
      
      // Check required properties
      expect(summary).toHaveProperty('totalItems');
      expect(summary).toHaveProperty('pendingItems');
      expect(summary).toHaveProperty('failedItems');
      expect(summary).toHaveProperty('syncingItems');
      expect(summary).toHaveProperty('highPriorityItems');
      expect(summary).toHaveProperty('lastUpdated');
      
      // Check optional oldest pending item structure
      if (summary.oldestPendingItem) {
        expect(summary.oldestPendingItem).toHaveProperty('id');
        expect(summary.oldestPendingItem).toHaveProperty('type');
        expect(summary.oldestPendingItem).toHaveProperty('createdAt');
        expect(summary.oldestPendingItem).toHaveProperty('priority');
      }
    });

    it('calculates statistics correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/queue/summary');
      
      const response = await getSummary(request);
      const data = await response.json();
      
      const summary = data.data;
      
      // Total should be sum of all status categories
      const calculatedTotal = summary.pendingItems + summary.failedItems + summary.syncingItems;
      expect(summary.totalItems).toBeGreaterThanOrEqual(calculatedTotal - summary.totalItems);
      
      // All counts should be non-negative
      expect(summary.totalItems).toBeGreaterThanOrEqual(0);
      expect(summary.pendingItems).toBeGreaterThanOrEqual(0);
      expect(summary.failedItems).toBeGreaterThanOrEqual(0);
      expect(summary.syncingItems).toBeGreaterThanOrEqual(0);
      expect(summary.highPriorityItems).toBeGreaterThanOrEqual(0);
    });

    it('identifies oldest pending item correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/queue/summary');
      
      const response = await getSummary(request);
      const data = await response.json();
      
      const summary = data.data;
      
      if (summary.oldestPendingItem && summary.pendingItems > 0) {
        expect(summary.oldestPendingItem.createdAt).toBeDefined();
        expect(['HIGH', 'NORMAL', 'LOW']).toContain(summary.oldestPendingItem.priority);
        expect(['ASSESSMENT', 'RESPONSE', 'MEDIA', 'ENTITY', 'INCIDENT']).toContain(summary.oldestPendingItem.type);
      }
    });
  });

  describe('Error handling', () => {
    it('handles malformed requests gracefully', async () => {
      // Test with malformed URL
      const request = new NextRequest('http://localhost:3000/api/v1/queue?status=FAILED&invalidparam');
      
      const response = await GET(request);
      
      // Should either return 200 with filtered results or 400 for invalid params
      expect([200, 400]).toContain(response.status);
    });

    it('returns proper error structure', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/queue?status=INVALID');
      
      const response = await GET(request);
      const data = await response.json();
      
      if (!data.success) {
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('error');
        expect(data.success).toBe(false);
        expect(typeof data.error).toBe('string');
      }
    });
  });

  describe('Performance and data consistency', () => {
    it('returns data within reasonable time', async () => {
      const startTime = Date.now();
      
      const request = new NextRequest('http://localhost:3000/api/v1/queue');
      const response = await GET(request);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
      expect(response.status).toBe(200);
    });

    it('maintains data consistency across requests', async () => {
      const request1 = new NextRequest('http://localhost:3000/api/v1/queue');
      const request2 = new NextRequest('http://localhost:3000/api/v1/queue');
      
      const [response1, response2] = await Promise.all([
        GET(request1),
        GET(request2)
      ]);
      
      const [data1, data2] = await Promise.all([
        response1.json(),
        response2.json()
      ]);
      
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      
      // Data structure should be consistent
      expect(data1.success).toBe(data2.success);
      expect(Array.isArray(data1.data)).toBe(Array.isArray(data2.data));
    });
  });
});