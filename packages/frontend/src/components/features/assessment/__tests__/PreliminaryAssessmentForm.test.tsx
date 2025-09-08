import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PreliminaryAssessmentForm } from '../PreliminaryAssessmentForm';
import { IncidentType, IncidentSeverity } from '@dms/shared';
import { useOfflineStore } from '@/stores/offline.store';
import { IncidentService } from '@/lib/api/incident.service';
import { NotificationService } from '@/lib/api/notification.service';

// Mock dependencies
jest.mock('@/stores/offline.store');
jest.mock('@/lib/api/incident.service');
jest.mock('@/lib/api/notification.service');
jest.mock('@/hooks/useGPS', () => ({
  useGPS: () => ({
    coordinates: { latitude: 40.7128, longitude: -74.0060, accuracy: 10 },
    captureLocation: jest.fn(),
    isLoading: false,
    error: null
  })
}));

const mockUseOfflineStore = useOfflineStore as jest.MockedFunction<typeof useOfflineStore>;
const mockIncidentService = IncidentService as jest.Mocked<typeof IncidentService>;
const mockNotificationService = NotificationService as jest.Mocked<typeof NotificationService>;

describe('PreliminaryAssessmentForm', () => {
  const defaultProps = {
    affectedEntityId: 'entity-123',
    assessorName: 'John Doe',
    assessorId: 'assessor-123',
    onSubmit: jest.fn(),
    onCancel: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock offline store
    mockUseOfflineStore.mockReturnValue({
      isOnline: true,
      addToQueue: jest.fn(),
      addPendingAssessment: jest.fn()
    } as any);

    // Mock services
    mockIncidentService.createFromAssessment.mockResolvedValue({
      success: true,
      incident: {
        id: 'incident-123',
        name: 'Test Incident',
        type: 'FLOOD',
        severity: 'SEVERE',
        status: 'ACTIVE',
        preliminaryAssessmentIds: ['assessment-123']
      }
    });

    mockNotificationService.notifyCoordinators.mockResolvedValue({
      success: true,
      notificationsSent: 3
    });
  });

  it('renders the form with all required fields', () => {
    render(<PreliminaryAssessmentForm {...defaultProps} />);

    expect(screen.getByText('Preliminary Assessment')).toBeInTheDocument();
    expect(screen.getByLabelText('Incident Type *')).toBeInTheDocument();
    expect(screen.getByLabelText('Incident Sub-Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Severity *')).toBeInTheDocument();
    expect(screen.getByLabelText('Affected Population Estimate *')).toBeInTheDocument();
    expect(screen.getByLabelText('Affected Households Estimate *')).toBeInTheDocument();
    expect(screen.getByLabelText('Immediate Needs Description *')).toBeInTheDocument();
    expect(screen.getByLabelText('Accessibility Status *')).toBeInTheDocument();
    expect(screen.getByLabelText('Priority Level *')).toBeInTheDocument();
    expect(screen.getByLabelText('Additional Details')).toBeInTheDocument();
  });

  it('displays priority indicators correctly', () => {
    render(<PreliminaryAssessmentForm {...defaultProps} />);

    const prioritySelect = screen.getByLabelText('Priority Level *');
    
    // Change to HIGH priority
    fireEvent.change(prioritySelect, { target: { value: 'HIGH' } });
    expect(screen.getByText('🚨 HIGH PRIORITY')).toBeInTheDocument();
    expect(screen.getByText('🚨 HIGH PRIORITY')).toHaveClass('bg-red-100');
    expect(screen.getByText('🚨 HIGH PRIORITY')).toHaveClass('text-red-800');

    // Change to NORMAL priority
    fireEvent.change(prioritySelect, { target: { value: 'NORMAL' } });
    expect(screen.getByText('📋 NORMAL PRIORITY')).toBeInTheDocument();
    expect(screen.getByText('📋 NORMAL PRIORITY')).toHaveClass('bg-blue-100');
    expect(screen.getByText('📋 NORMAL PRIORITY')).toHaveClass('text-blue-800');

    // Change to LOW priority
    fireEvent.change(prioritySelect, { target: { value: 'LOW' } });
    expect(screen.getByText('🕐 LOW PRIORITY')).toBeInTheDocument();
    expect(screen.getByText('🕐 LOW PRIORITY')).toHaveClass('bg-gray-100');
    expect(screen.getByText('🕐 LOW PRIORITY')).toHaveClass('text-gray-800');
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<PreliminaryAssessmentForm {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: /submit assessment/i });
    await user.click(submitButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('Affected population estimate is required')).toBeInTheDocument();
      expect(screen.getByText('Affected households estimate is required')).toBeInTheDocument();
      expect(screen.getByText('Immediate needs description is required')).toBeInTheDocument();
    });
  });

  it('validates affected population is greater than 0', async () => {
    const user = userEvent.setup();
    render(<PreliminaryAssessmentForm {...defaultProps} />);

    const populationInput = screen.getByLabelText('Affected Population Estimate *');
    await user.clear(populationInput);
    await user.type(populationInput, '0');

    const submitButton = screen.getByRole('button', { name: /submit assessment/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Affected population must be greater than 0')).toBeInTheDocument();
    });
  });

  it('submits form with valid data and creates incident', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    
    render(<PreliminaryAssessmentForm {...defaultProps} onSubmit={onSubmit} />);

    // Fill out the form
    await user.selectOptions(screen.getByLabelText('Incident Type *'), IncidentType.FLOOD);
    await user.type(screen.getByLabelText('Incident Sub-Type'), 'Flash flood');
    await user.selectOptions(screen.getByLabelText('Severity *'), IncidentSeverity.SEVERE);
    await user.clear(screen.getByLabelText('Affected Population Estimate *'));
    await user.type(screen.getByLabelText('Affected Population Estimate *'), '500');
    await user.clear(screen.getByLabelText('Affected Households Estimate *'));
    await user.type(screen.getByLabelText('Affected Households Estimate *'), '100');
    await user.type(screen.getByLabelText('Immediate Needs Description *'), 'Shelter and clean water needed');
    await user.selectOptions(screen.getByLabelText('Accessibility Status *'), 'ACCESSIBLE');
    await user.selectOptions(screen.getByLabelText('Priority Level *'), 'HIGH');
    await user.type(screen.getByLabelText('Additional Details'), 'Bridge damaged, access limited');

    const submitButton = screen.getByRole('button', { name: /submit assessment/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockIncidentService.createFromAssessment).toHaveBeenCalled();
      expect(mockNotificationService.notifyCoordinators).toHaveBeenCalled();
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  it('handles incident creation failure gracefully', async () => {
    mockIncidentService.createFromAssessment.mockRejectedValue(new Error('API Error'));
    
    const user = userEvent.setup();
    render(<PreliminaryAssessmentForm {...defaultProps} />);

    // Fill required fields
    await user.selectOptions(screen.getByLabelText('Incident Type *'), IncidentType.FLOOD);
    await user.selectOptions(screen.getByLabelText('Severity *'), IncidentSeverity.MODERATE);
    await user.type(screen.getByLabelText('Affected Population Estimate *'), '100');
    await user.type(screen.getByLabelText('Affected Households Estimate *'), '25');
    await user.type(screen.getByLabelText('Immediate Needs Description *'), 'Test needs');

    const submitButton = screen.getByRole('button', { name: /submit assessment/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/incident creation failed/i)).toBeInTheDocument();
    });
  });

  it('works in offline mode', async () => {
    mockUseOfflineStore.mockReturnValue({
      isOnline: false,
      addToQueue: jest.fn(),
      addPendingAssessment: jest.fn()
    } as any);

    const user = userEvent.setup();
    render(<PreliminaryAssessmentForm {...defaultProps} />);

    expect(screen.getByText('Offline Mode')).toBeInTheDocument();
    expect(screen.getByText(/incident will be created when back online/i)).toBeInTheDocument();

    // Fill and submit form
    await user.selectOptions(screen.getByLabelText('Incident Type *'), IncidentType.EARTHQUAKE);
    await user.selectOptions(screen.getByLabelText('Severity *'), IncidentSeverity.SEVERE);
    await user.type(screen.getByLabelText('Affected Population Estimate *'), '1000');
    await user.type(screen.getByLabelText('Affected Households Estimate *'), '200');
    await user.type(screen.getByLabelText('Immediate Needs Description *'), 'Medical assistance needed');

    const submitButton = screen.getByRole('button', { name: /submit assessment/i });
    await user.click(submitButton);

    const { addToQueue } = mockUseOfflineStore();
    await waitFor(() => {
      expect(addToQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ASSESSMENT',
          action: 'CREATE',
          priority: 'HIGH'
        })
      );
    });
  });

  it('displays GPS coordinates when available', () => {
    render(<PreliminaryAssessmentForm {...defaultProps} />);

    expect(screen.getByText(/lat: 40\.712800/i)).toBeInTheDocument();
    expect(screen.getByText(/lng: -74\.006000/i)).toBeInTheDocument();
    expect(screen.getByText(/±10m/i)).toBeInTheDocument();
  });

  it('shows loading state during submission', async () => {
    // Mock a slow API response
    mockIncidentService.createFromAssessment.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        success: true,
        incident: { id: 'test', name: 'Test', type: 'FLOOD', severity: 'MODERATE', status: 'ACTIVE', preliminaryAssessmentIds: [] }
      }), 1000))
    );

    const user = userEvent.setup();
    render(<PreliminaryAssessmentForm {...defaultProps} />);

    // Fill required fields
    await user.selectOptions(screen.getByLabelText('Incident Type *'), IncidentType.FLOOD);
    await user.selectOptions(screen.getByLabelText('Severity *'), IncidentSeverity.MODERATE);
    await user.type(screen.getByLabelText('Affected Population Estimate *'), '100');
    await user.type(screen.getByLabelText('Affected Households Estimate *'), '25');
    await user.type(screen.getByLabelText('Immediate Needs Description *'), 'Test needs');

    const submitButton = screen.getByRole('button', { name: /submit assessment/i });
    await user.click(submitButton);

    // Should show loading state
    expect(screen.getByText('Creating Incident...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('handles cancel action', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    
    render(<PreliminaryAssessmentForm {...defaultProps} onCancel={onCancel} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });

  it('shows status messages for incident creation process', async () => {
    const user = userEvent.setup();
    render(<PreliminaryAssessmentForm {...defaultProps} />);

    // Fill and submit form
    await user.selectOptions(screen.getByLabelText('Incident Type *'), IncidentType.WILDFIRE);
    await user.selectOptions(screen.getByLabelText('Severity *'), IncidentSeverity.CATASTROPHIC);
    await user.type(screen.getByLabelText('Affected Population Estimate *'), '5000');
    await user.type(screen.getByLabelText('Affected Households Estimate *'), '1000');
    await user.type(screen.getByLabelText('Immediate Needs Description *'), 'Evacuation needed');

    const submitButton = screen.getByRole('button', { name: /submit assessment/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/incident created successfully/i)).toBeInTheDocument();
      expect(screen.getByText(/coordinators have been notified/i)).toBeInTheDocument();
    });
  });

  it('validates incident sub-type length', async () => {
    const user = userEvent.setup();
    render(<PreliminaryAssessmentForm {...defaultProps} />);

    const subTypeInput = screen.getByLabelText('Incident Sub-Type');
    await user.type(subTypeInput, 'a'.repeat(101)); // Exceeds 100 character limit

    const submitButton = screen.getByRole('button', { name: /submit assessment/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Incident sub-type must be 100 characters or less')).toBeInTheDocument();
    });
  });

  it('validates immediate needs description length', async () => {
    const user = userEvent.setup();
    render(<PreliminaryAssessmentForm {...defaultProps} />);

    const needsInput = screen.getByLabelText('Immediate Needs Description *');
    await user.type(needsInput, 'a'.repeat(1001)); // Exceeds 1000 character limit

    const submitButton = screen.getByRole('button', { name: /submit assessment/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Immediate needs description must be 1000 characters or less')).toBeInTheDocument();
    });
  });

  it('displays character count for text areas', () => {
    render(<PreliminaryAssessmentForm {...defaultProps} />);

    expect(screen.getByText('0/1000')).toBeInTheDocument(); // For immediate needs
    expect(screen.getByText('0/2000')).toBeInTheDocument(); // For additional details
  });

  it('updates character count as user types', async () => {
    const user = userEvent.setup();
    render(<PreliminaryAssessmentForm {...defaultProps} />);

    const needsInput = screen.getByLabelText('Immediate Needs Description *');
    await user.type(needsInput, 'Test description');

    expect(screen.getByText('16/1000')).toBeInTheDocument();
  });
});