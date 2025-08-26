import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AssessmentApproval } from '@/components/features/verification/AssessmentApproval';
import { RapidAssessment, AssessmentType, VerificationStatus, SyncStatus } from '@dms/shared';

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

jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockAssessment: RapidAssessment = {
  id: 'test-assessment-id',
  type: AssessmentType.HEALTH,
  date: new Date('2023-08-25'),
  affectedEntityId: 'entity-1',
  assessorName: 'John Assessor',
  assessorId: 'assessor-1',
  verificationStatus: VerificationStatus.PENDING,
  syncStatus: SyncStatus.SYNCED,
  data: {
    hasFunctionalClinic: true,
    numberHealthFacilities: 2,
    healthFacilityType: 'Primary Care',
    qualifiedHealthWorkers: 5,
    hasMedicineSupply: true,
    hasMedicalSupplies: true,
    hasMaternalChildServices: false,
    commonHealthIssues: ['Malaria', 'Respiratory Issues'],
  },
  mediaAttachments: [],
  createdAt: new Date('2023-08-25'),
  updatedAt: new Date('2023-08-25'),
};

describe('AssessmentApproval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders approval buttons for pending assessments', () => {
    render(<AssessmentApproval assessment={mockAssessment} />);
    
    expect(screen.getByText('Quick Approve')).toBeInTheDocument();
    expect(screen.getByText('Approve with Note')).toBeInTheDocument();
  });

  it('shows already approved state for verified assessments', () => {
    const verifiedAssessment = { ...mockAssessment, verificationStatus: VerificationStatus.VERIFIED };
    
    render(<AssessmentApproval assessment={verifiedAssessment} />);
    
    expect(screen.getByText('Already Approved')).toBeInTheDocument();
    expect(screen.queryByText('Quick Approve')).not.toBeInTheDocument();
  });

  it('handles quick approval successfully', async () => {
    const mockOnApprovalComplete = jest.fn();
    const mockToast = require('@/hooks/use-toast').toast;
    
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          assessmentId: 'test-assessment-id',
          verificationStatus: VerificationStatus.VERIFIED,
          approvedBy: 'Test Coordinator',
          approvedAt: new Date(),
          notificationSent: true,
        },
      }),
    });

    render(
      <AssessmentApproval 
        assessment={mockAssessment} 
        onApprovalComplete={mockOnApprovalComplete}
      />
    );

    fireEvent.click(screen.getByText('Quick Approve'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/v1/verification/assessments/test-assessment-id/approve',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"assessmentId":"test-assessment-id"'),
        })
      );
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Assessment Approved',
          variant: 'default',
        })
      );
      expect(mockOnApprovalComplete).toHaveBeenCalledWith('test-assessment-id');
    });
  });

  it('opens dialog for approval with note', async () => {
    render(<AssessmentApproval assessment={mockAssessment} />);

    fireEvent.click(screen.getByText('Approve with Note'));

    await waitFor(() => {
      expect(screen.getByText('Approve Assessment')).toBeInTheDocument();
      expect(screen.getByText('Approval Note')).toBeInTheDocument();
      expect(screen.getByText('Notify assessor of approval')).toBeInTheDocument();
    });
  });

  it('submits approval with note correctly', async () => {
    const mockOnApprovalComplete = jest.fn();
    const mockToast = require('@/hooks/use-toast').toast;
    
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          assessmentId: 'test-assessment-id',
          verificationStatus: VerificationStatus.VERIFIED,
          approvedBy: 'Test Coordinator',
          approvedAt: new Date(),
          notificationSent: true,
        },
      }),
    });

    render(
      <AssessmentApproval 
        assessment={mockAssessment} 
        onApprovalComplete={mockOnApprovalComplete}
      />
    );

    // Open dialog
    fireEvent.click(screen.getByText('Approve with Note'));

    await waitFor(() => {
      expect(screen.getByText('Approve Assessment')).toBeInTheDocument();
    });

    // Add approval note
    const noteTextarea = screen.getByPlaceholderText(/Add a note about the approval/);
    fireEvent.change(noteTextarea, { 
      target: { value: 'Excellent data quality and completeness.' } 
    });

    // Submit approval
    fireEvent.click(screen.getByText('Approve Assessment'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/v1/verification/assessments/test-assessment-id/approve',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"approvalNote":"Excellent data quality and completeness."'),
        })
      );
    });

    await waitFor(() => {
      expect(mockOnApprovalComplete).toHaveBeenCalledWith('test-assessment-id');
    });
  });

  it('handles approval errors gracefully', async () => {
    const mockToast = require('@/hooks/use-toast').toast;
    
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        message: 'Server error occurred',
      }),
    });

    render(<AssessmentApproval assessment={mockAssessment} />);

    fireEvent.click(screen.getByText('Quick Approve'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Approval Failed',
          variant: 'destructive',
        })
      );
    });
  });

  it('disables buttons when disabled prop is true', () => {
    render(<AssessmentApproval assessment={mockAssessment} disabled />);
    
    expect(screen.getByText('Quick Approve')).toBeDisabled();
    expect(screen.getByText('Approve with Note')).toBeDisabled();
  });

  it('shows loading state during approval', async () => {
    (fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      }), 100))
    );

    render(<AssessmentApproval assessment={mockAssessment} />);

    fireEvent.click(screen.getByText('Quick Approve'));

    await waitFor(() => {
      expect(screen.getByText(/Approving.../)).toBeInTheDocument();
    });
  });

  it('toggles notification checkbox correctly', async () => {
    render(<AssessmentApproval assessment={mockAssessment} />);

    fireEvent.click(screen.getByText('Approve with Note'));

    await waitFor(() => {
      const notifyCheckbox = screen.getByLabelText('Notify assessor of approval');
      expect(notifyCheckbox).toBeChecked();
      
      fireEvent.click(notifyCheckbox);
      expect(notifyCheckbox).not.toBeChecked();
    });
  });

  it('displays assessment information in dialog', async () => {
    render(<AssessmentApproval assessment={mockAssessment} />);

    fireEvent.click(screen.getByText('Approve with Note'));

    await waitFor(() => {
      expect(screen.getByText('HEALTH')).toBeInTheDocument();
      expect(screen.getByText('John Assessor')).toBeInTheDocument();
      expect(screen.getByText(/Aug 25, 2023/)).toBeInTheDocument();
    });
  });

  it('handles authentication error', async () => {
    const mockUseAuth = require('@/hooks/useAuth').useAuth;
    mockUseAuth.mockReturnValueOnce({ user: null });

    const mockToast = require('@/hooks/use-toast').toast;

    render(<AssessmentApproval assessment={mockAssessment} />);

    fireEvent.click(screen.getByText('Quick Approve'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Authentication Required',
          variant: 'destructive',
        })
      );
    });

    expect(fetch).not.toHaveBeenCalled();
  });
});