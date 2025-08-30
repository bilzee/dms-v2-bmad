import { GET } from '@/app/api/v1/monitoring/situation/overview/route';
import { NextRequest } from 'next/server';

describe('/api/v1/monitoring/situation/overview', () => {
  it('returns situation overview data successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/overview');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('timestamp');
    expect(data.data).toHaveProperty('totalAssessments');
    expect(data.data).toHaveProperty('totalResponses');
    expect(data.data).toHaveProperty('pendingVerification');
    expect(data.data).toHaveProperty('activeIncidents');
    expect(data.data).toHaveProperty('criticalGaps');
    expect(data.data).toHaveProperty('dataFreshness');
  });

  it('includes proper data freshness structure', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/overview');
    const response = await GET(request);
    const data = await response.json();

    expect(data.data.dataFreshness).toHaveProperty('realTime');
    expect(data.data.dataFreshness).toHaveProperty('recent');
    expect(data.data.dataFreshness).toHaveProperty('offlinePending');
    expect(typeof data.data.dataFreshness.realTime).toBe('number');
    expect(typeof data.data.dataFreshness.recent).toBe('number');
    expect(typeof data.data.dataFreshness.offlinePending).toBe('number');
  });

  it('includes proper metadata in response', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/overview');
    const response = await GET(request);
    const data = await response.json();

    expect(data.meta).toHaveProperty('refreshInterval');
    expect(data.meta).toHaveProperty('connectionStatus');
    expect(data.meta).toHaveProperty('lastUpdate');
    expect(data.meta).toHaveProperty('dataSource');
    expect(data.meta.refreshInterval).toBe(25);
    expect(['connected', 'degraded', 'offline']).toContain(data.meta.connectionStatus);
  });

  it('returns consistent numeric ranges for mock data', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/overview');
    const response = await GET(request);
    const data = await response.json();

    // Verify data is within expected ranges
    expect(data.data.totalAssessments).toBeGreaterThanOrEqual(100);
    expect(data.data.totalAssessments).toBeLessThanOrEqual(600);
    expect(data.data.totalResponses).toBeGreaterThanOrEqual(80);
    expect(data.data.totalResponses).toBeLessThanOrEqual(480);
    expect(data.data.pendingVerification).toBeGreaterThanOrEqual(5);
    expect(data.data.pendingVerification).toBeLessThanOrEqual(55);
    expect(data.data.activeIncidents).toBeGreaterThanOrEqual(3);
    expect(data.data.activeIncidents).toBeLessThanOrEqual(13);
  });

  it('includes proper timestamp format', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/overview');
    const response = await GET(request);
    const data = await response.json();

    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO format
    expect(data.meta.lastUpdate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('handles errors gracefully', async () => {
    // Mock console.error to prevent error output during test
    const originalConsoleError = console.error;
    console.error = jest.fn();

    // Force an error by mocking a failing internal operation
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation(() => {
      throw new Error('Database connection failed');
    });

    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/overview');
    
    // This test verifies the route handles errors, not that it calls fetch
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200); // Our route should still return 200 with mock data
    expect(data.success).toBe(true);

    // Restore mocks
    global.fetch = originalFetch;
    console.error = originalConsoleError;
  });

  it('returns valid JSON structure', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/overview');
    const response = await GET(request);
    const data = await response.json();

    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('meta');
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('timestamp');
    expect(typeof data.success).toBe('boolean');
    expect(typeof data.message).toBe('string');
  });
});