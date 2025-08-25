import { User } from '@dms/shared';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

// Mock auth hook for Story 3.2
// TODO: Replace with actual authentication implementation
export const useAuth = (): AuthState => {
  // For development/testing, return a mock coordinator user
  const mockUser: User = {
    id: 'coord-123',
    email: 'coordinator@example.com',
    name: 'Mock Coordinator',
    phone: '+1234567890',
    organization: 'Test Organization',
    roles: [{
      id: 'coord-role',
      name: 'COORDINATOR',
      permissions: [],
      isActive: true,
    }],
    activeRole: {
      id: 'coord-role',
      name: 'COORDINATOR',
      permissions: [],
      isActive: true,
    },
    permissions: [],
    lastSync: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    user: mockUser,
    isLoading: false,
    error: null,
  };
};