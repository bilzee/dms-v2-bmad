import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IncidentStatusTracker } from '../IncidentStatusTracker';
import { useIncidentStore } from '@/stores/incident.store';
import { IncidentStatus, IncidentSeverity } from '@dms/shared';

// Mock the incident store
jest.mock('@/stores/incident.store');

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date) => '2024-08-26 10:30'),
  formatDistanceToNow: jest.fn(() => '2 hours ago'),
  isAfter: jest.fn(() => false),
  isBefore: jest.fn(() => true),
}));

// Mock child components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ onValueChange, value, children }: any) => (
    <select data-testid="select" value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>,
}));

const mockUseIncidentStore = useIncidentStore as jest.MockedFunction<typeof useIncidentStore>;

const mockIncident = {
  id: '1',
  name: 'Test Flood Incident',
  type: 'FLOOD',
  severity: IncidentSeverity.SEVERE,
  status: IncidentStatus.ACTIVE,
  date: new Date('2024-08-20'),
  coordinatorId: 'coord-1',
  coordinatorName: 'Sarah Johnson',
  lastUpdated: new Date('2024-08-26'),
};

const mockStatusHistory = [
  {
    status: IncidentStatus.ACTIVE,
    changedAt: new Date('2024-08-20T08:00:00Z'),
    changedBy: 'Sarah Johnson',
    coordinatorId: 'coord-1',
    notes: 'Initial incident creation',
    duration: '6 days 2 hours',
  },
];

const mockTimeline = [
  {
    id: 'timeline-1',
    type: 'STATUS_CHANGE' as const,
    timestamp: new Date('2024-08-20T08:00:00Z'),
    coordinatorId: 'coord-1',
    coordinatorName: 'Sarah Johnson',
    description: 'Incident created and marked as ACTIVE',
    metadata: {
      previousStatus: null,
      newStatus: IncidentStatus.ACTIVE,
    },
  },
  {
    id: 'timeline-2',
    type: 'NOTE_ADDED' as const,
    timestamp: new Date('2024-08-21T10:30:00Z'),
    coordinatorId: 'coord-1',
    coordinatorName: 'Sarah Johnson',
    description: 'Updated response priorities based on field reports',
    metadata: {
      note: 'Water contamination confirmed in affected areas.',
      priority: 'HIGH',
    },
  },
];

const mockActionItems = [
  {
    id: 'action-1',
    title: 'Deploy water purification units',
    description: 'Set up emergency water treatment facilities',
    priority: 'HIGH' as const,
    status: 'PENDING' as const,
    assignedTo: 'coord-2',
    assignedToName: 'Dr. Ahmed Musa',
    dueDate: new Date('2024-08-27'),
    createdAt: new Date('2024-08-26'),
    createdBy: 'Sarah Johnson',
  },
  {
    id: 'action-2',
    title: 'Evacuate high-risk areas',
    description: 'Complete evacuation of flood-prone zones',
    priority: 'CRITICAL' as const,
    status: 'IN_PROGRESS' as const,
    assignedTo: 'coord-3',
    assignedToName: 'Ibrahim Katsina',
    dueDate: new Date('2024-08-26'),
    createdAt: new Date('2024-08-25'),
    createdBy: 'Sarah Johnson',
  },
];

