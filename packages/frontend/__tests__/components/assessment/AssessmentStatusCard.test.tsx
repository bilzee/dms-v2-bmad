import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssessmentStatusCard } from '@/components/features/assessment/AssessmentStatusCard';
import { AssessmentType, VerificationStatus, SyncStatus, type RapidAssessment } from '@dms/shared';

// Mock the FeedbackViewer component
jest.mock('@/components/features/assessment/FeedbackViewer', () => ({
  FeedbackViewer: ({ assessmentId, onClose, onMarkAsRead }: any) => (
    <div data-testid="feedback-viewer">
      <div>Feedback for {assessmentId}</div>
      <button onClick={() => onMarkAsRead('feedback-1')} data-testid="mark-as-read">
        Mark as Read
      </button>
      <button onClick={onClose} data-testid="close-feedback">
        Close
      </button>
    </div>
  ),
}));

const createMockAssessment = (overrides: Partial<RapidAssessment> = {}): RapidAssessment => ({
  id: 'assessment-1',
  type: AssessmentType.HEALTH,
  date: new Date('2024-01-15'),
  affectedEntityId: 'entity-1',
  assessorName: 'Dr. Jane Smith',
  assessorId: 'assessor-1',
  verificationStatus: VerificationStatus.PENDING,
  syncStatus: SyncStatus.SYNCED,
  data: {
    hasFunctionalClinic: true,
    numberHealthFacilities: 2,
    healthFacilityType: 'Basic Health Unit',
    qualifiedHealthWorkers: 5,
    hasMedicineSupply: false,
    hasMedicalSupplies: true,
    hasMaternalChildServices: true,
    commonHealthIssues: ['Malaria'],
  },
  mediaAttachments: [],
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T12:00:00Z'),
  ...overrides,
});

