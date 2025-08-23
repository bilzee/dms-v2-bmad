import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssessmentStatusList } from '@/components/features/assessment/AssessmentStatusList';
import { VerificationStatus, SyncStatus, type RapidAssessment } from '@dms/shared';
import { useOfflineStore } from '@/stores/offline.store';

// Mock the offline store
jest.mock('@/stores/offline.store');
const mockUseOfflineStore = useOfflineStore as jest.MockedFunction<typeof useOfflineStore>;

// Mock the AssessmentStatusCard component
jest.mock('@/components/features/assessment/AssessmentStatusCard', () => ({
  AssessmentStatusCard: ({ assessment, onResubmit, onViewDetails }: any) => (
    <div data-testid={`assessment-card-${assessment.id}`}>
      <div>{assessment.type} Assessment</div>
      <div>Status: {assessment.verificationStatus}</div>
      <div>Assessor: {assessment.assessorName}</div>
      {onResubmit && (
        <button onClick={() => onResubmit()} data-testid={`resubmit-${assessment.id}`}>
          Resubmit
        </button>
      )}
      {onViewDetails && (
        <button onClick={() => onViewDetails()} data-testid={`view-details-${assessment.id}`}>
          View Details
        </button>
      )}
    </div>
  ),
}));

const mockAssessments: RapidAssessment[] = [
  {
    id: 'assessment-1',
    type: 'HEALTH',
    date: new Date('2024-01-15'),
    affectedEntityId: 'entity-1',
    assessorName: 'Dr. Jane Smith',
    assessorId: 'assessor-1',
    verificationStatus: VerificationStatus.REJECTED,
    syncStatus: SyncStatus.SYNCED,
    offlineId: 'offline-1',
    data: {},
    mediaAttachments: [],
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-16T10:00:00Z'),
  },
  {
    id: 'assessment-2',
    type: 'WASH',
    date: new Date('2024-01-16'),
    affectedEntityId: 'entity-2',
    assessorName: 'John Doe',
    assessorId: 'assessor-2',
    verificationStatus: VerificationStatus.PENDING,
    syncStatus: SyncStatus.SYNCED,
    data: {},
    mediaAttachments: [],
    createdAt: new Date('2024-01-16T10:00:00Z'),
    updatedAt: new Date('2024-01-16T10:00:00Z'),
  },
  {
    id: 'assessment-3',
    type: 'SHELTER',
    date: new Date('2024-01-17'),
    affectedEntityId: 'entity-3',
    assessorName: 'Sarah Johnson',
    assessorId: 'assessor-3',
    verificationStatus: VerificationStatus.VERIFIED,
    syncStatus: SyncStatus.SYNCED,
    data: {},
    mediaAttachments: [],
    createdAt: new Date('2024-01-17T10:00:00Z'),
    updatedAt: new Date('2024-01-17T10:00:00Z'),
  },
  {
    id: 'assessment-4',
    type: 'PRELIMINARY',
    date: new Date('2024-01-18'),
    affectedEntityId: 'entity-4',
    assessorName: 'Michael Chen',
    assessorId: 'assessor-4',
    verificationStatus: VerificationStatus.AUTO_VERIFIED,
    syncStatus: SyncStatus.SYNCED,
    data: {},
    mediaAttachments: [],
    createdAt: new Date('2024-01-18T10:00:00Z'),
    updatedAt: new Date('2024-01-18T10:00:00Z'),
  },
];

