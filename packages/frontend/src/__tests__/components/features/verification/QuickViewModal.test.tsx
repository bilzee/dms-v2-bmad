import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuickViewModal } from '@/components/features/verification/QuickViewModal';
import { RapidAssessment, RapidResponse, VerificationStatus, AssessmentType, ResponseType, ResponseStatus, SyncStatus } from '@dms/shared';

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, format) => {
    if (format === 'PPP') return 'January 1st, 2024';
    if (format === 'p') return '10:00 AM';
    if (format === 'PPpp') return 'Jan 1, 2024, 10:00 AM';
    if (format === 'MMM dd') return 'Jan 01';
    return 'Formatted Date';
  })
}));

const mockAssessment: RapidAssessment = {
  id: 'test-assessment-1',
  type: AssessmentType.HEALTH,
  verificationStatus: VerificationStatus.PENDING,
  syncStatus: SyncStatus.SYNCED,
  date: new Date('2024-01-01T10:00:00Z'),
  assessorId: 'assessor-1',
  assessorName: 'Jane Assessor',
  affectedEntityId: 'entity-1',
  data: {
    hasFunctionalClinic: false,
    numberHealthFacilities: 1,
    healthFacilityType: 'clinic',
    qualifiedHealthWorkers: 2,
    hasMedicineSupply: false,
    hasMedicalSupplies: true,
    hasMaternalChildServices: false,
    commonHealthIssues: ['malaria'],
    additionalDetails: 'Critical health situation requiring immediate attention'
  },
  mediaAttachments: [],
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
  lastSyncAttempt: new Date('2024-01-01T10:00:00Z')
};

const mockResponse: RapidResponse = {
  id: 'test-response-1',
  responseType: ResponseType.FOOD,
  verificationStatus: VerificationStatus.PENDING,
  syncStatus: SyncStatus.SYNCED,
  status: ResponseStatus.PLANNED,
  plannedDate: new Date('2024-01-01T10:00:00Z'),
  deliveredDate: new Date('2024-01-02T10:00:00Z'),
  affectedEntityId: 'entity-1',
  assessmentId: 'assessment-1',
  responderId: 'responder-1',
  responderName: 'John Responder',
  data: {
    foodItemsDelivered: [
      { item: 'rice', quantity: 50, unit: 'kg' },
      { item: 'beans', quantity: 25, unit: 'kg' }
    ],
    householdsServed: 20,
    personsServed: 80,
    nutritionSupplementsProvided: 10,
    additionalDetails: 'Emergency food distribution for affected families'
  },
  otherItemsDelivered: [],
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
  requiresAttention: false,
  lastSyncAttempt: new Date('2024-01-01T10:00:00Z'),
  deliveryEvidence: []
};

