// TypeScript-compliant mock objects for tests
// This ensures all mock objects match the actual Prisma interfaces

export const createMockUser = (overrides: Partial<any> = {}) => ({
  id: 'mock-user-1',
  name: 'Mock User',
  email: 'mock@example.com',
  phone: null,
  organization: 'Mock Organization',
  isActive: true,
  requirePasswordReset: false,
  lastSync: null,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  emailVerified: null,
  image: null,
  resetToken: null,
  resetTokenExpiry: null,
  activeRoleId: 'mock-role-1',
  roles: [createMockRole()],
  activeRole: createMockRole(),
  ...overrides
});

export const createMockRole = (overrides: Partial<any> = {}) => ({
  id: 'mock-role-1',
  name: 'ASSESSOR' as const,
  isActive: true,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  permissions: [],
  ...overrides
});

export const createMockRoleWithPermissions = (overrides: Partial<any> = {}) => ({
  ...createMockRole(overrides),
  permissions: [
    {
      permission: {
        id: 'mock-permission-1',
        name: 'READ_ASSESSMENTS',
        isActive: true,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
        description: 'Read assessment data',
        resource: 'assessments',
        action: 'read'
      }
    }
  ]
});

export const createMockUserWithPermissions = (overrides: Partial<any> = {}) => {
  const roleWithPermissions = createMockRoleWithPermissions();
  return createMockUser({
    roles: [roleWithPermissions],
    activeRole: roleWithPermissions,
    ...overrides
  });
};

export const createMockAdminUser = (overrides: Partial<any> = {}) => ({
  ...createMockUser(),
  activeRole: createMockRole(),
  accountStatus: 'ACTIVE',
  permissions: [
    {
      id: 'mock-permission-1',
      name: 'READ_ASSESSMENTS',
      resource: 'assessments',
      action: 'read',
      isActive: true
    }
  ],
  ...overrides
});

export const createMockAdminRole = (overrides: Partial<any> = {}) => ({
  ...createMockRole(),
  permissions: [
    {
      id: 'mock-permission-1',
      name: 'READ_ASSESSMENTS',
      description: 'Read assessment data',
      resource: 'assessments',
      action: 'read',
      isActive: true
    }
  ],
  userCount: 5,
  description: 'Mock admin role',
  ...overrides
});

export const createMockPagination = (overrides: Partial<any> = {}) => ({
  limit: 10,
  offset: 0,
  totalPages: 1,
  total: 1,
  ...overrides
});

export const createMockRapidResponse = (overrides: Partial<any> = {}) => ({
  id: 'mock-response-1',
  responseType: 'IMMEDIATE',
  status: 'PENDING',
  priority: 'HIGH',
  resourceType: 'SUPPLIES',
  quantity: 100,
  estimatedArrival: new Date('2023-01-02'),
  deliveryLocation: {
    coordinates: [0, 0],
    address: 'Mock Location'
  },
  deliveryEvidence: [],
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  assessmentId: 'mock-assessment-1',
  assignedTeamId: 'mock-team-1',
  completedAt: null,
  ...overrides
});

export const createMockAssessment = (overrides: Partial<any> = {}) => ({
  id: 'mock-assessment-1',
  type: 'RAPID',
  status: 'DRAFT',
  priority: 'HIGH',
  location: {
    coordinates: [0, 0],
    address: 'Mock Location'
  },
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  assessorId: 'mock-user-1',
  data: {},
  ...overrides
});

export const createMockFilters = (overrides: Partial<any> = {}) => ({
  search: '',
  status: '',
  priority: '',
  type: '',
  page: 1,
  limit: 10,
  ...overrides
});