describe('AssessmentStatusCard', () => {
  it('renders assessment basic information', () => {
    const assessment = createMockAssessment();
    render(<AssessmentStatusCard assessment={assessment} />);
    
    expect(screen.getByText('HEALTH Assessment')).toBeInTheDocument();
    expect(screen.getByText('by Dr. Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('1/15/2024')).toBeInTheDocument(); // Assessment date
  });

  it('displays correct verification status badge for PENDING', () => {
    const assessment = createMockAssessment({ verificationStatus: VerificationStatus.PENDING });
    render(<AssessmentStatusCard assessment={assessment} />);
    
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('displays correct verification status badge for VERIFIED', () => {
    const assessment = createMockAssessment({ verificationStatus: VerificationStatus.VERIFIED });
    render(<AssessmentStatusCard assessment={assessment} />);
    
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('displays correct verification status badge for AUTO_VERIFIED', () => {
    const assessment = createMockAssessment({ verificationStatus: VerificationStatus.AUTO_VERIFIED });
    render(<AssessmentStatusCard assessment={assessment} />);
    
    expect(screen.getByText('Auto-Verified')).toBeInTheDocument();
  });

  it('displays correct verification status badge for REJECTED', () => {
    const assessment = createMockAssessment({ verificationStatus: VerificationStatus.REJECTED });
    render(<AssessmentStatusCard assessment={assessment} />);
    
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('shows sync status badge', () => {
    const assessment = createMockAssessment({ syncStatus: SyncStatus.SYNCED });
    render(<AssessmentStatusCard assessment={assessment} />);
    
    expect(screen.getByText('SYNCED')).toBeInTheDocument();
  });

  it('displays media attachment count when present', () => {
    const assessment = createMockAssessment({
      mediaAttachments: [
        {
          id: 'media-1',
          mimeType: 'image/jpeg',
          size: 1024,
          metadata: { timestamp: new Date() }
        },
        {
          id: 'media-2',
          mimeType: 'image/png', 
          size: 2048,
          metadata: { timestamp: new Date() }
        }
      ]
    });
    render(<AssessmentStatusCard assessment={assessment} />);
    
    expect(screen.getByText('📎 2 files')).toBeInTheDocument();
  });

  it('shows priority indicator when enabled', () => {
    const assessment = createMockAssessment({ verificationStatus: VerificationStatus.REJECTED });
    render(<AssessmentStatusCard assessment={assessment} showPriorityIndicator={true} />);
    
    // For rejected assessments, should show urgent priority (red indicator)
    const priorityIndicator = screen.getByRole('generic');
    expect(priorityIndicator).toHaveClass('bg-red-500');
  });

  it('hides priority indicator when disabled', () => {
    const assessment = createMockAssessment({ verificationStatus: VerificationStatus.REJECTED });
    render(<AssessmentStatusCard assessment={assessment} showPriorityIndicator={false} />);
    
    // Should not show priority indicator
    const priorityIndicators = screen.queryAllByRole('generic');
    const redIndicators = priorityIndicators.filter(el => el.classList.contains('bg-red-500'));
    expect(redIndicators).toHaveLength(0);
  });

  it('shows rejection section for rejected assessments', () => {
    const assessment = createMockAssessment({ verificationStatus: VerificationStatus.REJECTED });
    render(<AssessmentStatusCard assessment={assessment} />);
    
    expect(screen.getByText('Assessment Rejected')).toBeInTheDocument();
    expect(screen.getByText(/This assessment requires attention/)).toBeInTheDocument();
    expect(screen.getByText('View Feedback')).toBeInTheDocument();
  });

  it('does not show rejection section for non-rejected assessments', () => {
    const assessment = createMockAssessment({ verificationStatus: VerificationStatus.VERIFIED });
    render(<AssessmentStatusCard assessment={assessment} />);
    
    expect(screen.queryByText('Assessment Rejected')).not.toBeInTheDocument();
    expect(screen.queryByText('View Feedback')).not.toBeInTheDocument();
  });

  it('calls onViewDetails when View Details button is clicked', async () => {
    const mockOnViewDetails = jest.fn();
    const assessment = createMockAssessment();
    const user = userEvent.setup();
    
    render(
      <AssessmentStatusCard 
        assessment={assessment} 
        onViewDetails={mockOnViewDetails} 
      />
    );
    
    const viewDetailsButton = screen.getByText('View Details');
    await user.click(viewDetailsButton);
    
    expect(mockOnViewDetails).toHaveBeenCalledTimes(1);
  });

  it('calls onResubmit when Resubmit button is clicked for rejected assessments', async () => {
    const mockOnResubmit = jest.fn();
    const assessment = createMockAssessment({ verificationStatus: VerificationStatus.REJECTED });
    const user = userEvent.setup();
    
    render(
      <AssessmentStatusCard 
        assessment={assessment} 
        onResubmit={mockOnResubmit} 
      />
    );
    
    const resubmitButton = screen.getByText('Resubmit');
    await user.click(resubmitButton);
    
    expect(mockOnResubmit).toHaveBeenCalledTimes(1);
  });

  it('does not show Resubmit button for non-rejected assessments', () => {
    const mockOnResubmit = jest.fn();
    const assessment = createMockAssessment({ verificationStatus: VerificationStatus.VERIFIED });
    
    render(
      <AssessmentStatusCard 
        assessment={assessment} 
        onResubmit={mockOnResubmit} 
      />
    );
    
    expect(screen.queryByText('Resubmit')).not.toBeInTheDocument();
  });

  it('opens feedback viewer when View Feedback button is clicked', async () => {
    const assessment = createMockAssessment({ verificationStatus: VerificationStatus.REJECTED });
    const user = userEvent.setup();
    
    render(<AssessmentStatusCard assessment={assessment} />);
    
    const viewFeedbackButton = screen.getByText('View Feedback');
    await user.click(viewFeedbackButton);
    
    expect(screen.getByTestId('feedback-viewer')).toBeInTheDocument();
    expect(screen.getByText(`Feedback for ${assessment.id}`)).toBeInTheDocument();
  });

  it('closes feedback viewer when close button is clicked', async () => {
    const assessment = createMockAssessment({ verificationStatus: VerificationStatus.REJECTED });
    const user = userEvent.setup();
    
    render(<AssessmentStatusCard assessment={assessment} />);
    
    // Open feedback viewer
    const viewFeedbackButton = screen.getByText('View Feedback');
    await user.click(viewFeedbackButton);
    
    // Close feedback viewer
    const closeButton = screen.getByTestId('close-feedback');
    await user.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByTestId('feedback-viewer')).not.toBeInTheDocument();
    });
  });

  it('handles feedback mark as read action', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const assessment = createMockAssessment({ verificationStatus: VerificationStatus.REJECTED });
    const user = userEvent.setup();
    
    render(<AssessmentStatusCard assessment={assessment} />);
    
    // Open feedback viewer
    const viewFeedbackButton = screen.getByText('View Feedback');
    await user.click(viewFeedbackButton);
    
    // Mark feedback as read
    const markAsReadButton = screen.getByTestId('mark-as-read');
    await user.click(markAsReadButton);
    
    expect(consoleSpy).toHaveBeenCalledWith('Mark feedback as read:', 'feedback-1');
    
    consoleSpy.mockRestore();
  });

  it('displays correct assessment type icon', () => {
    const healthAssessment = createMockAssessment({ type: AssessmentType.HEALTH });
    const { rerender } = render(<AssessmentStatusCard assessment={healthAssessment} />);
    expect(screen.getByText('🏥')).toBeInTheDocument();
    
    const washAssessment = createMockAssessment({ type: AssessmentType.WASH });
    rerender(<AssessmentStatusCard assessment={washAssessment} />);
    expect(screen.getByText('💧')).toBeInTheDocument();
    
    const shelterAssessment = createMockAssessment({ type: AssessmentType.SHELTER });
    rerender(<AssessmentStatusCard assessment={shelterAssessment} />);
    expect(screen.getByText('🏠')).toBeInTheDocument();
  });

  it('calculates priority level correctly for old pending assessments', () => {
    // Create an assessment that's 8 days old and pending (should be urgent)
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 8);
    
    const assessment = createMockAssessment({ 
      verificationStatus: VerificationStatus.PENDING,
      updatedAt: oldDate 
    });
    
    render(<AssessmentStatusCard assessment={assessment} showPriorityIndicator={true} />);
    
    // Should show urgent priority (red indicator) for old pending assessments
    const priorityIndicator = screen.getByRole('generic');
    expect(priorityIndicator).toHaveClass('bg-red-500');
  });

  it('shows different sync status colors', () => {
    const failedAssessment = createMockAssessment({ syncStatus: SyncStatus.FAILED });
    render(<AssessmentStatusCard assessment={failedAssessment} />);
    
    const syncBadge = screen.getByText('FAILED');
    expect(syncBadge).toHaveClass('bg-red-100', 'text-red-800');
  });

  it('handles missing action handlers gracefully', () => {
    const assessment = createMockAssessment({ verificationStatus: VerificationStatus.REJECTED });
    
    // Should not crash when no handlers are provided
    expect(() => {
      render(<AssessmentStatusCard assessment={assessment} />);
    }).not.toThrow();
    
    // Should not show action buttons section when no actions available
    expect(screen.queryByText('View Details')).not.toBeInTheDocument();
    expect(screen.queryByText('Resubmit')).not.toBeInTheDocument();
  });
});