describe('QuickViewModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    item: null,
    type: 'assessment' as const,
    onVerify: jest.fn(),
    onReject: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Assessment Details', () => {
    it('renders assessment details correctly', () => {
      render(
        <QuickViewModal
          {...defaultProps}
          item={mockAssessment}
          type="assessment"
        />
      );

      expect(screen.getByText('Assessment Details')).toBeInTheDocument();
      expect(screen.getByText('Assessment Info')).toBeInTheDocument();
      expect(screen.getByText('Assessor Details')).toBeInTheDocument();
      expect(screen.getByText('Location Details')).toBeInTheDocument();
      expect(screen.getByText('Assessment Findings')).toBeInTheDocument();
    });

    it('displays assessment metadata correctly', () => {
      render(
        <QuickViewModal
          {...defaultProps}
          item={mockAssessment}
          type="assessment"
        />
      );

      expect(screen.getByText('January 1st, 2024 at 10:00 AM')).toBeInTheDocument();
      expect(screen.getByText('HEALTH')).toBeInTheDocument();
      expect(screen.getByText('assessor-1')).toBeInTheDocument();
    });

    it('shows GPS coordinates', () => {
      render(
        <QuickViewModal
          {...defaultProps}
          item={mockAssessment}
          type="assessment"
        />
      );

      expect(screen.getByText('9.076500, 7.398600')).toBeInTheDocument();
    });

    it('displays assessment notes', () => {
      render(
        <QuickViewModal
          {...defaultProps}
          item={mockAssessment}
          type="assessment"
        />
      );

      expect(screen.getByText('Critical health situation requiring immediate attention')).toBeInTheDocument();
    });

    it('shows verification actions for pending assessments', () => {
      render(
        <QuickViewModal
          {...defaultProps}
          item={mockAssessment}
          type="assessment"
        />
      );

      expect(screen.getByText('Verify')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
    });

    it('hides verification actions for non-pending assessments', () => {
      const verifiedAssessment = {
        ...mockAssessment,
        verificationStatus: VerificationStatus.VERIFIED
      };

      render(
        <QuickViewModal
          {...defaultProps}
          item={verifiedAssessment}
          type="assessment"
        />
      );

      expect(screen.queryByText('Verify')).not.toBeInTheDocument();
      expect(screen.queryByText('Reject')).not.toBeInTheDocument();
    });
  });

  describe('Response Details', () => {
    it('renders response details correctly', () => {
      render(
        <QuickViewModal
          {...defaultProps}
          item={mockResponse}
          type="response"
        />
      );

      expect(screen.getByText('Response Details')).toBeInTheDocument();
      expect(screen.getByText('Response Info')).toBeInTheDocument();
      expect(screen.getByText('Responder Details')).toBeInTheDocument();
      expect(screen.getByText('Response Plan')).toBeInTheDocument();
      expect(screen.getByText('Delivery Information')).toBeInTheDocument();
    });

    it('displays response metadata correctly', () => {
      render(
        <QuickViewModal
          {...defaultProps}
          item={mockResponse}
          type="response"
        />
      );

      expect(screen.getByText('FOOD')).toBeInTheDocument();
      expect(screen.getByText('PLANNED')).toBeInTheDocument();
      expect(screen.getByText('responder-1')).toBeInTheDocument();
    });

    it('shows delivery information', () => {
      render(
        <QuickViewModal
          {...defaultProps}
          item={mockResponse}
          type="response"
        />
      );

      expect(screen.getByText('Emergency food distribution for affected families')).toBeInTheDocument();
      expect(screen.getByText('Delivered: Jan 01')).toBeInTheDocument();
    });

    it('shows verification actions for pending responses', () => {
      render(
        <QuickViewModal
          {...defaultProps}
          item={mockResponse}
          type="response"
        />
      );

      expect(screen.getByText('Verify')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
    });
  });

  describe('Modal Interactions', () => {
    it('calls onClose when close button is clicked', () => {
      const onClose = jest.fn();
      
      render(
        <QuickViewModal
          {...defaultProps}
          item={mockAssessment}
          onClose={onClose}
        />
      );

      fireEvent.click(screen.getByText('Close'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onVerify when verify button is clicked', () => {
      const onVerify = jest.fn();
      
      render(
        <QuickViewModal
          {...defaultProps}
          item={mockAssessment}
          onVerify={onVerify}
        />
      );

      fireEvent.click(screen.getByText('Verify'));
      expect(onVerify).toHaveBeenCalledWith('test-assessment-1');
    });

    it('calls onReject when reject button is clicked', () => {
      const onReject = jest.fn();
      
      render(
        <QuickViewModal
          {...defaultProps}
          item={mockAssessment}
          onReject={onReject}
        />
      );

      fireEvent.click(screen.getByText('Reject'));
      expect(onReject).toHaveBeenCalledWith('test-assessment-1');
    });

    it('does not render when item is null', () => {
      render(
        <QuickViewModal
          {...defaultProps}
          item={null}
        />
      );

      expect(screen.queryByText('Assessment Details')).not.toBeInTheDocument();
      expect(screen.queryByText('Response Details')).not.toBeInTheDocument();
    });

    it('does not render when modal is closed', () => {
      render(
        <QuickViewModal
          {...defaultProps}
          isOpen={false}
          item={mockAssessment}
        />
      );

      expect(screen.queryByText('Assessment Details')).not.toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('switches between assessment tabs correctly', () => {
      render(
        <QuickViewModal
          {...defaultProps}
          item={mockAssessment}
          type="assessment"
        />
      );

      // Default tab should be summary
      expect(screen.getByText('Key Findings')).toBeInTheDocument();

      // Click on details tab
      fireEvent.click(screen.getByText('Details'));
      expect(screen.getByText(`Assessment ID: ${mockAssessment.id}`)).toBeInTheDocument();

      // Click on photos tab
      fireEvent.click(screen.getByText('Photos'));
      // Photos section should be visible
      const photoElements = screen.getAllByTestId || screen.getAllByLabelText;
      // We can't easily test the photo grid without specific test IDs, but the tab should be clickable
    });

    it('switches between response tabs correctly', () => {
      render(
        <QuickViewModal
          {...defaultProps}
          item={mockResponse}
          type="response"
        />
      );

      // Click on delivery tab
      fireEvent.click(screen.getByText('Delivery'));
      expect(screen.getByText('Delivered:')).toBeInTheDocument();

      // Click on verification tab
      fireEvent.click(screen.getByText('Verification'));
      expect(screen.getByText('Photos:')).toBeInTheDocument();
    });
  });
});

describe('QuickViewModal Accessibility', () => {
  it('has proper dialog structure', () => {
    render(
      <QuickViewModal
        isOpen={true}
        onClose={jest.fn()}
        item={mockAssessment}
        type="assessment"
      />
    );

    // Dialog should be present
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // Dialog should have a title
    expect(screen.getByText('Assessment Details')).toBeInTheDocument();
  });

  it('has proper button accessibility', () => {
    render(
      <QuickViewModal
        isOpen={true}
        onClose={jest.fn()}
        item={mockAssessment}
        type="assessment"
        onVerify={jest.fn()}
        onReject={jest.fn()}
      />
    );

    const verifyButton = screen.getByRole('button', { name: /verify/i });
    const rejectButton = screen.getByRole('button', { name: /reject/i });
    const closeButton = screen.getByRole('button', { name: /close/i });

    expect(verifyButton).toBeInTheDocument();
    expect(rejectButton).toBeInTheDocument();
    expect(closeButton).toBeInTheDocument();
  });
});