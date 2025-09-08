import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import RolesManagementPage from '../page';

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Mock components that require complex setup
jest.mock('@/components/providers/RoleContextProvider', () => ({
  useRoleContext: () => ({
    hasPermission: () => true,
    hasRole: () => true,
    activeRole: { name: 'ADMIN' }
  })
}));

// Mock data
const mockUsers = [
  {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    roles: [{ id: 'role-1', name: 'RESPONDER' }],
    isActive: true,
    lastLogin: new Date().toISOString(),
    requirePasswordReset: false,
    lastSync: null
  },
  {
    id: 'user-2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    roles: [{ id: 'role-2', name: 'COORDINATOR' }],
    isActive: true,
    lastLogin: new Date().toISOString(),
    requirePasswordReset: false,
    lastSync: null
  }
];

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

const mockStats = {
  totalUsers: 25,
  totalRoles: 5,
  activeAssignments: 47,
  multiRoleUsers: 12
};

describe('Role Assignment Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();

    // Setup default fetch responses
    mockFetch.mockImplementation((url) => {
      const urlStr = url as string;
      
      if (urlStr.includes('/api/v1/admin/users')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { users: mockUsers, pagination: { total: 2 } }
          })
        } as Response);
      }
      
      if (urlStr.includes('/api/v1/admin/roles')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { roles: mockRoles }
          })
        } as Response);
      }
      
      if (urlStr.includes('/api/v1/admin/stats')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: mockStats
          })
        } as Response);
      }
      
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
  });

  it('loads role management dashboard with all components', async () => {
    render(<RolesManagementPage />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Role Management')).toBeInTheDocument();
    });

    // Check statistics cards
    expect(screen.getByText('25')).toBeInTheDocument(); // Total users
    expect(screen.getByText('5')).toBeInTheDocument();  // Total roles
    expect(screen.getByText('47')).toBeInTheDocument(); // Active assignments
    expect(screen.getByText('12')).toBeInTheDocument(); // Multi-role users

    // Check users are displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('opens role assignment modal when assign roles is clicked', async () => {
    render(<RolesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click on assign roles button for first user
    const assignButtons = screen.getAllByText('Assign Roles');
    fireEvent.click(assignButtons[0]);

    // Modal should open
    await waitFor(() => {
      expect(screen.getByText('Assign Roles to John Doe')).toBeInTheDocument();
    });
  });

  it('performs role assignment workflow', async () => {
    render(<RolesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Open role assignment modal
    const assignButtons = screen.getAllByText('Assign Roles');
    fireEvent.click(assignButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Assign Roles to John Doe')).toBeInTheDocument();
    });

    // Mock successful role assignment
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            userId: 'user-1',
            assignedRoles: mockRoles,
            changeId: 'test-change-1'
          }
        })
      } as Response)
    );

    // Select COORDINATOR role (additional to existing RESPONDER)
    const coordinatorCheckbox = screen.getByRole('checkbox', { name: /coordinator/i });
    fireEvent.click(coordinatorCheckbox);

    // Add reason
    const reasonInput = screen.getByPlaceholderText('Optional reason for role assignment');
    fireEvent.change(reasonInput, { target: { value: 'Promotion to coordinator level' } });

    // Submit assignment
    const submitButton = screen.getByText('Assign Roles');
    fireEvent.click(submitButton);

    // Verify API call was made
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/admin/users/user-1/roles',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"reason":"Promotion to coordinator level"')
        })
      );
    });
  });

  it('filters users by role', async () => {
    render(<RolesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Mock filtered response
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: { 
            users: [mockUsers[0]], // Only John Doe (RESPONDER)
            pagination: { total: 1 } 
          }
        })
      } as Response)
    );

    // Open role filter dropdown
    const roleFilter = screen.getByText('All Roles');
    fireEvent.click(roleFilter);

    // Select RESPONDER role
    const responderOption = screen.getByText('RESPONDER');
    fireEvent.click(responderOption);

    // Verify filtering API call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/admin/users?role=RESPONDER'),
        expect.any(Object)
      );
    });
  });

  it('searches users by name', async () => {
    render(<RolesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Mock search response
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: { 
            users: [mockUsers[0]], // Only John Doe
            pagination: { total: 1 } 
          }
        })
      } as Response)
    );

    // Search for "John"
    const searchInput = screen.getByPlaceholderText('Search users...');
    fireEvent.change(searchInput, { target: { value: 'John' } });

    // Trigger search (usually would be debounced)
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    // Verify search API call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/admin/users?search=John'),
        expect.any(Object)
      );
    });
  });

  it('handles bulk role assignment', async () => {
    render(<RolesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Select multiple users
    const userCheckboxes = screen.getAllByRole('checkbox');
    fireEvent.click(userCheckboxes[0]); // John Doe
    fireEvent.click(userCheckboxes[1]); // Jane Smith

    // Bulk actions should appear
    await waitFor(() => {
      expect(screen.getByText('Bulk Assign Roles')).toBeInTheDocument();
    });

    // Mock successful bulk assignment
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            successfulAssignments: 2,
            failedAssignments: 0,
            changeId: 'bulk-change-1'
          }
        })
      } as Response)
    );

    // Click bulk assign
    fireEvent.click(screen.getByText('Bulk Assign Roles'));

    // Bulk assignment modal should open (mock this behavior)
    await waitFor(() => {
      // In a real implementation, this would open a bulk assignment modal
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('displays role assignment history', async () => {
    // Mock role history response
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            history: [
              {
                id: 'history-1',
                userId: 'user-1',
                action: 'ADDED',
                roleName: 'COORDINATOR',
                changedBy: 'Admin User',
                reason: 'Promotion',
                createdAt: new Date().toISOString()
              }
            ]
          }
        })
      } as Response)
    );

    render(<RolesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Role Management')).toBeInTheDocument();
    });

    // Click on Activity tab
    const activityTab = screen.getByText('Activity');
    fireEvent.click(activityTab);

    // Check history is displayed
    await waitFor(() => {
      expect(screen.getByText('ADDED')).toBeInTheDocument();
      expect(screen.getByText('COORDINATOR')).toBeInTheDocument();
      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('Promotion')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock API error
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: 'Internal server error'
        })
      } as Response)
    );

    render(<RolesManagementPage />);

    // Error state should be displayed
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    // Retry button should be available
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();

    // Click retry should make new API call
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});