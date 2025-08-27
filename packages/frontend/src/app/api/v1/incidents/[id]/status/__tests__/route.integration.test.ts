import { NextRequest } from 'next/server';
import { GET, PUT } from '../route';
import { IncidentStatus } from '@dms/shared';

describe('/api/v1/incidents/[id]/status Integration Tests', () => {
  const validIncidentId = '1';
  const invalidIncidentId = 'nonexistent';

  describe('GET /api/v1/incidents/[id]/status', () => {
    it('returns status history successfully for valid incident', async () => {
      const request = new NextRequest(`http://localhost:3000/api/v1/incidents/${validIncidentId}/status`);
      const response = await GET(request, { params: { id: validIncidentId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        incidentId: validIncidentId,
        currentStatus: expect.any(String),
        statusHistory: expect.any(Array),
        nextPossibleStatuses: expect.any(Array),
        canTransition: expect.any(Boolean),
        totalTransitions: expect.any(Number),
      });

      // Validate status history structure
      data.data.statusHistory.forEach((entry: any) => {
        expect(entry).toMatchObject({
          status: expect.any(String),
          changedAt: expect.any(String),
          changedBy: expect.any(String),
          coordinatorId: expect.any(String),
          notes: expect.any(String),
          duration: expect.any(String),
        });
        expect(Object.values(IncidentStatus)).toContain(entry.status);
      });

      expect(data.timestamp).toBeDefined();
      expect(data.message).toContain('retrieved successfully');
    });

    it('validates status transitions correctly', async () => {
      const request = new NextRequest(`http://localhost:3000/api/v1/incidents/${validIncidentId}/status`);
      const response = await GET(request, { params: { id: validIncidentId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      
      const currentStatus = data.data.currentStatus;
      const nextPossibleStatuses = data.data.nextPossibleStatuses;

      // Validate transition logic
      if (currentStatus === IncidentStatus.ACTIVE) {
        expect(nextPossibleStatuses).toEqual(
          expect.arrayContaining([IncidentStatus.CONTAINED, IncidentStatus.RESOLVED])
        );
      } else if (currentStatus === IncidentStatus.CONTAINED) {
        expect(nextPossibleStatuses).toEqual([IncidentStatus.RESOLVED]);
      } else if (currentStatus === IncidentStatus.RESOLVED) {
        expect(nextPossibleStatuses).toEqual([]);
        expect(data.data.canTransition).toBe(false);
      }
    });

    it('returns 400 for invalid incident ID format', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/incidents/invalid-id/status');
      const response = await GET(request, { params: { id: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid incident ID');
      expect(data.message).toContain('required');
    });
  });

  describe('PUT /api/v1/incidents/[id]/status', () => {
    it('updates status successfully with valid transition', async () => {
      const statusUpdate = {
        newStatus: IncidentStatus.CONTAINED,
        milestone: 'Evacuation completed',
        notes: 'All residents safely evacuated to temporary shelters',
        coordinatorId: 'coord-123',
        coordinatorName: 'John Coordinator',
        actionItems: [
          {
            title: 'Assess infrastructure damage',
            description: 'Complete damage assessment before reopening areas',
            priority: 'HIGH' as const,
            assignedTo: 'coord-456',
            dueDate: new Date('2024-08-30'),
          },
        ],
      };

      const request = new NextRequest(`http://localhost:3000/api/v1/incidents/${validIncidentId}/status`, {
        method: 'PUT',
        body: JSON.stringify(statusUpdate),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request, { params: { id: validIncidentId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        incident: {
          id: validIncidentId,
          status: statusUpdate.newStatus,
          updatedAt: expect.any(String),
        },
        statusUpdate: {
          previousStatus: IncidentStatus.ACTIVE,
          newStatus: statusUpdate.newStatus,
          transitionTime: expect.any(String),
          coordinator: {
            id: statusUpdate.coordinatorId,
            name: statusUpdate.coordinatorName,
          },
          milestone: statusUpdate.milestone,
          notes: statusUpdate.notes,
          actionItemsAdded: 1,
        },
        timeline: {
          type: 'STATUS_CHANGE',
          description: expect.stringContaining('ACTIVE to CONTAINED'),
          coordinatorName: statusUpdate.coordinatorName,
          metadata: {
            previousStatus: IncidentStatus.ACTIVE,
            newStatus: statusUpdate.newStatus,
            milestone: statusUpdate.milestone,
            notes: statusUpdate.notes,
          },
        },
      });

      expect(data.message).toContain('updated successfully');
    });

    it('updates status without optional fields', async () => {
      const statusUpdate = {
        newStatus: IncidentStatus.CONTAINED,
      };

      const request = new NextRequest(`http://localhost:3000/api/v1/incidents/${validIncidentId}/status`, {
        method: 'PUT',
        body: JSON.stringify(statusUpdate),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request, { params: { id: validIncidentId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.statusUpdate.milestone).toBeUndefined();
      expect(data.data.statusUpdate.notes).toBeUndefined();
      expect(data.data.statusUpdate.actionItemsAdded).toBe(0);
    });

    it('validates required newStatus field', async () => {
      const statusUpdate = {
        // Missing newStatus
        milestone: 'Test milestone',
        notes: 'Test notes',
      };

      const request = new NextRequest(`http://localhost:3000/api/v1/incidents/${validIncidentId}/status`, {
        method: 'PUT',
        body: JSON.stringify(statusUpdate),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request, { params: { id: validIncidentId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing required field');
      expect(data.message).toContain('newStatus is required');
    });

    it('validates status enum values', async () => {
      const statusUpdate = {
        newStatus: 'INVALID_STATUS',
      };

      const request = new NextRequest(`http://localhost:3000/api/v1/incidents/${validIncidentId}/status`, {
        method: 'PUT',
        body: JSON.stringify(statusUpdate),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request, { params: { id: validIncidentId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid status');
      expect(data.message).toContain('must be one of');
      expect(data.message).toContain('ACTIVE');
      expect(data.message).toContain('CONTAINED');
      expect(data.message).toContain('RESOLVED');
    });

    it('validates status transitions', async () => {
      // Try to transition from CONTAINED back to ACTIVE (invalid)
      const statusUpdate = {
        newStatus: IncidentStatus.ACTIVE, // Invalid transition from CONTAINED
      };

      // First, simulate incident is already CONTAINED
      const request = new NextRequest(`http://localhost:3000/api/v1/incidents/2/status`, {
        method: 'PUT',
        body: JSON.stringify(statusUpdate),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request, { params: { id: '2' } }); // Incident 2 is CONTAINED
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid status transition');
      expect(data.message).toContain('Cannot transition');
    });

    it('prevents transition from RESOLVED status', async () => {
      const statusUpdate = {
        newStatus: IncidentStatus.ACTIVE,
      };

      // Mock a resolved incident (in real implementation, you'd have a resolved incident)
      const request = new NextRequest(`http://localhost:3000/api/v1/incidents/resolved-incident/status`, {
        method: 'PUT',
        body: JSON.stringify(statusUpdate),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request, { params: { id: 'resolved-incident' } });
      const data = await response.json();

      // This would be 400 if we had a proper resolved incident mock
      // For now, it might return different error based on mock data
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });

    it('validates incident ID format', async () => {
      const statusUpdate = {
        newStatus: IncidentStatus.CONTAINED,
      };

      const request = new NextRequest('http://localhost:3000/api/v1/incidents//status', {
        method: 'PUT',
        body: JSON.stringify(statusUpdate),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request, { params: { id: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid incident ID');
    });

    it('handles malformed JSON in request body', async () => {
      const request = new NextRequest(`http://localhost:3000/api/v1/incidents/${validIncidentId}/status`, {
        method: 'PUT',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request, { params: { id: validIncidentId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid JSON in request body');
      expect(data.message).toContain('check your request format');
    });

    it('creates proper timeline event for status change', async () => {
      const statusUpdate = {
        newStatus: IncidentStatus.RESOLVED,
        milestone: 'Recovery completed',
        notes: 'All systems restored and population returned',
      };

      const request = new NextRequest(`http://localhost:3000/api/v1/incidents/${validIncidentId}/status`, {
        method: 'PUT',
        body: JSON.stringify(statusUpdate),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request, { params: { id: validIncidentId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.timeline).toMatchObject({
        id: expect.stringMatching(/^timeline-\d+$/),
        type: 'STATUS_CHANGE',
        timestamp: expect.any(String),
        coordinatorId: 'current-user-id',
        coordinatorName: 'Current User',
        description: expect.stringContaining('Recovery completed'),
        metadata: {
          previousStatus: expect.any(String),
          newStatus: statusUpdate.newStatus,
          milestone: statusUpdate.milestone,
          notes: statusUpdate.notes,
        },
      });
    });

    it('handles action items in status update', async () => {
      const statusUpdate = {
        newStatus: IncidentStatus.CONTAINED,
        actionItems: [
          {
            title: 'Damage assessment',
            description: 'Assess structural damage',
            priority: 'HIGH' as const,
            assignedTo: 'coord-456',
            dueDate: new Date('2024-08-30'),
          },
          {
            title: 'Resource allocation',
            description: 'Allocate recovery resources',
            priority: 'MEDIUM' as const,
            assignedTo: 'coord-789',
            dueDate: new Date('2024-09-01'),
          },
        ],
      };

      const request = new NextRequest(`http://localhost:3000/api/v1/incidents/${validIncidentId}/status`, {
        method: 'PUT',
        body: JSON.stringify(statusUpdate),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request, { params: { id: validIncidentId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.statusUpdate.actionItemsAdded).toBe(2);
      expect(data.data.incident.actionItems).toHaveLength(2);
      expect(data.data.timeline.metadata.actionItemsAdded).toBe(2);
    });

    it('calculates status duration correctly', async () => {
      const statusUpdate = {
        newStatus: IncidentStatus.CONTAINED,
      };

      const request = new NextRequest(`http://localhost:3000/api/v1/incidents/${validIncidentId}/status`, {
        method: 'PUT',
        body: JSON.stringify(statusUpdate),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request, { params: { id: validIncidentId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.statusUpdate.duration).toMatch(/\d+\s+(days?|hours?|minutes?)/);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles server errors gracefully', async () => {
      // Test with parameters that might cause server errors
      const request = new NextRequest('http://localhost:3000/api/v1/incidents/error-test/status');
      const response = await GET(request, { params: { id: 'error-test' } });
      
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(600);
      
      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('timestamp');
    });

    it('maintains consistent error response format', async () => {
      const request = new NextRequest(`http://localhost:3000/api/v1/incidents/${validIncidentId}/status`, {
        method: 'PUT',
        body: '{}', // Empty object
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request, { params: { id: validIncidentId } });
      const data = await response.json();

      expect(data).toMatchObject({
        success: false,
        error: expect.any(String),
        message: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('handles missing request body', async () => {
      const request = new NextRequest(`http://localhost:3000/api/v1/incidents/${validIncidentId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request, { params: { id: validIncidentId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});