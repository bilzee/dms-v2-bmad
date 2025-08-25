import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BatchApprovalRejection } from '@/components/features/verification/BatchApprovalRejection';

// Mock dependencies
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'test-coordinator-id',
      name: 'Test Coordinator',
      email: 'coordinator@test.com',
    },
  }),
}));

jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}));

jest.mock('@/stores/verification.store', () => ({
  useVerificationStore: () => ({
    batchApprove: jest.fn(),
    batchReject: jest.fn(),
  }),
  useBatchOperations: () => ({
    isBatchProcessing: false,
    batchProgress: {
      processed: 0,
      total: 0,
      currentOperation: '',
    },
  }),
}));

describe('BatchApprovalRejection', () => {
  const mockSelectedIds = ['assessment-1', 'assessment-2', 'assessment-3'];
  const mockOnBatchComplete = jest.fn();
  const mockOnClearSelection = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when no assessments are selected', () => {
    const { container } = render(
      <BatchApprovalRejection 
        selectedAssessmentIds={[]} 
        onBatchComplete={mockOnBatchComplete}
        onClearSelection={mockOnClearSelection}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('displays selection count and batch action buttons', () => {
    render(
      <BatchApprovalRejection 
        selectedAssessmentIds={mockSelectedIds} 
        onBatchComplete={mockOnBatchComplete}
        onClearSelection={mockOnClearSelection}
      />
    );
    
    expect(screen.getByText('3 assessments selected')).toBeInTheDocument();
    expect(screen.getByText('Approve All (3)')).toBeInTheDocument();
    expect(screen.getByText('Reject All (3)')).toBeInTheDocument();
    expect(screen.getByText('Clear Selection')).toBeInTheDocument();
  });

  it('handles clear selection', () => {
    render(
      <BatchApprovalRejection 
        selectedAssessmentIds={mockSelectedIds} 
        onBatchComplete={mockOnBatchComplete}
        onClearSelection={mockOnClearSelection}
      />
    );
    
    fireEvent.click(screen.getByText('Clear Selection'));
    expect(mockOnClearSelection).toHaveBeenCalled();
  });

  it('opens batch approval dialog', async () => {
    render(
      <BatchApprovalRejection 
        selectedAssessmentIds={mockSelectedIds} 
        onBatchComplete={mockOnBatchComplete}
        onClearSelection={mockOnClearSelection}
      />
    );
    
    fireEvent.click(screen.getByText('Approve All (3)'));
    
    await waitFor(() => {
      expect(screen.getByText('Batch Approve Assessments')).toBeInTheDocument();
      expect(screen.getByText('3 assessments will be approved')).toBeInTheDocument();
      expect(screen.getByText('Batch Approval Note')).toBeInTheDocument();
      expect(screen.getByText('Notify all assessors of approval')).toBeInTheDocument();
    });
  });

  it('opens batch rejection dialog', async () => {
    render(
      <BatchApprovalRejection 
        selectedAssessmentIds={mockSelectedIds} 
        onBatchComplete={mockOnBatchComplete}
        onClearSelection={mockOnClearSelection}
      />
    );
    
    fireEvent.click(screen.getByText('Reject All (3)'));
    
    await waitFor(() => {
      expect(screen.getByText('Batch Reject Assessments')).toBeInTheDocument();
      expect(screen.getByText('3 assessments will be rejected')).toBeInTheDocument();
      expect(screen.getByText('Rejection Reason')).toBeInTheDocument();
      expect(screen.getByText('Feedback Priority')).toBeInTheDocument();
      expect(screen.getByText('Batch Feedback')).toBeInTheDocument();
    });
  });

  it('processes batch approval successfully', async () => {
    const mockBatchApprove = jest.fn().mockResolvedValue(undefined);
    const mockStore = require('@/stores/verification.store');
    mockStore.useVerificationStore = () => ({
      batchApprove: mockBatchApprove,
      batchReject: jest.fn(),
    });

    const mockToast = require('@/components/ui/use-toast').toast;
    
    render(
      <BatchApprovalRejection 
        selectedAssessmentIds={mockSelectedIds} 
        onBatchComplete={mockOnBatchComplete}
        onClearSelection={mockOnClearSelection}
      />
    );
    
    // Open approval dialog
    fireEvent.click(screen.getByText('Approve All (3)'));
    
    await waitFor(() => {
      // Add a batch note
      const noteTextarea = screen.getByPlaceholderText(/Add a note for all approved assessments/);
      fireEvent.change(noteTextarea, { 
        target: { value: 'Batch approval - all assessments meet quality standards.' } 
      });
      
      // Submit approval
      fireEvent.click(screen.getByText('Approve 3 Assessments'));
    });

    await waitFor(() => {
      expect(mockBatchApprove).toHaveBeenCalledWith(
        mockSelectedIds,
        expect.objectContaining({
          assessmentIds: mockSelectedIds,
          coordinatorId: 'test-coordinator-id',
          coordinatorName: 'Test Coordinator',
          batchNote: 'Batch approval - all assessments meet quality standards.',
          notifyAssessors: true,
        })
      );
      
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Batch Approval Successful',
          variant: 'default',
        })
      );
      
      expect(mockOnBatchComplete).toHaveBeenCalled();
    });
  });

  it('processes batch rejection successfully', async () => {
    const mockBatchReject = jest.fn().mockResolvedValue(undefined);
    const mockStore = require('@/stores/verification.store');
    mockStore.useVerificationStore = () => ({
      batchApprove: jest.fn(),
      batchReject: mockBatchReject,
    });

    const mockToast = require('@/components/ui/use-toast').toast;
    
    render(
      <BatchApprovalRejection 
        selectedAssessmentIds={mockSelectedIds} 
        onBatchComplete={mockOnBatchComplete}
        onClearSelection={mockOnClearSelection}
      />
    );
    
    // Open rejection dialog
    fireEvent.click(screen.getByText('Reject All (3)'));
    
    await waitFor(() => {
      // Add feedback
      const feedbackTextarea = screen.getByPlaceholderText(/Provide feedback that applies to all selected assessments/);
      fireEvent.change(feedbackTextarea, { 
        target: { value: 'All assessments require additional documentation.' } 
      });
      
      // Submit rejection
      fireEvent.click(screen.getByText('Reject 3 Assessments'));
    });

    await waitFor(() => {
      expect(mockBatchReject).toHaveBeenCalledWith(
        mockSelectedIds,
        expect.objectContaining({
          assessmentIds: mockSelectedIds,
          coordinatorId: 'test-coordinator-id',
          coordinatorName: 'Test Coordinator',
          rejectionReason: 'DATA_QUALITY',
          rejectionComments: 'All assessments require additional documentation.',
          priority: 'NORMAL',
          notifyAssessors: true,
        })
      );
      
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Batch Rejection Successful',
          variant: 'default',
        })
      );
      
      expect(mockOnBatchComplete).toHaveBeenCalled();
    });
  });

  it('validates required fields for batch rejection', async () => {
    render(
      <BatchApprovalRejection 
        selectedAssessmentIds={mockSelectedIds} 
        onBatchComplete={mockOnBatchComplete}
        onClearSelection={mockOnClearSelection}
      />
    );
    
    fireEvent.click(screen.getByText('Reject All (3)'));
    
    await waitFor(() => {
      const submitButton = screen.getByText('Reject 3 Assessments');
      expect(submitButton).toBeDisabled();
    });
  });

  it('enables rejection submission when feedback is provided', async () => {
    render(
      <BatchApprovalRejection 
        selectedAssessmentIds={mockSelectedIds} 
        onBatchComplete={mockOnBatchComplete}
        onClearSelection={mockOnClearSelection}
      />
    );
    
    fireEvent.click(screen.getByText('Reject All (3)'));
    
    await waitFor(() => {
      const feedbackTextarea = screen.getByPlaceholderText(/Provide feedback that applies to all selected assessments/);
      fireEvent.change(feedbackTextarea, { 
        target: { value: 'Test batch rejection feedback' } 
      });
      
      const submitButton = screen.getByText('Reject 3 Assessments');
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('shows processing state during batch operations', () => {
    const mockStore = require('@/stores/verification.store');
    mockStore.useBatchOperations = () => ({
      isBatchProcessing: true,
      batchProgress: {
        processed: 2,
        total: 3,
        currentOperation: 'Processing batch approval...',
      },
    });

    render(
      <BatchApprovalRejection 
        selectedAssessmentIds={mockSelectedIds} 
        onBatchComplete={mockOnBatchComplete}
        onClearSelection={mockOnClearSelection}
      />
    );
    
    expect(screen.getByText('Processing batch operation...')).toBeInTheDocument();
    expect(screen.getByText('Processing batch approval...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles batch operation errors', async () => {
    const mockBatchApprove = jest.fn().mockRejectedValue(new Error('Network error'));
    const mockStore = require('@/stores/verification.store');
    mockStore.useVerificationStore = () => ({
      batchApprove: mockBatchApprove,
      batchReject: jest.fn(),
    });

    const mockToast = require('@/components/ui/use-toast').toast;
    
    render(
      <BatchApprovalRejection 
        selectedAssessmentIds={mockSelectedIds} 
        onBatchComplete={mockOnBatchComplete}
        onClearSelection={mockOnClearSelection}
      />
    );
    
    fireEvent.click(screen.getByText('Approve All (3)'));
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Approve 3 Assessments'));
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Batch Approval Failed',
          variant: 'destructive',
        })
      );
    });
  });

  it('toggles notification checkboxes', async () => {
    render(
      <BatchApprovalRejection 
        selectedAssessmentIds={mockSelectedIds} 
        onBatchComplete={mockOnBatchComplete}
        onClearSelection={mockOnClearSelection}
      />
    );
    
    // Test approval dialog
    fireEvent.click(screen.getByText('Approve All (3)'));
    
    await waitFor(() => {
      const notifyCheckbox = screen.getByLabelText('Notify all assessors of approval');
      expect(notifyCheckbox).toBeChecked();
      
      fireEvent.click(notifyCheckbox);
      expect(notifyCheckbox).not.toBeChecked();
    });
  });

  it('handles authentication error', async () => {
    const mockUseAuth = require('@/hooks/useAuth').useAuth;
    mockUseAuth.mockReturnValueOnce({ user: null });

    const mockToast = require('@/components/ui/use-toast').toast;

    render(
      <BatchApprovalRejection 
        selectedAssessmentIds={mockSelectedIds} 
        onBatchComplete={mockOnBatchComplete}
        onClearSelection={mockOnClearSelection}
      />
    );
    
    fireEvent.click(screen.getByText('Approve All (3)'));
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Approve 3 Assessments'));
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Authentication Required',
          variant: 'destructive',
        })
      );
    });
  });

  it('shows character count for rejection feedback', async () => {
    render(
      <BatchApprovalRejection 
        selectedAssessmentIds={mockSelectedIds} 
        onBatchComplete={mockOnBatchComplete}
        onClearSelection={mockOnClearSelection}
      />
    );
    
    fireEvent.click(screen.getByText('Reject All (3)'));
    
    await waitFor(() => {
      const feedbackTextarea = screen.getByPlaceholderText(/Provide feedback that applies to all selected assessments/);
      fireEvent.change(feedbackTextarea, { 
        target: { value: 'Test feedback' } 
      });
      
      expect(screen.getByText('13 characters')).toBeInTheDocument();
    });
  });
});