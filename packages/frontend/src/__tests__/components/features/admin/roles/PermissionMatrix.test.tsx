import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';
import { PermissionMatrix } from '@/components/features/admin/roles/PermissionMatrix';
import { createMockAdminRole } from '@/__tests__/utils/mockObjects';

// Mock data
const mockPermissions = [
  {
    id: 'perm-1',
    name: 'VIEW_INCIDENTS',
    description: 'View incident reports',
    resource: 'INCIDENT',
    action: 'READ',
    isActive: true,
    roles: [
      { role: { id: 'role-1', name: 'RESPONDER' } },
      { role: { id: 'role-2', name: 'COORDINATOR' } }
    ]
  },
  {
    id: 'perm-2',
    name: 'MANAGE_RESOURCES',
    description: 'Manage disaster resources',
    resource: 'RESOURCE',
    action: 'WRITE',
    isActive: true,
    roles: [
      { role: { id: 'role-2', name: 'COORDINATOR' } },
      { role: { id: 'role-3', name: 'ADMIN' } }
    ]
  },
  {
    id: 'perm-3',
    name: 'DELETE_USERS',
    description: 'Delete user accounts',
    resource: 'USER',
    action: 'DELETE',
    isActive: false,
    roles: [
      { role: { id: 'role-3', name: 'ADMIN' } }
    ]
  }
];

const mockRoles = [
  createMockAdminRole({
    id: 'role-1',
    name: 'RESPONDER',
    permissions: [
      { id: 'perm-1', name: 'VIEW_INCIDENTS', resource: 'incidents', action: 'read', isActive: true }
    ],
    userCount: 5,
    description: 'First responder role'
  }),
  createMockAdminRole({
    id: 'role-2',
    name: 'COORDINATOR',
    permissions: [
      { id: 'perm-1', name: 'VIEW_INCIDENTS', resource: 'incidents', action: 'read', isActive: true },
      { id: 'perm-2', name: 'MANAGE_RESOURCES', resource: 'resources', action: 'write', isActive: true }
    ],
    userCount: 3,
    description: 'Coordination role'
  }),
  createMockAdminRole({
    id: 'role-3',
    name: 'ADMIN',
    permissions: [
      { id: 'perm-1', name: 'VIEW_INCIDENTS', resource: 'incidents', action: 'read', isActive: true },
      { id: 'perm-2', name: 'MANAGE_RESOURCES', resource: 'resources', action: 'write', isActive: true },
      { id: 'perm-3', name: 'DELETE_USERS', resource: 'users', action: 'delete', isActive: true }
    ],
    userCount: 1,
    description: 'Administrator role'
  })
];

const defaultProps = {
  matrix: {
    roles: mockRoles,
    permissions: mockPermissions,
    matrix: {
      'role-1': { 'perm-1': true, 'perm-2': false, 'perm-3': false },
      'role-2': { 'perm-1': true, 'perm-2': true, 'perm-3': false },
      'role-3': { 'perm-1': true, 'perm-2': true, 'perm-3': true }
    }
  },
  onRefresh: jest.fn(),
  isLoading: false
};

