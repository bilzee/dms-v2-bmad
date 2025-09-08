import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/v1/admin/users/route';
import DatabaseService from '@/lib/services/DatabaseService';
import { getToken } from 'next-auth/jwt';
import { PasswordService } from '@/lib/services/PasswordService';
import { EmailService } from '@/lib/services/EmailService';
import { createMockUserWithPermissions, createMockPagination } from '@/__tests__/utils/mockObjects';

jest.mock('@/lib/services/DatabaseService');
jest.mock('next-auth/jwt');
jest.mock('@/lib/services/PasswordService');
jest.mock('@/lib/services/EmailService');

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
const mockPasswordService = PasswordService as jest.Mocked<typeof PasswordService>;
const mockEmailService = EmailService as jest.Mocked<typeof EmailService>;

const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

describe('/api/v1/admin/users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockReset();
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      // Mock no token (unauthenticated)
      mockGetToken.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/v1/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('should require admin role', async () => {
      // Mock token with non-admin role
      mockGetToken.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'ASSESSOR'
      } as any);

      const request = new NextRequest('http://localhost/api/v1/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Insufficient permissions');
    });
  });

  describe('GET /api/v1/admin/users', () => {
    beforeEach(() => {
      // Mock admin token for successful requests
      mockGetToken.mockResolvedValue({
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'ADMIN'
      } as any);

      // Mock default user stats
      mockDatabaseService.getUserStats.mockResolvedValue({
        totalUsers: 10,
        activeUsers: 8,
        inactiveUsers: 2,
        recentUsers: 3
      });

      // Mock role-based user queries (for usersByRole calculation)
      mockDatabaseService.listUsers
        .mockResolvedValueOnce({ users: [], total: 2 }) // ASSESSOR
        .mockResolvedValueOnce({ users: [], total: 1 }) // RESPONDER
        .mockResolvedValueOnce({ users: [], total: 3 }) // COORDINATOR
        .mockResolvedValueOnce({ users: [], total: 1 }) // DONOR
        .mockResolvedValueOnce({ users: [], total: 0 }) // VERIFIER
        .mockResolvedValueOnce({ users: [], total: 1 }); // ADMIN
    });

    it('should return paginated users list', async () => {
      const mockUsers = {
        users: [
          createMockUserWithPermissions({
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            organization: 'Relief Org'
          })
        ],
        total: 1,
        pagination: createMockPagination()
      };

      // Clear previous mocks and set up specific call sequence
      mockDatabaseService.listUsers.mockReset();
      
      // First call: main user list
      mockDatabaseService.listUsers.mockResolvedValueOnce(mockUsers);
      
      // Next 6 calls: role-based counts
      mockDatabaseService.listUsers
        .mockResolvedValueOnce({ users: [], total: 2 }) // ASSESSOR
        .mockResolvedValueOnce({ users: [], total: 1 }) // RESPONDER
        .mockResolvedValueOnce({ users: [], total: 3 }) // COORDINATOR
        .mockResolvedValueOnce({ users: [], total: 1 }) // DONOR
        .mockResolvedValueOnce({ users: [], total: 0 }) // VERIFIER
        .mockResolvedValueOnce({ users: [], total: 1 }); // ADMIN

      const request = new NextRequest('http://localhost/api/v1/admin/users?page=1&limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockUsers);
      expect(mockDatabaseService.listUsers).toHaveBeenCalledWith({
        page: 1,
        limit: 10
      });
    });

    it('should handle search and filter parameters', async () => {
      const request = new NextRequest('http://localhost/api/v1/admin/users?search=john&role=ASSESSOR&isActive=true');
      mockDatabaseService.listUsers.mockResolvedValue({
        users: [],
        total: 0,
        pagination: createMockPagination({ total: 0, totalPages: 0 })
      });

      await GET(request);

      expect(mockDatabaseService.listUsers).toHaveBeenCalledWith({
        search: 'john',
        role: 'ASSESSOR',
        isActive: true,
        page: 1,
        limit: 10
      });
    });

    it('should handle database errors', async () => {
      mockDatabaseService.listUsers.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/v1/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch users');
    });
  });

  describe('POST /api/v1/admin/users', () => {
    beforeEach(() => {
      // Mock admin token for successful requests
      mockGetToken.mockResolvedValue({
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'ADMIN'
      } as any);

      // Mock password service
      mockPasswordService.generateTemporaryCredentials.mockReturnValue({
        password: 'temp-password-123',
        resetToken: 'reset-token-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      // Mock email service
      mockEmailService.sendWelcomeEmail.mockResolvedValue();
    });

    it('should require admin authentication for user creation', async () => {
      // Mock no token
      mockGetToken.mockResolvedValue(null);

      const userData = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        roleIds: ['role-1']
      };

      const request = new NextRequest('http://localhost/api/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify(userData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('should create a new user successfully', async () => {
      const userData = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+0987654321',
        organization: 'Emergency Response',
        roleIds: ['role-1'],
        isActive: true
      };

      const mockCreatedUser = createMockUserWithPermissions({
        id: 'user-123',
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      mockDatabaseService.createUserWithAdmin.mockResolvedValue(mockCreatedUser);

      const request = new NextRequest('http://localhost/api/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify(userData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.user).toEqual(mockCreatedUser);
      expect(mockDatabaseService.createUserWithAdmin).toHaveBeenCalledWith({
        ...userData,
        createdBy: 'system', // This would be actual admin user in real scenario
        createdByName: 'System Admin'
      });
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        name: 'John Doe'
        // Missing email and roleIds
      };

      const request = new NextRequest('http://localhost/api/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify(incompleteData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('validation failed');
    });

    it('should handle duplicate email addresses', async () => {
      const userData = {
        name: 'John Doe',
        email: 'existing@example.com',
        roleIds: ['role-1']
      };

      mockDatabaseService.createUserWithAdmin.mockRejectedValue(new Error('Email already exists'));

      const request = new NextRequest('http://localhost/api/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify(userData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Email already exists');
    });

    it('should handle invalid role IDs', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        roleIds: ['invalid-role-id']
      };

      mockDatabaseService.createUserWithAdmin.mockRejectedValue(new Error('Invalid role ID'));

      const request = new NextRequest('http://localhost/api/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify(userData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Invalid role ID');
    });
  });
});