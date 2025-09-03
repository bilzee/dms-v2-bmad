import { GET } from '@/app/api/v1/monitoring/map/assessments/route';
import { NextRequest } from 'next/server';

describe('/api/v1/monitoring/map/assessments', () => {
  it('returns map assessments data successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/map/assessments');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
  });

  it('includes proper assessment structure', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/map/assessments');
    const response = await GET(request);
    const data = await response.json();

    const assessment = data.data[0];
    expect(assessment).toHaveProperty('id');
    expect(assessment).toHaveProperty('type');
    expect(assessment).toHaveProperty('date');
    expect(assessment).toHaveProperty('assessorName');
    expect(assessment).toHaveProperty('coordinates');
    expect(assessment).toHaveProperty('entityName');
    expect(assessment).toHaveProperty('verificationStatus');
    expect(assessment).toHaveProperty('priorityLevel');
  });

  it('validates assessment types and statuses', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/map/assessments');
    const response = await GET(request);
    const data = await response.json();

    const validTypes = ['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION'];
    const validStatuses = ['PENDING', 'VERIFIED', 'AUTO_VERIFIED', 'REJECTED'];
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    data.data.forEach((assessment: any) => {
      expect(validTypes).toContain(assessment.type);
      expect(validStatuses).toContain(assessment.verificationStatus);
      expect(validPriorities).toContain(assessment.priorityLevel);
    });
  });

  it('includes proper metadata with breakdowns', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/map/assessments');
    const response = await GET(request);
    const data = await response.json();

    expect(data.meta).toHaveProperty('statusBreakdown');
    expect(data.meta).toHaveProperty('typeBreakdown');
    expect(data.meta).toHaveProperty('lastUpdate');
    expect(data.meta).toHaveProperty('refreshInterval');
    
    const statusBreakdown = data.meta.statusBreakdown;
    expect(statusBreakdown).toHaveProperty('pending');
    expect(statusBreakdown).toHaveProperty('verified');
    expect(statusBreakdown).toHaveProperty('rejected');
    
    const typeBreakdown = data.meta.typeBreakdown;
    expect(typeBreakdown).toHaveProperty('HEALTH');
    expect(typeBreakdown).toHaveProperty('WASH');
    expect(typeBreakdown).toHaveProperty('SHELTER');
  });

  it('validates GPS coordinates are within Borno State bounds', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/map/assessments');
    const response = await GET(request);
    const data = await response.json();

    data.data.forEach((assessment: any) => {
      const coords = assessment.coordinates;
      expect(coords.latitude).toBeGreaterThan(11);
      expect(coords.latitude).toBeLessThan(15);
      expect(coords.longitude).toBeGreaterThan(12);
      expect(coords.longitude).toBeLessThan(16);
      expect(coords.accuracy).toBeGreaterThan(0);
      expect(['GPS', 'MANUAL', 'MAP_SELECT']).toContain(coords.captureMethod);
    });
  });
});