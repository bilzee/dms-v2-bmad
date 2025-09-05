import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { RoleAssignmentModal } from '../RoleAssignmentModal';

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Mock data
const mockUser = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  roles: [
    { id: 'role-1', name: 'RESPONDER' }
  ]
};

const mockRoles = [
  {
    id: 'role-1',
    name: 'RESPONDER',
    description: 'Emergency response role',
    permissions: [
      { id: 'perm-1', name: 'VIEW_INCIDENTS', resource: 'INCIDENT', action: 'READ' }
    ],
    userCount: 10,
    isActive: true
  },
  {
    id: 'role-2',
    name: 'COORDINATOR',
    description: 'Coordination role',
    permissions: [
      { id: 'perm-2', name: 'MANAGE_RESOURCES', resource: 'RESOURCE', action: 'WRITE' }
    ],
    userCount: 5,
    isActive: true
  }
];

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  onAssign: jest.fn(),
  user: mockUser,
  availableRoles: mockRoles,
  isLoading: false
};

describe('RoleAssignmentModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it('renders modal with user information', () => {
    render(<RoleAssignmentModal {...defaultProps} />);
    
    expect(screen.getByText('Assign Roles to John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('displays available roles for selection', () => {
    render(<RoleAssignmentModal {...defaultProps} />);
    
    expect(screen.getByText('RESPONDER')).toBeInTheDocument();
    expect(screen.getByText('COORDINATOR')).toBeInTheDocument();
    expect(screen.getByText('Emergency response role')).toBeInTheDocument();
    expect(screen.getByText('Coordination role')).toBeInTheDocument();
  });

  it('allows role selection and shows permission preview', async () => {
    render(<RoleAssignmentModal {...defaultProps} />);
    
    // Select COORDINATOR role
    const coordinatorCheckbox = screen.getByRole('checkbox', { name: /coordinator/i });
    fireEvent.click(coordinatorCheckbox);
    
    // Click on Permissions tab
    fireEvent.click(screen.getByText('Permissions'));
    
    await waitFor(() => {
      expect(screen.getByText('MANAGE_RESOURCES')).toBeInTheDocument();
      expect(screen.getByText('RESOURCE')).toBeInTheDocument();
      expect(screen.getByText('WRITE')).toBeInTheDocument();
    });
  });

  it('shows change impact analysis', async () => {
    render(<RoleAssignmentModal {...defaultProps} />);
    
    // Select COORDINATOR role (new role)
    const coordinatorCheckbox = screen.getByRole('checkbox', { name: /coordinator/i });
    fireEvent.click(coordinatorCheckbox);
    
    // Unselect RESPONDER role (existing role)
    const responderCheckbox = screen.getByRole('checkbox', { name: /responder/i });
    fireEvent.click(responderCheckbox);
    
    // Click on Impact tab
    fireEvent.click(screen.getByText('Impact'));
    
    await waitFor(() => {
      expect(screen.getByText('Roles to be Added')).toBeInTheDocument();
      expect(screen.getByText('Roles to be Removed')).toBeInTheDocument();
    });
  });

  it('submits role assignment with notification option', async () => {
    const onAssignMock = jest.fn();
    render(<RoleAssignmentModal {...defaultProps} onAssign={onAssignMock} />);
    
    // Select roles
    const coordinatorCheckbox = screen.getByRole('checkbox', { name: /coordinator/i });
    fireEvent.click(coordinatorCheckbox);
    
    // Add reason
    const reasonInput = screen.getByPlaceholderText('Optional reason for role assignment');
    fireEvent.change(reasonInput, { target: { value: 'Promotion to coordinator' } });
    
    // Enable notifications
    const notifyCheckbox = screen.getByRole('checkbox', { name: /notify user via email/i });
    fireEvent.click(notifyCheckbox);
    
    // Submit
    const assignButton = screen.getByText('Assign Roles');
    fireEvent.click(assignButton);
    
    await waitFor(() => {
      expect(onAssignMock).toHaveBeenCalledWith({
        roleIds: ['role-1', 'role-2'], // Both selected roles
        reason: 'Promotion to coordinator',
        notifyUser: true
      });
    });
  });

  it('displays loading state during assignment', () => {
    render(<RoleAssignmentModal {...defaultProps} isLoading={true} />);
    
    const assignButton = screen.getByRole('button', { name: /assign roles/i });
    expect(assignButton).toBeDisabled();
    expect(screen.getByText('Assigning...')).toBeInTheDocument();
  });

  it('validates that at least one role is selected', async () => {
    render(<RoleAssignmentModal {...defaultProps} />);
    
    // Unselect the existing role
    const responderCheckbox = screen.getByRole('checkbox', { name: /responder/i });
    fireEvent.click(responderCheckbox);
    
    // Try to submit
    const assignButton = screen.getByText('Assign Roles');
    fireEvent.click(assignButton);
    
    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText('At least one role must be selected')).toBeInTheDocument();
    });
  });

  it('closes modal when close button is clicked', () => {
    const onCloseMock = jest.fn();
    render(<RoleAssignmentModal {...defaultProps} onClose={onCloseMock} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('handles sensitive role assignment warnings', async () => {
    const sensitiveRoles = [
      {
        ...mockRoles[0],
        name: 'ADMIN',
        description: 'System administrator role'
      }
    ];

    render(<RoleAssignmentModal {...defaultProps} availableRoles={sensitiveRoles} />);
    
    const adminCheckbox = screen.getByRole('checkbox', { name: /admin/i });
    fireEvent.click(adminCheckbox);
    
    // Should show warning
    await waitFor(() => {
      expect(screen.getByText(/sensitive role/i)).toBeInTheDocument();
      expect(screen.getByText(/This role has administrative privileges/i)).toBeInTheDocument();
    });
  });
});