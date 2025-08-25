import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssessmentVerificationQueue } from '@/components/features/verification/AssessmentVerificationQueue';
import { useVerificationStore } from '@/stores/verification.store';
import { AssessmentType, VerificationStatus } from '@shared/types/entities';

// Mock the verification store
jest.mock('@/stores/verification.store', () => ({
  useVerificationStore: jest.fn(),
  useQueueData: jest.fn(),
  useQueueFilters: jest.fn(),
  useQueueSelection: jest.fn(),
}));

// Mock the components
jest.mock('@/components/features/verification/VerificationStatusIndicators', () => ({
  AssessmentStatusDisplay: ({ verificationStatus }: any) => (
    <div data-testid="status-display">{verificationStatus}</div>
  ),
  NotificationCounter: ({ count, type }: any) => (
    <div data-testid={`counter-${type}`}>{count}</div>
  ),
  PriorityIndicator: ({ priority }: any) => (
    <div data-testid="priority-indicator">{priority}</div>
  ),
  AssessmentTypeIndicator: ({ type }: any) => (
    <div data-testid="type-indicator">{type}</div>
  ),
}));

const mockQueueData = {
  queue: [
    {
      assessment: {
        id: '1',
        type: AssessmentType.HEALTH,
        date: new Date('2025-01-20T10:30:00Z'),
        affectedEntityId: 'entity-1',
        assessorName: 'Dr. Sarah Johnson',
        assessorId: 'assessor-1',
        verificationStatus: VerificationStatus.PENDING,
        syncStatus: 'SYNCED' as any,
        data: {} as any,
        mediaAttachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      affectedEntity: {
        id: 'entity-1',
        type: 'CAMP' as const,
        name: 'Maiduguri IDP Camp',
        lga: 'Maiduguri',
        ward: 'Bulumkuttu',
        longitude: 13.1606,
        latitude: 11.8333,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      assessorName: 'Dr. Sarah Johnson',
      feedbackCount: 0,
      requiresAttention: false,
      priority: 'HIGH' as const,
    },
  ],
  queueStats: {
    totalPending: 1,
    highPriority: 1,
    requiresAttention: 0,
    byAssessmentType: { [AssessmentType.HEALTH]: 1 },
  },
  pagination: {
    page: 1,
    pageSize: 20,
    totalPages: 1,
    totalCount: 1,
  },
  isLoading: false,
  error: null,
};

const mockQueueFilters = {
  filters: {},
  sortBy: 'priority' as const,
  sortOrder: 'desc' as const,
  setFilters: jest.fn(),
  setSorting: jest.fn(),
};

const mockQueueSelection = {
  selectedAssessmentIds: [],
  toggleAssessmentSelection: jest.fn(),
  selectAllVisible: jest.fn(),
  clearSelection: jest.fn(),
  getSelectedCount: jest.fn(() => 0),
};

const mockVerificationStore = {
  fetchQueue: jest.fn(),
  setPage: jest.fn(),
  openPreview: jest.fn(),
};

describe('AssessmentVerificationQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    (useVerificationStore as jest.Mock).mockReturnValue(mockVerificationStore);
    
    // Mock the individual hooks
    require('@/stores/verification.store').useQueueData.mockReturnValue(mockQueueData);
    require('@/stores/verification.store').useQueueFilters.mockReturnValue(mockQueueFilters);
    require('@/stores/verification.store').useQueueSelection.mockReturnValue(mockQueueSelection);
  });

  it('renders queue header with stats', () => {
    render(<AssessmentVerificationQueue />);
    
    expect(screen.getByText('Assessment Verification Queue')).toBeInTheDocument();
    expect(screen.getByTestId('counter-pending')).toHaveTextContent('1');
    expect(screen.getByTestId('counter-attention')).toHaveTextContent('0');
    expect(screen.getByTestId('counter-high-priority')).toHaveTextContent('1');
  });

  it('displays search and filter controls', () => {
    render(<AssessmentVerificationQueue />);
    
    expect(screen.getByPlaceholderText(/search by assessor/i)).toBeInTheDocument();
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('shows filter panel when filters button is clicked', async () => {
    render(<AssessmentVerificationQueue />);
    
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);
    
    await waitFor(() => {
      expect(screen.getByText('Assessment Type')).toBeInTheDocument();
      expect(screen.getByText('Verification Status')).toBeInTheDocument();
      expect(screen.getByText('Priority')).toBeInTheDocument();
    });
  });

  it('renders assessment queue table', () => {
    render(<AssessmentVerificationQueue />);
    
    // Check table headers
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Assessor')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    
    // Check assessment data
    expect(screen.getByText('Dr. Sarah Johnson')).toBeInTheDocument();
    expect(screen.getByText('Maiduguri IDP Camp')).toBeInTheDocument();
    expect(screen.getByText('Maiduguri, Bulumkuttu')).toBeInTheDocument();
  });

  it('handles sorting when column headers are clicked', async () => {
    render(<AssessmentVerificationQueue />);
    
    const priorityHeader = screen.getByText('Priority').closest('th');
    fireEvent.click(priorityHeader!);
    
    await waitFor(() => {
      expect(mockQueueFilters.setSorting).toHaveBeenCalledWith('priority', 'asc');
    });
  });

  it('handles assessment selection', async () => {
    render(<AssessmentVerificationQueue />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    const firstAssessmentCheckbox = checkboxes[1]; // First is select all
    
    fireEvent.click(firstAssessmentCheckbox);
    
    await waitFor(() => {
      expect(mockQueueSelection.toggleAssessmentSelection).toHaveBeenCalledWith('1');
    });
  });

  it('handles select all functionality', async () => {
    render(<AssessmentVerificationQueue />);
    
    const selectAllButton = screen.getByText('Select All');
    fireEvent.click(selectAllButton);
    
    await waitFor(() => {
      expect(mockQueueSelection.selectAllVisible).toHaveBeenCalled();
    });
  });

  it('opens preview when eye icon is clicked', async () => {
    render(<AssessmentVerificationQueue />);
    
    const previewButton = screen.getByRole('button', { name: '' }); // Eye icon button
    fireEvent.click(previewButton);
    
    await waitFor(() => {
      expect(mockVerificationStore.openPreview).toHaveBeenCalledWith(mockQueueData.queue[0].assessment);
    });
  });

  it('calls onBatchAction when batch actions are triggered', () => {
    const mockOnBatchAction = jest.fn();
    
    // Mock selected assessments
    mockQueueSelection.getSelectedCount.mockReturnValue(1);
    mockQueueSelection.selectedAssessmentIds = ['1'];
    
    render(<AssessmentVerificationQueue onBatchAction={mockOnBatchAction} />);
    
    // Should show batch actions when assessments are selected
    expect(screen.getByText('1 assessment selected')).toBeInTheDocument();
    
    const approveButton = screen.getByText('Approve Selected');
    fireEvent.click(approveButton);
    
    expect(mockOnBatchAction).toHaveBeenCalledWith('APPROVE', ['1']);
  });

  it('handles pagination', async () => {
    // Mock multiple pages
    const multiPageData = {
      ...mockQueueData,
      pagination: {
        page: 1,
        pageSize: 20,
        totalPages: 3,
        totalCount: 50,
      },
    };
    
    require('@/stores/verification.store').useQueueData.mockReturnValue(multiPageData);
    
    render(<AssessmentVerificationQueue />);
    
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(mockVerificationStore.setPage).toHaveBeenCalledWith(2);
    });
  });

  it('shows loading state', () => {
    const loadingData = { ...mockQueueData, isLoading: true };
    require('@/stores/verification.store').useQueueData.mockReturnValue(loadingData);
    
    render(<AssessmentVerificationQueue />);
    
    // Should show skeleton loaders
    const skeletons = screen.getAllByTestId(/skeleton/i);
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows error state and retry functionality', async () => {
    const errorData = { 
      ...mockQueueData, 
      isLoading: false, 
      error: 'Failed to load verification queue' 
    };
    require('@/stores/verification.store').useQueueData.mockReturnValue(errorData);
    
    render(<AssessmentVerificationQueue />);
    
    expect(screen.getByText(/failed to load verification queue/i)).toBeInTheDocument();
    
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    
    await waitFor(() => {
      expect(mockVerificationStore.fetchQueue).toHaveBeenCalled();
    });
  });

  it('shows empty state when no assessments', () => {
    const emptyData = { ...mockQueueData, queue: [] };
    require('@/stores/verification.store').useQueueData.mockReturnValue(emptyData);
    
    render(<AssessmentVerificationQueue />);
    
    expect(screen.getByText('No assessments in verification queue')).toBeInTheDocument();
  });

  it('applies filters correctly', async () => {
    render(<AssessmentVerificationQueue />);
    
    // Open filters
    fireEvent.click(screen.getByText('Filters'));
    
    await waitFor(() => {
      const typeSelect = screen.getByRole('combobox');
      fireEvent.click(typeSelect);
    });
    
    // This would test filter application, but requires more complex mocking
    // of the Select component behavior
  });

  it('refreshes queue when refresh button is clicked', async () => {
    render(<AssessmentVerificationQueue />);
    
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(mockVerificationStore.fetchQueue).toHaveBeenCalled();
    });
  });

  it('initializes with queue fetch on mount', () => {
    render(<AssessmentVerificationQueue />);
    
    expect(mockVerificationStore.fetchQueue).toHaveBeenCalled();
  });
});