describe('AssessmentStatusList', () => {
  beforeEach(() => {
    mockUseOfflineStore.mockReturnValue({
      isOnline: true,
      queue: [],
      pendingAssessments: [],
      setOnlineStatus: jest.fn(),
      addToQueue: jest.fn(),
      removeFromQueue: jest.fn(),
      updateQueueItem: jest.fn(),
      addPendingAssessment: jest.fn(),
      removePendingAssessment: jest.fn(),
      clearQueue: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders assessment status review header', () => {
    render(<AssessmentStatusList assessments={mockAssessments} />);
    expect(screen.getByText('Assessment Status Review')).toBeInTheDocument();
  });

  it('displays correct status counts in filter buttons', () => {
    render(<AssessmentStatusList assessments={mockAssessments} />);
    
    expect(screen.getByText('All (4)')).toBeInTheDocument();
    expect(screen.getByText('Pending (1)')).toBeInTheDocument();
    expect(screen.getByText('✓ Verified (2)')).toBeInTheDocument(); // Includes both VERIFIED and AUTO_VERIFIED
    expect(screen.getByText('Rejected (1)')).toBeInTheDocument();
  });

  it('renders all assessment cards by default', () => {
    render(<AssessmentStatusList assessments={mockAssessments} />);
    
    mockAssessments.forEach(assessment => {
      expect(screen.getByTestId(`assessment-card-${assessment.id}`)).toBeInTheDocument();
    });
  });

  it('filters assessments by status when filter button is clicked', async () => {
    const user = userEvent.setup();
    render(<AssessmentStatusList assessments={mockAssessments} />);
    
    // Click on REJECTED filter
    await user.click(screen.getByText('Rejected (1)'));
    
    // Should only show rejected assessment
    expect(screen.getByTestId('assessment-card-assessment-1')).toBeInTheDocument();
    expect(screen.queryByTestId('assessment-card-assessment-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('assessment-card-assessment-3')).not.toBeInTheDocument();
    expect(screen.queryByTestId('assessment-card-assessment-4')).not.toBeInTheDocument();
  });

  it('filters assessments by search term', async () => {
    const user = userEvent.setup();
    render(<AssessmentStatusList assessments={mockAssessments} />);
    
    const searchInput = screen.getByPlaceholderText(/Search assessments/);
    await user.type(searchInput, 'HEALTH');
    
    // Should only show health assessment
    expect(screen.getByTestId('assessment-card-assessment-1')).toBeInTheDocument();
    expect(screen.queryByTestId('assessment-card-assessment-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('assessment-card-assessment-3')).not.toBeInTheDocument();
    expect(screen.queryByTestId('assessment-card-assessment-4')).not.toBeInTheDocument();
  });

  it('searches by assessor name', async () => {
    const user = userEvent.setup();
    render(<AssessmentStatusList assessments={mockAssessments} />);
    
    const searchInput = screen.getByPlaceholderText(/Search assessments/);
    await user.type(searchInput, 'Jane Smith');
    
    // Should only show assessment by Jane Smith
    expect(screen.getByTestId('assessment-card-assessment-1')).toBeInTheDocument();
    expect(screen.queryByTestId('assessment-card-assessment-2')).not.toBeInTheDocument();
  });

  it('sorts assessments by priority (rejected first, then pending)', () => {
    render(<AssessmentStatusList assessments={mockAssessments} />);
    
    const cards = screen.getAllByTestId(/assessment-card-/);
    
    // First card should be the rejected one (assessment-1)
    expect(cards[0]).toHaveAttribute('data-testid', 'assessment-card-assessment-1');
    
    // Second card should be the pending one (assessment-2)
    expect(cards[1]).toHaveAttribute('data-testid', 'assessment-card-assessment-2');
  });

  it('displays results summary correctly', () => {
    render(<AssessmentStatusList assessments={mockAssessments} />);
    expect(screen.getByText('Showing 4 of 4 assessments')).toBeInTheDocument();
  });

  it('updates results summary when searching', async () => {
    const user = userEvent.setup();
    render(<AssessmentStatusList assessments={mockAssessments} />);
    
    const searchInput = screen.getByPlaceholderText(/Search assessments/);
    await user.type(searchInput, 'HEALTH');
    
    expect(screen.getByText('Showing 1 of 4 assessments matching "HEALTH"')).toBeInTheDocument();
  });

  it('calls onRefresh when refresh button is clicked', async () => {
    const mockOnRefresh = jest.fn();
    const user = userEvent.setup();
    render(<AssessmentStatusList assessments={mockAssessments} onRefresh={mockOnRefresh} />);
    
    const refreshButton = screen.getByText('Refresh');
    await user.click(refreshButton);
    
    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it('disables refresh button when offline', () => {
    mockUseOfflineStore.mockReturnValue({
      isOnline: false,
      queue: [],
      pendingAssessments: [],
      setOnlineStatus: jest.fn(),
      addToQueue: jest.fn(),
      removeFromQueue: jest.fn(),
      updateQueueItem: jest.fn(),
      addPendingAssessment: jest.fn(),
      removePendingAssessment: jest.fn(),
      clearQueue: jest.fn(),
    });

    render(<AssessmentStatusList assessments={mockAssessments} />);
    
    const refreshButton = screen.getByText('Refresh');
    expect(refreshButton).toBeDisabled();
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('shows empty state when no assessments provided', () => {
    render(<AssessmentStatusList assessments={[]} />);
    
    expect(screen.getByText('No assessments found')).toBeInTheDocument();
    expect(screen.getByText('Your submitted assessments will appear here once you create them.')).toBeInTheDocument();
    expect(screen.getByText('Create Assessment')).toBeInTheDocument();
  });

  it('shows no matching results when search yields no results', async () => {
    const user = userEvent.setup();
    render(<AssessmentStatusList assessments={mockAssessments} />);
    
    const searchInput = screen.getByPlaceholderText(/Search assessments/);
    await user.type(searchInput, 'NonExistentType');
    
    expect(screen.getByText('No matching assessments')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search criteria or filters.')).toBeInTheDocument();
  });

  it('applies combined filters and search correctly', async () => {
    const user = userEvent.setup();
    render(<AssessmentStatusList assessments={mockAssessments} />);
    
    // Filter by VERIFIED and search for 'SHELTER'
    await user.click(screen.getByText(/✓ Verified/));
    
    const searchInput = screen.getByPlaceholderText(/Search assessments/);
    await user.type(searchInput, 'SHELTER');
    
    // Should only show the verified shelter assessment
    expect(screen.getByTestId('assessment-card-assessment-3')).toBeInTheDocument();
    expect(screen.queryByTestId('assessment-card-assessment-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('assessment-card-assessment-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('assessment-card-assessment-4')).not.toBeInTheDocument();
  });

  it('shows loading skeleton while refreshing', async () => {
    const mockOnRefresh = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
    const user = userEvent.setup();
    
    render(<AssessmentStatusList assessments={mockAssessments} onRefresh={mockOnRefresh} />);
    
    const refreshButton = screen.getByText('Refresh');
    await user.click(refreshButton);
    
    // Should show loading skeleton
    expect(screen.getByText('Refreshing...')).toBeInTheDocument();
    
    // Wait for refresh to complete
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
  });

  it('handles resubmit action for rejected assessments', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    render(<AssessmentStatusList assessments={mockAssessments} />);
    
    // The rejected assessment should have a resubmit button (mocked)
    const resubmitButton = screen.getByTestId('resubmit-assessment-1');
    fireEvent.click(resubmitButton);
    
    expect(consoleSpy).toHaveBeenCalledWith('Resubmit assessment:', 'assessment-1');
    
    consoleSpy.mockRestore();
  });

  it('handles view details action for all assessments', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    render(<AssessmentStatusList assessments={mockAssessments} />);
    
    // All assessments should have view details buttons
    mockAssessments.forEach(assessment => {
      const viewDetailsButton = screen.getByTestId(`view-details-${assessment.id}`);
      fireEvent.click(viewDetailsButton);
      expect(consoleSpy).toHaveBeenCalledWith('View details for assessment:', assessment.id);
    });
    
    consoleSpy.mockRestore();
  });
});