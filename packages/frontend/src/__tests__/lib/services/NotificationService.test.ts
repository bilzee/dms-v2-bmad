import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import NotificationService from '@/lib/services/NotificationService';

// Mock DatabaseService
jest.mock('../DatabaseService', () => ({
  __esModule: true,
  default: {
    prisma: {
      notification: {
        create: jest.fn()
      }
    }
  }
}));

import DatabaseService from '@/lib/services/DatabaseService';

const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;
const mockNotificationCreate = mockDatabaseService.prisma.notification.create as jest.MockedFunction<typeof DatabaseService.prisma.notification.create>;

// Mock data
const mockUser = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  requirePasswordReset: false,
  lastSync: null
};

const mockAdmin = {
  id: 'admin-1',
  name: 'Admin User',
  requirePasswordReset: false,
  lastSync: null
};

const mockRoles = [
  {
    id: 'role-1',
    name: 'RESPONDER',
    description: 'Emergency response role',
    permissions: [],
    userCount: 10,
    isActive: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  },
  {
    id: 'role-2', 
    name: 'COORDINATOR',
    description: 'Coordination role',
    permissions: [],
    userCount: 5,
    isActive: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  }
];

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful database operations
    mockNotificationCreate.mockResolvedValue({
      id: 'notification-1',
      status: 'PENDING'
    });
  });

  describe('createRoleChangeNotification', () => {
    it('creates role assignment notification correctly', async () => {
      const notification = await NotificationService.createRoleChangeNotification(
        'ROLE_ASSIGNED',
        mockUser as any,
        mockAdmin,
        mockRoles as any[],
        'Promotion to coordinator'
      );

      expect(notification).toEqual({
        type: 'ROLE_ASSIGNED',
        userId: 'user-1',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        adminId: 'admin-1',
        adminName: 'Admin User',
        roles: mockRoles,
        reason: 'Promotion to coordinator',
        timestamp: expect.any(Date)
      });
    });

    it('creates role removal notification correctly', async () => {
      const notification = await NotificationService.createRoleChangeNotification(
        'ROLE_REMOVED',
        mockUser as any,
        mockAdmin,
        [mockRoles[0]] as any[],
        'Role no longer needed'
      );

      expect(notification.type).toBe('ROLE_REMOVED');
      expect(notification.roles).toHaveLength(1);
      expect(notification.reason).toBe('Role no longer needed');
    });
  });

  describe('sendRoleAssignmentNotification', () => {
    it('sends notification for assigned roles', async () => {
      await NotificationService.sendRoleAssignmentNotification(
        mockUser as any,
        [mockRoles[1]] as any[], // Assigned roles
        [], // Removed roles
        mockAdmin,
        'Promotion'
      );

      expect(mockDatabaseService.prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'ROLE_ASSIGNED',
          title: 'New Role(s) Assigned: COORDINATOR',
          message: 'You have been assigned the following role(s): COORDINATOR by Admin User',
          targetRoles: ['USER'],
          entityId: 'user-1',
          priority: 'MEDIUM',
          metadata: expect.objectContaining({
            adminId: 'admin-1',
            adminName: 'Admin User',
            roles: [{ id: 'role-2', name: 'COORDINATOR' }],
            reason: 'Promotion',
            type: 'ROLE_ASSIGNED'
          }),
          status: 'PENDING'
        })
      });
    });

    it('sends notification for removed roles', async () => {
      await NotificationService.sendRoleAssignmentNotification(
        mockUser as any,
        [], // Assigned roles
        [mockRoles[0]] as any[], // Removed roles
        mockAdmin,
        'Role cleanup'
      );

      expect(mockDatabaseService.prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'ROLE_REMOVED',
          title: 'Role(s) Removed: RESPONDER',
          message: 'The following role(s) have been removed from your account: RESPONDER by Admin User',
          priority: 'HIGH'
        })
      });
    });

    it('handles both assigned and removed roles', async () => {
      await NotificationService.sendRoleAssignmentNotification(
        mockUser as any,
        [mockRoles[1]] as any[], // Assigned COORDINATOR
        [mockRoles[0]] as any[], // Removed RESPONDER
        mockAdmin,
        'Role change'
      );

      expect(mockDatabaseService.prisma.notification.create).toHaveBeenCalledTimes(2);
    });

    it('does not fail when database operation fails', async () => {
      mockNotificationCreate.mockRejectedValue(
        new Error('Database error')
      );

      // Should not throw error
      await expect(NotificationService.sendRoleAssignmentNotification(
        mockUser as any,
        [mockRoles[0]] as any[],
        [],
        mockAdmin,
        'Test'
      )).resolves.toBeUndefined();
    });
  });

  describe('sendBulkAssignmentNotification', () => {
    const mockUsers = [
      { ...mockUser, id: 'user-1', name: 'John Doe' },
      { ...mockUser, id: 'user-2', name: 'Jane Smith' }
    ];

    it('sends notifications to all users', async () => {
      await NotificationService.sendBulkAssignmentNotification(
        mockUsers as any[],
        [mockRoles[0]] as any[],
        mockAdmin,
        'Bulk role assignment'
      );

      // Should create notification for each user + admin summary
      expect(mockDatabaseService.prisma.notification.create).toHaveBeenCalledTimes(3);
    });

    it('creates admin summary notification', async () => {
      await NotificationService.sendBulkAssignmentNotification(
        mockUsers as any[],
        mockRoles as any[],
        mockAdmin,
        'Bulk assignment'
      );

      // Check admin summary notification
      const adminSummaryCall = mockNotificationCreate.mock.calls
        .find(call => call[0].data.targetRoles.includes('ADMIN'));

      expect(adminSummaryCall[0].data).toEqual(
        expect.objectContaining({
          type: 'BULK_ASSIGNMENT',
          title: 'Bulk Role Assignment Completed',
          message: 'Successfully assigned 2 role(s) to 2 user(s)',
          targetRoles: ['ADMIN'],
          entityId: 'admin-1',
          priority: 'MEDIUM',
          metadata: expect.objectContaining({
            userCount: 2,
            roleCount: 2,
            roles: ['RESPONDER', 'COORDINATOR'],
            reason: 'Bulk assignment',
            completedBy: 'Admin User'
          })
        })
      );
    });
  });

  describe('getEmailTemplate', () => {
    const notification = {
      type: 'ROLE_ASSIGNED' as const,
      userId: 'user-1',
      userName: 'John Doe',
      userEmail: 'john@example.com',
      adminId: 'admin-1',
      adminName: 'Admin User',
      roles: [mockRoles[0]],
      reason: 'Promotion',
      timestamp: new Date()
    };

    it('generates correct template for role assignment', () => {
      const template = (NotificationService as any).getEmailTemplate(notification);

      expect(template.subject).toBe('New Role(s) Assigned: RESPONDER');
      expect(template.body).toContain('John Doe');
      expect(template.body).toContain('RESPONDER');
      expect(template.body).toContain('Admin User');
      expect(template.body).toContain('Promotion');
      expect(template.priority).toBe('MEDIUM');
    });

    it('generates correct template for role removal', () => {
      const removalNotification = { ...notification, type: 'ROLE_REMOVED' as const };
      const template = (NotificationService as any).getEmailTemplate(removalNotification);

      expect(template.subject).toBe('Role(s) Removed: RESPONDER');
      expect(template.body).toContain('removed from your account');
      expect(template.priority).toBe('HIGH');
    });

    it('generates correct template for bulk assignment', () => {
      const bulkNotification = { ...notification, type: 'BULK_ASSIGNMENT' as const };
      const template = (NotificationService as any).getEmailTemplate(bulkNotification);

      expect(template.subject).toBe('Role Assignment Update: RESPONDER');
      expect(template.body).toContain('bulk operation');
      expect(template.priority).toBe('MEDIUM');
    });
  });

  describe('getNotificationPriority', () => {
    it('returns correct priority for different notification types', () => {
      expect((NotificationService as any).getNotificationPriority('ROLE_ASSIGNED')).toBe('MEDIUM');
      expect((NotificationService as any).getNotificationPriority('ROLE_REMOVED')).toBe('HIGH');
      expect((NotificationService as any).getNotificationPriority('ROLE_ACTIVATED')).toBe('LOW');
      expect((NotificationService as any).getNotificationPriority('BULK_ASSIGNMENT')).toBe('MEDIUM');
    });
  });

  describe('getNotificationTitle', () => {
    const notification = {
      type: 'ROLE_ASSIGNED' as const,
      roles: [{ name: 'COORDINATOR' }, { name: 'RESPONDER' }]
    };

    it('generates correct titles for different notification types', () => {
      expect((NotificationService as any).getNotificationTitle({ 
        ...notification, 
        type: 'ROLE_ASSIGNED' 
      })).toBe('New Role(s) Assigned: COORDINATOR, RESPONDER');

      expect((NotificationService as any).getNotificationTitle({ 
        ...notification, 
        type: 'ROLE_REMOVED' 
      })).toBe('Role(s) Removed: COORDINATOR, RESPONDER');

      expect((NotificationService as any).getNotificationTitle({ 
        ...notification, 
        type: 'ROLE_ACTIVATED' 
      })).toBe('Active Role Changed: COORDINATOR, RESPONDER');
    });
  });
});