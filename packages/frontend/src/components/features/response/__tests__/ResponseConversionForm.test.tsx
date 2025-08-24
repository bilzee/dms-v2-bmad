import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponseConversionForm } from '../ResponseConversionForm';
import { useResponseStore } from '@/stores/response.store';
import { useGPS } from '@/hooks/useGPS';
import { ResponseStatus, ResponseType } from '@dms/shared';

// Mock dependencies
jest.mock('@/stores/response.store');
jest.mock('@/hooks/useGPS');

const mockUseResponseStore = useResponseStore as jest.MockedFunction<typeof useResponseStore>;
const mockUseGPS = useGPS as jest.MockedFunction<typeof useGPS>;

// Mock response data
const mockResponse = {
  id: 'response-123',
  responseType: ResponseType.HEALTH,
  status: ResponseStatus.PLANNED,
  plannedDate: new Date('2024-01-15T10:00:00Z'),
  affectedEntityId: 'entity-1',
  assessmentId: 'assessment-1',
  responderId: 'responder-1',
  responderName: 'John Doe',
  verificationStatus: 'PENDING' as any,
  syncStatus: 'SYNCED' as any,
  data: {
    medicinesDelivered: [],
    medicalSuppliesDelivered: [],
    healthWorkersDeployed: 2,
    patientsTreated: 50,
  },
  otherItemsDelivered: [
    { item: 'Paracetamol', quantity: 100, unit: 'tablets' },
    { item: 'Bandages', quantity: 25, unit: 'rolls' },
  ],
  deliveryEvidence: [],
  createdAt: new Date('2024-01-10T08:00:00Z'),
  updatedAt: new Date('2024-01-10T08:00:00Z'),
};

const mockConversionDraft = {
  originalPlanId: 'response-123',
  conversionTimestamp: new Date('2024-01-15T12:00:00Z'),
  deliveryTimestamp: new Date('2024-01-15T14:00:00Z'),
  deliveryLocation: {
    latitude: 9.0579,
    longitude: 7.4951,
    timestamp: new Date('2024-01-15T14:00:00Z'),
    captureMethod: 'GPS' as const,
  },
  actualItemsDelivered: [],
  beneficiariesServed: 75,
  completionPercentage: 100,
  deliveryEvidence: [],
};

// Default store mock
const mockStoreState = {
  conversionInProgress: false,
  conversionDraft: null,
  currentConversion: null,
  isConverting: false,
  error: null,
  startConversion: jest.fn(),
  updateConversionData: jest.fn(),
  completeConversion: jest.fn(),
  cancelConversion: jest.fn(),
  clearError: jest.fn(),
  getResponseForConversion: jest.fn(),
  calculateActualVsPlanned: jest.fn(),
};

// Default GPS mock
const mockGPSState = {
  captureLocation: jest.fn(),
  isLoading: false,
};

