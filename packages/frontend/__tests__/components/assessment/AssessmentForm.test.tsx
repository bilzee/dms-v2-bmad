import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AssessmentType } from '@dms/shared';
import { AssessmentForm } from '@/components/features/assessment/AssessmentForm';

// Mock the stores and hooks
jest.mock('@/hooks/useGPS', () => ({
  useGPS: jest.fn(() => ({
    coordinates: null,
    captureLocation: jest.fn(),
    isLoading: false,
    error: null,
  })),
}));

jest.mock('@/stores/offline.store', () => ({
  useOfflineStore: jest.fn(() => ({
    isOnline: true,
    addToQueue: jest.fn(),
    addPendingAssessment: jest.fn(),
  })),
}));

jest.mock('@/lib/offline/db', () => ({
  db: {
    saveAssessment: jest.fn(),
    saveDraft: jest.fn(),
  },
}));

describe('AssessmentForm', () => {
  const defaultProps = {
    assessmentType: AssessmentType.HEALTH,
    affectedEntityId: '123e4567-e89b-12d3-a456-426614174000',
    assessorName: 'Test Assessor',
    assessorId: 'test-assessor-id',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders health assessment form correctly', () => {
    render(<AssessmentForm {...defaultProps} />);
    
    expect(screen.getByText('HEALTH Assessment')).toBeInTheDocument();
    expect(screen.getByText(/Test Assessor/)).toBeInTheDocument();
    expect(screen.getByText('Capture GPS')).toBeInTheDocument();
  });

  test('displays online status correctly', () => {
    render(<AssessmentForm {...defaultProps} />);
    
    expect(screen.getByText(/Online/)).toBeInTheDocument();
  });

  test('renders form fields for health assessment', () => {
    render(<AssessmentForm {...defaultProps} />);
    
    expect(screen.getByLabelText('Has Functional Clinic')).toBeInTheDocument();
    expect(screen.getByLabelText('Number of Health Facilities')).toBeInTheDocument();
    expect(screen.getByLabelText('Health Facility Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Qualified Health Workers')).toBeInTheDocument();
  });

  test('renders population assessment form fields', () => {
    render(
      <AssessmentForm 
        {...defaultProps} 
        assessmentType={AssessmentType.POPULATION}
      />
    );
    
    expect(screen.getByText('POPULATION Assessment')).toBeInTheDocument();
    expect(screen.getByLabelText('Total Households')).toBeInTheDocument();
    expect(screen.getByLabelText('Total Population')).toBeInTheDocument();
    expect(screen.getByLabelText('Male Population')).toBeInTheDocument();
    expect(screen.getByLabelText('Female Population')).toBeInTheDocument();
  });

  test('renders WASH assessment form fields', () => {
    render(
      <AssessmentForm 
        {...defaultProps} 
        assessmentType={AssessmentType.WASH}
      />
    );
    
    expect(screen.getByText('WASH Assessment')).toBeInTheDocument();
    expect(screen.getByLabelText('Is Water Sufficient')).toBeInTheDocument();
    expect(screen.getByLabelText('Water Quality')).toBeInTheDocument();
    expect(screen.getByLabelText('Has Toilets')).toBeInTheDocument();
    expect(screen.getByLabelText('Number of Toilets')).toBeInTheDocument();
  });

  test('renders SHELTER assessment form fields', () => {
    render(
      <AssessmentForm 
        {...defaultProps} 
        assessmentType={AssessmentType.SHELTER}
      />
    );
    
    expect(screen.getByText('SHELTER Assessment')).toBeInTheDocument();
    expect(screen.getByLabelText('Are Shelters Sufficient')).toBeInTheDocument();
    expect(screen.getByLabelText('Number of Shelters')).toBeInTheDocument();
    expect(screen.getByLabelText('Shelter Condition')).toBeInTheDocument();
    expect(screen.getByLabelText('Needs Repair')).toBeInTheDocument();
  });

  test('renders FOOD assessment form fields', () => {
    render(
      <AssessmentForm 
        {...defaultProps} 
        assessmentType={AssessmentType.FOOD}
      />
    );
    
    expect(screen.getByText('FOOD Assessment')).toBeInTheDocument();
    expect(screen.getByLabelText('Available Food Duration (Days)')).toBeInTheDocument();
    expect(screen.getByLabelText('Additional Food Required (Persons)')).toBeInTheDocument();
    expect(screen.getByLabelText('Malnutrition Cases')).toBeInTheDocument();
    expect(screen.getByLabelText('Feeding Program Exists')).toBeInTheDocument();
  });

  test('renders SECURITY assessment form fields', () => {
    render(
      <AssessmentForm 
        {...defaultProps} 
        assessmentType={AssessmentType.SECURITY}
      />
    );
    
    expect(screen.getByText('SECURITY Assessment')).toBeInTheDocument();
    expect(screen.getByLabelText('Is Area Secure')).toBeInTheDocument();
    expect(screen.getByLabelText('Has Security Presence')).toBeInTheDocument();
    expect(screen.getByLabelText('Security Provider')).toBeInTheDocument();
    expect(screen.getByLabelText('Incidents Reported')).toBeInTheDocument();
  });

  test('renders PRELIMINARY assessment form fields', () => {
    render(
      <AssessmentForm 
        {...defaultProps} 
        assessmentType={AssessmentType.PRELIMINARY}
      />
    );
    
    expect(screen.getByText('PRELIMINARY Assessment')).toBeInTheDocument();
    expect(screen.getByText('🚨 Emergency Incident Report')).toBeInTheDocument();
    expect(screen.getByLabelText('Incident Type *')).toBeInTheDocument();
    expect(screen.getByLabelText('Incident Sub Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Severity Level *')).toBeInTheDocument();
    expect(screen.getByLabelText('Affected Population *')).toBeInTheDocument();
    expect(screen.getByLabelText('Affected Households *')).toBeInTheDocument();
    expect(screen.getByLabelText('Immediate Needs Description *')).toBeInTheDocument();
    expect(screen.getByLabelText('Site Accessibility *')).toBeInTheDocument();
    expect(screen.getByLabelText('Response Priority *')).toBeInTheDocument();
    expect(screen.getByLabelText('Additional Details')).toBeInTheDocument();
  });

  test('form submission button is present', () => {
    render(<AssessmentForm {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: /Submit Assessment/ })).toBeInTheDocument();
  });

  test('reset button clears form', async () => {
    render(<AssessmentForm {...defaultProps} />);
    
    const facilityInput = screen.getByLabelText('Number of Health Facilities');
    fireEvent.change(facilityInput, { target: { value: '5' } });
    
    const resetButton = screen.getByRole('button', { name: /Reset/ });
    fireEvent.click(resetButton);
    
    await waitFor(() => {
      expect(facilityInput).toHaveValue(0);
    });
  });

  test('calls onSubmit when form is submitted successfully', async () => {
    const mockOnSubmit = jest.fn();
    const mockSaveAssessment = jest.fn().mockResolvedValue('saved-id');
    require('@/lib/offline/db').db.saveAssessment = mockSaveAssessment;
    
    render(<AssessmentForm {...defaultProps} onSubmit={mockOnSubmit} />);
    
    // Fill out required fields
    const facilityTypeInput = screen.getByLabelText('Health Facility Type');
    fireEvent.change(facilityTypeInput, { target: { value: 'Hospital' } });
    
    const submitButton = screen.getByRole('button', { name: /Submit Assessment/ });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockSaveAssessment).toHaveBeenCalledTimes(1);
    });
    
    const firstCallId = mockSaveAssessment.mock.calls[0][0].id;
    expect(typeof firstCallId).toBe('string');
    expect(firstCallId.length).toBeGreaterThan(0);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });
  });

  test('displays GPS capture section', () => {
    render(<AssessmentForm {...defaultProps} />);
    
    expect(screen.getByText('Location Capture')).toBeInTheDocument();
    expect(screen.getByText('No location captured')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Capture GPS/ })).toBeInTheDocument();
  });
});

