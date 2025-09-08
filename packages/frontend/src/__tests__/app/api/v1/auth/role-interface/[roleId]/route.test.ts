import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/v1/auth/role-interface/[roleId]/route';
import { createMockUserWithPermissions } from '@/__tests__/utils/mockObjects';

// Mock next-auth
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

import { auth } from '@/auth';
import type { Session } from 'next-auth';
const mockAuth = auth as jest.MockedFunction<any>;

describe('/api/v1/auth/role-interface/[roleId]', () => {
  const mockSession = {
    user: createMockUserWithPermissions({
      id: 'user123',
      email: 'test@example.com'
    }),
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/auth/role-interface/[roleId]', () => {
    it('should return role interface configuration for authorized user', async () => {
      mockAuth.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/v1/auth/role-interface/ASSESSOR_001');
      const response = await GET(request, { params: { roleId: 'ASSESSOR_001' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.roleId).toBe('ASSESSOR_001');
      expect(data.roleName).toBe('ASSESSOR');
      expect(data.navigation.primaryMenuItems).toContain('Assessment Types');
      expect(data.dashboard.layout).toBe('three-column');
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/v1/auth/role-interface/ASSESSOR_001');
      const response = await GET(request, { params: { roleId: 'ASSESSOR_001' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for missing roleId', async () => {
      mockAuth.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/v1/auth/role-interface/');
      const response = await GET(request, { params: { roleId: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Role ID is required');
    });

    it('should return 403 for unauthorized role access', async () => {
      mockAuth.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/v1/auth/role-interface/DONOR_003');
      const response = await GET(request, { params: { roleId: 'DONOR_003' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied for this role');
    });

    it('should return different configurations for different roles', async () => {
      mockAuth.mockResolvedValue(mockSession);

      // Test ASSESSOR configuration
      const assessorRequest = new NextRequest('http://localhost/api/v1/auth/role-interface/ASSESSOR_001');
      const assessorResponse = await GET(assessorRequest, { params: { roleId: 'ASSESSOR_001' } });
      const assessorData = await assessorResponse.json();

      expect(assessorData.dashboard.layout).toBe('three-column');
      expect(assessorData.navigation.primaryMenuItems).toContain('Assessment Types');

      // Test COORDINATOR configuration
      const coordinatorRequest = new NextRequest('http://localhost/api/v1/auth/role-interface/COORDINATOR_002');
      const coordinatorResponse = await GET(coordinatorRequest, { params: { roleId: 'COORDINATOR_002' } });
      const coordinatorData = await coordinatorResponse.json();

      expect(coordinatorData.dashboard.layout).toBe('grid');
      expect(coordinatorData.navigation.primaryMenuItems).toContain('Verification Dashboard');
    });
  });

  describe('PUT /api/v1/auth/role-interface/[roleId]', () => {
    const validInterfaceUpdate = {
      navigation: {
        primaryMenuItems: ['Custom Section'],
        quickActions: [],
        hiddenSections: ['old-section'],
      },
      dashboard: {
        layout: 'two-column',
        widgets: [],
        refreshInterval: 20000,
        hiddenWidgets: ['unused-widget'],
      },
      forms: {
        conditionalFields: {},
        defaultValues: { 'custom.field': 'value' },
        validationRules: {},
        fieldVisibility: { 'advanced.options': false },
      },
    };

    it('should update role interface configuration for authorized user', async () => {
      mockAuth.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/v1/auth/role-interface/ASSESSOR_001', {
        method: 'PUT',
        body: JSON.stringify(validInterfaceUpdate),
      });

      const response = await PUT(request, { params: { roleId: 'ASSESSOR_001' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.roleId).toBe('ASSESSOR_001');
      expect(data.message).toBe('Role interface updated successfully');
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/v1/auth/role-interface/ASSESSOR_001', {
        method: 'PUT',
        body: JSON.stringify(validInterfaceUpdate),
      });

      const response = await PUT(request, { params: { roleId: 'ASSESSOR_001' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 for unauthorized role access', async () => {
      mockAuth.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/v1/auth/role-interface/ADMIN_999', {
        method: 'PUT',
        body: JSON.stringify(validInterfaceUpdate),
      });

      const response = await PUT(request, { params: { roleId: 'ADMIN_999' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied for this role');
    });

    it('should return 400 for invalid interface configuration', async () => {
      mockAuth.mockResolvedValue(mockSession);

      const invalidUpdate = {
        navigation: { primaryMenuItems: [] },
        // Missing required dashboard and forms fields
      };

      const request = new NextRequest('http://localhost/api/v1/auth/role-interface/ASSESSOR_001', {
        method: 'PUT',
        body: JSON.stringify(invalidUpdate),
      });

      const response = await PUT(request, { params: { roleId: 'ASSESSOR_001' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should validate required fields correctly', async () => {
      mockAuth.mockResolvedValue(mockSession);

      const partialUpdate = {
        navigation: { primaryMenuItems: [] },
        dashboard: { layout: 'grid', widgets: [] },
        // Missing forms field
      };

      const request = new NextRequest('http://localhost/api/v1/auth/role-interface/ASSESSOR_001', {
        method: 'PUT',
        body: JSON.stringify(partialUpdate),
      });

      const response = await PUT(request, { params: { roleId: 'ASSESSOR_001' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields: forms');
    });
  });

  describe('Default Role Configurations', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockSession);
    });

    it('should provide correct default configuration for ASSESSOR', async () => {
      const request = new NextRequest('http://localhost/api/v1/auth/role-interface/ASSESSOR_001');
      const response = await GET(request, { params: { roleId: 'ASSESSOR_001' } });
      const data = await response.json();

      expect(data.roleName).toBe('ASSESSOR');
      expect(data.navigation.quickActions).toHaveLength(2);
      expect(data.dashboard.widgets).toHaveLength(3);
      expect(data.forms.fieldOrder.assessment).toContain('type');
      expect(data.forms.requiredFields.assessment).toContain('type');
    });

    it('should provide correct default configuration for COORDINATOR', async () => {
      const request = new NextRequest('http://localhost/api/v1/auth/role-interface/COORDINATOR_002');
      const response = await GET(request, { params: { roleId: 'COORDINATOR_002' } });
      const data = await response.json();

      expect(data.roleName).toBe('COORDINATOR');
      expect(data.dashboard.layout).toBe('grid');
      expect(data.dashboard.widgets).toHaveLength(4);
      expect(data.navigation.quickActions).toHaveLength(2);
      expect(data.forms.fieldOrder.verification).toBeDefined();
    });

    it('should provide correct default configuration for RESPONDER', async () => {
      const mockResponderSession = {
        ...mockSession,
        user: {
          ...mockSession.user,
          roles: [{ id: 'RESPONDER_001', name: 'RESPONDER' }],
        },
      };
      mockAuth.mockResolvedValue(mockResponderSession);

      const request = new NextRequest('http://localhost/api/v1/auth/role-interface/RESPONDER_001');
      const response = await GET(request, { params: { roleId: 'RESPONDER_001' } });
      const data = await response.json();

      expect(data.roleName).toBe('RESPONDER');
      expect(data.dashboard.layout).toBe('three-column');
      expect(data.dashboard.widgets).toHaveLength(3);
      expect(data.forms.fieldOrder.response).toContain('type');
    });

    it('should provide correct default configuration for DONOR', async () => {
      const mockDonorSession = {
        ...mockSession,
        user: {
          ...mockSession.user,
          roles: [{ id: 'DONOR_001', name: 'DONOR' }],
        },
      };
      mockAuth.mockResolvedValue(mockDonorSession);

      const request = new NextRequest('http://localhost/api/v1/auth/role-interface/DONOR_001');
      const response = await GET(request, { params: { roleId: 'DONOR_001' } });
      const data = await response.json();

      expect(data.roleName).toBe('DONOR');
      expect(data.dashboard.layout).toBe('three-column');
      expect(data.dashboard.widgets).toHaveLength(3);
      expect(data.forms.fieldOrder.commitment).toContain('type');
    });

    it('should provide correct default configuration for ADMIN', async () => {
      const mockAdminSession = {
        ...mockSession,
        user: {
          ...mockSession.user,
          roles: [{ id: 'ADMIN_001', name: 'ADMIN' }],
        },
      };
      mockAuth.mockResolvedValue(mockAdminSession);

      const request = new NextRequest('http://localhost/api/v1/auth/role-interface/ADMIN_001');
      const response = await GET(request, { params: { roleId: 'ADMIN_001' } });
      const data = await response.json();

      expect(data.roleName).toBe('ADMIN');
      expect(data.dashboard.layout).toBe('grid');
      expect(data.dashboard.widgets).toHaveLength(3);
      expect(data.forms.fieldOrder.user).toContain('email');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in PUT requests', async () => {
      mockAuth.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/v1/auth/role-interface/ASSESSOR_001', {
        method: 'PUT',
        body: 'invalid json',
      });

      const response = await PUT(request, { params: { roleId: 'ASSESSOR_001' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle session retrieval errors', async () => {
      mockAuth.mockRejectedValue(new Error('Session error'));

      const request = new NextRequest('http://localhost/api/v1/auth/role-interface/ASSESSOR_001');
      const response = await GET(request, { params: { roleId: 'ASSESSOR_001' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});