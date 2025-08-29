import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeliveryMetricsValidator from '@/components/features/verification/DeliveryMetricsValidator';
import { RapidResponse, RapidAssessment, ResponseType, ResponseStatus, VerificationStatus, AssessmentType, SyncStatus, PreliminaryAssessmentData, FoodResponseData, IncidentType, IncidentSeverity } from '@dms/shared';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('DeliveryMetricsValidator', () => {
  const mockAssessment: RapidAssessment = {
    id: 'assessment-1',
    type: AssessmentType.PRELIMINARY,
    date: new Date('2025-01-14T12:00:00Z'),
    affectedEntityId: 'entity-1',
    assessorName: 'Jane Doe',
    assessorId: 'assessor-1',
    verificationStatus: VerificationStatus.VERIFIED,
    syncStatus: SyncStatus.SYNCED,
    data: {
      incidentType: IncidentType.FLOOD,
      severity: IncidentSeverity.SEVERE,
      affectedPopulationEstimate: 500,
      affectedHouseholdsEstimate: 100,
      immediateNeedsDescription: 'Food and clean water needed urgently',
      accessibilityStatus: 'ACCESSIBLE',
      priorityLevel: 'HIGH',
      additionalDetails: 'Emergency assessment for flood victims'
    } as PreliminaryAssessmentData,
    mediaAttachments: [],
    createdAt: new Date('2025-01-14T12:00:00Z'),
    updatedAt: new Date('2025-01-14T12:00:00Z')
  };

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
    syncStatus: SyncStatus.SYNCED,
    data: {
      foodItemsDelivered: [
        { item: 'rice', quantity: 450, unit: 'kg' },
        { item: 'beans', quantity: 180, unit: 'kg' }
      ],
      householdsServed: 25,
      personsServed: 85,
      nutritionSupplementsProvided: 0,
      additionalDetails: 'Some rice bags were damaged during transport'
    } as FoodResponseData,
    otherItemsDelivered: [],
    deliveryEvidence: [],
    requiresAttention: false,
    createdAt: new Date('2025-01-15T08:00:00Z'),
    updatedAt: new Date('2025-01-15T14:30:00Z')
  };

  const mockOnVerificationComplete = jest.fn();
  const mockOnNotesChange = jest.fn();

  // Mock API response for delivery comparison
  const mockDeliveryComparison = {
    success: true,
    data: {
      responseId: 'response-1',
      assessment: {
        id: 'assessment-1',
        type: 'NEEDS_ASSESSMENT',
        needs: [
          { itemType: 'FOOD', plannedQuantity: 500, actualQuantity: 450, unit: 'kg', variance: 10, verified: false },
          { itemType: 'FOOD', plannedQuantity: 200, actualQuantity: 180, unit: 'kg', variance: 10, verified: false }
        ]
      },
      plannedResponse: {
        items: [
          { itemType: 'FOOD', plannedQuantity: 500, actualQuantity: 450, unit: 'kg', variance: 10, verified: false },
          { itemType: 'FOOD', plannedQuantity: 200, actualQuantity: 180, unit: 'kg', variance: 10, verified: false }
        ],
        beneficiaries: 100,
        plannedDate: new Date('2025-01-15T10:00:00Z')
      },
      actualResponse: {
        items: [
          { itemType: 'FOOD', plannedQuantity: 500, actualQuantity: 450, unit: 'kg', variance: 10, verified: false },
          { itemType: 'FOOD', plannedQuantity: 200, actualQuantity: 180, unit: 'kg', variance: 10, verified: false }
        ],
        beneficiaries: 85,
        deliveredDate: new Date('2025-01-15T14:30:00Z')
      },
      variance: {
        overall: 12.5,
        byItem: [
          {
            type: 'QUANTITY',
            severity: 'MEDIUM',
            description: 'Rice delivery variance: 10%',
            threshold: 500,
            actual: 450
          },
          {
            type: 'BENEFICIARY',
            severity: 'MEDIUM',
            description: 'Beneficiary count variance: 15%',
            threshold: 100,
            actual: 85
          }
        ],
        recommendations: [
          'Consider follow-up delivery for remaining rice quantities',
          'Verify beneficiary count with field team'
        ]
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDeliveryComparison)
    });
  });

  describe('Component Rendering', () => {
    it('renders metrics validator with comparison data', async () => {
      render(
        <DeliveryMetricsValidator
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
          onNotesChange={mockOnNotesChange}
        />
      );

      expect(screen.getByText('Delivery Metrics Validation')).toBeInTheDocument();
      expect(screen.getByText('Loading delivery comparison...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Planned vs Actual Delivery')).toBeInTheDocument();
      });
    });

    it('displays planned vs actual comparison charts', async () => {
      render(
        <DeliveryMetricsValidator
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Rice')).toBeInTheDocument();
        expect(screen.getByText('Beans')).toBeInTheDocument();
        expect(screen.getByText('500 kg')).toBeInTheDocument(); // Planned
        expect(screen.getByText('450 kg')).toBeInTheDocument(); // Actual
        expect(screen.getByText('200 kg')).toBeInTheDocument(); // Planned beans
        expect(screen.getByText('180 kg')).toBeInTheDocument(); // Actual beans
      });
    });

    it('shows beneficiary count comparison', async () => {
      render(
        <DeliveryMetricsValidator
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Beneficiaries')).toBeInTheDocument();
        expect(screen.getByText('Planned: 100')).toBeInTheDocument();
        expect(screen.getByText('Actual: 85')).toBeInTheDocument();
      });
    });

    it('displays variance indicators with appropriate colors', async () => {
      render(
        <DeliveryMetricsValidator
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        // Should show variance percentages
        expect(screen.getByText('10%')).toBeInTheDocument(); // Rice variance
        expect(screen.getByText('15%')).toBeInTheDocument(); // Beneficiary variance
        
        // Should show severity indicators
        expect(screen.getByText('MEDIUM')).toBeInTheDocument();
      });
    });
  });

  describe('Metrics Validation', () => {
    it('allows approving metrics within acceptable variance', async () => {
      const user = userEvent.setup();
      render(
        <DeliveryMetricsValidator
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Planned vs Actual Delivery')).toBeInTheDocument();
      });

      // Approve the metrics
      const approveButton = screen.getByText('Approve Metrics');
      await user.click(approveButton);

      expect(mockOnVerificationComplete).toHaveBeenCalledWith(true);
    });

    it('shows warnings for high variance items', async () => {
      const highVarianceComparison = {
        ...mockDeliveryComparison,
        data: {
          ...mockDeliveryComparison.data,
          variance: {
            ...mockDeliveryComparison.data.variance,
            byItem: [
              {
                type: 'QUANTITY',
                severity: 'HIGH',
                description: 'Rice delivery variance: 40%',
                threshold: 500,
                actual: 300
              }
            ]
          }
        }
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(highVarianceComparison)
      });

      render(
        <DeliveryMetricsValidator
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('HIGH')).toBeInTheDocument();
        expect(screen.getByText('Rice delivery variance: 40%')).toBeInTheDocument();
      });

      // Should show warning or require coordinator approval
      expect(screen.getByText('Requires Review')).toBeInTheDocument();
    });

    it('calculates and displays delivery completeness percentage', async () => {
      render(
        <DeliveryMetricsValidator
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('87.5%')).toBeInTheDocument(); // Overall completeness
        expect(screen.getByText('Delivery Completeness')).toBeInTheDocument();
      });
    });

    it('allows adding verification notes for discrepancies', async () => {
      const user = userEvent.setup();
      render(
        <DeliveryMetricsValidator
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
          onNotesChange={mockOnNotesChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add verification notes...')).toBeInTheDocument();
      });

      const notesInput = screen.getByPlaceholderText('Add verification notes...');
      await user.type(notesInput, 'Rice shortfall due to transport damage, acceptable variance');

      expect(mockOnNotesChange).toHaveBeenCalledWith(
        'Rice shortfall due to transport damage, acceptable variance'
      );
    });
  });

  describe('Variance Analysis', () => {
    it('shows detailed variance breakdown by item', async () => {
      render(
        <DeliveryMetricsValidator
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Variance Analysis')).toBeInTheDocument();
        expect(screen.getByText('Rice delivery variance: 10%')).toBeInTheDocument();
        expect(screen.getByText('Beneficiary count variance: 15%')).toBeInTheDocument();
      });
    });

    it('provides recommendations for addressing variances', async () => {
      render(
        <DeliveryMetricsValidator
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Recommendations')).toBeInTheDocument();
        expect(screen.getByText('Consider follow-up delivery for remaining rice quantities')).toBeInTheDocument();
        expect(screen.getByText('Verify beneficiary count with field team')).toBeInTheDocument();
      });
    });

    it('allows validating individual delivery items', async () => {
      const user = userEvent.setup();
      render(
        <DeliveryMetricsValidator
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText('Verify Item')).toHaveLength(2);
      });

      // Verify individual rice delivery
      const verifyRiceButtons = screen.getAllByText('Verify Item');
      await user.click(verifyRiceButtons[0]);

      // Should show item as verified
      await waitFor(() => {
        expect(screen.getByText('Rice - Verified')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Metrics', () => {
    it('displays delivery efficiency metrics', async () => {
      render(
        <DeliveryMetricsValidator
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Delivery Efficiency')).toBeInTheDocument();
        expect(screen.getByText('87.5%')).toBeInTheDocument(); // Overall efficiency
      });
    });

    it('shows timing analysis for delivery schedule adherence', async () => {
      render(
        <DeliveryMetricsValidator
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Delivery Timing')).toBeInTheDocument();
        expect(screen.getByText('4.5 hours late')).toBeInTheDocument(); // Calculated delay
      });
    });

    it('calculates resource utilization rates', async () => {
      render(
        <DeliveryMetricsValidator
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Resource Utilization')).toBeInTheDocument();
        // Should show utilization percentages for each resource type
      });
    });
  });

  describe('Data Validation', () => {
    it('validates data quality and completeness', async () => {
      render(
        <DeliveryMetricsValidator
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Data Quality')).toBeInTheDocument();
      });

      // Should show quality indicators
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });

    it('flags missing or incomplete data', async () => {
      const incompleteResponse = {
        ...mockResponse,
        data: {
          foodItemsDelivered: [
            { item: 'rice', quantity: 450, unit: '' } // Missing unit
          ],
          householdsServed: 0, // Missing proper count
          personsServed: 0, // Missing beneficiary count
          nutritionSupplementsProvided: 0,
          additionalDetails: ''
        } as FoodResponseData
      };

      render(
        <DeliveryMetricsValidator
          response={incompleteResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Incomplete Data')).toBeInTheDocument();
        expect(screen.getByText('Missing unit information')).toBeInTheDocument();
        expect(screen.getByText('Missing beneficiary count')).toBeInTheDocument();
      });
    });

    it('cross-references with assessment data for consistency', async () => {
      render(
        <DeliveryMetricsValidator
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Assessment Cross-Reference')).toBeInTheDocument();
        expect(screen.getByText('Data consistent with assessment')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      render(
        <DeliveryMetricsValidator
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Error loading delivery comparison')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('handles missing assessment data', () => {
      render(
        <DeliveryMetricsValidator
          response={mockResponse}
          assessment={undefined}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      expect(screen.getByText('No assessment data available for comparison')).toBeInTheDocument();
    });

    it('handles malformed response data', async () => {
      const malformedResponse = {
        ...mockResponse,
        data: {
          foodItemsDelivered: [],
          householdsServed: 0,
          personsServed: 0,
          nutritionSupplementsProvided: 0,
          additionalDetails: 'Malformed data test'
        } as FoodResponseData
      };

      render(
        <DeliveryMetricsValidator
          response={malformedResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Invalid response data')).toBeInTheDocument();
      });
    });
  });

  describe('Interactive Features', () => {
    it('allows expanding detailed variance analysis', async () => {
      const user = userEvent.setup();
      render(
        <DeliveryMetricsValidator
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Show Details')).toBeInTheDocument();
      });

      const showDetailsButton = screen.getByText('Show Details');
      await user.click(showDetailsButton);

      expect(screen.getByText('Detailed Analysis')).toBeInTheDocument();
    });

    it('supports filtering metrics by variance level', async () => {
      const user = userEvent.setup();
      render(
        <DeliveryMetricsValidator
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Filter by Variance')).toBeInTheDocument();
      });

      const highVarianceFilter = screen.getByText('High Variance Only');
      await user.click(highVarianceFilter);

      // Should filter to show only high variance items
    });

    it('enables bulk approval for acceptable variances', async () => {
      const user = userEvent.setup();
      render(
        <DeliveryMetricsValidator
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Approve All Acceptable')).toBeInTheDocument();
      });

      const bulkApproveButton = screen.getByText('Approve All Acceptable');
      await user.click(bulkApproveButton);

      expect(mockOnVerificationComplete).toHaveBeenCalledWith(true);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for metric controls', async () => {
      render(
        <DeliveryMetricsValidator
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Approve rice delivery metrics')).toBeInTheDocument();
        expect(screen.getByLabelText('Approve beans delivery metrics')).toBeInTheDocument();
      });
    });

    it('provides screen reader friendly variance descriptions', async () => {
      render(
        <DeliveryMetricsValidator
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        const varianceDescription = screen.getByLabelText(
          'Rice delivery variance 10 percent, medium severity'
        );
        expect(varianceDescription).toBeInTheDocument();
      });
    });
  });
});