import { GET } from '@/app/api/v1/monitoring/situation/incidents/route';
import { NextRequest } from 'next/server';

describe('/api/v1/monitoring/situation/incidents', () => {
  it('returns incident overview data successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/incidents');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThanOrEqual(3);
    expect(data.data.length).toBeLessThanOrEqual(10);
  });

  it('includes proper incident structure for each incident', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/incidents');
    const response = await GET(request);
    const data = await response.json();

    const incident = data.data[0];
    expect(incident).toHaveProperty('id');
    expect(incident).toHaveProperty('name');
    expect(incident).toHaveProperty('type');
    expect(incident).toHaveProperty('severity');
    expect(incident).toHaveProperty('status');
    expect(incident).toHaveProperty('date');
    expect(incident).toHaveProperty('assessmentCount');
    expect(incident).toHaveProperty('responseCount');
    expect(incident).toHaveProperty('gapScore');
    expect(incident).toHaveProperty('lastUpdate');
  });

  it('validates incident type enums', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/incidents');
    const response = await GET(request);
    const data = await response.json();

    const validTypes = ['FLOOD', 'FIRE', 'LANDSLIDE', 'CYCLONE', 'CONFLICT', 'EPIDEMIC', 'OTHER'];
    const validSeverities = ['MINOR', 'MODERATE', 'SEVERE', 'CATASTROPHIC'];
    const validStatuses = ['ACTIVE', 'CONTAINED', 'RESOLVED'];

    data.data.forEach((incident: any) => {
      expect(validTypes).toContain(incident.type);
      expect(validSeverities).toContain(incident.severity);
      expect(validStatuses).toContain(incident.status);
    });
  });

  it('includes proper metadata structure', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/incidents');
    const response = await GET(request);
    const data = await response.json();

    expect(data.meta).toHaveProperty('totalActive');
    expect(data.meta).toHaveProperty('totalContained');
    expect(data.meta).toHaveProperty('totalResolved');
    expect(data.meta).toHaveProperty('criticalCount');
    expect(data.meta).toHaveProperty('totalIncidents');
    expect(data.meta).toHaveProperty('filters');
    expect(data.meta).toHaveProperty('sorting');
  });

  it('handles status filter parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/incidents?status=ACTIVE');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.meta.filters.status).toBe('ACTIVE');
    
    // All returned incidents should have ACTIVE status when filtered
    data.data.forEach((incident: any) => {
      expect(incident.status).toBe('ACTIVE');
    });
  });

  it('handles severity filter parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/incidents?severity=CATASTROPHIC');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.meta.filters.severity).toBe('CATASTROPHIC');
  });

  it('handles sorting parameters', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/incidents?sortBy=severity&sortOrder=asc');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.meta.sorting.sortBy).toBe('severity');
    expect(data.meta.sorting.sortOrder).toBe('asc');
  });

  it('calculates gap scores correctly', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/incidents');
    const response = await GET(request);
    const data = await response.json();

    data.data.forEach((incident: any) => {
      expect(incident.gapScore).toBeGreaterThanOrEqual(0);
      expect(incident.gapScore).toBeLessThanOrEqual(100);
      
      // Gap score should be reasonable based on assessment vs response counts
      if (incident.responseCount > 0 && incident.assessmentCount > 0) {
        const expectedScore = Math.floor((incident.responseCount / incident.assessmentCount) * 100);
        expect(incident.gapScore).toBeLessThanOrEqual(Math.min(expectedScore + 10, 100));
      }
    });
  });

  it('returns valid date formats', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/incidents');
    const response = await GET(request);
    const data = await response.json();

    data.data.forEach((incident: any) => {
      expect(new Date(incident.date)).toBeInstanceOf(Date);
      expect(new Date(incident.lastUpdate)).toBeInstanceOf(Date);
      expect(isNaN(new Date(incident.date).getTime())).toBe(false);
      expect(isNaN(new Date(incident.lastUpdate).getTime())).toBe(false);
    });
  });

  it('provides consistent metadata counts', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/incidents');
    const response = await GET(request);
    const data = await response.json();

    const actualActive = data.data.filter((i: any) => i.status === 'ACTIVE').length;
    const actualContained = data.data.filter((i: any) => i.status === 'CONTAINED').length;
    const actualResolved = data.data.filter((i: any) => i.status === 'RESOLVED').length;
    const actualCritical = data.data.filter((i: any) => i.severity === 'CATASTROPHIC' || i.severity === 'SEVERE').length;

    expect(data.meta.totalActive).toBe(actualActive);
    expect(data.meta.totalContained).toBe(actualContained);
    expect(data.meta.totalResolved).toBe(actualResolved);
    expect(data.meta.criticalCount).toBe(actualCritical);
    expect(data.meta.totalIncidents).toBe(data.data.length);
  });
});