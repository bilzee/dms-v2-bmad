import { POST } from '@/app/api/v1/auth/switch-role/route';
import { auth } from '@/auth';
import { NextRequest } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';

jest.mock('@/lib/services/DatabaseService', () => ({
  default: {
    getUserWithRoles: jest.fn(),
    switchUserRole: jest.fn(),
  },
}));

jest.mock('@/lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  userRolePreferences: {
    upsert: jest.fn(),
  },
  roleAuditLog: {
    create: jest.fn(),
  },
}));

import type { Session } from 'next-auth';
const mockAuth = auth as jest.MockedFunction<any>;
const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  userRolePreferences: {
    upsert: jest.fn(),
  },
  roleAuditLog: {
    create: jest.fn(),
  },
};

jest.doMock('@/lib/prisma', () => mockPrisma);

describe('/api/v1/auth/switch-role', () => {
  const mockUser = {
    id: 'user-1',
    activeRoleId: 'role-1',
    requirePasswordReset: false,
    lastSync: null,
    roles: [
      { id: 'role-1', name: 'ASSESSOR', permissions: [{ id: 'p1', name: 'assess', resource: 'assessments', action: 'create' }] },
      { id: 'role-2', name: 'COORDINATOR', permissions: [{ id: 'p2', name: 'coordinate', resource: 'incidents', action: 'manage' }] }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Role Switching', () => {
    it('should switch role successfully with performance tracking', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as any);
      mockDatabaseService.getUserWithRoles.mockResolvedValue(mockUser as any);
      mockDatabaseService.switchUserRole.mockResolvedValue({
        ...mockUser,
        activeRoleId: 'role-2',
        roles: mockUser.roles
      } as any);
      mockPrisma.roleAuditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/v1/auth/switch-role', {
        method: 'POST',
        body: JSON.stringify({
          targetRoleId: 'role-2',
          targetRoleName: 'COORDINATOR'
        })
      });

      const startTime = Date.now();
      const response = await POST(request);
      const elapsedTime = Date.now() - startTime;
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.newRole.name).toBe('COORDINATOR');
      expect(result.performanceMs).toBeDefined();
      expect(result.performanceMs).toBeLessThan(200);
      expect(elapsedTime).toBeLessThan(200);
    });

    it('should save preferences during role switch', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as any);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        activeRoleId: 'role-2'
      } as any);
      mockPrisma.userRolePreferences.upsert.mockResolvedValue({} as any);
      mockPrisma.roleAuditLog.create.mockResolvedValue({} as any);

      const preferences = { theme: 'dark', dashboardLayout: 'grid' };
      const request = new NextRequest('http://localhost/api/v1/auth/switch-role', {
        method: 'POST',
        body: JSON.stringify({
          targetRoleId: 'role-2',
          targetRoleName: 'COORDINATOR',
          currentContext: { preferences }
        })
      });

      const response = await POST(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(mockPrisma.userRolePreferences.upsert).toHaveBeenCalledWith({
        where: {
          userId_roleId: {
            userId: 'user-1',
            roleId: 'role-1'
          }
        },
        update: {
          preferences,
          updatedAt: expect.any(Date)
        },
        create: {
          userId: 'user-1',
          roleId: 'role-1',
          preferences
        }
      });
    });

    it('should create audit log for successful role switch', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-1' } } as any);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        activeRoleId: 'role-2'
      } as any);
      mockPrisma.roleAuditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/v1/auth/switch-role', {
        method: 'POST',
        body: JSON.stringify({
          targetRoleId: 'role-2',
          targetRoleName: 'COORDINATOR'
        }),
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0'
        }
      });

      await POST(request);

      expect(mockPrisma.roleAuditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          fromRoleId: 'role-1',
          toRoleId: 'role-2',
          timestamp: expect.any(Date),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          success: true
        }
      });
    });
  });

  describe('Error Handling and Rollback', () => {
    it('should return 401 for unauthorized access', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/v1/auth/switch-role', {
        method: 'POST',
        body: JSON.stringify({
          targetRoleId: 'role-2',
          targetRoleName: 'COORDINATOR'
        })
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });

    it('should return 403 for unauthorized role access', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost/api/v1/auth/switch-role', {
        method: 'POST',
        body: JSON.stringify({
          targetRoleId: 'role-3',
          targetRoleName: 'ADMIN'
        })
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(403);
      expect(result.success).toBe(false);
      expect(result.error).toBe('User does not have access to this role');
    });

    it('should rollback on database error and create audit log', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce(mockUser);
      mockPrisma.roleAuditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/v1/auth/switch-role', {
        method: 'POST',
        body: JSON.stringify({
          targetRoleId: 'role-2',
          targetRoleName: 'COORDINATOR'
        })
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.rollbackInfo).toBeDefined();
      expect(mockPrisma.user.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.roleAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          success: false,
          errorMessage: 'Database error'
        })
      });
    });

    it('should validate role ID and name match', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost/api/v1/auth/switch-role', {
        method: 'POST',
        body: JSON.stringify({
          targetRoleId: 'role-2',
          targetRoleName: 'ADMIN'
        })
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Role ID and name mismatch');
    });
  });

  describe('Performance Requirements', () => {
    it('should track and return performance metrics under 200ms', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        activeRoleId: 'role-2'
      });
      mockPrisma.roleAuditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/v1/auth/switch-role', {
        method: 'POST',
        body: JSON.stringify({
          targetRoleId: 'role-2',
          targetRoleName: 'COORDINATOR'
        })
      });

      const response = await POST(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.performanceMs).toBeDefined();
      expect(typeof result.performanceMs).toBe('number');
      expect(result.performanceMs).toBeGreaterThan(0);
    });
  });
});