describe('IncidentStatusTracker', () => {
  const defaultProps = {
    coordinatorId: 'coord-123',
    coordinatorName: 'John Coordinator',
  };

  const mockActions = {
    fetchIncidentStatusHistory: jest.fn(),
    fetchIncidentTimeline: jest.fn(),
    fetchIncidentActionItems: jest.fn(),
    updateIncidentStatus: jest.fn(),
    addActionItem: jest.fn(),
    updateActionItem: jest.fn(),
    addTimelineNote: jest.fn(),
    openStatusUpdateForm: jest.fn(),
    closeStatusUpdateForm: jest.fn(),
  };

  const mockStoreState = {
    incidents: [mockIncident],
    selectedIncident: mockIncident,
    statusHistory: mockStatusHistory,
    timeline: mockTimeline,
    actionItems: mockActionItems,
    statusUpdateForm: {
      isOpen: false,
      incidentId: null,
    },
    nextPossibleStatuses: [IncidentStatus.CONTAINED, IncidentStatus.RESOLVED],
    isLoading: false,
    isUpdatingStatus: false,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        ...mockActions,
      };
    });
  });

  it('renders the status tracker interface', () => {
    render(<IncidentStatusTracker {...defaultProps} />);

    expect(screen.getByText('Incident Status Timeline')).toBeInTheDocument();
    expect(screen.getByText('Current Status: ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('Action Items')).toBeInTheDocument();
    expect(screen.getByText('Timeline')).toBeInTheDocument();
  });

  it('displays status progression workflow', () => {
    render(<IncidentStatusTracker {...defaultProps} />);

    // Should show all statuses in workflow
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('CONTAINED')).toBeInTheDocument();
    expect(screen.getByText('RESOLVED')).toBeInTheDocument();

    // Current status should be highlighted
    expect(screen.getByText('ACTIVE')).toHaveClass('bg-yellow-100', 'border-yellow-500');
  });

  it('fetches data on mount and when incident changes', () => {
    render(<IncidentStatusTracker {...defaultProps} />);

    expect(mockActions.fetchIncidentStatusHistory).toHaveBeenCalledWith('1');
    expect(mockActions.fetchIncidentTimeline).toHaveBeenCalledWith('1');
    expect(mockActions.fetchIncidentActionItems).toHaveBeenCalledWith('1');
  });

  it('shows update status button for valid transitions', async () => {
    const user = userEvent.setup();
    render(<IncidentStatusTracker {...defaultProps} />);

    const updateButton = screen.getByText('Update Status');
    expect(updateButton).toBeInTheDocument();
    expect(updateButton).not.toBeDisabled();

    await user.click(updateButton);
    expect(mockActions.openStatusUpdateForm).toHaveBeenCalledWith('1');
  });

  it('disables update button when no valid transitions available', () => {
    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          selectedIncident: { ...mockIncident, status: IncidentStatus.RESOLVED },
          nextPossibleStatuses: [],
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        selectedIncident: { ...mockIncident, status: IncidentStatus.RESOLVED },
        nextPossibleStatuses: [],
        ...mockActions,
      };
    });

    render(<IncidentStatusTracker {...defaultProps} />);

    const updateButton = screen.getByText('Update Status');
    expect(updateButton).toBeDisabled();
  });

  it('displays status update form when open', () => {
    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          statusUpdateForm: {
            isOpen: true,
            incidentId: '1',
          },
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        statusUpdateForm: {
          isOpen: true,
          incidentId: '1',
        },
        ...mockActions,
      };
    });

    render(<IncidentStatusTracker {...defaultProps} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('Update Incident Status')).toBeInTheDocument();
  });

  it('handles status update form submission', async () => {
    const user = userEvent.setup();
    
    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          statusUpdateForm: {
            isOpen: true,
            incidentId: '1',
          },
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        statusUpdateForm: {
          isOpen: true,
          incidentId: '1',
        },
        ...mockActions,
      };
    });

    render(<IncidentStatusTracker {...defaultProps} />);

    // Select new status
    await user.selectOptions(screen.getByDisplayValue('Select new status'), IncidentStatus.CONTAINED);
    
    // Add milestone
    await user.type(screen.getByLabelText(/milestone/i), 'Evacuation completed');
    
    // Add notes
    await user.type(screen.getByLabelText(/notes/i), 'All residents safely evacuated');

    // Submit form
    await user.click(screen.getByText('Update Status'));

    expect(mockActions.updateIncidentStatus).toHaveBeenCalledWith('1', {
      newStatus: IncidentStatus.CONTAINED,
      milestone: 'Evacuation completed',
      notes: 'All residents safely evacuated',
      coordinatorId: 'coord-123',
      coordinatorName: 'John Coordinator',
    });
  });

  it('displays action items list', () => {
    render(<IncidentStatusTracker {...defaultProps} />);

    expect(screen.getByText('Deploy water purification units')).toBeInTheDocument();
    expect(screen.getByText('Evacuate high-risk areas')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
  });

  it('handles action item creation', async () => {
    const user = userEvent.setup();
    render(<IncidentStatusTracker {...defaultProps} />);

    // Open add action item form
    await user.click(screen.getByText('Add Action Item'));

    // Fill form
    await user.type(screen.getByLabelText(/title/i), 'Medical supplies distribution');
    await user.type(screen.getByLabelText(/description/i), 'Distribute emergency medical supplies');
    await user.selectOptions(screen.getByDisplayValue('Select priority'), 'HIGH');
    await user.type(screen.getByLabelText(/assigned to/i), 'coord-4');

    // Submit
    await user.click(screen.getByText('Add Action Item'));

    expect(mockActions.addActionItem).toHaveBeenCalledWith('1', {
      title: 'Medical supplies distribution',
      description: 'Distribute emergency medical supplies',
      priority: 'HIGH',
      assignedTo: 'coord-4',
      dueDate: expect.any(Date),
    });
  });

  it('updates action item status', async () => {
    const user = userEvent.setup();
    render(<IncidentStatusTracker {...defaultProps} />);

    // Click on action item to expand options
    const actionItem = screen.getByText('Deploy water purification units');
    await user.click(actionItem);

    // Mark as completed
    await user.click(screen.getByText('Mark Complete'));

    expect(mockActions.updateActionItem).toHaveBeenCalledWith('1', 'action-1', {
      status: 'COMPLETED',
      completedAt: expect.any(Date),
    });
  });

  it('displays timeline events', () => {
    render(<IncidentStatusTracker {...defaultProps} />);

    expect(screen.getByText('Incident created and marked as ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('Updated response priorities based on field reports')).toBeInTheDocument();
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
  });

  it('adds timeline note', async () => {
    const user = userEvent.setup();
    render(<IncidentStatusTracker {...defaultProps} />);

    // Open add note form
    await user.click(screen.getByText('Add Note'));

    // Fill form
    await user.type(screen.getByLabelText(/note/i), 'Emergency supplies delivered to affected areas');
    await user.selectOptions(screen.getByDisplayValue('Select priority'), 'NORMAL');

    // Submit
    await user.click(screen.getByText('Add Timeline Note'));

    expect(mockActions.addTimelineNote).toHaveBeenCalledWith('1', {
      description: 'Emergency supplies delivered to affected areas',
      priority: 'NORMAL',
      coordinatorId: 'coord-123',
      coordinatorName: 'John Coordinator',
    });
  });

  it('filters timeline by event type', async () => {
    const user = userEvent.setup();
    render(<IncidentStatusTracker {...defaultProps} />);

    // Filter by status changes only
    await user.selectOptions(screen.getByDisplayValue('All Events'), 'STATUS_CHANGE');

    // Only status change events should be visible
    expect(screen.getByText('Incident created and marked as ACTIVE')).toBeInTheDocument();
    expect(screen.queryByText('Updated response priorities based on field reports')).not.toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          isLoading: true,
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        isLoading: true,
        ...mockActions,
      };
    });

    render(<IncidentStatusTracker {...defaultProps} />);

    expect(screen.getByText('Loading status information...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    const errorMessage = 'Failed to load status data';
    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          error: errorMessage,
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        error: errorMessage,
        ...mockActions,
      };
    });

    render(<IncidentStatusTracker {...defaultProps} />);

    expect(screen.getByText(/Failed to load status information/i)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('shows updating status loading state', () => {
    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          isUpdatingStatus: true,
          statusUpdateForm: {
            isOpen: true,
            incidentId: '1',
          },
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        isUpdatingStatus: true,
        statusUpdateForm: {
          isOpen: true,
          incidentId: '1',
        },
        ...mockActions,
      };
    });

    render(<IncidentStatusTracker {...defaultProps} />);

    expect(screen.getByText('Updating...')).toBeInTheDocument();
    expect(screen.getByText('Update Status')).toBeDisabled();
  });

  it('handles empty states', () => {
    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          selectedIncident: null,
          statusHistory: [],
          timeline: [],
          actionItems: [],
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        selectedIncident: null,
        statusHistory: [],
        timeline: [],
        actionItems: [],
        ...mockActions,
      };
    });

    render(<IncidentStatusTracker {...defaultProps} />);

    expect(screen.getByText('No incident selected')).toBeInTheDocument();
  });

  it('validates action item form fields', async () => {
    const user = userEvent.setup();
    render(<IncidentStatusTracker {...defaultProps} />);

    // Open add action item form
    await user.click(screen.getByText('Add Action Item'));

    // Try to submit without required fields
    await user.click(screen.getByText('Add Action Item'));

    expect(screen.getByText(/Title is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Priority is required/i)).toBeInTheDocument();
    expect(mockActions.addActionItem).not.toHaveBeenCalled();
  });

  it('sorts action items by priority and due date', () => {
    render(<IncidentStatusTracker {...defaultProps} />);

    const actionItems = screen.getAllByTestId(/action-item-/);
    // Critical priority item should appear first
    expect(actionItems[0]).toHaveTextContent('Evacuate high-risk areas');
    expect(actionItems[1]).toHaveTextContent('Deploy water purification units');
  });
});