import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock the authentication
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => Promise.resolve({
    user: { id: 'test-user-id' }
  }))
}));

jest.mock('@/auth.config', () => ({
  authConfig: {}
}));

describe('/api/v1/assessments/stats', () => {
  it('should return assessment statistics', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/assessments/stats');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('totalAssessments');
    expect(data.data).toHaveProperty('activeAssessments');
    expect(data.data).toHaveProperty('pendingReview');
    expect(data.data).toHaveProperty('completedToday');
    expect(data).toHaveProperty('timestamp');
  });

  it('should return 401 when user is not authenticated', async () => {
    // Mock unauthenticated request
    jest.doMock('next-auth', () => ({
      getServerSession: jest.fn(() => Promise.resolve(null))
    }));

    const request = new NextRequest('http://localhost:3000/api/v1/assessments/stats');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.errors).toContain('Unauthorized');
  });
});