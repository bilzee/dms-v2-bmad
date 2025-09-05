import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/v1/admin/users/[id]/route';
import DatabaseService from '@/lib/services/DatabaseService';

jest.mock('@/lib/services/DatabaseService');

const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

describe('/api/v1/admin/users/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/admin/users/[id]', () => {
    it('should return user details', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        organization: 'Relief Org',
        isActive: true,
        activeRole: null,
        roles: [{ id: 'role-1', name: 'ASSESSOR' }],
        createdAt: new Date('2023-01-01'),
        lastSync: null
      };

      mockDatabaseService.getUserWithRoles.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost/api/v1/admin/users/user-123');
      const response = await GET(request, { params: { id: 'user-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user).toEqual(mockUser);
      expect(mockDatabaseService.getUserWithRoles).toHaveBeenCalledWith('user-123');
    });

    it('should return 404 for non-existent user', async () => {
      mockDatabaseService.getUserWithRoles.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/v1/admin/users/non-existent');
      const response = await GET(request, { params: { id: 'non-existent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });

    it('should handle database errors', async () => {
      mockDatabaseService.getUserWithRoles.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/v1/admin/users/user-123');
      const response = await GET(request, { params: { id: 'user-123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch user');
    });
  });

  describe('PUT /api/v1/admin/users/[id]', () => {
    it('should update user successfully', async () => {
      const updateData = {
        name: 'John Smith',
        phone: '+1234567899',
        organization: 'Updated Org',
        roleIds: ['role-2']
      };

      const mockUpdatedUser = {
        id: 'user-123',
        ...updateData,
        email: 'john@example.com',
        isActive: true,
        roles: [{ id: 'role-2', name: 'COORDINATOR' }],
        updatedAt: new Date()
      };

      mockDatabaseService.updateUserWithAdmin.mockResolvedValue(mockUpdatedUser);

      const request = new NextRequest('http://localhost/api/v1/admin/users/user-123', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user).toEqual(mockUpdatedUser);
      expect(mockDatabaseService.updateUserWithAdmin).toHaveBeenCalledWith(
        'user-123',
        {
          ...updateData,
          updatedBy: 'system',
          updatedByName: 'System Admin'
        }
      );
    });

    it('should handle partial updates', async () => {
      const partialUpdate = {
        name: 'John Updated'
      };

      const mockUpdatedUser = {
        id: 'user-123',
        name: 'John Updated',
        email: 'john@example.com',
        isActive: true,
        roles: [],
        updatedAt: new Date()
      };

      mockDatabaseService.updateUserWithAdmin.mockResolvedValue(mockUpdatedUser);

      const request = new NextRequest('http://localhost/api/v1/admin/users/user-123', {
        method: 'PUT',
        body: JSON.stringify(partialUpdate)
      });

      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user.name).toBe('John Updated');
    });

    it('should return 404 for non-existent user', async () => {
      mockDatabaseService.updateUserWithAdmin.mockRejectedValue(new Error('User not found'));

      const request = new NextRequest('http://localhost/api/v1/admin/users/non-existent', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' })
      });

      const response = await PUT(request, { params: { id: 'non-existent' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('User not found');
    });

    it('should validate update data', async () => {
      const invalidData = {
        email: 'invalid-email-format'
      };

      const request = new NextRequest('http://localhost/api/v1/admin/users/user-123', {
        method: 'PUT',
        body: JSON.stringify(invalidData)
      });

      const response = await PUT(request, { params: { id: 'user-123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('validation failed');
    });
  });
});