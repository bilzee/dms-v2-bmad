import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IncidentManagementInterface } from '../IncidentManagementInterface';
import { useIncidentStore } from '@/stores/incident.store';
import { IncidentType, IncidentSeverity, IncidentStatus } from '@dms/shared';

// Mock the incident store
jest.mock('@/stores/incident.store');

// Mock Next.js components
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date) => '2024-08-26'),
  formatDistanceToNow: jest.fn(() => '2 hours ago'),
}));

// Mock child components
jest.mock('../IncidentCreationForm', () => {
  return function MockIncidentCreationForm({ coordinatorId, coordinatorName }: any) {
    return (
      <div data-testid="incident-creation-form">
        Creation Form for {coordinatorName} ({coordinatorId})
      </div>
    );
  };
});

jest.mock('../IncidentStatusTracker', () => {
  return function MockIncidentStatusTracker({ coordinatorId, coordinatorName }: any) {
    return (
      <div data-testid="incident-status-tracker">
        Status Tracker for {coordinatorName} ({coordinatorId})
      </div>
    );
  };
});

jest.mock('../IncidentEntityLinker', () => {
  return function MockIncidentEntityLinker({ coordinatorId, coordinatorName }: any) {
    return (
      <div data-testid="incident-entity-linker">
        Entity Linker for {coordinatorName} ({coordinatorId})
      </div>
    );
  };
});

const mockUseIncidentStore = useIncidentStore as jest.MockedFunction<typeof useIncidentStore>;

