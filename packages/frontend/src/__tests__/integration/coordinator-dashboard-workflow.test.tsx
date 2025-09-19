import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import CoordinatorDashboard from '@/app/(dashboard)/coordinator/dashboard/page';
import { useDashboardBadges } from '@/hooks/useDashboardBadges';
import { useQueueManagement } from '@/hooks/useQueueManagement';
import { useVerificationActions } from '@/hooks/useVerificationActions';

// Mock all hooks and components
jest.mock('next/navigation');
jest.mock('@/hooks/useDashboardBadges');
jest.mock('@/hooks/useQueueManagement');
jest.mock('@/hooks/useVerificationActions');
jest.mock('@/components/features/verification/AssessmentVerificationQueue', () => ({
  AssessmentVerificationQueue: ({ onPreviewAssessment }: any) => (
    <div data-testid="assessment-queue">
      <button onClick={() => onPreviewAssessment('test-id')}>Preview Assessment</button>
    </div>
  )
}));
jest.mock('@/components/features/verification/ResponseVerificationQueue', () => ({
  ResponseVerificationQueue: ({ onPreviewResponse }: any) => (
    <div data-testid="response-queue">
      <button onClick={() => onPreviewResponse('test-id')}>Preview Response</button>
    </div>
  )
}));
jest.mock('@/components/features/verification/QuickViewModal', () => ({
  QuickViewModal: ({ isOpen, onClose, onVerify, onReject }: any) => (
    isOpen ? (
      <div data-testid="quick-view-modal">
        <button onClick={onVerify}>Verify</button>
        <button onClick={onReject}>Reject</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}));
jest.mock('@/components/features/coordinator/ResourceCoordinationPanel', () => ({
  ResourceCoordinationPanel: () => <div data-testid="resource-panel">Resource Panel</div>
}));
jest.mock('@/components/features/coordinator/TeamAssignmentPanel', () => ({
  TeamAssignmentPanel: () => <div data-testid="team-panel">Team Panel</div>
}));
jest.mock('@/components/features/coordinator/CommunicationFeedPanel', () => ({
  CommunicationFeedPanel: () => <div data-testid="communication-panel">Communication Panel</div>
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseDashboardBadges = useDashboardBadges as jest.MockedFunction<typeof useDashboardBadges>;
const mockUseQueueManagement = useQueueManagement as jest.MockedFunction<typeof useQueueManagement>;
const mockUseVerificationActions = useVerificationActions as jest.MockedFunction<typeof useVerificationActions>;

describe('Coordinator Dashboard End-to-End Workflow', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockBadges = {
    assessmentQueue: 15,
    responseQueue: 8,
    assessmentReviews: 5,
    incidentManagement: 2,
    activeIncidents: 2,
    totalLocations: 9,
    conflictResolution: 0,
    activeUsers: 8
  };

  const mockQueueManagement = {
    assessmentQueue: [],
    responseQueue: [],
    assessmentMetrics: {
      totalPending: 15,
      averageProcessingTime: 45,
      queueVelocity: 12,
      bottleneckThreshold: 60,
      isBottleneck: false,
      trendDirection: 'STABLE' as const
    },
    responseMetrics: {
      totalPending: 8,
      averageProcessingTime: 75,
      queueVelocity: 8,
      bottleneckThreshold: 60,
      isBottleneck: true,
      trendDirection: 'UP' as const
    },
    combinedMetrics: {
      totalPending: 23,
      totalVelocity: 20,
      hasBottleneck: true
    },
    refreshQueues: jest.fn(),
    previewItem: null,
    previewType: null,
    openPreview: jest.fn(),
    closePreview: jest.fn(),
    isLoading: false,
    error: null
  };

  const mockVerificationActions = {
    verifyItem: jest.fn(),
    rejectItem: jest.fn(),
    isVerifying: false,
    isRejecting: false
  };

  beforeEach(() => {
    mockUseRouter.mockReturnValue(mockRouter);
    mockUseDashboardBadges.mockReturnValue({
      badges: mockBadges,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
    mockUseQueueManagement.mockReturnValue(mockQueueManagement);
    mockUseVerificationActions.mockReturnValue(mockVerificationActions);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders coordinator dashboard with all main components', () => {
    render(<CoordinatorDashboard />);

    expect(screen.getByText('Coordination Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Real-time assessment and response queue management/)).toBeInTheDocument();
    expect(screen.getByTestId('assessment-queue')).toBeInTheDocument();
    expect(screen.getByTestId('response-queue')).toBeInTheDocument();
    expect(screen.getByTestId('resource-panel')).toBeInTheDocument();
    expect(screen.getByTestId('team-panel')).toBeInTheDocument();
    expect(screen.getByTestId('communication-panel')).toBeInTheDocument();
  });

  it('displays real-time metrics from badges data', () => {
    render(<CoordinatorDashboard />);

    expect(screen.getByText('15')).toBeInTheDocument(); // Pending assessments
    expect(screen.getByText('8')).toBeInTheDocument(); // Pending responses
    expect(screen.getByText('2')).toBeInTheDocument(); // Active incidents
    expect(screen.getByText('9')).toBeInTheDocument(); // Total locations
  });

  it('shows bottleneck alerts when response queue is bottlenecked', () => {
    render(<CoordinatorDashboard />);

    expect(screen.getByText('Bottleneck Alerts')).toBeInTheDocument();
    expect(screen.getByText(/Response queue processing is 15s above threshold/)).toBeInTheDocument();
  });

  it('allows navigation between different dashboard tabs', async () => {
    render(<CoordinatorDashboard />);

    // Check default tab is combined view
    expect(screen.getByTestId('assessment-queue')).toBeInTheDocument();
    expect(screen.getByTestId('response-queue')).toBeInTheDocument();

    // Switch to resources tab
    const resourcesTab = screen.getByText('Resources');
    fireEvent.click(resourcesTab);

    await waitFor(() => {
      expect(screen.getByTestId('resource-panel')).toBeInTheDocument();
    });

    // Switch to teams tab
    const teamsTab = screen.getByText('Teams');
    fireEvent.click(teamsTab);

    await waitFor(() => {
      expect(screen.getByTestId('team-panel')).toBeInTheDocument();
    });

    // Switch to communications tab
    const communicationsTab = screen.getByText('Messages');
    fireEvent.click(communicationsTab);

    await waitFor(() => {
      expect(screen.getByTestId('communication-panel')).toBeInTheDocument();
    });
  });

  it('handles assessment preview workflow', async () => {
    const { openPreview } = mockQueueManagement;
    
    render(<CoordinatorDashboard />);

    // Click preview assessment button
    const previewButton = screen.getByText('Preview Assessment');
    fireEvent.click(previewButton);

    expect(openPreview).toHaveBeenCalledWith(expect.any(Object), 'assessment');
  });

  it('handles response preview workflow', async () => {
    const { openPreview } = mockQueueManagement;
    
    render(<CoordinatorDashboard />);

    // Click preview response button
    const previewButton = screen.getByText('Preview Response');
    fireEvent.click(previewButton);

    expect(openPreview).toHaveBeenCalledWith(expect.any(Object), 'response');
  });

  it('handles verification actions from modal', async () => {
    const { verifyItem, rejectItem } = mockVerificationActions;
    const { closePreview } = mockQueueManagement;

    // Simulate modal being open
    mockQueueManagement.previewItem = { id: 'test-id' };
    mockQueueManagement.previewType = 'assessment';

    render(<CoordinatorDashboard />);

    // Verify item
    const verifyButton = screen.getByText('Verify');
    fireEvent.click(verifyButton);

    expect(verifyItem).toHaveBeenCalledWith('test-id', 'assessment');
    expect(closePreview).toHaveBeenCalled();

    // Reset and test rejection
    mockQueueManagement.previewItem = { id: 'test-id' };
    render(<CoordinatorDashboard />);

    const rejectButton = screen.getByText('Reject');
    fireEvent.click(rejectButton);

    expect(rejectItem).toHaveBeenCalledWith('test-id', 'assessment');
    expect(closePreview).toHaveBeenCalled();
  });

  it('navigates to management pages via quick actions', async () => {
    render(<CoordinatorDashboard />);

    // Test manage incidents button
    const manageIncidentsButton = screen.getByText('Manage Incidents');
    fireEvent.click(manageIncidentsButton);

    expect(mockRouter.push).toHaveBeenCalledWith('/coordinator/incidents');

    // Test auto-approval button
    const autoApprovalButton = screen.getByText('Auto-Approval');
    fireEvent.click(autoApprovalButton);

    expect(mockRouter.push).toHaveBeenCalledWith('/coordinator/auto-approval');

    // Test conflicts button
    const conflictsButton = screen.getByText('Conflicts (0)');
    fireEvent.click(conflictsButton);

    expect(mockRouter.push).toHaveBeenCalledWith('/coordinator/conflicts');
  });

  it('displays loading states during data fetching', () => {
    mockUseDashboardBadges.mockReturnValue({
      badges: null,
      loading: true,
      error: null,
      refetch: jest.fn(),
    });

    render(<CoordinatorDashboard />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays error states when data fetching fails', () => {
    mockUseDashboardBadges.mockReturnValue({
      badges: null,
      loading: false,
      error: 'Failed to fetch badges',
      refetch: jest.fn(),
    });

    render(<CoordinatorDashboard />);

    expect(screen.getByText('Error: Failed to fetch badges')).toBeInTheDocument();
  });

  it('shows empty state when no data is available', () => {
    mockUseDashboardBadges.mockReturnValue({
      badges: null,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<CoordinatorDashboard />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('calculates metrics correctly from badges data', () => {
    render(<CoordinatorDashboard />);

    // Verify derived metrics
    expect(screen.getByText('15')).toBeInTheDocument(); // Pending assessments
    expect(screen.getByText('8')).toBeInTheDocument(); // Pending responses
    expect(screen.getByText('0')).toBeInTheDocument(); // Flagged items (conflictResolution)
  });

  it('displays live updates indicator', () => {
    render(<CoordinatorDashboard />);

    expect(screen.getByText('Live Updates')).toBeInTheDocument();
    const liveIndicator = screen.getByRole('status', { hidden: true });
    expect(liveIndicator).toHaveClass('animate-pulse');
  });

  it('refreshes queues after verification actions', async () => {
    const { refreshQueues } = mockQueueManagement;
    
    render(<CoordinatorDashboard />);

    // Simulate verification callback
    const verificationCallback = mockUseVerificationActions.mock.calls[0][0];
    await verificationCallback();

    expect(refreshQueues).toHaveBeenCalled();
  });
});