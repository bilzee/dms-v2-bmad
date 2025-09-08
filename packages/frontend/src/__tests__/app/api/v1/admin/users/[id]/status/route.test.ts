import { NextRequest } from 'next/server';
import { PUT } from '@/app/api/v1/admin/users/[id]/status/route';
import DatabaseService from '@/lib/services/DatabaseService';

jest.mock('@/lib/services/DatabaseService');

const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

describe('/api/v1/admin/users/[id]/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PUT /api/v1/admin/users/[id]/status', () => {
    it('should activate user successfully', async () => {
      const mockBatchResult = {
        count: 1
      };

      mockDatabaseService.toggleUserStatus.mockResolvedValue(mockBatchResult);

      const request = new NextRequest('http://localhost/api/v1/admin/users/user-123/status', {
        method: 'PUT',
        body: JSON.stringify({ isActive: true })
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'user-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user.isActive).toBe(true);
      expect(data.message).toBe('User activated successfully');
      expect(mockDatabaseService.toggleUserStatus).toHaveBeenCalledWith(
        'user-123',
        true,
        'system',
        'System Admin'
      );
    });

    it('should deactivate user successfully', async () => {
      const mockBatchResult = {
        count: 1
      };

      mockDatabaseService.toggleUserStatus.mockResolvedValue(mockBatchResult);

      const request = new NextRequest('http://localhost/api/v1/admin/users/user-123/status', {
        method: 'PUT',
        body: JSON.stringify({ isActive: false })
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'user-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user.isActive).toBe(false);
      expect(data.message).toBe('User deactivated successfully');
    });

    it('should validate isActive field', async () => {
      const request = new NextRequest('http://localhost/api/v1/admin/users/user-123/status', {
        method: 'PUT',
        body: JSON.stringify({})
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'user-123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('isActive field is required');
    });

    it('should return 404 for non-existent user', async () => {
      mockDatabaseService.toggleUserStatus.mockRejectedValue(new Error('User not found'));

      const request = new NextRequest('http://localhost/api/v1/admin/users/non-existent/status', {
        method: 'PUT',
        body: JSON.stringify({ isActive: true })
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'non-existent' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('User not found');
    });

    it('should handle database errors', async () => {
      mockDatabaseService.toggleUserStatus.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost/api/v1/admin/users/user-123/status', {
        method: 'PUT',
        body: JSON.stringify({ isActive: true })
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'user-123' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to update user status');
    });

    it('should handle invalid request body', async () => {
      const request = new NextRequest('http://localhost/api/v1/admin/users/user-123/status', {
        method: 'PUT',
        body: 'invalid-json'
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'user-123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid request body');
    });
  });
});