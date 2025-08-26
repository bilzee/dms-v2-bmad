import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResponseAccountabilityTracker from '@/components/features/verification/ResponseAccountabilityTracker';
import { RapidResponse, RapidAssessment, ResponseType, ResponseStatus, VerificationStatus, AssessmentType } from '@dms/shared';

describe('ResponseAccountabilityTracker', () => {
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
    data: { 
      needsAssessment: {
        urgency: 'high',
        requiredResponseTime: 24 // hours
      }
    },
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
    syncStatus: 'SYNCED',
    data: {
      deliveredItems: {
        rice: { quantity: 450, unit: 'kg' },
        beans: { quantity: 180, unit: 'kg' }
      },
      beneficiariesReached: 85,
      deliveryNotes: 'Delivery completed successfully',
      performanceMetrics: {
        responseTime: 26, // hours from assessment to delivery
        deliveryEfficiency: 87.5, // percentage
        qualityScore: 8.5 // out of 10
      }
    },
    createdAt: new Date('2025-01-15T08:00:00Z'),
    updatedAt: new Date('2025-01-15T14:30:00Z')
  };

  const mockOnVerificationComplete = jest.fn();
  const mockOnNotesChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders accountability tracker with timeline', () => {
      render(
        <ResponseAccountabilityTracker
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
          onNotesChange={mockOnNotesChange}
        />
      );

      expect(screen.getByText('Response Accountability Tracking')).toBeInTheDocument();
      expect(screen.getByText('Delivery Timeline')).toBeInTheDocument();
    });

    it('displays response timeline with key milestones', () => {
      render(
        <ResponseAccountabilityTracker
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      expect(screen.getByText('Assessment Created')).toBeInTheDocument();
      expect(screen.getByText('Response Planned')).toBeInTheDocument();
      expect(screen.getByText('Delivery Completed')).toBeInTheDocument();
      
      // Should show timestamps
      expect(screen.getByText(/2025-01-14/)).toBeInTheDocument(); // Assessment date
      expect(screen.getByText(/2025-01-15/)).toBeInTheDocument(); // Delivery date
    });

    it('shows responder accountability information', () => {
      render(
        <ResponseAccountabilityTracker
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      expect(screen.getByText('Responder Performance')).toBeInTheDocument();
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Response Time: 26 hours')).toBeInTheDocument();
      expect(screen.getByText('Efficiency: 87.5%')).toBeInTheDocument();
      expect(screen.getByText('Quality Score: 8.5/10')).toBeInTheDocument();
    });

    it('displays donor attribution and verification', () => {
      render(
        <ResponseAccountabilityTracker
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      expect(screen.getByText('Donor Attribution')).toBeInTheDocument();
      expect(screen.getByText('Red Cross')).toBeInTheDocument();
      expect(screen.getByText('Attribution Verified')).toBeInTheDocument();
    });
  });

  describe('Timeline Verification', () => {
    it('validates response timing against requirements', () => {
      render(
        <ResponseAccountabilityTracker
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      expect(screen.getByText('Timeline Compliance')).toBeInTheDocument();
      expect(screen.getByText('Required: 24 hours')).toBeInTheDocument();
      expect(screen.getByText('Actual: 26 hours')).toBeInTheDocument();
      expect(screen.getByText('2 hours late')).toBeInTheDocument();
      
      // Should show warning for late delivery
      expect(screen.getByText('Delayed Response')).toBeInTheDocument();
    });

    it('shows compliance indicators with appropriate colors', () => {
      const onTimeResponse = {
        ...mockResponse,
        data: {
          ...mockResponse.data,
          performanceMetrics: {
            responseTime: 20, // Within 24 hour requirement
            deliveryEfficiency: 95,
            qualityScore: 9.0
          }
        }
      };

      render(
        <ResponseAccountabilityTracker
          response={onTimeResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      expect(screen.getByText('On Time')).toBeInTheDocument();
      // Should have green/success styling
      const complianceIndicator = screen.getByText('On Time').closest('.bg-green-100');
      expect(complianceIndicator).toBeInTheDocument();
    });

    it('allows approving timeline despite minor delays', async () => {
      const user = userEvent.setup();
      render(
        <ResponseAccountabilityTracker
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      const approveTimelineButton = screen.getByText('Approve Timeline');
      await user.click(approveTimelineButton);

      // Should show approval confirmation
      expect(screen.getByText('Timeline Approved')).toBeInTheDocument();
    });
  });

  describe('Performance Tracking', () => {
    it('displays comprehensive performance metrics', () => {
      render(
        <ResponseAccountabilityTracker
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
      expect(screen.getByText('87.5%')).toBeInTheDocument(); // Efficiency
      expect(screen.getByText('8.5/10')).toBeInTheDocument(); // Quality score
    });

    it('shows performance trends and historical context', () => {
      const responseWithHistory = {
        ...mockResponse,
        data: {
          ...mockResponse.data,
          performanceHistory: {
            averageResponseTime: 22,
            averageEfficiency: 85,
            totalDeliveries: 15,
            successRate: 93.3
          }
        }
      };

      render(
        <ResponseAccountabilityTracker
          response={responseWithHistory}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      expect(screen.getByText('Performance History')).toBeInTheDocument();
      expect(screen.getByText('Average Response: 22 hours')).toBeInTheDocument();
      expect(screen.getByText('Success Rate: 93.3%')).toBeInTheDocument();
      expect(screen.getByText('Total Deliveries: 15')).toBeInTheDocument();
    });

    it('allows rating responder performance', async () => {
      const user = userEvent.setup();
      render(
        <ResponseAccountabilityTracker
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      expect(screen.getByText('Rate Performance')).toBeInTheDocument();
      
      // Should have star rating or numeric input
      const ratingInput = screen.getByLabelText('Performance Rating');
      await user.clear(ratingInput);
      await user.type(ratingInput, '9');

      expect(ratingInput).toHaveValue(9);
    });
  });

  describe('Impact Assessment', () => {
    it('displays delivery impact metrics', () => {
      render(
        <ResponseAccountabilityTracker
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      expect(screen.getByText('Delivery Impact')).toBeInTheDocument();
      expect(screen.getByText('Beneficiaries Reached: 85')).toBeInTheDocument();
      expect(screen.getByText('Items Delivered')).toBeInTheDocument();
      expect(screen.getByText('450 kg rice')).toBeInTheDocument();
      expect(screen.getByText('180 kg beans')).toBeInTheDocument();
    });

    it('calculates impact effectiveness scores', () => {
      render(
        <ResponseAccountabilityTracker
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      expect(screen.getByText('Impact Score')).toBeInTheDocument();
      // Should calculate based on beneficiaries reached vs planned
      expect(screen.getByText('85%')).toBeInTheDocument(); // 85 reached / 100 planned
    });

    it('shows community feedback integration', () => {
      const responseWithFeedback = {
        ...mockResponse,
        data: {
          ...mockResponse.data,
          communityFeedback: {
            satisfaction: 4.2, // out of 5
            feedbackCount: 12,
            positiveFeedback: 10,
            concerns: ['Distribution timing could be improved']
          }
        }
      };

      render(
        <ResponseAccountabilityTracker
          response={responseWithFeedback}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      expect(screen.getByText('Community Feedback')).toBeInTheDocument();
      expect(screen.getByText('4.2/5 satisfaction')).toBeInTheDocument();
      expect(screen.getByText('12 responses')).toBeInTheDocument();
      expect(screen.getByText('Distribution timing could be improved')).toBeInTheDocument();
    });
  });

  describe('Audit Trail', () => {
    it('displays comprehensive audit information', () => {
      render(
        <ResponseAccountabilityTracker
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      expect(screen.getByText('Audit Trail')).toBeInTheDocument();
      expect(screen.getByText('Created by: John Smith')).toBeInTheDocument();
      expect(screen.getByText('Coordinator: coord-1')).toBeInTheDocument();
      expect(screen.getByText('Last Updated:')).toBeInTheDocument();
    });

    it('shows verification history and changes', () => {
      const responseWithVerificationHistory = {
        ...mockResponse,
        data: {
          ...mockResponse.data,
          verificationHistory: [
            {
              action: 'CREATED',
              timestamp: '2025-01-15T08:00:00Z',
              userId: 'responder-1',
              userName: 'John Smith'
            },
            {
              action: 'UPDATED',
              timestamp: '2025-01-15T12:00:00Z',
              userId: 'responder-1',
              userName: 'John Smith',
              changes: ['Added delivery evidence']
            }
          ]
        }
      };

      render(
        <ResponseAccountabilityTracker
          response={responseWithVerificationHistory}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      expect(screen.getByText('Verification History')).toBeInTheDocument();
      expect(screen.getByText('Response Created')).toBeInTheDocument();
      expect(screen.getByText('Evidence Added')).toBeInTheDocument();
      expect(screen.getByText('Added delivery evidence')).toBeInTheDocument();
    });

    it('enables export of accountability report', async () => {
      const user = userEvent.setup();
      render(
        <ResponseAccountabilityTracker
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      const exportButton = screen.getByText('Export Report');
      await user.click(exportButton);

      // Should trigger download or show export options
      expect(screen.getByText('Export Options')).toBeInTheDocument();
    });
  });

  describe('Verification Actions', () => {
    it('allows approving accountability after review', async () => {
      const user = userEvent.setup();
      render(
        <ResponseAccountabilityTracker
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      const approveButton = screen.getByText('Approve Accountability');
      await user.click(approveButton);

      expect(mockOnVerificationComplete).toHaveBeenCalledWith(true);
    });

    it('requires notes for rejecting accountability', async () => {
      const user = userEvent.setup();
      render(
        <ResponseAccountabilityTracker
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
          onNotesChange={mockOnNotesChange}
        />
      );

      const rejectButton = screen.getByText('Reject');
      await user.click(rejectButton);

      // Should show notes requirement
      expect(screen.getByText('Rejection reason required')).toBeInTheDocument();
      
      const notesInput = screen.getByPlaceholderText('Explain accountability concerns...');
      await user.type(notesInput, 'Significant delay without adequate explanation');

      expect(mockOnNotesChange).toHaveBeenCalledWith(
        'Significant delay without adequate explanation'
      );
    });

    it('supports requesting additional documentation', async () => {
      const user = userEvent.setup();
      render(
        <ResponseAccountabilityTracker
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      const requestDocsButton = screen.getByText('Request Documentation');
      await user.click(requestDocsButton);

      expect(screen.getByText('Documentation Request')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Specify required documents...')).toBeInTheDocument();
    });
  });

  describe('Data Integrity', () => {
    it('validates cross-references between assessment and response', () => {
      render(
        <ResponseAccountabilityTracker
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      expect(screen.getByText('Data Integrity')).toBeInTheDocument();
      expect(screen.getByText('Assessment Link: Valid')).toBeInTheDocument();
      expect(screen.getByText('Entity Match: Confirmed')).toBeInTheDocument();
    });

    it('flags inconsistencies in linked data', () => {
      const inconsistentResponse = {
        ...mockResponse,
        affectedEntityId: 'different-entity' // Doesn't match assessment
      };

      render(
        <ResponseAccountabilityTracker
          response={inconsistentResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      expect(screen.getByText('Entity Mismatch')).toBeInTheDocument();
      expect(screen.getByText('Warning: Response entity differs from assessment')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing performance data gracefully', () => {
      const responseWithoutMetrics = {
        ...mockResponse,
        data: {
          deliveredItems: {
            rice: { quantity: 450, unit: 'kg' }
          }
          // Missing performanceMetrics
        }
      };

      render(
        <ResponseAccountabilityTracker
          response={responseWithoutMetrics}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      expect(screen.getByText('Performance data unavailable')).toBeInTheDocument();
    });

    it('handles missing assessment gracefully', () => {
      render(
        <ResponseAccountabilityTracker
          response={mockResponse}
          assessment={undefined}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      expect(screen.getByText('No assessment data for comparison')).toBeInTheDocument();
    });
  });

  describe('Interactive Features', () => {
    it('allows expanding detailed timeline view', async () => {
      const user = userEvent.setup();
      render(
        <ResponseAccountabilityTracker
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      const expandButton = screen.getByText('View Detailed Timeline');
      await user.click(expandButton);

      expect(screen.getByText('Detailed Timeline View')).toBeInTheDocument();
    });

    it('supports filtering accountability metrics', async () => {
      const user = userEvent.setup();
      render(
        <ResponseAccountabilityTracker
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      const filterSelect = screen.getByLabelText('Filter metrics');
      await user.selectOptions(filterSelect, 'performance');

      expect(screen.getByText('Showing performance metrics only')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for timeline elements', () => {
      render(
        <ResponseAccountabilityTracker
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      expect(screen.getByLabelText('Assessment created milestone')).toBeInTheDocument();
      expect(screen.getByLabelText('Response planned milestone')).toBeInTheDocument();
      expect(screen.getByLabelText('Delivery completed milestone')).toBeInTheDocument();
    });

    it('provides screen reader friendly performance summaries', () => {
      render(
        <ResponseAccountabilityTracker
          response={mockResponse}
          assessment={mockAssessment}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      const performanceSummary = screen.getByLabelText(
        'Performance summary: 87.5 percent efficiency, 8.5 out of 10 quality score, 2 hours late'
      );
      expect(performanceSummary).toBeInTheDocument();
    });
  });
});