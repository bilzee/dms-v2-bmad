/**
 * API Integration Tests for /api/v1/sync/conflicts
 * 
 * Tests all conflict management API endpoints using next-test-api-route-handler
 * for comprehensive API integration testing.
 */

import { testApiHandler } from 'next-test-api-route-handler';
import * as conflictsHandler from '../route';

describe('/api/v1/sync/conflicts API', () => {
  describe('GET /api/v1/sync/conflicts', () => {
    it('returns conflict queue with default pagination', async () => {
      await testApiHandler({
        appHandler: conflictsHandler,
        test: async ({ fetch }) => {
          const response = await fetch({ method: 'GET' });
          const json = await response.json();
          
          expect(response.status).toBe(200);
          expect(json.success).toBe(true);
          expect(json.data.conflicts).toBeDefined();
          expect(json.data.pagination).toBeDefined();
          expect(json.data.stats).toBeDefined();
          
          // Verify pagination structure
          expect(json.data.pagination).toMatchObject({
            page: 1,
            limit: 10,
            total: expect.any(Number),
            totalPages: expect.any(Number)
          });
          
          // Verify stats structure
          expect(json.data.stats).toMatchObject({
            pendingConflicts: expect.any(Number),
            criticalConflicts: expect.any(Number),
            resolvedConflicts: expect.any(Number),
            totalConflicts: expect.any(Number)
          });
        },
      });
    });

    it('supports filtering by severity', async () => {
      await testApiHandler({
        appHandler: conflictsHandler,
        test: async ({ fetch }) => {
          const response = await fetch({ 
            method: 'GET',
            url: '/api/v1/sync/conflicts?severity=CRITICAL'
          });
          const json = await response.json();
          
          expect(response.status).toBe(200);
          expect(json.data.filters.severity).toContain('CRITICAL');
          
          // All returned conflicts should be CRITICAL
          json.data.conflicts.forEach((conflict: any) => {
            expect(conflict.severity).toBe('CRITICAL');
          });
        },
      });
    });

    it('supports filtering by entity type', async () => {
      await testApiHandler({
        appHandler: conflictsHandler,
        test: async ({ fetch }) => {
          const response = await fetch({ 
            method: 'GET',
            url: '/api/v1/sync/conflicts?entityType=ASSESSMENT'
          });
          const json = await response.json();
          
          expect(response.status).toBe(200);
          expect(json.data.filters.entityType).toContain('ASSESSMENT');
          
          // All returned conflicts should be for ASSESSMENT entities
          json.data.conflicts.forEach((conflict: any) => {
            expect(conflict.entityType).toBe('ASSESSMENT');
          });
        },
      });
    });

    it('supports filtering by conflict type', async () => {
      await testApiHandler({
        appHandler: conflictsHandler,
        test: async ({ fetch }) => {
          const response = await fetch({ 
            method: 'GET',
            url: '/api/v1/sync/conflicts?conflictType=FIELD_LEVEL'
          });
          const json = await response.json();
          
          expect(response.status).toBe(200);
          expect(json.data.filters.conflictType).toContain('FIELD_LEVEL');
        },
      });
    });

    it('supports pagination parameters', async () => {
      await testApiHandler({
        appHandler: conflictsHandler,
        test: async ({ fetch }) => {
          const response = await fetch({ 
            method: 'GET',
            url: '/api/v1/sync/conflicts?page=2&limit=5'
          });
          const json = await response.json();
          
          expect(response.status).toBe(200);
          expect(json.data.pagination.page).toBe(2);
          expect(json.data.pagination.limit).toBe(5);
          expect(json.data.conflicts.length).toBeLessThanOrEqual(5);
        },
      });
    });

    it('returns empty results for invalid filters', async () => {
      await testApiHandler({
        appHandler: conflictsHandler,
        test: async ({ fetch }) => {
          const response = await fetch({ 
            method: 'GET',
            url: '/api/v1/sync/conflicts?severity=INVALID'
          });
          const json = await response.json();
          
          expect(response.status).toBe(200);
          expect(json.data.conflicts).toHaveLength(0);
        },
      });
    });
  });

  describe('GET /api/v1/sync/conflicts/[id]', () => {
    it('returns conflict details for valid ID', async () => {
      await testApiHandler({
        appHandler: conflictsHandler,
        test: async ({ fetch }) => {
          const response = await fetch({ 
            method: 'GET',
            url: '/api/v1/sync/conflicts/conflict-1'
          });
          const json = await response.json();
          
          expect(response.status).toBe(200);
          expect(json.success).toBe(true);
          expect(json.data.conflict).toBeDefined();
          expect(json.data.conflict.id).toBe('conflict-1');
          
          // Verify conflict structure
          expect(json.data.conflict).toMatchObject({
            id: expect.any(String),
            entityType: expect.any(String),
            entityId: expect.any(String),
            conflictType: expect.any(String),
            severity: expect.any(String),
            status: expect.any(String),
            localVersion: expect.any(Object),
            serverVersion: expect.any(Object),
            auditTrail: expect.any(Array)
          });
        },
      });
    });

    it('returns 404 for non-existent conflict ID', async () => {
      await testApiHandler({
        appHandler: conflictsHandler,
        test: async ({ fetch }) => {
          const response = await fetch({ 
            method: 'GET',
            url: '/api/v1/sync/conflicts/non-existent'
          });
          const json = await response.json();
          
          expect(response.status).toBe(404);
          expect(json.success).toBe(false);
          expect(json.error).toContain('Conflict not found');
        },
      });
    });
  });

  describe('POST /api/v1/sync/conflicts/[id]/resolve', () => {
    it('resolves conflict with valid strategy and justification', async () => {
      await testApiHandler({
        appHandler: conflictsHandler,
        test: async ({ fetch }) => {
          const requestBody = {
            strategy: 'SERVER_WINS',
            coordinatorId: 'coordinator-1',
            justification: 'Server version is more accurate'
          };
          
          const response = await fetch({ 
            method: 'POST',
            url: '/api/v1/sync/conflicts/conflict-1/resolve',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          const json = await response.json();
          
          expect(response.status).toBe(200);
          expect(json.success).toBe(true);
          expect(json.data.conflictId).toBe('conflict-1');
          expect(json.data.resolved).toBe(true);
        },
      });
    });

    it('requires justification for resolution', async () => {
      await testApiHandler({
        appHandler: conflictsHandler,
        test: async ({ fetch }) => {
          const requestBody = {
            strategy: 'SERVER_WINS',
            coordinatorId: 'coordinator-1'
            // Missing justification
          };
          
          const response = await fetch({ 
            method: 'POST',
            url: '/api/v1/sync/conflicts/conflict-1/resolve',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          const json = await response.json();
          
          expect(response.status).toBe(400);
          expect(json.success).toBe(false);
          expect(json.error).toContain('justification');
        },
      });
    });

    it('validates resolution strategy', async () => {
      await testApiHandler({
        appHandler: conflictsHandler,
        test: async ({ fetch }) => {
          const requestBody = {
            strategy: 'INVALID_STRATEGY',
            coordinatorId: 'coordinator-1',
            justification: 'Test resolution'
          };
          
          const response = await fetch({ 
            method: 'POST',
            url: '/api/v1/sync/conflicts/conflict-1/resolve',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          const json = await response.json();
          
          expect(response.status).toBe(400);
          expect(json.success).toBe(false);
          expect(json.error).toContain('Invalid resolution strategy');
        },
      });
    });

    it('handles manual resolution with merged data', async () => {
      await testApiHandler({
        appHandler: conflictsHandler,
        test: async ({ fetch }) => {
          const requestBody = {
            strategy: 'MANUAL',
            coordinatorId: 'coordinator-1',
            justification: 'Custom merge applied',
            mergedData: {
              id: 'entity-1',
              status: 'REVIEWED',
              score: 88,
              notes: 'Manually reviewed and updated'
            }
          };
          
          const response = await fetch({ 
            method: 'POST',
            url: '/api/v1/sync/conflicts/conflict-1/resolve',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          const json = await response.json();
          
          expect(response.status).toBe(200);
          expect(json.success).toBe(true);
        },
      });
    });
  });

  describe('POST /api/v1/sync/conflicts/[id]/override', () => {
    it('allows coordinator override with proper justification', async () => {
      await testApiHandler({
        appHandler: conflictsHandler,
        test: async ({ fetch }) => {
          const requestBody = {
            coordinatorId: 'coordinator-1',
            overrideReason: 'Emergency situation requires immediate resolution',
            forcedData: {
              id: 'entity-1',
              status: 'EMERGENCY_APPROVED'
            }
          };
          
          const response = await fetch({ 
            method: 'POST',
            url: '/api/v1/sync/conflicts/conflict-1/override',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          const json = await response.json();
          
          expect(response.status).toBe(200);
          expect(json.success).toBe(true);
          expect(json.data.overridden).toBe(true);
        },
      });
    });

    it('requires override reason for coordinator override', async () => {
      await testApiHandler({
        appHandler: conflictsHandler,
        test: async ({ fetch }) => {
          const requestBody = {
            coordinatorId: 'coordinator-1',
            forcedData: { id: 'entity-1' }
            // Missing overrideReason
          };
          
          const response = await fetch({ 
            method: 'POST',
            url: '/api/v1/sync/conflicts/conflict-1/override',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          const json = await response.json();
          
          expect(response.status).toBe(400);
          expect(json.success).toBe(false);
          expect(json.error).toContain('Override reason is required');
        },
      });
    });
  });

  describe('GET /api/v1/sync/conflicts/[id]/audit', () => {
    it('returns complete audit trail for conflict', async () => {
      await testApiHandler({
        appHandler: conflictsHandler,
        test: async ({ fetch }) => {
          const response = await fetch({ 
            method: 'GET',
            url: '/api/v1/sync/conflicts/conflict-1/audit'
          });
          const json = await response.json();
          
          expect(response.status).toBe(200);
          expect(json.success).toBe(true);
          expect(json.data.auditTrail).toBeDefined();
          expect(Array.isArray(json.data.auditTrail)).toBe(true);
          
          // Verify audit trail entry structure
          if (json.data.auditTrail.length > 0) {
            expect(json.data.auditTrail[0]).toMatchObject({
              timestamp: expect.any(String),
              action: expect.any(String),
              performedBy: expect.any(String),
              details: expect.any(Object)
            });
          }
        },
      });
    });

    it('returns 404 for non-existent conflict audit', async () => {
      await testApiHandler({
        appHandler: conflictsHandler,
        test: async ({ fetch }) => {
          const response = await fetch({ 
            method: 'GET',
            url: '/api/v1/sync/conflicts/non-existent/audit'
          });
          const json = await response.json();
          
          expect(response.status).toBe(404);
          expect(json.success).toBe(false);
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('handles malformed JSON in request body', async () => {
      await testApiHandler({
        appHandler: conflictsHandler,
        test: async ({ fetch }) => {
          const response = await fetch({ 
            method: 'POST',
            url: '/api/v1/sync/conflicts/conflict-1/resolve',
            headers: { 'Content-Type': 'application/json' },
            body: '{ invalid json }'
          });
          const json = await response.json();
          
          expect(response.status).toBe(400);
          expect(json.success).toBe(false);
          expect(json.error).toContain('Invalid JSON');
        },
      });
    });

    it('handles missing Content-Type header', async () => {
      await testApiHandler({
        appHandler: conflictsHandler,
        test: async ({ fetch }) => {
          const response = await fetch({ 
            method: 'POST',
            url: '/api/v1/sync/conflicts/conflict-1/resolve',
            body: JSON.stringify({
              strategy: 'SERVER_WINS',
              coordinatorId: 'coordinator-1',
              justification: 'Test'
            })
            // Missing Content-Type header
          });
          const json = await response.json();
          
          // Should still work as Next.js is flexible with content types
          expect([200, 400]).toContain(response.status);
        },
      });
    });

    it('handles unsupported HTTP methods', async () => {
      await testApiHandler({
        appHandler: conflictsHandler,
        test: async ({ fetch }) => {
          const response = await fetch({ 
            method: 'DELETE',
            url: '/api/v1/sync/conflicts/conflict-1'
          });
          
          expect(response.status).toBe(405); // Method Not Allowed
        },
      });
    });
  });
});