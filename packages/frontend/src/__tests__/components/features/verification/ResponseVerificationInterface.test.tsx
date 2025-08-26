import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { ResponseVerificationInterface } from '@/components/features/verification/ResponseVerificationInterface';
import { useVerificationStore } from '@/stores/verification.store';
import { RapidResponse, RapidAssessment, ResponseType, ResponseStatus, VerificationStatus, AssessmentType } from '@dms/shared';

// Mock the verification store
jest.mock('@/stores/verification.store', () => ({
  useVerificationStore: () => ({
    responseVerifications: {},
    setResponsePhotoVerification: jest.fn(),
    setResponseMetricsValidation: jest.fn(),
    setResponseVerifierNotes: jest.fn(),
    approveResponse: jest.fn(),
    rejectResponse: jest.fn(),
    photoVerifications: {},
    responseMetrics: null,
    isLoadingResponseVerification: false,
    responseVerificationError: null,
  })
}));

// Mock child components
jest.mock('@/components/features/verification/DeliveryPhotoReviewer', () => ({
  default: ({ onVerificationComplete, onNotesChange }: any) => (
    <div data-testid="delivery-photo-reviewer">
      <button 
        onClick={() => onVerificationComplete(true)}
        data-testid="verify-photos"
      >
        Verify Photos
      </button>
      <input 
        onChange={(e) => onNotesChange(e.target.value)}
        data-testid="photo-notes"
        placeholder="Photo notes"
      />
    </div>
  )
}));

jest.mock('@/components/features/verification/DeliveryMetricsValidator', () => ({
  default: ({ onVerificationComplete, onNotesChange }: any) => (
    <div data-testid="delivery-metrics-validator">
      <button 
        onClick={() => onVerificationComplete(true)}
        data-testid="verify-metrics"
      >
        Verify Metrics
      </button>
      <input 
        onChange={(e) => onNotesChange(e.target.value)}
        data-testid="metrics-notes"
        placeholder="Metrics notes"
      />
    </div>
  )
}));

jest.mock('@/components/features/verification/ResponseAccountabilityTracker', () => ({
  default: ({ onVerificationComplete, onNotesChange }: any) => (
    <div data-testid="response-accountability-tracker">
      <button 
        onClick={() => onVerificationComplete(true)}
        data-testid="verify-accountability"
      >
        Verify Accountability
      </button>
      <input 
        onChange={(e) => onNotesChange(e.target.value)}
        data-testid="accountability-notes"
        placeholder="Accountability notes"
      />
    </div>
  )
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: (date: Date, formatStr: string) => `formatted-${formatStr}`
}));

