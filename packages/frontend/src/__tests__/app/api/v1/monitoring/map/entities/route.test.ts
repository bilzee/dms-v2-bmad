import { GET } from '@/app/api/v1/monitoring/map/entities/route';
import { NextRequest } from 'next/server';

describe('/api/v1/monitoring/map/entities', () => {
  it('returns map entities data successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/map/entities');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
  });

  it('includes proper entity structure', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/map/entities');
    const response = await GET(request);
    const data = await response.json();

    const entity = data.data[0];
    expect(entity).toHaveProperty('id');
    expect(entity).toHaveProperty('name');
    expect(entity).toHaveProperty('type');
    expect(entity).toHaveProperty('longitude');
    expect(entity).toHaveProperty('latitude');
    expect(entity).toHaveProperty('coordinates');
    expect(entity).toHaveProperty('assessmentCount');
    expect(entity).toHaveProperty('responseCount');
    expect(entity).toHaveProperty('lastActivity');
    expect(entity).toHaveProperty('statusSummary');
  });

  it('includes proper GPS coordinates structure', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/map/entities');
    const response = await GET(request);
    const data = await response.json();

    const coordinates = data.data[0].coordinates;
    expect(coordinates).toHaveProperty('latitude');
    expect(coordinates).toHaveProperty('longitude');
    expect(coordinates).toHaveProperty('accuracy');
    expect(coordinates).toHaveProperty('timestamp');
    expect(coordinates).toHaveProperty('captureMethod');
    expect(['GPS', 'MANUAL', 'MAP_SELECT']).toContain(coordinates.captureMethod);
  });

  it('includes proper metadata with bounding box', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/map/entities');
    const response = await GET(request);
    const data = await response.json();

    expect(data.meta).toHaveProperty('boundingBox');
    expect(data.meta).toHaveProperty('totalEntities');
    expect(data.meta).toHaveProperty('lastUpdate');
    expect(data.meta).toHaveProperty('refreshInterval');
    expect(data.meta).toHaveProperty('connectionStatus');
    
    const boundingBox = data.meta.boundingBox;
    expect(boundingBox).toHaveProperty('northEast');
    expect(boundingBox).toHaveProperty('southWest');
    expect(boundingBox.northEast).toHaveProperty('latitude');
    expect(boundingBox.northEast).toHaveProperty('longitude');
  });

  it('validates entity types are correct', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/map/entities');
    const response = await GET(request);
    const data = await response.json();

    data.data.forEach((entity: any) => {
      expect(['CAMP', 'COMMUNITY']).toContain(entity.type);
      expect(typeof entity.latitude).toBe('number');
      expect(typeof entity.longitude).toBe('number');
      expect(entity.latitude).toBeGreaterThan(10);
      expect(entity.latitude).toBeLessThan(15);
      expect(entity.longitude).toBeGreaterThan(12);
      expect(entity.longitude).toBeLessThan(16);
    });
  });

  it('includes proper status summary structure', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/map/entities');
    const response = await GET(request);
    const data = await response.json();

    const statusSummary = data.data[0].statusSummary;
    expect(statusSummary).toHaveProperty('pendingAssessments');
    expect(statusSummary).toHaveProperty('verifiedAssessments');
    expect(statusSummary).toHaveProperty('activeResponses');
    expect(statusSummary).toHaveProperty('completedResponses');
    expect(typeof statusSummary.pendingAssessments).toBe('number');
    expect(typeof statusSummary.verifiedAssessments).toBe('number');
  });
});