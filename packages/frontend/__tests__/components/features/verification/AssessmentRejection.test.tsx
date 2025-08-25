import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AssessmentRejection } from '@/components/features/verification/AssessmentRejection';
import { RapidAssessment } from '@dms/shared';

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

// Mock fetch
global.fetch = jest.fn();

const mockAssessment: RapidAssessment = {
  id: 'test-assessment-id',
  type: 'HEALTH',
  date: new Date('2023-08-25'),
  affectedEntityId: 'entity-1',
  assessorName: 'John Assessor',
  assessorId: 'assessor-1',
  verificationStatus: 'PENDING',
  syncStatus: 'SYNCED',
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

describe('AssessmentRejection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders rejection button for pending assessments', () => {
    render(<AssessmentRejection assessment={mockAssessment} />);
    
    expect(screen.getByText('Reject Assessment')).toBeInTheDocument();
  });

  it('shows already rejected state for rejected assessments', () => {
    const rejectedAssessment = { ...mockAssessment, verificationStatus: 'REJECTED' as const };
    
    render(<AssessmentRejection assessment={rejectedAssessment} />);
    
    expect(screen.getByText('Already Rejected')).toBeInTheDocument();
    expect(screen.queryByText('Reject Assessment')).not.toBeInTheDocument();
  });

  it('opens rejection dialog with form fields', async () => {
    render(<AssessmentRejection assessment={mockAssessment} />);

    fireEvent.click(screen.getByText('Reject Assessment'));

    await waitFor(() => {
      expect(screen.getByText('Reject Assessment')).toBeInTheDocument();
      expect(screen.getByText('Rejection Reason')).toBeInTheDocument();
      expect(screen.getByText('Feedback Priority')).toBeInTheDocument();
      expect(screen.getByText('Specific Feedback')).toBeInTheDocument();
    });
  });

  it('validates required fields before submission', async () => {
    const mockToast = require('@/components/ui/use-toast').toast;
    
    render(<AssessmentRejection assessment={mockAssessment} />);

    fireEvent.click(screen.getByText('Reject Assessment'));

    await waitFor(() => {
      const submitButton = screen.getByText('Reject Assessment');
      expect(submitButton).toBeDisabled();
    });
  });

  it('enables submission when feedback is provided', async () => {
    render(<AssessmentRejection assessment={mockAssessment} />);

    fireEvent.click(screen.getByText('Reject Assessment'));

    await waitFor(() => {
      const feedbackTextarea = screen.getByPlaceholderText(/Provide specific, constructive feedback/);
      fireEvent.change(feedbackTextarea, { 
        target: { value: 'The population data appears inconsistent with household count.' } 
      });

      const submitButton = screen.getByText('Reject Assessment');
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('submits rejection successfully', async () => {
    const mockOnRejectionComplete = jest.fn();
    const mockToast = require('@/components/ui/use-toast').toast;
    
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          assessmentId: 'test-assessment-id',
          verificationStatus: 'REJECTED',
          rejectedBy: 'Test Coordinator',
          rejectedAt: new Date(),
          feedbackId: 'feedback-123',
          notificationSent: true,
        },
      }),
    });

    render(
      <AssessmentRejection 
        assessment={mockAssessment} 
        onRejectionComplete={mockOnRejectionComplete}
      />
    );

    fireEvent.click(screen.getByText('Reject Assessment'));

    await waitFor(() => {
      // Fill in required feedback
      const feedbackTextarea = screen.getByPlaceholderText(/Provide specific, constructive feedback/);
      fireEvent.change(feedbackTextarea, { 
        target: { value: 'Please review the population data for accuracy.' } 
      });

      // Select rejection reason
      const reasonSelect = screen.getByDisplayValue('Data Quality Issues');
      expect(reasonSelect).toBeInTheDocument();

      // Submit
      fireEvent.click(screen.getByText('Reject Assessment'));
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/v1/verification/assessments/test-assessment-id/reject',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"rejectionComments":"Please review the population data for accuracy."'),
        })
      );
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Assessment Rejected',
          variant: 'default',
        })
      );
      expect(mockOnRejectionComplete).toHaveBeenCalledWith('test-assessment-id');
    });
  });

  it('changes rejection reason and priority', async () => {
    render(<AssessmentRejection assessment={mockAssessment} />);

    fireEvent.click(screen.getByText('Reject Assessment'));

    await waitFor(() => {
      // Test that we can see the default values
      expect(screen.getByDisplayValue('Data Quality Issues')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Normal')).toBeInTheDocument();
      
      // Test form interaction - the selects should be present
      const reasonDropdown = screen.getByRole('combobox', { name: /rejection reason/i });
      const priorityDropdown = screen.getByRole('combobox', { name: /feedback priority/i });
      
      expect(reasonDropdown).toBeInTheDocument();
      expect(priorityDropdown).toBeInTheDocument();
    });
  });

  it('shows feedback preview when comments are entered', async () => {
    render(<AssessmentRejection assessment={mockAssessment} />);

    fireEvent.click(screen.getByText('Reject Assessment'));

    await waitFor(() => {
      const feedbackTextarea = screen.getByPlaceholderText(/Provide specific, constructive feedback/);
      fireEvent.change(feedbackTextarea, { 
        target: { value: 'This is test feedback for preview.' } 
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Feedback Preview:')).toBeInTheDocument();
      expect(screen.getByText('This is test feedback for preview.')).toBeInTheDocument();
    });
  });

  it('toggles notification and resubmission checkboxes', async () => {
    render(<AssessmentRejection assessment={mockAssessment} />);

    fireEvent.click(screen.getByText('Reject Assessment'));

    await waitFor(() => {
      const notifyCheckbox = screen.getByLabelText('Notify assessor immediately');
      const resubmissionCheckbox = screen.getByLabelText('Requires resubmission after corrections');
      
      expect(notifyCheckbox).toBeChecked();
      expect(resubmissionCheckbox).toBeChecked();
      
      fireEvent.click(notifyCheckbox);
      fireEvent.click(resubmissionCheckbox);
      
      expect(notifyCheckbox).not.toBeChecked();
      expect(resubmissionCheckbox).not.toBeChecked();
    });
  });

  it('handles rejection errors gracefully', async () => {
    const mockToast = require('@/components/ui/use-toast').toast;
    
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        message: 'Server error occurred',
      }),
    });

    render(<AssessmentRejection assessment={mockAssessment} />);

    fireEvent.click(screen.getByText('Reject Assessment'));

    await waitFor(() => {
      const feedbackTextarea = screen.getByPlaceholderText(/Provide specific, constructive feedback/);
      fireEvent.change(feedbackTextarea, { 
        target: { value: 'Test feedback' } 
      });
      
      fireEvent.click(screen.getByText('Reject Assessment'));
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Rejection Failed',
          variant: 'destructive',
        })
      );
    });
  });

  it('shows loading state during rejection', async () => {
    (fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      }), 100))
    );

    render(<AssessmentRejection assessment={mockAssessment} />);

    fireEvent.click(screen.getByText('Reject Assessment'));

    await waitFor(() => {
      const feedbackTextarea = screen.getByPlaceholderText(/Provide specific, constructive feedback/);
      fireEvent.change(feedbackTextarea, { 
        target: { value: 'Test feedback' } 
      });
      
      fireEvent.click(screen.getByText('Reject Assessment'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Rejecting.../)).toBeInTheDocument();
    });
  });

  it('handles authentication error', async () => {
    const mockUseAuth = require('@/hooks/useAuth').useAuth;
    mockUseAuth.mockReturnValueOnce({ user: null });

    const mockToast = require('@/components/ui/use-toast').toast;

    render(<AssessmentRejection assessment={mockAssessment} />);

    fireEvent.click(screen.getByText('Reject Assessment'));

    await waitFor(() => {
      const feedbackTextarea = screen.getByPlaceholderText(/Provide specific, constructive feedback/);
      fireEvent.change(feedbackTextarea, { 
        target: { value: 'Test feedback' } 
      });
      
      fireEvent.click(screen.getByText('Reject Assessment'));
    });

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

  it('displays assessment information in dialog', async () => {
    render(<AssessmentRejection assessment={mockAssessment} />);

    fireEvent.click(screen.getByText('Reject Assessment'));

    await waitFor(() => {
      expect(screen.getByText('HEALTH')).toBeInTheDocument();
      expect(screen.getByText('John Assessor')).toBeInTheDocument();
      expect(screen.getByText(/Aug 25, 2023/)).toBeInTheDocument();
    });
  });
});