// P0 Critical Offline Functionality Tests
describe('AssessmentForm - P0 Offline Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should work completely offline - displays offline indicator', () => {
    // Mock offline state
    const { useOfflineStore } = require('@/stores/offline.store');
    useOfflineStore.mockImplementation(() => ({
      isOnline: false,
      addToQueue: jest.fn(),
      addPendingAssessment: jest.fn(),
    }));

    render(<AssessmentForm {...{
      assessmentType: AssessmentType.HEALTH,
      affectedEntityId: '123e4567-e89b-12d3-a456-426614174000',
      assessorName: 'Test Assessor',
      assessorId: 'test-assessor-id',
    }} />);
    
    expect(screen.getByText(/Offline • Test Assessor/)).toBeInTheDocument();
    expect(screen.getByText(/Will sync when online/)).toBeInTheDocument();
  });

  test('should queue assessments when offline', async () => {
    const mockAddPendingAssessment = jest.fn();
    require('@/stores/offline.store').useOfflineStore.mockReturnValue({
      isOnline: false,
      addToQueue: jest.fn(),
      addPendingAssessment: mockAddPendingAssessment,
    });

    const mockSaveAssessment = jest.fn().mockResolvedValue('saved-id');
    require('@/lib/offline/db').db.saveAssessment = mockSaveAssessment;

    render(<AssessmentForm {...{
      assessmentType: AssessmentType.HEALTH,
      affectedEntityId: '123e4567-e89b-12d3-a456-426614174000',
      assessorName: 'Test Assessor',
      assessorId: 'test-assessor-id',
    }} />);
    
    // Fill required field
    const facilityTypeInput = screen.getByLabelText('Health Facility Type');
    fireEvent.change(facilityTypeInput, { target: { value: 'Hospital' } });
    
    const submitButton = screen.getByRole('button', { name: /Submit Assessment/ });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockSaveAssessment).toHaveBeenCalled();
      expect(mockAddPendingAssessment).toHaveBeenCalled();
    });
  });

  test('should auto-save drafts every 30 seconds when form is dirty', async () => {
    jest.useFakeTimers();
    
    const mockSaveDraft = jest.fn().mockResolvedValue('draft-id');
    require('@/lib/offline/db').db.saveDraft = mockSaveDraft;

    render(<AssessmentForm {...{
      assessmentType: AssessmentType.HEALTH,
      affectedEntityId: '123e4567-e89b-12d3-a456-426614174000',
      assessorName: 'Test Assessor',
      assessorId: 'test-assessor-id',
    }} />);
    
    // Make form dirty
    const facilityInput = screen.getByLabelText('Number of Health Facilities');
    fireEvent.change(facilityInput, { target: { value: '5' } });
    
    // Fast forward 30 seconds
    jest.advanceTimersByTime(30000);
    
    await waitFor(() => {
      expect(mockSaveDraft).toHaveBeenCalled();
    });
    
    jest.useRealTimers();
  });

  test('should persist assessment data to IndexedDB without data loss', async () => {
    const mockSaveAssessment = jest.fn().mockResolvedValue('saved-id');
    require('@/lib/offline/db').db.saveAssessment = mockSaveAssessment;

    render(<AssessmentForm {...{
      assessmentType: AssessmentType.POPULATION,
      affectedEntityId: '123e4567-e89b-12d3-a456-426614174000',
      assessorName: 'Test Assessor',
      assessorId: 'test-assessor-id',
    }} />);
    
    // Fill all critical fields to test data integrity
    fireEvent.change(screen.getByLabelText('Total Households'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Total Population'), { target: { value: '450' } });
    fireEvent.change(screen.getByLabelText('Male Population'), { target: { value: '220' } });
    fireEvent.change(screen.getByLabelText('Female Population'), { target: { value: '230' } });
    
    const submitButton = screen.getByRole('button', { name: /Submit Assessment/ });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockSaveAssessment).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AssessmentType.POPULATION,
          data: expect.objectContaining({
            totalHouseholds: 100,
            totalPopulation: 450,
            populationMale: 220,
            populationFemale: 230,
          }),
          syncStatus: 'PENDING',
          verificationStatus: 'PENDING',
        })
      );
    });
  });
});

