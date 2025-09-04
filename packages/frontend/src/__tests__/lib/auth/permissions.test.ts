import { 
  hasPermission, 
  canAccessEntity, 
  getAccessibleRoles, 
  validateCrossRoleAccess,
  ROLE_PERMISSIONS 
} from '@/lib/auth/permissions';

const mockUserRoles = [
  { id: 'role-1', name: 'ASSESSOR' as const, permissions: [], isActive: true },
  { id: 'role-2', name: 'COORDINATOR' as const, permissions: [], isActive: true }
];

const mockAdminRole = [
  { id: 'admin-role', name: 'ADMIN' as const, permissions: [], isActive: true }
];

describe('Permission System', () => {
  describe('hasPermission', () => {
    it('should grant admin all permissions', () => {
      expect(hasPermission(mockAdminRole, 'any-resource', 'any-action')).toBe(true);
    });

    it('should check ASSESSOR permissions correctly', () => {
      const assessorRole = [{ id: 'role-1', name: 'ASSESSOR' as const, permissions: [], isActive: true }];
      
      expect(hasPermission(assessorRole, 'assessments', 'create')).toBe(true);
      expect(hasPermission(assessorRole, 'assessments', 'read')).toBe(true);
      expect(hasPermission(assessorRole, 'assessments', 'delete')).toBe(false);
      expect(hasPermission(assessorRole, 'users', 'create')).toBe(false);
    });

    it('should check COORDINATOR permissions correctly', () => {
      const coordinatorRole = [{ id: 'role-2', name: 'COORDINATOR' as const, permissions: [], isActive: true }];
      
      expect(hasPermission(coordinatorRole, 'assessments', 'verify')).toBe(true);
      expect(hasPermission(coordinatorRole, 'incidents', 'create')).toBe(true);
      expect(hasPermission(coordinatorRole, 'users', 'delete')).toBe(false);
    });

    it('should check multi-role permissions', () => {
      expect(hasPermission(mockUserRoles, 'assessments', 'create')).toBe(true); // ASSESSOR can
      expect(hasPermission(mockUserRoles, 'incidents', 'create')).toBe(true); // COORDINATOR can
      expect(hasPermission(mockUserRoles, 'users', 'delete')).toBe(false); // Neither can
    });
  });

  describe('canAccessEntity', () => {
    it('should allow access to entities based on role', () => {
      expect(canAccessEntity(mockUserRoles, 'assessment')).toBe(true);
      expect(canAccessEntity(mockUserRoles, 'incident')).toBe(true);
      expect(canAccessEntity(mockUserRoles, 'user')).toBe(true); // COORDINATOR has users: ['read']
    });

    it('should allow admin to access all entities', () => {
      expect(canAccessEntity(mockAdminRole, 'user')).toBe(true);
      expect(canAccessEntity(mockAdminRole, 'assessment')).toBe(true);
    });
  });

  describe('getAccessibleRoles', () => {
    it('should return roles that can access resource', () => {
      const accessibleRoles = getAccessibleRoles(mockUserRoles, 'assessments');
      expect(accessibleRoles).toContain('ASSESSOR');
      expect(accessibleRoles).toContain('COORDINATOR');
    });

    it('should return empty array for inaccessible resource', () => {
      const assessorOnly = [{ id: 'role-1', name: 'ASSESSOR' as const, permissions: [], isActive: true }];
      const accessibleRoles = getAccessibleRoles(assessorOnly, 'users');
      expect(accessibleRoles).toEqual([]);
    });
  });

  describe('validateCrossRoleAccess', () => {
    it('should allow admin cross-role access', () => {
      const result = validateCrossRoleAccess(mockAdminRole, 'entity-123', 'assessment', 'read');
      expect(result.allowed).toBe(true);
    });

    it('should validate basic entity access', () => {
      const assessorRole = [{ id: 'role-1', name: 'ASSESSOR' as const, permissions: [], isActive: true }];
      
      const validAccess = validateCrossRoleAccess(assessorRole, 'entity-123', 'assessments', 'read');
      expect(validAccess.allowed).toBe(true);

      const invalidAccess = validateCrossRoleAccess(assessorRole, 'entity-123', 'users', 'read');
      expect(invalidAccess.allowed).toBe(false);
      expect(invalidAccess.reason).toContain('No access to users entities');
    });

    it('should validate action permissions', () => {
      const assessorRole = [{ id: 'role-1', name: 'ASSESSOR' as const, permissions: [], isActive: true }];
      
      const invalidAction = validateCrossRoleAccess(assessorRole, 'entity-123', 'assessments', 'delete');
      expect(invalidAction.allowed).toBe(false);
      expect(invalidAction.reason).toContain('No permission to delete');
    });
  });

  describe('ROLE_PERMISSIONS', () => {
    it('should have permissions defined for all roles', () => {
      expect(ROLE_PERMISSIONS.ASSESSOR).toBeDefined();
      expect(ROLE_PERMISSIONS.RESPONDER).toBeDefined();
      expect(ROLE_PERMISSIONS.COORDINATOR).toBeDefined();
      expect(ROLE_PERMISSIONS.DONOR).toBeDefined();
      expect(ROLE_PERMISSIONS.ADMIN).toBeDefined();
    });

    it('should grant admin universal access', () => {
      expect(ROLE_PERMISSIONS.ADMIN['*']).toContain('*');
    });
  });
});