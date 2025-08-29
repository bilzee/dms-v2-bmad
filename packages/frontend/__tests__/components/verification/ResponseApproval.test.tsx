import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponseApproval } from '../../../src/components/features/verification/ResponseApproval';
import { RapidResponse, ResponseApprovalRequest, ResponseType, ResponseStatus, VerificationStatus, SyncStatus, HealthResponseData, User } from '@dms/shared';
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
  id: 'response-123',
  responseType: ResponseType.HEALTH,
  status: ResponseStatus.DELIVERED,
  plannedDate: new Date('2025-01-20'),
  deliveredDate: new Date('2025-01-21'),
  affectedEntityId: 'entity-123',
  assessmentId: 'assessment-123',
  responderId: 'responder-456',
  responderName: 'John Responder',
  donorId: 'donor-789',
  donorName: 'Test Donor',
  verificationStatus: VerificationStatus.PENDING,
  syncStatus: SyncStatus.SYNCED,
  data: {
    medicinesDelivered: [{ name: 'Aspirin', quantity: 100, unit: 'tablets' }],
    medicalSuppliesDelivered: [{ name: 'Bandages', quantity: 100 }],
    healthWorkersDeployed: 2,
    patientsTreated: 50,
    additionalDetails: 'Emergency medical supplies delivered'
  } as HealthResponseData,
  otherItemsDelivered: [],
  deliveryEvidence: [],
  requiresAttention: false,
  createdAt: new Date('2025-01-15'),
  updatedAt: new Date('2025-01-21'),
};

const mockUser: User = {
  id: 'coord-123',
  email: 'coordinator@test.com',
  name: 'Test Coordinator',
  roles: [{ id: 'role-1', name: 'COORDINATOR', permissions: [], isActive: true }],
  activeRole: { id: 'role-1', name: 'COORDINATOR', permissions: [], isActive: true },
  permissions: [],
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

describe('ResponseApproval', () => {
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
          message: 'Response approved successfully',
          data: {
            responseId: 'response-123',
            verificationStatus: 'VERIFIED',
            approvedBy: 'Test Coordinator',
            approvedAt: new Date(),
            notificationSent: true,
          },
        }),
      })
    );
  });

  it('renders quick approval button for pending response', () => {
    render(<ResponseApproval response={mockResponse} />);
    
    expect(screen.getByText('Quick Approve')).toBeInTheDocument();
    expect(screen.getByText('Approve with Note')).toBeInTheDocument();
  });

  it('shows already approved status for verified response', () => {
    const verifiedResponse = { ...mockResponse, verificationStatus: VerificationStatus.VERIFIED };
    
    render(<ResponseApproval response={verifiedResponse} />);
    
    expect(screen.getByText('Already Approved')).toBeInTheDocument();
    expect(screen.queryByText('Quick Approve')).not.toBeInTheDocument();
  });

  it('handles quick approval successfully', async () => {
    const user = userEvent.setup();
    const onApprovalComplete = jest.fn();
    
    render(<ResponseApproval response={mockResponse} onApprovalComplete={onApprovalComplete} />);
    
    await user.click(screen.getByText('Quick Approve'));
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/verification/responses/response-123/approve',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"responseId":"response-123"'),
        })
      );
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Response Approved',
      description: expect.stringContaining('Response HEALTH delivery has been successfully approved'),
      variant: 'default',
    });

    expect(onApprovalComplete).toHaveBeenCalledWith('response-123');
  });

  it('opens detailed approval dialog', async () => {
    const user = userEvent.setup();
    
    render(<ResponseApproval response={mockResponse} />);
    
    await user.click(screen.getByText('Approve with Note'));
    
    expect(screen.getByText('Approve Response Delivery')).toBeInTheDocument();
    expect(screen.getByLabelText(/Approval Note/)).toBeInTheDocument();
    expect(screen.getByLabelText('Notify responder of approval')).toBeInTheDocument();
  });

  it('submits detailed approval with note', async () => {
    const user = userEvent.setup();
    const onApprovalComplete = jest.fn();
    
    render(<ResponseApproval response={mockResponse} onApprovalComplete={onApprovalComplete} />);
    
    // Open dialog
    await user.click(screen.getByText('Approve with Note'));
    
    // Fill in approval note
    const noteInput = screen.getByLabelText(/Approval Note/);
    await user.type(noteInput, 'Excellent delivery documentation');
    
    // Uncheck notification
    const notifyCheckbox = screen.getByLabelText('Notify responder of approval');
    await user.click(notifyCheckbox);
    
    // Submit approval
    await user.click(screen.getByText('Approve Response'));
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/verification/responses/response-123/approve',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"approvalNote":"Excellent delivery documentation"'),
        })
      );
    });

    expect(onApprovalComplete).toHaveBeenCalledWith('response-123');
  });

  it('shows authentication error when user not logged in', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      error: null,
    });

    const user = userEvent.setup();
    
    render(<ResponseApproval response={mockResponse} />);
    
    await user.click(screen.getByText('Quick Approve'));
    
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Authentication Required',
      description: 'You must be logged in to approve responses.',
      variant: 'destructive',
    });
    
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('handles API error during approval', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          success: false,
          message: 'Internal server error',
        }),
      })
    );

    const user = userEvent.setup();
    
    render(<ResponseApproval response={mockResponse} />);
    
    await user.click(screen.getByText('Quick Approve'));
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Approval Failed',
        description: 'Internal server error',
        variant: 'destructive',
      });
    });
  });

  it('displays response details in approval dialog', async () => {
    const user = userEvent.setup();
    const responseWithDelivery = {
      ...mockResponse,
      deliveredDate: new Date('2025-01-21'),
    };
    
    render(<ResponseApproval response={responseWithDelivery} />);
    
    await user.click(screen.getByText('Approve with Note'));
    
    expect(screen.getByText('Type:')).toBeInTheDocument();
    expect(screen.getByText('HEALTH')).toBeInTheDocument();
    expect(screen.getByText('Responder:')).toBeInTheDocument();
    expect(screen.getByText('John Responder')).toBeInTheDocument();
    expect(screen.getByText('Status:')).toBeInTheDocument();
    expect(screen.getByText('DELIVERED')).toBeInTheDocument();
  });

  it('disables approval buttons when disabled prop is true', () => {
    render(<ResponseApproval response={mockResponse} disabled={true} />);
    
    expect(screen.getByText('Quick Approve')).toBeDisabled();
    expect(screen.getByText('Approve with Note')).toBeDisabled();
  });

  it('shows loading state during approval process', async () => {
    // Mock a delayed API response
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise((resolve) =>
        setTimeout(() =>
          resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: { responseId: 'response-123', verificationStatus: 'VERIFIED' },
            }),
          }),
          100
        )
      )
    );

    const user = userEvent.setup();
    
    render(<ResponseApproval response={mockResponse} />);
    
    await user.click(screen.getByText('Quick Approve'));
    
    // Should show loading state immediately
    expect(screen.getByText('Quick Approve')).toBeDisabled();
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled();
    });
  });

  it('cancels detailed approval dialog', async () => {
    const user = userEvent.setup();
    
    render(<ResponseApproval response={mockResponse} />);
    
    // Open dialog
    await user.click(screen.getByText('Approve with Note'));
    expect(screen.getByText('Approve Response Delivery')).toBeInTheDocument();
    
    // Cancel dialog
    await user.click(screen.getByText('Cancel'));
    
    // Dialog should be closed
    expect(screen.queryByText('Approve Response Delivery')).not.toBeInTheDocument();
  });
});