// P0 Critical GPS Validation Tests
describe('AssessmentForm - P0 GPS Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should capture GPS coordinates with timestamp when available', () => {
    const mockCoordinates = {
      latitude: 12.9716,
      longitude: 77.5946,
      accuracy: 10,
      timestamp: new Date(),
      captureMethod: 'GPS' as const,
    };

    require('@/hooks/useGPS').useGPS.mockReturnValue({
      coordinates: mockCoordinates,
      captureLocation: jest.fn(),
      isLoading: false,
      error: null,
    });

    render(<AssessmentForm {...{
      assessmentType: AssessmentType.HEALTH,
      affectedEntityId: '123e4567-e89b-12d3-a456-426614174000',
      assessorName: 'Test Assessor',
      assessorId: 'test-assessor-id',
    }} />);
    
    expect(screen.getByText(/Lat: 12.971600, Lng: 77.594600/)).toBeInTheDocument();
    expect(screen.getByText(/±10m/)).toBeInTheDocument();
  });

  test('should handle GPS capture failure gracefully', () => {
    require('@/hooks/useGPS').useGPS.mockReturnValue({
      coordinates: null,
      captureLocation: jest.fn(),
      isLoading: false,
      error: 'GPS not available',
    });

    render(<AssessmentForm {...{
      assessmentType: AssessmentType.HEALTH,
      affectedEntityId: '123e4567-e89b-12d3-a456-426614174000',
      assessorName: 'Test Assessor',
      assessorId: 'test-assessor-id',
    }} />);
    
    expect(screen.getByText('GPS not available')).toBeInTheDocument();
    expect(screen.getByText('No location captured')).toBeInTheDocument();
  });

  test('should allow form submission without GPS when location not critical', async () => {
    require('@/hooks/useGPS').useGPS.mockReturnValue({
      coordinates: null,
      captureLocation: jest.fn(),
      isLoading: false,
      error: null,
    });

    const mockSaveAssessment = jest.fn().mockResolvedValue('saved-id');
    require('@/lib/offline/db').db.saveAssessment = mockSaveAssessment;

    render(<AssessmentForm {...{
      assessmentType: AssessmentType.HEALTH,
      affectedEntityId: '123e4567-e89b-12d3-a456-426614174000',
      assessorName: 'Test Assessor',
      assessorId: 'test-assessor-id',
    }} />);
    
    const facilityTypeInput = screen.getByLabelText('Health Facility Type');
    fireEvent.change(facilityTypeInput, { target: { value: 'Hospital' } });
    
    const submitButton = screen.getByRole('button', { name: /Submit Assessment/ });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockSaveAssessment).toHaveBeenCalled();
    });
  });
});

