import { NextRequest } from 'next/server';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { POST, PUT, DELETE } from '../route';

// Mock dependencies
jest.mock('@/lib/services/DatabaseService');
jest.mock('@/lib/services/NotificationService');
jest.mock('@/lib/auth-middleware');

import DatabaseService from '@/lib/services/DatabaseService';
import NotificationService from '@/lib/services/NotificationService';
import { requireAdminRole, getCurrentUser } from '@/lib/auth-middleware';

const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;
const mockNotificationService = NotificationService as jest.Mocked<typeof NotificationService>;
const mockRequireAdminRole = requireAdminRole as jest.MockedFunction<typeof requireAdminRole>;
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;

// Mock data
const mockUser = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  roles: [
    { id: 'role-1', name: 'RESPONDER' }
  ]
};

const mockRoles = [
  {
    id: 'role-1',
    name: 'RESPONDER',
    description: 'Emergency response role',
    permissions: [
      { permission: { id: 'perm-1', name: 'VIEW_INCIDENTS', description: 'View incidents', resource: 'INCIDENT', action: 'READ', isActive: true } }
    ],
    _count: { users: 10 },
    isActive: true
  },
  {
    id: 'role-2',
    name: 'COORDINATOR',
    description: 'Coordination role',
    permissions: [
      { permission: { id: 'perm-2', name: 'MANAGE_RESOURCES', description: 'Manage resources', resource: 'RESOURCE', action: 'WRITE', isActive: true } }
    ],
    _count: { users: 5 },
    isActive: true
  }
];

const mockUpdatedUser = {
  ...mockUser,
  roles: mockRoles,
  activeRole: mockRoles[0]
};

describe('Role Assignment API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful authentication
    mockRequireAdminRole.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      id: 'admin-1',
      name: 'Admin User',
      email: 'admin@example.com'
    });
    
    // Mock database service
    mockDatabaseService.assignUserRoles.mockResolvedValue(mockUpdatedUser);
    mockDatabaseService.getAllRoles.mockResolvedValue(mockRoles);
    mockDatabaseService.listUsers.mockResolvedValue({ users: [mockUser] });
  });

  describe('POST /api/v1/admin/users/[id]/roles', () => {
    const createRequest = (body: any) => {
      return new NextRequest('http://localhost/api/v1/admin/users/user-1/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    };

    it('assigns roles to user successfully', async () => {
      const request = createRequest({
        roleIds: ['role-1', 'role-2'],
        reason: 'Promotion',
        notifyUser: true
      });

      const context = { params: Promise.resolve({ id: 'user-1' }) };
      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.userId).toBe('user-1');
      expect(data.data.assignedRoles).toHaveLength(2);
      
      expect(mockDatabaseService.assignUserRoles).toHaveBeenCalledWith(
        'user-1',
        ['role-1', 'role-2'],
        'admin-1',
        'Admin User',
        'Promotion',
        'unknown',
        'unknown'
      );
      
      expect(mockNotificationService.sendRoleAssignmentNotification).toHaveBeenCalled();
    });

    it('validates request data', async () => {
      const request = createRequest({
        roleIds: [], // Invalid - empty array
        reason: 'Test'
      });

      const context = { params: Promise.resolve({ id: 'user-1' }) };
      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
    });

    it('requires admin role', async () => {
      mockRequireAdminRole.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
      );

      const request = createRequest({
        roleIds: ['role-1'],
        reason: 'Test'
      });

      const context = { params: Promise.resolve({ id: 'user-1' }) };
      const response = await POST(request, context);

      expect(response.status).toBe(401);
    });

    it('handles database errors', async () => {
      mockDatabaseService.assignUserRoles.mockRejectedValue(new Error('Database error'));

      const request = createRequest({
        roleIds: ['role-1'],
        reason: 'Test'
      });

      const context = { params: Promise.resolve({ id: 'user-1' }) };
      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to assign user roles');
    });

    it('handles user not found error', async () => {
      mockDatabaseService.assignUserRoles.mockRejectedValue(new Error('User not found'));

      const request = createRequest({
        roleIds: ['role-1'],
        reason: 'Test'
      });

      const context = { params: Promise.resolve({ id: 'user-1' }) };
      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });
  });

  describe('PUT /api/v1/admin/users/[id]/roles', () => {
    const createRequest = (body: any) => {
      return new NextRequest('http://localhost/api/v1/admin/users/user-1/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    };

    it('updates user roles successfully', async () => {
      const request = createRequest({
        roleIds: ['role-2'],
        reason: 'Role change',
        notifyUser: true
      });

      const context = { params: Promise.resolve({ id: 'user-1' }) };
      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.userId).toBe('user-1');
      
      expect(mockDatabaseService.listUsers).toHaveBeenCalledWith({ search: 'user-1' });
      expect(mockDatabaseService.assignUserRoles).toHaveBeenCalledWith(
        'user-1',
        ['role-2'],
        'admin-1',
        'Admin User',
        'Role change',
        'unknown',
        'unknown'
      );
    });

    it('calculates role changes correctly', async () => {
      // Mock current user with role-1
      mockDatabaseService.listUsers.mockResolvedValue({
        users: [{
          ...mockUser,
          roles: [{ id: 'role-1', name: 'RESPONDER' }]
        }]
      });

      const request = createRequest({
        roleIds: ['role-2'], // Changing from role-1 to role-2
        reason: 'Role change'
      });

      const context = { params: Promise.resolve({ id: 'user-1' }) };
      const response = await PUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.assignedRoles).toHaveLength(1); // Only role-2 (newly assigned)
      expect(data.data.removedRoles).toHaveLength(1);  // Only role-1 (removed)
    });
  });

  describe('DELETE /api/v1/admin/users/[id]/roles/:roleId', () => {
    const createRequest = (url: string) => {
      return new NextRequest(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
    };

    it('removes specific role from user', async () => {
      // Mock user with multiple roles
      mockDatabaseService.listUsers.mockResolvedValue({
        users: [{
          ...mockUser,
          roles: [
            { id: 'role-1', name: 'RESPONDER' },
            { id: 'role-2', name: 'COORDINATOR' }
          ]
        }]
      });

      mockDatabaseService.assignUserRoles.mockResolvedValue({
        ...mockUpdatedUser,
        roles: [{ id: 'role-2', name: 'COORDINATOR' }] // Only coordinator remains
      });

      const request = createRequest('http://localhost/api/v1/admin/users/user-1/roles/role-1');
      const context = { params: Promise.resolve({ id: 'user-1' }) };
      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.removedRoleId).toBe('role-1');
      expect(data.data.remainingRoles).toHaveLength(1);
      
      expect(mockDatabaseService.assignUserRoles).toHaveBeenCalledWith(
        'user-1',
        ['role-2'], // Only role-2 remains
        'admin-1',
        'Admin User',
        'Role removed via admin interface',
        'unknown',
        'unknown'
      );
    });

    it('validates role is assigned to user', async () => {
      // Mock user without the role being removed
      mockDatabaseService.listUsers.mockResolvedValue({
        users: [{
          ...mockUser,
          roles: [{ id: 'role-1', name: 'RESPONDER' }] // Only has role-1
        }]
      });

      const request = createRequest('http://localhost/api/v1/admin/users/user-1/roles/role-2');
      const context = { params: Promise.resolve({ id: 'user-1' }) };
      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Role not assigned');
    });

    it('validates role ID is provided', async () => {
      const request = createRequest('http://localhost/api/v1/admin/users/user-1/roles');
      const context = { params: Promise.resolve({ id: 'user-1' }) };
      const response = await DELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid request');
    });
  });
});