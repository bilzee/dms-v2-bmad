import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateUserModal } from '@/components/features/admin/users/CreateUserModal';
import { toast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('@/hooks/use-toast');
const mockToast = toast as jest.MockedFunction<typeof toast>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

const mockRoles = [
  { id: 'role-1', name: 'ASSESSOR', permissions: [] },
  { id: 'role-2', name: 'COORDINATOR', permissions: [] },
  { id: 'role-3', name: 'RESPONDER', permissions: [] }
];

describe('CreateUserModal Component', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { roles: mockRoles }
      })
    } as Response);
    mockToast.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockProps = {
    open: true,
    onClose: jest.fn(),
    onSuccess: jest.fn()
  };

  it('renders create user modal', async () => {
    render(<CreateUserModal {...mockProps} />);

    expect(screen.getByText('Create New User')).toBeInTheDocument();
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone (Optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Organization (Optional)')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Select roles...')).toBeInTheDocument();
    });
  });

  it('loads available roles', async () => {
    render(<CreateUserModal {...mockProps} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/admin/roles');
    });
  });

  it('handles form submission with valid data', async () => {
    const createResponse = {
      success: true,
      data: {
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
          roles: [{ name: 'ASSESSOR' }]
        }
      },
      message: 'User created successfully'
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { roles: mockRoles } })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createResponse
      } as Response);

    render(<CreateUserModal {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    });

    // Fill out the form
    fireEvent.change(screen.getByLabelText('Full Name'), {
      target: { value: 'John Doe' }
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'john@example.com' }
    });
    fireEvent.change(screen.getByLabelText('Phone (Optional)'), {
      target: { value: '+1234567890' }
    });
    fireEvent.change(screen.getByLabelText('Organization (Optional)'), {
      target: { value: 'Relief Organization' }
    });

    // Select roles
    const rolesCombobox = screen.getByRole('combobox');
    fireEvent.click(rolesCombobox);

    await waitFor(() => {
      expect(screen.getByText('ASSESSOR')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('ASSESSOR'));

    // Submit form
    const createButton = screen.getByRole('button', { name: /create user/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          organization: 'Relief Organization',
          roleIds: ['role-1'],
          isActive: true
        })
      });
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Success',
      description: 'User created successfully'
    });
    expect(mockProps.onSuccess).toHaveBeenCalled();
  });

  it('validates required fields', async () => {
    render(<CreateUserModal {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    });

    // Try to submit without required fields
    const createButton = screen.getByRole('button', { name: /create user/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('At least one role must be selected')).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    render(<CreateUserModal {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'invalid-email' }
    });

    fireEvent.blur(screen.getByLabelText('Email'));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('validates phone number format', async () => {
    render(<CreateUserModal {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Phone (Optional)')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Phone (Optional)'), {
      target: { value: 'invalid-phone' }
    });

    fireEvent.blur(screen.getByLabelText('Phone (Optional)'));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid phone number (e.g., +1234567890)')).toBeInTheDocument();
    });
  });

  it('allows multiple role selection', async () => {
    render(<CreateUserModal {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const rolesCombobox = screen.getByRole('combobox');
    fireEvent.click(rolesCombobox);

    await waitFor(() => {
      expect(screen.getByText('ASSESSOR')).toBeInTheDocument();
    });

    // Select first role
    fireEvent.click(screen.getByText('ASSESSOR'));
    
    // Select second role
    fireEvent.click(screen.getByText('COORDINATOR'));

    // Check that both roles are selected
    expect(screen.getByText('ASSESSOR')).toBeInTheDocument();
    expect(screen.getByText('COORDINATOR')).toBeInTheDocument();
  });

  it('handles API errors during user creation', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { roles: mockRoles } })
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          message: 'Email already exists'
        })
      } as Response);

    render(<CreateUserModal {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    });

    // Fill form with duplicate email
    fireEvent.change(screen.getByLabelText('Full Name'), {
      target: { value: 'John Doe' }
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'existing@example.com' }
    });

    // Select role
    const rolesCombobox = screen.getByRole('combobox');
    fireEvent.click(rolesCombobox);
    await waitFor(() => fireEvent.click(screen.getByText('ASSESSOR')));

    // Submit form
    const createButton = screen.getByRole('button', { name: /create user/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Email already exists',
        variant: 'destructive'
      });
    });
  });

  it('handles modal close', () => {
    render(<CreateUserModal {...mockProps} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('resets form when modal closes and reopens', async () => {
    const { rerender } = render(<CreateUserModal {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByLabelText('Full Name'), {
      target: { value: 'John Doe' }
    });

    // Close modal
    rerender(<CreateUserModal {...mockProps} open={false} />);

    // Reopen modal
    rerender(<CreateUserModal {...mockProps} open={true} />);

    await waitFor(() => {
      expect((screen.getByLabelText('Full Name') as HTMLInputElement).value).toBe('');
    });
  });

  it('shows loading state during submission', async () => {
    // Mock delayed response
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { roles: mockRoles } })
      } as Response)
      .mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: { user: { id: 'user-123' } }
            })
          } as Response), 1000)
        )
      );

    render(<CreateUserModal {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    });

    // Fill required fields
    fireEvent.change(screen.getByLabelText('Full Name'), {
      target: { value: 'John Doe' }
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'john@example.com' }
    });

    const rolesCombobox = screen.getByRole('combobox');
    fireEvent.click(rolesCombobox);
    await waitFor(() => fireEvent.click(screen.getByText('ASSESSOR')));

    // Submit form
    const createButton = screen.getByRole('button', { name: /create user/i });
    fireEvent.click(createButton);

    // Check loading state
    await waitFor(() => {
      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });
  });

  it('handles roles loading failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Failed to load roles'));

    render(<CreateUserModal {...mockProps} />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to load roles',
        variant: 'destructive'
      });
    });
  });
});