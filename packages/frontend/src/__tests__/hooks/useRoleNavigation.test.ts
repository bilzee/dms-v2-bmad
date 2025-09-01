import { renderHook } from '@testing-library/react';
import { useRoleNavigation } from '@/hooks/useRoleNavigation';
import { useRoleContext } from '@/components/providers/RoleContextProvider';

jest.mock('@/components/providers/RoleContextProvider');

const mockUseRoleContext = useRoleContext as jest.MockedFunction<typeof useRoleContext>;

describe('useRoleNavigation Hook', () => {
  const mockAssessorRole = {
    activeRole: { id: 'role-1', name: 'ASSESSOR', permissions: [] },
    permissions: [
      { id: 'p1', name: 'assess-create', resource: 'assessments', action: 'create' },
      { id: 'p2', name: 'assess-read', resource: 'assessments', action: 'read' }
    ],
    hasPermission: jest.fn((resource: string, action: string) => {
      return resource === 'assessments' && ['create', 'read'].includes(action);
    })
  };

  const mockCoordinatorRole = {
    activeRole: { id: 'role-2', name: 'COORDINATOR', permissions: [] },
    permissions: [
      { id: 'p3', name: 'verify-read', resource: 'verification', action: 'read' },
      { id: 'p4', name: 'incidents-manage', resource: 'incidents', action: 'manage' },
      { id: 'p5', name: 'config-manage', resource: 'config', action: 'manage' }
    ],
    hasPermission: jest.fn((resource: string, action: string) => {
      const allowedPermissions = {
        verification: ['read', 'approve'],
        incidents: ['manage'],
        config: ['manage'],
        monitoring: ['read']
      };
      return allowedPermissions[resource]?.includes(action) || false;
    })
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Role-Based Navigation Filtering', () => {
    it('should return assessor-specific navigation for ASSESSOR role', () => {
      mockUseRoleContext.mockReturnValue(mockAssessorRole as any);

      const { result } = renderHook(() => useRoleNavigation());

      expect(result.current.currentRole).toBe('ASSESSOR');
      const assessmentSection = result.current.navigationSections.find(
        section => section.title === 'Assessment Types'
      );
      expect(assessmentSection).toBeDefined();
      expect(assessmentSection?.items.length).toBeGreaterThan(0);

      const verificationSection = result.current.navigationSections.find(
        section => section.title === 'Verification Dashboard'
      );
      expect(verificationSection).toBeUndefined();
    });

    it('should return coordinator-specific navigation for COORDINATOR role', () => {
      mockUseRoleContext.mockReturnValue(mockCoordinatorRole as any);

      const { result } = renderHook(() => useRoleNavigation());

      expect(result.current.currentRole).toBe('COORDINATOR');
      const verificationSection = result.current.navigationSections.find(
        section => section.title === 'Verification Dashboard'
      );
      expect(verificationSection).toBeDefined();

      const assessmentSection = result.current.navigationSections.find(
        section => section.title === 'Assessment Types'
      );
      expect(assessmentSection).toBeUndefined();
    });

    it('should filter navigation items based on permissions', () => {
      const limitedCoordinatorRole = {
        ...mockCoordinatorRole,
        hasPermission: jest.fn((resource: string, action: string) => {
          return resource === 'verification' && action === 'read';
        })
      };
      
      mockUseRoleContext.mockReturnValue(limitedCoordinatorRole as any);

      const { result } = renderHook(() => useRoleNavigation());

      const verificationSection = result.current.navigationSections.find(
        section => section.title === 'Verification Dashboard'
      );
      expect(verificationSection).toBeDefined();

      const systemConfigSection = result.current.navigationSections.find(
        section => section.title === 'System Configuration'
      );
      expect(systemConfigSection).toBeUndefined();
    });
  });

  describe('Route Authorization', () => {
    it('should authorize routes based on role and permissions', () => {
      mockUseRoleContext.mockReturnValue(mockAssessorRole as any);

      const { result } = renderHook(() => useRoleNavigation());

      expect(result.current.isAuthorizedForRoute('/assessments/new?type=HEALTH')).toBe(true);
      expect(result.current.isAuthorizedForRoute('/verification/queue')).toBe(false);
    });

    it('should handle routes without specific permissions', () => {
      mockUseRoleContext.mockReturnValue(mockAssessorRole as any);

      const { result } = renderHook(() => useRoleNavigation());

      expect(result.current.isAuthorizedForRoute('/some/unknown/route')).toBe(true);
    });
  });

  describe('Section Access Control', () => {
    it('should correctly identify section access for different roles', () => {
      mockUseRoleContext.mockReturnValue(mockCoordinatorRole as any);

      const { result } = renderHook(() => useRoleNavigation());

      expect(result.current.hasAccessToSection('Verification Dashboard')).toBe(true);
      expect(result.current.hasAccessToSection('Assessment Types')).toBe(false);
      expect(result.current.hasAccessToSection('System Configuration')).toBe(true);
    });

    it('should handle non-existent sections gracefully', () => {
      mockUseRoleContext.mockReturnValue(mockAssessorRole as any);

      const { result } = renderHook(() => useRoleNavigation());

      expect(result.current.hasAccessToSection('Non-Existent Section')).toBe(false);
    });
  });

  describe('Dynamic Navigation Updates', () => {
    it('should update navigation when role context changes', () => {
      const { result, rerender } = renderHook(() => useRoleNavigation());

      mockUseRoleContext.mockReturnValue(mockAssessorRole as any);
      rerender();

      expect(result.current.currentRole).toBe('ASSESSOR');
      const assessorSections = result.current.navigationSections.length;

      mockUseRoleContext.mockReturnValue(mockCoordinatorRole as any);
      rerender();

      expect(result.current.currentRole).toBe('COORDINATOR');
      const coordinatorSections = result.current.navigationSections.length;

      expect(assessorSections).not.toBe(coordinatorSections);
    });

    it('should maintain consistent navigation structure per role', () => {
      mockUseRoleContext.mockReturnValue(mockAssessorRole as any);

      const { result } = renderHook(() => useRoleNavigation());
      const firstNavigation = result.current.getFilteredNavigation();

      const { result: result2 } = renderHook(() => useRoleNavigation());
      const secondNavigation = result2.current.getFilteredNavigation();

      expect(firstNavigation).toEqual(secondNavigation);
    });
  });
});