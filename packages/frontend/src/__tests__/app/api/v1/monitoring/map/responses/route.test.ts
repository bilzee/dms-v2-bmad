import { GET } from '@/app/api/v1/monitoring/map/responses/route';
import { NextRequest } from 'next/server';

describe('/api/v1/monitoring/map/responses', () => {
  it('returns map responses data successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/map/responses');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
  });

  it('includes proper response structure', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/map/responses');
    const response = await GET(request);
    const data = await response.json();

    const response_data = data.data[0];
    expect(response_data).toHaveProperty('id');
    expect(response_data).toHaveProperty('responseType');
    expect(response_data).toHaveProperty('plannedDate');
    expect(response_data).toHaveProperty('responderName');
    expect(response_data).toHaveProperty('coordinates');
    expect(response_data).toHaveProperty('entityName');
    expect(response_data).toHaveProperty('status');
    expect(response_data).toHaveProperty('deliveryItems');
  });

  it('validates response statuses', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/map/responses');
    const response = await GET(request);
    const data = await response.json();

    const validStatuses = ['PLANNED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED'];

    data.data.forEach((resp: any) => {
      expect(validStatuses).toContain(resp.status);
    });
  });

  it('includes proper metadata with status breakdown', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/map/responses');
    const response = await GET(request);
    const data = await response.json();

    expect(data.meta).toHaveProperty('statusBreakdown');
    expect(data.meta).toHaveProperty('totalDeliveryItems');
    expect(data.meta).toHaveProperty('lastUpdate');
    expect(data.meta).toHaveProperty('refreshInterval');
    
    const statusBreakdown = data.meta.statusBreakdown;
    expect(statusBreakdown).toHaveProperty('planned');
    expect(statusBreakdown).toHaveProperty('inProgress');
    expect(statusBreakdown).toHaveProperty('delivered');
    expect(statusBreakdown).toHaveProperty('cancelled');
  });

  it('validates delivery items structure', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/map/responses');
    const response = await GET(request);
    const data = await response.json();

    data.data.forEach((resp: any) => {
      expect(Array.isArray(resp.deliveryItems)).toBe(true);
      resp.deliveryItems.forEach((item: any) => {
        expect(item).toHaveProperty('item');
        expect(item).toHaveProperty('quantity');
        expect(typeof item.item).toBe('string');
        expect(typeof item.quantity).toBe('number');
        expect(item.quantity).toBeGreaterThan(0);
      });
    });
  });

  it('validates delivered date logic', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/map/responses');
    const response = await GET(request);
    const data = await response.json();

    data.data.forEach((resp: any) => {
      if (resp.status === 'DELIVERED') {
        expect(resp.deliveredDate).toBeDefined();
      } else {
        expect(resp.deliveredDate).toBeUndefined();
      }
    });
  });
});