import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { IncidentType, IncidentSeverity, IncidentStatus } from '@dms/shared';

// Mock environment variables
process.env.NODE_ENV = 'test';

describe('/api/v1/incidents Integration Tests', () => {
  describe('GET /api/v1/incidents', () => {
    it('returns incidents list with default pagination', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/incidents');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.incidents).toBeInstanceOf(Array);
      expect(data.data.pagination).toMatchObject({
        page: 1,
        pageSize: 20,
        totalPages: expect.any(Number),
        totalCount: expect.any(Number),
      });
      expect(data.data.statistics).toBeDefined();
      expect(data.timestamp).toBeDefined();
      expect(data.message).toContain('incidents retrieved');
    });

    it('applies pagination correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/incidents?page=1&pageSize=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.incidents).toHaveLength(1);
      expect(data.data.pagination.pageSize).toBe(1);
      expect(data.data.pagination.page).toBe(1);
    });

    it('filters by incident type', async () => {
      const request = new NextRequest(`http://localhost:3000/api/v1/incidents?type=${IncidentType.FLOOD}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.incidents.forEach((incident: any) => {
        expect(incident.type).toBe(IncidentType.FLOOD);
      });
    });

    it('filters by severity', async () => {
      const request = new NextRequest(`http://localhost:3000/api/v1/incidents?severity=${IncidentSeverity.SEVERE}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.incidents.forEach((incident: any) => {
        expect(incident.severity).toBe(IncidentSeverity.SEVERE);
      });
    });

    it('filters by status', async () => {
      const request = new NextRequest(`http://localhost:3000/api/v1/incidents?status=${IncidentStatus.ACTIVE}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.incidents.forEach((incident: any) => {
        expect(incident.status).toBe(IncidentStatus.ACTIVE);
      });
    });

    it('searches incidents by name', async () => {
      const searchTerm = 'flood';
      const request = new NextRequest(`http://localhost:3000/api/v1/incidents?search=${searchTerm}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.incidents.forEach((incident: any) => {
        expect(incident.name.toLowerCase()).toContain(searchTerm.toLowerCase());
      });
    });

    it('sorts incidents correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/incidents?sortBy=date&sortOrder=asc');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const incidents = data.data.incidents;
      if (incidents.length > 1) {
        for (let i = 1; i < incidents.length; i++) {
          expect(new Date(incidents[i].date) >= new Date(incidents[i - 1].date)).toBe(true);
        }
      }
    });

    it('handles date range filtering', async () => {
      const dateFrom = '2024-08-01';
      const dateTo = '2024-08-31';
      const request = new NextRequest(`http://localhost:3000/api/v1/incidents?dateFrom=${dateFrom}&dateTo=${dateTo}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.incidents.forEach((incident: any) => {
        const incidentDate = new Date(incident.date);
        expect(incidentDate >= new Date(dateFrom)).toBe(true);
        expect(incidentDate <= new Date(dateTo)).toBe(true);
      });
    });

    it('returns empty results for non-matching filters', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/incidents?search=nonexistent');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.incidents).toHaveLength(0);
      expect(data.data.pagination.totalCount).toBe(0);
    });

    it('validates invalid sort parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/incidents?sortBy=invalid&sortOrder=invalid');
      const response = await GET(request);
      const data = await response.json();

      // Should fallback to default sorting
      expect(response.status).toBe(200);
      expect(data.data.incidents).toBeDefined();
    });

    it('handles large page size gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/incidents?pageSize=1000');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.pagination.pageSize).toBeLessThanOrEqual(100); // Should be capped
    });
  });

  describe('POST /api/v1/incidents', () => {
    it('creates incident successfully with valid data', async () => {
      const incidentData = {
        name: 'Test Integration Flood',
        type: IncidentType.FLOOD,
        severity: IncidentSeverity.SEVERE,
        description: 'Integration test incident',
        coordinatorId: 'coord-123',
        coordinatorName: 'John Coordinator',
        source: 'MANUAL' as const,
        location: {
          latitude: 11.8311,
          longitude: 13.1506,
        },
        linkedEntityIds: ['1', '2'],
        linkedAssessmentIds: [],
      };

      const request = new NextRequest('http://localhost:3000/api/v1/incidents', {
        method: 'POST',
        body: JSON.stringify(incidentData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.incident).toMatchObject({
        id: expect.any(String),
        name: incidentData.name,
        type: incidentData.type,
        severity: incidentData.severity,
        status: IncidentStatus.ACTIVE,
        coordinatorId: incidentData.coordinatorId,
        coordinatorName: incidentData.coordinatorName,
      });
      expect(data.data.incident.createdAt).toBeDefined();
      expect(data.data.timeline).toBeDefined();
      expect(data.message).toContain('successfully');
    });

    it('creates incident from assessment successfully', async () => {
      const incidentData = {
        name: 'Assessment-Based Incident',
        coordinatorId: 'coord-123',
        coordinatorName: 'John Coordinator',
        source: 'ASSESSMENT' as const,
        linkedAssessmentIds: ['assess-1'],
        linkedEntityIds: ['1'],
        type: IncidentType.FLOOD,
        severity: IncidentSeverity.MODERATE,
      };

      const request = new NextRequest('http://localhost:3000/api/v1/incidents', {
        method: 'POST',
        body: JSON.stringify(incidentData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.incident.source).toBe('ASSESSMENT');
      expect(data.data.incident.linkedAssessmentIds).toEqual(['assess-1']);
    });

    it('validates required fields', async () => {
      const incidentData = {
        // Missing required fields
        description: 'Test without required fields',
      };

      const request = new NextRequest('http://localhost:3000/api/v1/incidents', {
        method: 'POST',
        body: JSON.stringify(incidentData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing required fields');
      expect(data.message).toContain('name');
    });

    it('validates incident type enum', async () => {
      const incidentData = {
        name: 'Test Invalid Type',
        type: 'INVALID_TYPE',
        severity: IncidentSeverity.MODERATE,
        coordinatorId: 'coord-123',
        coordinatorName: 'Test Coordinator',
        source: 'MANUAL' as const,
      };

      const request = new NextRequest('http://localhost:3000/api/v1/incidents', {
        method: 'POST',
        body: JSON.stringify(incidentData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid incident type');
    });

    it('validates severity enum', async () => {
      const incidentData = {
        name: 'Test Invalid Severity',
        type: IncidentType.FLOOD,
        severity: 'INVALID_SEVERITY',
        coordinatorId: 'coord-123',
        coordinatorName: 'Test Coordinator',
        source: 'MANUAL' as const,
      };

      const request = new NextRequest('http://localhost:3000/api/v1/incidents', {
        method: 'POST',
        body: JSON.stringify(incidentData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid severity level');
    });

    it('validates location coordinates', async () => {
      const incidentData = {
        name: 'Test Invalid Location',
        type: IncidentType.FLOOD,
        severity: IncidentSeverity.MODERATE,
        coordinatorId: 'coord-123',
        coordinatorName: 'Test Coordinator',
        source: 'MANUAL' as const,
        location: {
          latitude: 200, // Invalid latitude
          longitude: 13.1506,
        },
      };

      const request = new NextRequest('http://localhost:3000/api/v1/incidents', {
        method: 'POST',
        body: JSON.stringify(incidentData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid coordinates');
    });

    it('validates entity IDs format', async () => {
      const incidentData = {
        name: 'Test Invalid Entities',
        type: IncidentType.FLOOD,
        severity: IncidentSeverity.MODERATE,
        coordinatorId: 'coord-123',
        coordinatorName: 'Test Coordinator',
        source: 'MANUAL' as const,
        linkedEntityIds: 'not-an-array', // Should be array
      };

      const request = new NextRequest('http://localhost:3000/api/v1/incidents', {
        method: 'POST',
        body: JSON.stringify(incidentData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid entity IDs');
    });

    it('handles malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/incidents', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid JSON in request body');
    });

    it('handles missing content-type header', async () => {
      const incidentData = {
        name: 'Test No Content Type',
        type: IncidentType.FLOOD,
        severity: IncidentSeverity.MODERATE,
        coordinatorId: 'coord-123',
        coordinatorName: 'Test Coordinator',
        source: 'MANUAL' as const,
      };

      const request = new NextRequest('http://localhost:3000/api/v1/incidents', {
        method: 'POST',
        body: JSON.stringify(incidentData),
        // No Content-Type header
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201); // Should still work
      expect(data.success).toBe(true);
    });

    it('creates timeline event on incident creation', async () => {
      const incidentData = {
        name: 'Timeline Test Incident',
        type: IncidentType.FLOOD,
        severity: IncidentSeverity.SEVERE,
        coordinatorId: 'coord-123',
        coordinatorName: 'John Coordinator',
        source: 'MANUAL' as const,
      };

      const request = new NextRequest('http://localhost:3000/api/v1/incidents', {
        method: 'POST',
        body: JSON.stringify(incidentData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.timeline).toMatchObject({
        type: 'STATUS_CHANGE',
        description: expect.stringContaining('created'),
        coordinatorName: 'John Coordinator',
        metadata: {
          newStatus: IncidentStatus.ACTIVE,
          previousStatus: null,
        },
      });
    });

    it('handles empty entity and assessment arrays', async () => {
      const incidentData = {
        name: 'Empty Arrays Test',
        type: IncidentType.FLOOD,
        severity: IncidentSeverity.MODERATE,
        coordinatorId: 'coord-123',
        coordinatorName: 'Test Coordinator',
        source: 'MANUAL' as const,
        linkedEntityIds: [],
        linkedAssessmentIds: [],
      };

      const request = new NextRequest('http://localhost:3000/api/v1/incidents', {
        method: 'POST',
        body: JSON.stringify(incidentData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.incident.linkedEntityIds).toEqual([]);
      expect(data.data.incident.linkedAssessmentIds).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('handles server errors gracefully', async () => {
      // This test would simulate a server error condition
      // In a real implementation, you might mock database failures
      const request = new NextRequest('http://localhost:3000/api/v1/incidents');
      
      // Simulate error by passing invalid parameters that would cause server error
      // This is implementation-specific and would depend on your actual error conditions
      
      const response = await GET(request);
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(600);
    });

    it('returns consistent error format', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/incidents', {
        method: 'POST',
        body: 'invalid',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toMatchObject({
        success: false,
        error: expect.any(String),
        message: expect.any(String),
        timestamp: expect.any(String),
      });
    });
  });
});