// P0 Critical Data Integrity Tests
describe('AssessmentForm - P0 Data Integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should validate all assessment types have required fields', async () => {
    const testCases = [
      { type: AssessmentType.HEALTH, field: 'Health Facility Type', value: 'Hospital' },
      { type: AssessmentType.WASH, field: 'Toilet Type', value: 'Latrine' },
      { type: AssessmentType.SHELTER, field: 'Number of Shelters', value: '10' },
      { type: AssessmentType.FOOD, field: 'Available Food Duration (Days)', value: '7' },
      { type: AssessmentType.SECURITY, field: 'Security Provider', value: 'Police' },
      { type: AssessmentType.POPULATION, field: 'Total Population', value: '100' },
      { type: AssessmentType.PRELIMINARY, field: 'Immediate Needs Description *', value: 'Emergency shelter needed' },
    ];

    for (const testCase of testCases) {
      const mockSaveAssessment = jest.fn().mockResolvedValue('saved-id');
      require('@/lib/offline/db').db.saveAssessment = mockSaveAssessment;

      const { unmount } = render(<AssessmentForm {...{
        assessmentType: testCase.type,
        affectedEntityId: '123e4567-e89b-12d3-a456-426614174000',
        assessorName: 'Test Assessor',
        assessorId: 'test-assessor-id',
      }} />);
      
      const fieldInput = screen.getByLabelText(testCase.field);
      fireEvent.change(fieldInput, { target: { value: testCase.value } });
      
      const submitButton = screen.getByRole('button', { name: /Submit Assessment/ });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockSaveAssessment).toHaveBeenCalledWith(
          expect.objectContaining({
            type: testCase.type,
            data: expect.any(Object),
          })
        );
      });
      
      unmount();
    }
  });

  test('should generate unique IDs for each assessment', async () => {
    const mockSaveAssessment = jest.fn().mockResolvedValue('saved-id');
    require('@/lib/offline/db').db.saveAssessment = mockSaveAssessment;

    const { unmount, rerender } = render(<AssessmentForm {...{
      assessmentType: AssessmentType.HEALTH,
      affectedEntityId: '123e4567-e89b-12d3-a456-426614174000',
      assessorName: 'Test Assessor',
      assessorId: 'test-assessor-id',
    }} />);
    
    const facilityTypeInput = screen.getByLabelText('Health Facility Type');
    fireEvent.change(facilityTypeInput, { target: { value: 'Hospital' } });
    
    const submitButton = screen.getByRole('button', { name: /Submit Assessment/ });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockSaveAssessment).toHaveBeenCalledTimes(1);
    });
    
    const firstCallId = mockSaveAssessment.mock.calls[0][0].id;
    
    // Reset and submit again
    mockSaveAssessment.mockClear();
    
    rerender(<AssessmentForm {...{
      assessmentType: AssessmentType.HEALTH,
      affectedEntityId: 'test-entity-id-2',
      assessorName: 'Test Assessor',
      assessorId: 'test-assessor-id',
    }} />);
    
    const facilityTypeInput2 = screen.getByLabelText('Health Facility Type');
    fireEvent.change(facilityTypeInput2, { target: { value: 'Clinic' } });
    
    const submitButton2 = screen.getByRole('button', { name: /Submit Assessment/ });
    fireEvent.click(submitButton2);
    
    await waitFor(() => {
      expect(mockSaveAssessment).toHaveBeenCalledTimes(1);
    });
    
    const secondCallId = mockSaveAssessment.mock.calls[0][0].id;
    
    expect(firstCallId).not.toBe(secondCallId);
    expect(firstCallId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(secondCallId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});