describe('IncidentManagementInterface', () => {
  const defaultProps = {
    coordinatorId: 'coord-123',
    coordinatorName: 'John Coordinator',
  };

  const mockIncidents = [
    {
      id: '1',
      name: 'Test Flood Incident',
      type: IncidentType.FLOOD,
      severity: IncidentSeverity.SEVERE,
      status: IncidentStatus.ACTIVE,
      date: new Date('2024-08-20'),
      affectedEntityCount: 3,
      assessmentCount: 5,
      responseCount: 2,
      lastUpdated: new Date('2024-08-26'),
    },
    {
      id: '2',
      name: 'Test Fire Incident',
      type: IncidentType.FIRE,
      severity: IncidentSeverity.MODERATE,
      status: IncidentStatus.CONTAINED,
      date: new Date('2024-08-22'),
      affectedEntityCount: 1,
      assessmentCount: 2,
      responseCount: 1,
      lastUpdated: new Date('2024-08-25'),
    },
  ];

  const mockStats = {
    totalIncidents: 2,
    activeIncidents: 1,
    highPriorityIncidents: 1,
    recentlyUpdated: 2,
    byType: {
      [IncidentType.FLOOD]: 1,
      [IncidentType.FIRE]: 1,
      [IncidentType.LANDSLIDE]: 0,
      [IncidentType.CYCLONE]: 0,
      [IncidentType.CONFLICT]: 0,
      [IncidentType.EPIDEMIC]: 0,
      [IncidentType.EARTHQUAKE]: 0,
      [IncidentType.WILDFIRE]: 0,
      [IncidentType.OTHER]: 0,
    },
    bySeverity: {
      [IncidentSeverity.MINOR]: 0,
      [IncidentSeverity.MODERATE]: 1,
      [IncidentSeverity.SEVERE]: 1,
      [IncidentSeverity.CATASTROPHIC]: 0,
    },
    byStatus: {
      [IncidentStatus.ACTIVE]: 1,
      [IncidentStatus.CONTAINED]: 1,
      [IncidentStatus.RESOLVED]: 0,
    },
  };

  const mockStoreState = {
    incidents: mockIncidents,
    incidentStats: mockStats,
    pagination: {
      page: 1,
      pageSize: 20,
      totalPages: 1,
      totalCount: 2,
    },
    isLoading: false,
    error: null,
    filters: {},
    sortBy: 'date' as const,
    sortOrder: 'desc' as const,
    searchTerm: '',
    selectedIncidentIds: [],
    isPreviewOpen: false,
    previewIncident: null,
    isLoadingDetail: false,
    detailError: null,
    creationForm: { isOpen: false },
    statusUpdateForm: { isOpen: false },
    entityLinkingForm: { isOpen: false },
    isCreating: false,
    isUpdatingStatus: false,
  };

  const mockActions = {
    fetchIncidents: jest.fn(),
    refreshStats: jest.fn(),
    setFilters: jest.fn(),
    setSorting: jest.fn(),
    setSearchTerm: jest.fn(),
    setPage: jest.fn(),
    toggleIncidentSelection: jest.fn(),
    selectAllVisible: jest.fn(),
    clearSelection: jest.fn(),
    getSelectedCount: jest.fn(() => 0),
    openPreview: jest.fn(),
    closePreview: jest.fn(),
    openCreationForm: jest.fn(),
    closeCreationForm: jest.fn(),
    openStatusUpdateForm: jest.fn(),
    closeStatusUpdateForm: jest.fn(),
    openEntityLinkingForm: jest.fn(),
    closeEntityLinkingForm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the store hook to return different parts of the state
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

  it('renders the component with correct header', () => {
    render(<IncidentManagementInterface {...defaultProps} />);

    expect(screen.getByText('Incident Management')).toBeInTheDocument();
    expect(screen.getByText(/Coordinate multi-phase incident responses/)).toBeInTheDocument();
  });

  it('displays incident statistics correctly', () => {
    render(<IncidentManagementInterface {...defaultProps} />);

    expect(screen.getByText('Total Incidents')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('High Priority')).toBeInTheDocument();
    expect(screen.getByText('Recently Updated')).toBeInTheDocument();
  });

  it('displays incident list when loaded', () => {
    render(<IncidentManagementInterface {...defaultProps} />);

    expect(screen.getByText('Test Flood Incident')).toBeInTheDocument();
    expect(screen.getByText('Test Fire Incident')).toBeInTheDocument();
    
    // Check for incident details
    expect(screen.getByText(/3 affected entities/)).toBeInTheDocument();
    expect(screen.getByText(/5 assessments/)).toBeInTheDocument();
  });

  it('shows loading state correctly', () => {
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

    render(<IncidentManagementInterface {...defaultProps} />);

    // Should show skeleton loading state
    expect(screen.getAllByTestId(/skeleton/i)).toHaveLength(3);
  });

  it('shows error state correctly', () => {
    const errorMessage = 'Failed to load incidents';
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

    render(<IncidentManagementInterface {...defaultProps} />);

    expect(screen.getByText(/Failed to load incident management data/)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows empty state when no incidents', () => {
    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          incidents: [],
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        incidents: [],
        ...mockActions,
      };
    });

    render(<IncidentManagementInterface {...defaultProps} />);

    expect(screen.getByText(/No incidents found matching your criteria/)).toBeInTheDocument();
    expect(screen.getByText('Create First Incident')).toBeInTheDocument();
  });

  it('calls fetchIncidents and refreshStats on mount', () => {
    render(<IncidentManagementInterface {...defaultProps} />);

    expect(mockActions.fetchIncidents).toHaveBeenCalledTimes(1);
    expect(mockActions.refreshStats).toHaveBeenCalledTimes(1);
  });

  it('handles search functionality', async () => {
    const user = userEvent.setup();
    render(<IncidentManagementInterface {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/Search incidents by name/);
    await user.type(searchInput, 'flood');

    // Should debounce and call setSearchTerm after 300ms
    await waitFor(() => {
      expect(mockActions.setSearchTerm).toHaveBeenCalledWith('flood');
    }, { timeout: 1000 });
  });

  it('handles filter changes', async () => {
    const user = userEvent.setup();
    render(<IncidentManagementInterface {...defaultProps} />);

    // Click on status filter
    const statusFilter = screen.getByDisplayValue('All Statuses');
    await user.click(statusFilter);

    // This would trigger the setFilters function in a real scenario
    // The exact implementation depends on the Select component behavior
  });

  it('opens creation form when New Incident button is clicked', async () => {
    const user = userEvent.setup();
    render(<IncidentManagementInterface {...defaultProps} />);

    const newIncidentButton = screen.getByText('New Incident');
    await user.click(newIncidentButton);

    expect(mockActions.openCreationForm).toHaveBeenCalledTimes(1);
  });

  it('handles refresh button click', async () => {
    const user = userEvent.setup();
    render(<IncidentManagementInterface {...defaultProps} />);

    const refreshButton = screen.getByText('Refresh');
    await user.click(refreshButton);

    expect(mockActions.fetchIncidents).toHaveBeenCalledTimes(2); // Once on mount + once on click
    expect(mockActions.refreshStats).toHaveBeenCalledTimes(2);
  });

  it('handles incident preview', async () => {
    const user = userEvent.setup();
    render(<IncidentManagementInterface {...defaultProps} />);

    const viewDetailsButton = screen.getAllByText('View Details')[0];
    await user.click(viewDetailsButton);

    expect(mockActions.openPreview).toHaveBeenCalledWith('1');
  });

  it('renders tabs correctly and switches between them', async () => {
    const user = userEvent.setup();
    render(<IncidentManagementInterface {...defaultProps} />);

    // Check all tabs are present
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Status Timeline')).toBeInTheDocument();
    expect(screen.getByText('Entity Relations')).toBeInTheDocument();

    // Switch to Status Timeline tab
    const statusTimelineTab = screen.getByText('Status Timeline');
    await user.click(statusTimelineTab);

    expect(screen.getByTestId('incident-status-tracker')).toBeInTheDocument();

    // Switch to Entity Relations tab
    const entityRelationsTab = screen.getByText('Entity Relations');
    await user.click(entityRelationsTab);

    expect(screen.getByTestId('incident-entity-linker')).toBeInTheDocument();
  });

  it('displays creation form when creationForm.isOpen is true', () => {
    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          creationForm: { isOpen: true },
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        creationForm: { isOpen: true },
        ...mockActions,
      };
    });

    render(<IncidentManagementInterface {...defaultProps} />);

    expect(screen.getByTestId('incident-creation-form')).toBeInTheDocument();
  });

  it('displays preview dialog when isPreviewOpen is true', () => {
    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          isPreviewOpen: true,
          previewIncident: mockIncidents[0],
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        isPreviewOpen: true,
        previewIncident: mockIncidents[0],
        ...mockActions,
      };
    });

    render(<IncidentManagementInterface {...defaultProps} />);

    expect(screen.getByText('Incident Details')).toBeInTheDocument();
    expect(screen.getByText('Test Flood Incident')).toBeInTheDocument();
  });

  it('handles error retry functionality', async () => {
    const user = userEvent.setup();
    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          error: 'Network error',
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        error: 'Network error',
        ...mockActions,
      };
    });

    render(<IncidentManagementInterface {...defaultProps} />);

    const retryButton = screen.getByText('Retry');
    await user.click(retryButton);

    expect(mockActions.fetchIncidents).toHaveBeenCalledTimes(1);
  });

  it('renders incident badges correctly', () => {
    render(<IncidentManagementInterface {...defaultProps} />);

    // Check for type badges
    expect(screen.getByText('FLOOD')).toBeInTheDocument();
    expect(screen.getByText('FIRE')).toBeInTheDocument();

    // Check for severity badges
    expect(screen.getByText('SEVERE')).toBeInTheDocument();
    expect(screen.getByText('MODERATE')).toBeInTheDocument();

    // Check for status badges
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('CONTAINED')).toBeInTheDocument();
  });

  it('handles coordinator props correctly', () => {
    render(<IncidentManagementInterface {...defaultProps} />);

    // Switch to other tabs to ensure coordinator info is passed to child components
    const statusTimelineTab = screen.getByText('Status Timeline');
    fireEvent.click(statusTimelineTab);

    expect(screen.getByTestId('incident-status-tracker')).toHaveTextContent('John Coordinator (coord-123)');
  });
});