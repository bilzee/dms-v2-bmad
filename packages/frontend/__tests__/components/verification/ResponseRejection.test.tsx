import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ResponseRejection } from '../../../src/components/features/verification/ResponseRejection';
import { RapidResponse, ResponseRejectionRequest, ResponseType, ResponseStatus, VerificationStatus, SyncStatus, WashResponseData, User } from '@dms/shared';
import { useAuth } from '../../../src/hooks/useAuth';
import { toast } from '../../../src/hooks/use-toast';

// Mock dependencies
jest.mock('../../../src/hooks/useAuth');
jest.mock('../../../src/hooks/use-toast');
jest.mock('../../../src/lib/utils/cn', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

// Mock fetch
global.fetch = jest.fn();

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockToast = toast as jest.MockedFunction<typeof toast>;

const mockResponse: RapidResponse = {
  id: 'response-456',
  responseType: ResponseType.WASH,
  status: ResponseStatus.DELIVERED,
  plannedDate: new Date('2025-01-20'),
  deliveredDate: new Date('2025-01-22'),
  affectedEntityId: 'entity-123',
  assessmentId: 'assessment-123',
  responderId: 'responder-456',
  responderName: 'Jane Responder',
  donorId: 'donor-789',
  donorName: 'Test Donor',
  verificationStatus: VerificationStatus.PENDING,
  syncStatus: SyncStatus.SYNCED,
  data: {
    waterDeliveredLiters: 1000,
    waterContainersDistributed: 50,
    toiletsConstructed: 2,
    hygieneKitsDistributed: 25,
    additionalDetails: 'Emergency water supply delivered'
  } as WashResponseData,
  otherItemsDelivered: [],
  deliveryEvidence: [],
  requiresAttention: false,
  createdAt: new Date('2025-01-15'),
  updatedAt: new Date('2025-01-22'),
};

const mockUser: User = {
  id: 'coord-456',
  email: 'coordinator@test.com',
  name: 'Test Coordinator',
  roles: [{ id: 'role-1', name: 'COORDINATOR', permissions: [], isActive: true }],
  activeRole: { id: 'role-1', name: 'COORDINATOR', permissions: [], isActive: true },
  permissions: [],
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

describe('ResponseRejection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      error: null,
    });
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message: 'Response rejected successfully',
          data: {
            responseId: 'response-456',
            verificationStatus: 'REJECTED',
            rejectedBy: 'Test Coordinator',
            rejectedAt: new Date(),
            feedbackId: 'feedback-123',
            notificationSent: true,
          },
        }),
      })
    );
  });

  it('renders reject button for pending response', () => {
    render(<ResponseRejection response={mockResponse} />);
    
    expect(screen.getByText('Reject Response')).toBeInTheDocument();
  });

  it('shows already rejected status for rejected response', () => {
    const rejectedResponse = { ...mockResponse, verificationStatus: VerificationStatus.REJECTED };
    
    render(<ResponseRejection response={rejectedResponse} />);
    
    expect(screen.getByText('Already Rejected')).toBeInTheDocument();
    expect(screen.queryByText('Reject Response')).not.toBeInTheDocument();
  });

  it('opens rejection dialog with all required fields', async () => {
    const user = userEvent.setup();
    
    render(<ResponseRejection response={mockResponse} />);
    
    await user.click(screen.getByText('Reject Response'));
    
    expect(screen.getByText('Reject Response Delivery')).toBeInTheDocument();
    expect(screen.getByLabelText(/Rejection Reason/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Feedback Priority/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Specific Feedback/)).toBeInTheDocument();
    expect(screen.getByLabelText('Requires redelivery after corrections')).toBeInTheDocument();
    expect(screen.getByLabelText('Notify responder immediately')).toBeInTheDocument();
  });

  it('displays response details in rejection dialog', async () => {
    const user = userEvent.setup();
    
    render(<ResponseRejection response={mockResponse} />);
    
    await user.click(screen.getByText('Reject Response'));
    
    expect(screen.getByText('Type:')).toBeInTheDocument();
    expect(screen.getByText('WASH')).toBeInTheDocument();
    expect(screen.getByText('Responder:')).toBeInTheDocument();
    expect(screen.getByText('Jane Responder')).toBeInTheDocument();
    expect(screen.getByText('Status:')).toBeInTheDocument();
    expect(screen.getByText('DELIVERED')).toBeInTheDocument();
  });

  it('submits rejection with all form data', async () => {
    const user = userEvent.setup();
    const onRejectionComplete = jest.fn();
    
    render(<ResponseRejection response={mockResponse} onRejectionComplete={onRejectionComplete} />);
    
    // Open dialog using the trigger button
    const openButton = screen.getByTestId('reject-response-trigger');
    await user.click(openButton);
    
    // Wait for dialog to be fully rendered
    await waitFor(() => {
      expect(screen.getByText('Reject Response Delivery')).toBeInTheDocument();
    });
    
    // Select rejection reason using the select trigger
    const reasonSelect = screen.getByLabelText(/Rejection Reason/);
    await user.click(reasonSelect);
    
    // Find and click the option by role and text
    const dataQualityOption = screen.getByRole('option', { name: /Data Quality Issues/i });
    await user.click(dataQualityOption);
    
    // Select priority using the select trigger
    const prioritySelect = screen.getByLabelText(/Feedback Priority/);
    await user.click(prioritySelect);
    
    // Find and click the High priority option
    const highPriorityOption = screen.getByRole('option', { name: /High/i });
    await user.click(highPriorityOption);
    
    // Fill in comments
    const commentsInput = screen.getByLabelText(/Specific Feedback/);
    await user.type(commentsInput, 'The delivery quantities do not match the documentation provided.');
    
    // Uncheck resubmission required
    const resubmissionCheckbox = screen.getByLabelText('Requires redelivery after corrections');
    await user.click(resubmissionCheckbox);
    
    // Uncheck notification
    const notificationCheckbox = screen.getByLabelText('Notify responder immediately');
    await user.click(notificationCheckbox);
    
    // Submit rejection using the submit button in the dialog footer
    const submitButton = screen.getByTestId('reject-response-submit');
    expect(submitButton).toBeEnabled();
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/verification/responses/response-456/reject',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('response-456'),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Response Rejected',
      description: expect.stringContaining('Response WASH delivery has been rejected with feedback'),
      variant: 'default',
    });

    expect(onRejectionComplete).toHaveBeenCalledWith('response-456');
  });

  it('prevents submission without comments', async () => {
    const user = userEvent.setup();
    
    render(<ResponseRejection response={mockResponse} />);
    
    // Open dialog
    const openButton = screen.getByRole('button', { name: /reject response/i });
    await user.click(openButton);
    
    // Wait for dialog to be rendered
    await waitFor(() => {
      expect(screen.getByText('Reject Response Delivery')).toBeInTheDocument();
    });
    
    // The submit button should be enabled (validation happens on click)
    const submitButton = screen.getByTestId('reject-response-submit');
    expect(submitButton).toBeEnabled();
    
    // Try to submit without comments - should show validation toast
    await user.click(submitButton);
    
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Comments Required',
      description: 'Please provide specific feedback for the rejection.',
      variant: 'destructive',
    });
    
    // Should not make API call
    expect(global.fetch).not.toHaveBeenCalled();
    
    // Add comments and try again
    const commentsInput = screen.getByLabelText(/Specific Feedback/);
    await user.type(commentsInput, 'Missing delivery evidence');
    
    // Clear the mock to test successful submission
    mockToast.mockClear();
    
    // Now submission should work
    await user.click(submitButton);
    
    // Should make API call this time
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('shows feedback preview when comments are provided', async () => {
    const user = userEvent.setup();
    
    render(<ResponseRejection response={mockResponse} />);
    
    // Open dialog
    const openButton = screen.getByRole('button', { name: /reject response/i });
    await user.click(openButton);
    
    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByText('Reject Response Delivery')).toBeInTheDocument();
    });
    
    // Initially no preview
    expect(screen.queryByText('Feedback Preview:')).not.toBeInTheDocument();
    
    // Add comments
    const commentsInput = screen.getByLabelText(/Specific Feedback/);
    await user.type(commentsInput, 'Insufficient delivery documentation');
    
    // Preview should appear
    await waitFor(() => {
      expect(screen.getByText('Feedback Preview:')).toBeInTheDocument();
      // Check that the comment text appears somewhere in the preview area
      const previewSection = screen.getByText('Feedback Preview:').parentElement;
      expect(previewSection).toHaveTextContent('Insufficient delivery documentation');
    }, { timeout: 3000 });
  });

  it('shows all rejection reason options', async () => {
    const user = userEvent.setup();
    
    render(<ResponseRejection response={mockResponse} />);
    
    // Open dialog
    const openButton = screen.getByRole('button', { name: /reject response/i });
    await user.click(openButton);
    
    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByText('Reject Response Delivery')).toBeInTheDocument();
    });
    
    // Open rejection reason dropdown
    const reasonSelect = screen.getByLabelText(/Rejection Reason/);
    await user.click(reasonSelect);
    
    // Wait for options to appear and check they exist
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Data Quality Issues/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Missing Information/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Validation Error/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Insufficient Evidence/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Other/i })).toBeInTheDocument();
    });
  });

  it('shows all priority level options', async () => {
    const user = userEvent.setup();
    
    render(<ResponseRejection response={mockResponse} />);
    
    // Open dialog
    const openButton = screen.getByRole('button', { name: /reject response/i });
    await user.click(openButton);
    
    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByText('Reject Response Delivery')).toBeInTheDocument();
    });
    
    // Open priority dropdown
    const prioritySelect = screen.getByLabelText(/Feedback Priority/);
    await user.click(prioritySelect);
    
    // Wait for options to appear and check they exist
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Low/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Normal/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /High/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Urgent/i })).toBeInTheDocument();
    });
  });

  it('shows authentication error when user not logged in', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      error: null,
    });

    const user = userEvent.setup();
    
    render(<ResponseRejection response={mockResponse} />);
    
    // Open dialog
    const openButton = screen.getByRole('button', { name: /reject response/i });
    await user.click(openButton);
    
    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByText('Reject Response Delivery')).toBeInTheDocument();
    });
    
    // Add required comments
    const commentsInput = screen.getByLabelText(/Specific Feedback/);
    await user.type(commentsInput, 'Test rejection');
    
    // Find and click the submit button (should be enabled now)
    const submitButton = screen.getByTestId('reject-response-submit');
    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });
    await user.click(submitButton);
    
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Authentication Required',
      description: 'You must be logged in to reject responses.',
      variant: 'destructive',
    });
    
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('shows validation error for empty comments', async () => {
    const user = userEvent.setup();
    
    render(<ResponseRejection response={mockResponse} />);
    
    // Open dialog
    const openButton = screen.getByTestId('reject-response-trigger');
    await user.click(openButton);
    
    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByText('Reject Response Delivery')).toBeInTheDocument();
    });
    
    // The submit button should be enabled (only disabled during processing)
    const submitButton = screen.getByTestId('reject-response-submit');
    expect(submitButton).toBeEnabled();
    
    // Add some whitespace-only comments to test trimming
    const commentsInput = screen.getByLabelText(/Specific Feedback/);
    await user.type(commentsInput, '   ');
    
    // Clear the input to ensure it's empty
    await user.clear(commentsInput);
    
    // Click the submit button with empty comments - should show validation error
    await user.click(submitButton);
    
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Comments Required',
      description: 'Please provide specific feedback for the rejection.',
      variant: 'destructive',
    });
    
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('handles API error during rejection', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          message: 'Invalid rejection data',
        }),
      })
    );

    const user = userEvent.setup();
    
    render(<ResponseRejection response={mockResponse} />);
    
    // Open dialog
    const openButton = screen.getByRole('button', { name: /reject response/i });
    await user.click(openButton);
    
    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByText('Reject Response Delivery')).toBeInTheDocument();
    });
    
    const commentsInput = screen.getByLabelText(/Specific Feedback/);
    await user.type(commentsInput, 'Test rejection');
    
    // Find and click the submit button
    const submitButton = screen.getByTestId('reject-response-submit');
    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Rejection Failed',
        description: expect.stringContaining('Invalid rejection data'),
        variant: 'destructive',
      });
    });
  });

  it('cancels rejection dialog', async () => {
    const user = userEvent.setup();
    
    render(<ResponseRejection response={mockResponse} />);
    
    // Open dialog
    const openButton = screen.getByRole('button', { name: /reject response/i });
    await user.click(openButton);
    
    await waitFor(() => {
      expect(screen.getByText('Reject Response Delivery')).toBeInTheDocument();
    });
    
    // Cancel dialog
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    
    // Dialog should be closed
    await waitFor(() => {
      expect(screen.queryByText('Reject Response Delivery')).not.toBeInTheDocument();
    });
  });

  it('disables reject button when disabled prop is true', () => {
    render(<ResponseRejection response={mockResponse} disabled={true} />);
    
    expect(screen.getByText('Reject Response')).toBeDisabled();
  });

  it('shows character count for comments', async () => {
    const user = userEvent.setup();
    
    render(<ResponseRejection response={mockResponse} />);
    
    // Open dialog
    const openButton = screen.getByRole('button', { name: /reject response/i });
    await user.click(openButton);
    
    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByText('Reject Response Delivery')).toBeInTheDocument();
    });
    
    const commentsInput = screen.getByLabelText(/Specific Feedback/);
    await user.type(commentsInput, 'Test');
    
    await waitFor(() => {
      expect(screen.getByText('4 characters')).toBeInTheDocument();
    });
  });
});