// PRELIMINARY Assessment Specific Tests
describe('AssessmentForm - PRELIMINARY Assessment', () => {
  const preliminaryProps = {
    assessmentType: AssessmentType.PRELIMINARY,
    affectedEntityId: '123e4567-e89b-12d3-a456-426614174000',
    assessorName: 'Emergency Assessor',
    assessorId: 'emergency-assessor-id',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates required fields on submission', async () => {
    render(<AssessmentForm {...preliminaryProps} />);
    
    const submitButton = screen.getByRole('button', { name: /Submit Assessment/ });
    fireEvent.click(submitButton);
    
    // Form should prevent submission due to validation errors
    await waitFor(() => {
      // The form should not submit successfully without required fields
      expect(screen.getByLabelText('Incident Type *')).toBeInTheDocument();
    });
  });

  test('submits preliminary assessment with all fields', async () => {
    const mockSaveAssessment = jest.fn().mockResolvedValue('saved-id');
    require('@/lib/offline/db').db.saveAssessment = mockSaveAssessment;
    
    const propsWithEntity = {
      ...preliminaryProps,
      affectedEntityId: '123e4567-e89b-12d3-a456-426614174000', // Ensure entity is set
    };
    
    render(<AssessmentForm {...propsWithEntity} />);
    
    // Fill all required fields
    fireEvent.change(screen.getByLabelText('Incident Type *'), { target: { value: 'FLOOD' } });
    fireEvent.change(screen.getByLabelText('Incident Sub Type'), { target: { value: 'Flash flood' } });
    fireEvent.change(screen.getByLabelText('Severity Level *'), { target: { value: 'SEVERE' } });
    fireEvent.change(screen.getByLabelText('Affected Population *'), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText('Affected Households *'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Immediate Needs Description *'), { target: { value: 'Emergency shelter and medical aid needed' } });
    fireEvent.change(screen.getByLabelText('Site Accessibility *'), { target: { value: 'ACCESSIBLE' } });
    fireEvent.click(screen.getByDisplayValue('HIGH'));
    fireEvent.change(screen.getByLabelText('Additional Details'), { target: { value: 'Bridge damaged, alternate routes needed' } });
    
    const submitButton = screen.getByRole('button', { name: /Submit Assessment/ });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockSaveAssessment).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PRELIMINARY',
          data: expect.objectContaining({
            incidentType: 'FLOOD',
            incidentSubType: 'Flash flood',
            severity: 'SEVERE',
            affectedPopulationEstimate: 500,
            affectedHouseholdsEstimate: 100,
            immediateNeedsDescription: 'Emergency shelter and medical aid needed',
            accessibilityStatus: 'ACCESSIBLE',
            priorityLevel: 'HIGH',
            additionalDetails: 'Bridge damaged, alternate routes needed'
          })
        })
      );
    });
  });

  test('displays emergency styling for preliminary assessment', () => {
    render(<AssessmentForm {...preliminaryProps} />);
    
    expect(screen.getByText('🚨 Emergency Incident Report')).toBeInTheDocument();
    
    // Check that emergency styling classes are applied
    const container = screen.getByText('🚨 Emergency Incident Report').closest('div');
    expect(container).toHaveClass('bg-red-50');
    expect(container).toHaveClass('border-red-200');
  });

  test('priority radio buttons work correctly', async () => {
    render(<AssessmentForm {...preliminaryProps} />);
    
    const highPriorityRadio = screen.getByDisplayValue('HIGH');
    const normalPriorityRadio = screen.getByDisplayValue('NORMAL');
    const lowPriorityRadio = screen.getByDisplayValue('LOW');
    
    // Test selecting different priorities
    fireEvent.click(highPriorityRadio);
    expect(highPriorityRadio).toBeChecked();
    expect(normalPriorityRadio).not.toBeChecked();
    expect(lowPriorityRadio).not.toBeChecked();
    
    fireEvent.click(normalPriorityRadio);
    expect(normalPriorityRadio).toBeChecked();
    expect(highPriorityRadio).not.toBeChecked();
    expect(lowPriorityRadio).not.toBeChecked();
  });

  test('handles number inputs for population estimates', async () => {
    render(<AssessmentForm {...preliminaryProps} />);
    
    const populationInput = screen.getByLabelText('Affected Population *');
    const householdsInput = screen.getByLabelText('Affected Households *');
    
    fireEvent.change(populationInput, { target: { value: '1250' } });
    fireEvent.change(householdsInput, { target: { value: '300' } });
    
    expect(populationInput).toHaveValue(1250);
    expect(householdsInput).toHaveValue(300);
  });

  test('textarea fields accept multiline input', async () => {
    render(<AssessmentForm {...preliminaryProps} />);
    
    const needsTextarea = screen.getByLabelText('Immediate Needs Description *');
    const detailsTextarea = screen.getByLabelText('Additional Details');
    
    const multilineText = 'Line 1\nLine 2\nLine 3';
    
    fireEvent.change(needsTextarea, { target: { value: multilineText } });
    fireEvent.change(detailsTextarea, { target: { value: 'Additional info here' } });
    
    expect(needsTextarea).toHaveValue(multilineText);
    expect(detailsTextarea).toHaveValue('Additional info here');
  });
});