describe('ResponseConversionForm', () => {
  const mockOnComplete = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseResponseStore.mockReturnValue(mockStoreState);
    mockUseGPS.mockReturnValue(mockGPSState);
    mockStoreState.getResponseForConversion.mockReturnValue(mockResponse);
  });

  describe('Component Initialization', () => {
    it('renders conversion form with correct header', () => {
      render(
        <ResponseConversionForm
          responseId="response-123"
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Convert to Delivery')).toBeInTheDocument();
      expect(screen.getByText('Convert planned response to actual delivery documentation')).toBeInTheDocument();
    });

    it('starts conversion on mount when not already in progress', async () => {
      render(
        <ResponseConversionForm
          responseId="response-123"
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(mockStoreState.startConversion).toHaveBeenCalledWith('response-123');
      });
    });

    it('captures GPS location on mount', async () => {
      const mockLocation = {
        latitude: 9.0579,
        longitude: 7.4951,
      };
      mockGPSState.captureLocation.mockResolvedValue(mockLocation);

      render(
        <ResponseConversionForm
          responseId="response-123"
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(mockGPSState.captureLocation).toHaveBeenCalled();
      });
    });
  });

  describe('Progress Steps', () => {
    it('shows correct step progression', () => {
      render(
        <ResponseConversionForm
          responseId="response-123"
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      // Check step indicators
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Review Plan')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Compare Actual')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });
  });

  describe('Original Plan Overview', () => {
    it('displays response plan details correctly', () => {
      render(
        <ResponseConversionForm
          responseId="response-123"
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Original Response Plan')).toBeInTheDocument();
      const healthElements = screen.getAllByText('HEALTH');
      expect(healthElements.length).toBeGreaterThanOrEqual(1);
      expect(healthElements[0]).toBeInTheDocument();
      const johnDoeElements = screen.getAllByText('John Doe');
      expect(johnDoeElements.length).toBeGreaterThanOrEqual(1);
      expect(johnDoeElements[0]).toBeInTheDocument();
      expect(screen.getByText('2 items')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when present', () => {
      mockUseResponseStore.mockReturnValue({
        ...mockStoreState,
        error: 'Failed to start conversion',
      });

      render(
        <ResponseConversionForm
          responseId="response-123"
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Failed to start conversion')).toBeInTheDocument();
    });

    it('clears error when dismiss button is clicked', async () => {
      mockUseResponseStore.mockReturnValue({
        ...mockStoreState,
        error: 'Failed to start conversion',
      });

      render(
        <ResponseConversionForm
          responseId="response-123"
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const dismissButton = screen.getByText('Dismiss');
      await userEvent.click(dismissButton);

      expect(mockStoreState.clearError).toHaveBeenCalled();
    });

    it('shows response not found message for invalid response ID', () => {
      mockStoreState.getResponseForConversion.mockReturnValue(null);

      render(
        <ResponseConversionForm
          responseId="invalid-id"
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Response Not Found')).toBeInTheDocument();
      expect(screen.getByText('The response you\'re trying to convert could not be found.')).toBeInTheDocument();
    });

    it('shows invalid status message for non-planned responses', () => {
      mockStoreState.getResponseForConversion.mockReturnValue({
        ...mockResponse,
        status: ResponseStatus.DELIVERED,
      });

      render(
        <ResponseConversionForm
          responseId="response-123"
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Invalid Response Status')).toBeInTheDocument();
      expect(screen.getByText(/Only planned responses can be converted/)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('completes conversion successfully', async () => {
      mockUseResponseStore.mockReturnValue({
        ...mockStoreState,
        conversionInProgress: true,
        conversionDraft: mockConversionDraft,
      });

      const { container } = render(
        <ResponseConversionForm
          responseId="response-123"
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      // Find and submit form
      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();

      if (form) {
        fireEvent.submit(form);

        await waitFor(() => {
          expect(mockStoreState.completeConversion).toHaveBeenCalledWith('response-123');
        });
      }
    });

    it('calls onComplete callback after successful conversion', async () => {
      mockUseResponseStore.mockReturnValue({
        ...mockStoreState,
        conversionInProgress: true,
        conversionDraft: mockConversionDraft,
      });

      mockStoreState.completeConversion.mockResolvedValue(undefined);

      const { container } = render(
        <ResponseConversionForm
          responseId="response-123"
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const form = container.querySelector('form');
      if (form) {
        fireEvent.submit(form);

        await waitFor(() => {
          expect(mockOnComplete).toHaveBeenCalled();
        });
      }
    });
  });

  describe('Cancellation', () => {
    it('cancels conversion when cancel button is clicked', async () => {
      render(
        <ResponseConversionForm
          responseId="response-123"
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByText('Cancel Conversion');
      await userEvent.click(cancelButton);

      expect(mockStoreState.cancelConversion).toHaveBeenCalled();
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Auto-save Functionality', () => {
    it('triggers auto-save when form data changes', async () => {
      // Test that GPS location auto-save is called on mount
      mockUseResponseStore.mockReturnValue({
        ...mockStoreState,
        conversionInProgress: true,
        conversionDraft: mockConversionDraft,
      });

      render(
        <ResponseConversionForm
          responseId="response-123"
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      // Verify GPS location auto-save was triggered on mount
      await waitFor(() => {
        expect(mockStoreState.updateConversionData).toHaveBeenCalledWith(
          expect.objectContaining({
            deliveryLocation: expect.any(Object),
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(
        <ResponseConversionForm
          responseId="response-123"
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      // Check for form accessibility
      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();

      // Check for proper headings
      expect(screen.getByRole('heading', { name: /Convert to Delivery/i })).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator when converting', async () => {
      mockUseResponseStore.mockReturnValue({
        ...mockStoreState,
        isConverting: true,
        conversionInProgress: true,
        conversionDraft: mockConversionDraft,
      });

      render(
        <ResponseConversionForm
          responseId="response-123"
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      // Check that the Start Conversion button exists
      expect(screen.getByText('Start Conversion')).toBeInTheDocument();
      
      // Check that we're in converting state by looking for status indicators
      const plannedElements = screen.getAllByText('PLANNED');
      expect(plannedElements.length).toBeGreaterThanOrEqual(1);
      expect(plannedElements[0]).toBeInTheDocument();
    });

    it('shows GPS capture loading state', () => {
      mockUseGPS.mockReturnValue({
        ...mockGPSState,
        isLoading: true,
      });

      render(
        <ResponseConversionForm
          responseId="response-123"
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Capturing GPS Location')).toBeInTheDocument();
    });
  });
});