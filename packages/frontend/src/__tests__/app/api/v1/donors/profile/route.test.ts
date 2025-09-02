import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/v1/donors/profile/route';

describe('/api/v1/donors/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/donors/profile', () => {
    test('returns donor profile', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/donors/profile');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.profile).toBeDefined();
      expect(data.data.profile.email).toBe('coordinator@actionaid.org.ng');
      expect(data.data.profile.name).toBe('ActionAid Nigeria');
    });
  });

  describe('PUT /api/v1/donors/profile', () => {
    test('updates donor profile with valid data', async () => {
      const updateData = {
        name: 'ActionAid Nigeria Updated',
        organization: 'ActionAid Nigeria',
        phone: '+234-812-345-6789',
      };

      const request = new NextRequest('http://localhost:3000/api/v1/donors/profile', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.profile.name).toBe('ActionAid Nigeria Updated');
      expect(data.data.profile.phone).toBe('+234-812-345-6789');
    });

    test('validates required fields', async () => {
      const invalidData = {
        name: '', // Invalid - empty name
        organization: 'ActionAid Nigeria',
      };

      const request = new NextRequest('http://localhost:3000/api/v1/donors/profile', {
        method: 'PUT',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid name');
    });

    test('validates field length limits', async () => {
      const invalidData = {
        name: 'a'.repeat(101), // Invalid - too long
        organization: 'ActionAid Nigeria',
      };

      const request = new NextRequest('http://localhost:3000/api/v1/donors/profile', {
        method: 'PUT',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid name');
    });

    test('prevents email updates', async () => {
      const invalidData = {
        name: 'ActionAid Nigeria',
        organization: 'ActionAid Nigeria',
        email: 'newemail@example.com', // Invalid - email change not allowed
      };

      const request = new NextRequest('http://localhost:3000/api/v1/donors/profile', {
        method: 'PUT',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Email updates not allowed');
    });

    test('validates phone number length', async () => {
      const invalidData = {
        name: 'ActionAid Nigeria',
        organization: 'ActionAid Nigeria',
        phone: '123', // Invalid - too short
      };

      const request = new NextRequest('http://localhost:3000/api/v1/donors/profile', {
        method: 'PUT',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid phone number');
    });

    test('handles malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/donors/profile', {
        method: 'PUT',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid JSON in request body');
    });
  });
});