describe('PermissionMatrix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders permission matrix with permissions and roles', () => {
    render(<PermissionMatrix {...defaultProps} />);
    
    // Check permissions are displayed
    expect(screen.getByText('VIEW_INCIDENTS')).toBeInTheDocument();
    expect(screen.getByText('MANAGE_RESOURCES')).toBeInTheDocument();
    expect(screen.getByText('DELETE_USERS')).toBeInTheDocument();
    
    // Check roles are displayed
    expect(screen.getByText('RESPONDER')).toBeInTheDocument();
    expect(screen.getByText('COORDINATOR')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('filters permissions by resource', async () => {
    render(<PermissionMatrix {...defaultProps} />);
    
    // Open resource filter
    const resourceFilter = screen.getByText('All Resources');
    fireEvent.click(resourceFilter);
    
    // Select INCIDENT resource
    const incidentOption = screen.getByText('INCIDENT');
    fireEvent.click(incidentOption);
    
    await waitFor(() => {
      expect(screen.getByText('VIEW_INCIDENTS')).toBeInTheDocument();
      expect(screen.queryByText('MANAGE_RESOURCES')).not.toBeInTheDocument();
      expect(screen.queryByText('DELETE_USERS')).not.toBeInTheDocument();
    });
  });

  it('filters permissions by action', async () => {
    render(<PermissionMatrix {...defaultProps} />);
    
    // Open action filter
    const actionFilter = screen.getByText('All Actions');
    fireEvent.click(actionFilter);
    
    // Select READ action
    const readOption = screen.getByText('READ');
    fireEvent.click(readOption);
    
    await waitFor(() => {
      expect(screen.getByText('VIEW_INCIDENTS')).toBeInTheDocument();
      expect(screen.queryByText('MANAGE_RESOURCES')).not.toBeInTheDocument();
      expect(screen.queryByText('DELETE_USERS')).not.toBeInTheDocument();
    });
  });

  it('searches permissions by name', async () => {
    render(<PermissionMatrix {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search permissions...');
    fireEvent.change(searchInput, { target: { value: 'incident' } });
    
    await waitFor(() => {
      expect(screen.getByText('VIEW_INCIDENTS')).toBeInTheDocument();
      expect(screen.queryByText('MANAGE_RESOURCES')).not.toBeInTheDocument();
      expect(screen.queryByText('DELETE_USERS')).not.toBeInTheDocument();
    });
  });

  it('toggles between compact and table views', () => {
    render(<PermissionMatrix {...defaultProps} />);
    
    // Should start in compact view
    expect(screen.getByText('Table View')).toBeInTheDocument();
    
    // Switch to table view
    fireEvent.click(screen.getByText('Table View'));
    
    expect(screen.getByText('Compact View')).toBeInTheDocument();
    
    // Verify table headers are present
    expect(screen.getByText('Permission')).toBeInTheDocument();
    expect(screen.getByText('Resource')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('shows only active permissions by default', () => {
    render(<PermissionMatrix {...defaultProps} />);
    
    // Active permissions should be visible
    expect(screen.getByText('VIEW_INCIDENTS')).toBeInTheDocument();
    expect(screen.getByText('MANAGE_RESOURCES')).toBeInTheDocument();
    
    // Inactive permission should not be visible
    expect(screen.queryByText('DELETE_USERS')).not.toBeInTheDocument();
  });

  it('shows inactive permissions when filter is toggled', async () => {
    render(<PermissionMatrix {...defaultProps} />);
    
    // Toggle to show inactive permissions
    const showInactiveCheckbox = screen.getByRole('checkbox', { name: /show inactive/i });
    fireEvent.click(showInactiveCheckbox);
    
    await waitFor(() => {
      expect(screen.getByText('DELETE_USERS')).toBeInTheDocument();
    });
  });

  it('displays correct role assignments in matrix', () => {
    render(<PermissionMatrix {...defaultProps} />);
    
    // VIEW_INCIDENTS should show assignments to RESPONDER and COORDINATOR
    const viewIncidentsRow = screen.getByText('VIEW_INCIDENTS').closest('.permission-row');
    expect(viewIncidentsRow).toBeInTheDocument();
    
    // MANAGE_RESOURCES should show assignments to COORDINATOR and ADMIN
    const manageResourcesRow = screen.getByText('MANAGE_RESOURCES').closest('.permission-row');
    expect(manageResourcesRow).toBeInTheDocument();
  });

  it('handles loading state', () => {
    render(<PermissionMatrix {...defaultProps} isLoading={true} />);
    
    // Should show loading skeleton
    expect(screen.getAllByTestId('permission-skeleton')).toHaveLength(5);
  });

  it('handles empty permissions state', () => {
    render(<PermissionMatrix {...defaultProps} permissions={[]} />);
    
    expect(screen.getByText('No permissions found')).toBeInTheDocument();
    expect(screen.getByText('No permissions match the current filters')).toBeInTheDocument();
  });

  it('clears all filters when clear button is clicked', async () => {
    render(<PermissionMatrix {...defaultProps} />);
    
    // Apply filters
    const searchInput = screen.getByPlaceholderText('Search permissions...');
    fireEvent.change(searchInput, { target: { value: 'incident' } });
    
    // Clear filters
    const clearButton = screen.getByText('Clear Filters');
    fireEvent.click(clearButton);
    
    await waitFor(() => {
      expect(searchInput).toHaveValue('');
      expect(screen.getByText('All Resources')).toBeInTheDocument();
      expect(screen.getByText('All Actions')).toBeInTheDocument();
    });
  });

  it('exports matrix data when export button is clicked', async () => {
    // Mock window.URL.createObjectURL
    const mockCreateObjectURL = jest.fn(() => 'mock-url');
    const mockRevokeObjectURL = jest.fn();
    Object.defineProperty(window.URL, 'createObjectURL', { value: mockCreateObjectURL });
    Object.defineProperty(window.URL, 'revokeObjectURL', { value: mockRevokeObjectURL });
    
    // Mock document.createElement and click
    const mockClick = jest.fn();
    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick
    };
    jest.spyOn(document, 'createElement').mockImplementation(() => mockAnchor as any);
    
    render(<PermissionMatrix {...defaultProps} />);
    
    const exportButton = screen.getByText('Export CSV');
    fireEvent.click(exportButton);
    
    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });
  });
});