// Wrapper for providers
const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('ResponseVerificationInterface', () => {
  const mockResponse: RapidResponse = {
    id: 'response-1',
    responseType: ResponseType.FOOD,
    status: ResponseStatus.DELIVERED,
    plannedDate: new Date('2025-01-15T10:00:00Z'),
    deliveredDate: new Date('2025-01-15T14:30:00Z'),
    affectedEntityId: 'entity-1',
    assessmentId: 'assessment-1',
    responderId: 'responder-1',
    responderName: 'John Smith',
    donorId: 'donor-1',
    donorName: 'Red Cross',
    verificationStatus: VerificationStatus.PENDING,
    syncStatus: 'SYNCED',
    data: { items: ['rice', 'beans'], quantity: 100 },
    requiresAttention: false,
    otherItemsDelivered: [],
    deliveryEvidence: [],
    createdAt: new Date('2025-01-15T08:00:00Z'),
    updatedAt: new Date('2025-01-15T14:30:00Z')
  };

  const mockAssessment: RapidAssessment = {
    id: 'assessment-1',
    type: AssessmentType.NEEDS_ASSESSMENT,
    date: new Date('2025-01-14T12:00:00Z'),
    location: { latitude: 12.345, longitude: 67.890 },
    assessorId: 'assessor-1',
    assessorName: 'Jane Doe',
    coordinatorId: 'coord-1',
    affectedEntityId: 'entity-1',
    verificationStatus: VerificationStatus.VERIFIED,
    syncStatus: 'SYNCED',
    data: { needsIdentified: ['food', 'water'], urgency: 'high' },
    createdAt: new Date('2025-01-14T12:00:00Z'),
    updatedAt: new Date('2025-01-14T12:00:00Z')
  };

  const mockOnVerificationComplete = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders response verification interface correctly', () => {
      renderWithProviders(
        <ResponseVerificationInterface
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Response Verification')).toBeInTheDocument();
      expect(screen.getByText('Food')).toBeInTheDocument();
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Red Cross')).toBeInTheDocument();
    });

    it('displays response type with correct styling', () => {
      render(
        <ResponseVerificationInterface
          response={mockResponse}
          assessment={mockAssessment}
        />
      );

      const foodBadge = screen.getByText('🍽️');
      expect(foodBadge).toBeInTheDocument();
      expect(screen.getByText('Food')).toBeInTheDocument();
    });

    it('shows assessment relationship', () => {
      render(
        <ResponseVerificationInterface
          response={mockResponse}
          assessment={mockAssessment}
        />
      );

      expect(screen.getByText('Related Assessment')).toBeInTheDocument();
      expect(screen.getByText('NEEDS_ASSESSMENT')).toBeInTheDocument();
      expect(screen.getByText('by Jane Doe')).toBeInTheDocument();
    });

    it('renders back button when onClose is provided', () => {
      render(
        <ResponseVerificationInterface
          response={mockResponse}
          onClose={mockOnClose}
        />
      );

      const backButton = screen.getByText('Back to Queue');
      expect(backButton).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('renders all verification tabs', () => {
      render(
        <ResponseVerificationInterface
          response={mockResponse}
          assessment={mockAssessment}
        />
      );

      expect(screen.getByRole('tab', { name: /photo review/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /metrics/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /accountability/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
    });

    it('switches between tabs correctly', async () => {
      const user = userEvent.setup();
      render(
        <ResponseVerificationInterface
          response={mockResponse}
          assessment={mockAssessment}
        />
      );

      // Start with photos tab active
      expect(screen.getByTestId('delivery-photo-reviewer')).toBeInTheDocument();

      // Switch to metrics tab
      const metricsTab = screen.getByRole('tab', { name: /metrics/i });
      await user.click(metricsTab);
      expect(screen.getByTestId('delivery-metrics-validator')).toBeInTheDocument();

      // Switch to accountability tab
      const accountabilityTab = screen.getByRole('tab', { name: /accountability/i });
      await user.click(accountabilityTab);
      expect(screen.getByTestId('response-accountability-tracker')).toBeInTheDocument();
    });

    it('shows verification checkmarks on tabs when components are verified', async () => {
      const user = userEvent.setup();
      render(
        <ResponseVerificationInterface
          response={mockResponse}
          assessment={mockAssessment}
        />
      );

      // Verify photos
      const verifyPhotosButton = screen.getByTestId('verify-photos');
      await user.click(verifyPhotosButton);

      // Switch to metrics and verify
      const metricsTab = screen.getByRole('tab', { name: /metrics/i });
      await user.click(metricsTab);
      const verifyMetricsButton = screen.getByTestId('verify-metrics');
      await user.click(verifyMetricsButton);

      // Checkmarks should appear on verified tabs
      const photoTab = screen.getByRole('tab', { name: /photo review/i });
      expect(photoTab.querySelector('.text-green-500')).toBeInTheDocument();
    });
  });

  describe('Verification Process', () => {
    it('enables verify button only when all components are verified', async () => {
      const user = userEvent.setup();
      render(
        <ResponseVerificationInterface
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      // Initially verify button should be disabled
      const verifyButton = screen.getByText('Verify Response');
      expect(verifyButton).toBeDisabled();

      // Verify photos
      const verifyPhotosButton = screen.getByTestId('verify-photos');
      await user.click(verifyPhotosButton);
      expect(verifyButton).toBeDisabled();

      // Switch to metrics and verify
      const metricsTab = screen.getByRole('tab', { name: /metrics/i });
      await user.click(metricsTab);
      const verifyMetricsButton = screen.getByTestId('verify-metrics');
      await user.click(verifyMetricsButton);
      expect(verifyButton).toBeDisabled();

      // Switch to accountability and verify
      const accountabilityTab = screen.getByRole('tab', { name: /accountability/i });
      await user.click(accountabilityTab);
      const verifyAccountabilityButton = screen.getByTestId('verify-accountability');
      await user.click(verifyAccountabilityButton);

      // Now verify button should be enabled
      expect(verifyButton).toBeEnabled();
    });

    it('calls approveResponse when verify button is clicked', async () => {
      const user = userEvent.setup();
      mockApproveResponse.mockResolvedValue({});

      render(
        <ResponseVerificationInterface
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      // Verify all components
      await user.click(screen.getByTestId('verify-photos'));
      await user.click(screen.getByRole('tab', { name: /metrics/i }));
      await user.click(screen.getByTestId('verify-metrics'));
      await user.click(screen.getByRole('tab', { name: /accountability/i }));
      await user.click(screen.getByTestId('verify-accountability'));

      // Click verify button
      const verifyButton = screen.getByText('Verify Response');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(mockApproveResponse).toHaveBeenCalledWith(
          'response-1',
          expect.objectContaining({
            status: 'VERIFIED',
            verificationData: {
              photosVerified: true,
              metricsVerified: true,
              accountabilityVerified: true,
            }
          })
        );
      });

      expect(mockOnVerificationComplete).toHaveBeenCalledWith('response-1', 'VERIFIED');
    });

    it('calls rejectResponse when reject button is clicked', async () => {
      const user = userEvent.setup();
      mockRejectResponse.mockResolvedValue({});

      render(
        <ResponseVerificationInterface
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      const rejectButton = screen.getByText('Reject');
      await user.click(rejectButton);

      await waitFor(() => {
        expect(mockRejectResponse).toHaveBeenCalledWith(
          'response-1',
          expect.objectContaining({
            status: 'REJECTED',
            verifierNotes: 'Response rejected during verification',
          })
        );
      });

      expect(mockOnVerificationComplete).toHaveBeenCalledWith('response-1', 'REJECTED');
    });

    it('collects notes from verification components', async () => {
      const user = userEvent.setup();
      mockApproveResponse.mockResolvedValue({});

      render(
        <ResponseVerificationInterface
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      // Add notes from different components
      const photoNotes = screen.getByTestId('photo-notes');
      await user.type(photoNotes, 'Photos look good');

      // Verify all components
      await user.click(screen.getByTestId('verify-photos'));
      await user.click(screen.getByRole('tab', { name: /metrics/i }));
      await user.click(screen.getByTestId('verify-metrics'));
      await user.click(screen.getByRole('tab', { name: /accountability/i }));
      await user.click(screen.getByTestId('verify-accountability'));

      // Click verify button
      const verifyButton = screen.getByText('Verify Response');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(mockApproveResponse).toHaveBeenCalledWith(
          'response-1',
          expect.objectContaining({
            verifierNotes: 'Photos look good',
          })
        );
      });
    });
  });

  describe('Already Verified Response', () => {
    it('shows verified status for already verified response', () => {
      const verifiedResponse = {
        ...mockResponse,
        verificationStatus: VerificationStatus.VERIFIED
      };

      render(
        <ResponseVerificationInterface
          response={verifiedResponse}
          assessment={mockAssessment}
        />
      );

      expect(screen.getByText('Response has been verified')).toBeInTheDocument();
      expect(screen.queryByText('Verify Response')).not.toBeInTheDocument();
    });

    it('shows rejected status for already rejected response', () => {
      const rejectedResponse = {
        ...mockResponse,
        verificationStatus: VerificationStatus.REJECTED
      };

      render(
        <ResponseVerificationInterface
          response={rejectedResponse}
          assessment={mockAssessment}
        />
      );

      expect(screen.getByText('Response has been rejected')).toBeInTheDocument();
      expect(screen.queryByText('Verify Response')).not.toBeInTheDocument();
    });

    it('shows auto-verified status for auto verified response', () => {
      const autoVerifiedResponse = {
        ...mockResponse,
        verificationStatus: VerificationStatus.AUTO_VERIFIED
      };

      render(
        <ResponseVerificationInterface
          response={autoVerifiedResponse}
          assessment={mockAssessment}
        />
      );

      expect(screen.getByText('Response was auto-verified')).toBeInTheDocument();
      expect(screen.queryByText('Verify Response')).not.toBeInTheDocument();
    });
  });

  describe('Overview Tab', () => {
    it('shows verification summary in overview tab', async () => {
      const user = userEvent.setup();
      render(
        <ResponseVerificationInterface
          response={mockResponse}
          assessment={mockAssessment}
        />
      );

      // Switch to overview tab
      const overviewTab = screen.getByRole('tab', { name: /overview/i });
      await user.click(overviewTab);

      expect(screen.getByText('Verification Summary')).toBeInTheDocument();
      expect(screen.getByText('Photo Review')).toBeInTheDocument();
      expect(screen.getByText('Delivery Metrics')).toBeInTheDocument();
      expect(screen.getByText('Accountability')).toBeInTheDocument();
    });

    it('updates verification status in overview when components are verified', async () => {
      const user = userEvent.setup();
      render(
        <ResponseVerificationInterface
          response={mockResponse}
          assessment={mockAssessment}
        />
      );

      // Verify photos
      await user.click(screen.getByTestId('verify-photos'));

      // Switch to overview
      const overviewTab = screen.getByRole('tab', { name: /overview/i });
      await user.click(overviewTab);

      // Photo review should show as verified
      expect(screen.getByText('Photos verified')).toBeInTheDocument();
      expect(screen.getByText('Metrics require validation')).toBeInTheDocument();
      expect(screen.getByText('Accountability requires verification')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles verification API errors gracefully', async () => {
      const user = userEvent.setup();
      mockApproveResponse.mockRejectedValue(new Error('API Error'));
      console.error = jest.fn(); // Mock console.error

      render(
        <ResponseVerificationInterface
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      // Verify all components
      await user.click(screen.getByTestId('verify-photos'));
      await user.click(screen.getByRole('tab', { name: /metrics/i }));
      await user.click(screen.getByTestId('verify-metrics'));
      await user.click(screen.getByRole('tab', { name: /accountability/i }));
      await user.click(screen.getByTestId('verify-accountability'));

      // Click verify button
      const verifyButton = screen.getByText('Verify Response');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          'Failed to verify response:',
          expect.any(Error)
        );
      });

      // Button should be enabled again after error
      expect(verifyButton).toBeEnabled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(
        <ResponseVerificationInterface
          response={mockResponse}
          assessment={mockAssessment}
        />
      );

      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeInTheDocument();

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(4);

      const verifyButton = screen.getByRole('button', { name: /verify response/i });
      expect(verifyButton).toBeInTheDocument();
    });
  });
});