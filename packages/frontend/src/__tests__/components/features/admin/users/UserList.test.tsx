import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserList } from '@/components/features/admin/users/UserList';
import { toast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('@/hooks/use-toast');
const mockToast = toast as jest.MockedFunction<typeof toast>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

const mockUsers = [
  {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    organization: 'Relief Org',
    isActive: true,
    roles: [{ name: 'ASSESSOR' }],
    createdAt: '2023-01-01T00:00:00Z',
    lastSync: null,
    requirePasswordReset: false
  },
  {
    id: 'user-2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+0987654321',
    organization: 'Emergency Response',
    isActive: false,
    roles: [{ name: 'COORDINATOR' }],
    createdAt: '2023-01-02T00:00:00Z',
    lastSync: '2023-01-15T10:30:00Z',
    requirePasswordReset: false
  }
];

const mockResponse = {
  success: true,
  data: {
    users: mockUsers,
    pagination: {
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1
    }
  }
};

describe('UserList Component', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    } as Response);
    mockToast.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockProps = {
    users: mockUsers,
    loading: false,
    totalCount: mockUsers.length,
    filters: {
      search: '',
      role: '',
      isActive: undefined,
      page: 1,
      limit: 10
    },
    onFilterChange: jest.fn(),
    onPageChange: jest.fn(),
    onUserUpdated: jest.fn()
  };

  it('renders user list with data', async () => {
    render(<UserList {...mockProps} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('Relief Org')).toBeInTheDocument();
    });
  });

  it('displays user status correctly', async () => {
    render(<UserList {...mockProps} />);

    await waitFor(() => {
      // Active user should show Active badge
      expect(screen.getByText('Active')).toBeInTheDocument();
      // Inactive user should show Inactive badge
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  it('handles search functionality', async () => {
    render(<UserList {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search users...');
    fireEvent.change(searchInput, { target: { value: 'john' } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=john'),
        expect.any(Object)
      );
    });
  });

  it('handles role filter', async () => {
    render(<UserList {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('All Roles')).toBeInTheDocument();
    });

    const roleFilter = screen.getByRole('combobox');
    fireEvent.click(roleFilter);

    // Assuming ASSESSOR option is available
    const assessorOption = screen.getByText('ASSESSOR');
    fireEvent.click(assessorOption);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('role=ASSESSOR'),
        expect.any(Object)
      );
    });
  });

  it('handles status filter', async () => {
    render(<UserList {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('All Status')).toBeInTheDocument();
    });

    const statusFilter = screen.getByDisplayValue('All Status');
    fireEvent.click(statusFilter);

    const activeOption = screen.getByText('Active Only');
    fireEvent.click(activeOption);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('isActive=true'),
        expect.any(Object)
      );
    });
  });

  it('handles user status toggle', async () => {
    // Mock the status update API call
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { user: { ...mockUsers[0], isActive: false } },
          message: 'User deactivated successfully'
        })
      } as Response);

    render(<UserList {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Find and click the status toggle button for active user
    const statusButtons = screen.getAllByRole('button');
    const toggleButton = statusButtons.find(btn => 
      btn.textContent?.includes('Deactivate')
    );
    
    if (toggleButton) {
      fireEvent.click(toggleButton);

      // Confirm in the dialog
      await waitFor(() => {
        expect(screen.getByText('Confirm Action')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/admin/users/user-1/status',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ isActive: false })
          })
        );
      });
    }
  });

  it('handles edit user action', async () => {
    render(<UserList {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByLabelText(/Edit user/i);
    fireEvent.click(editButtons[0]);

    expect(mockProps.onEditUser).toHaveBeenCalledWith(mockUsers[0]);
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<UserList {...mockProps} />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive'
      });
    });
  });

  it('displays loading state', () => {
    // Mock a delayed response
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(<UserList {...mockProps} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('displays empty state when no users found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          users: [],
          pagination: { total: 0, page: 1, limit: 10, totalPages: 0 }
        }
      })
    } as Response);

    render(<UserList {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  it('handles pagination', async () => {
    const paginatedResponse = {
      ...mockResponse,
      data: {
        ...mockResponse.data,
        pagination: {
          total: 25,
          page: 1,
          limit: 10,
          totalPages: 3
        }
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => paginatedResponse
    } as Response);

    render(<UserList {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object)
      );
    });
  });

  it('refreshes data when refreshTrigger changes', async () => {
    const { rerender } = render(<UserList {...mockProps} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Trigger a rerender with updated props
    rerender(<UserList {...mockProps} totalCount={5} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it('sorts users by different columns', async () => {
    render(<UserList {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sortBy=name&sortOrder=asc'),
        expect.any(Object)
      );
    });
  });
});