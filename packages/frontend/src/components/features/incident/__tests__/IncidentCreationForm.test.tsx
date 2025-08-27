import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IncidentCreationForm } from '../IncidentCreationForm';
import { useIncidentStore } from '@/stores/incident.store';
import { IncidentType, IncidentSeverity, EntityType } from '@dms/shared';

// Mock the incident store
jest.mock('@/stores/incident.store');

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

// Mock geolocation API
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

// Mock child components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ onValueChange, value, children }: any) => (
    <select data-testid="select" value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>,
}));

const mockUseIncidentStore = useIncidentStore as jest.MockedFunction<typeof useIncidentStore>;

const mockEntities = [
  {
    id: '1',
    name: 'Maiduguri Camp A',
    type: EntityType.CAMP,
    lga: 'Maiduguri',
    ward: 'Bolori Ward',
    population: 15000,
  },
  {
    id: '2',
    name: 'Bama Community Center',
    type: EntityType.COMMUNITY,
    lga: 'Bama',
    ward: 'Central Ward',
    population: 8500,
  },
];

const mockPreliminaryAssessments = [
  {
    id: 'assess-1',
    entityId: '1',
    entityName: 'Maiduguri Camp A',
    severity: 'SEVERE',
    date: new Date('2024-08-20'),
    coordinatorName: 'Dr. Ahmed',
  },
  {
    id: 'assess-2',
    entityId: '2',
    entityName: 'Bama Community Center',
    severity: 'MODERATE',
    date: new Date('2024-08-21'),
    coordinatorName: 'Sarah Johnson',
  },
];

describe('IncidentCreationForm', () => {
  const defaultProps = {
    coordinatorId: 'coord-123',
    coordinatorName: 'John Coordinator',
  };

  const mockActions = {
    createIncident: jest.fn(),
    closeCreationForm: jest.fn(),
    fetchAvailableEntities: jest.fn(),
    fetchPreliminaryAssessments: jest.fn(),
  };

  const mockStoreState = {
    creationForm: {
      isOpen: true,
      availableEntities: mockEntities,
      preliminaryAssessments: mockPreliminaryAssessments,
      isLoading: false,
      error: null,
    },
    isCreating: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        ...mockActions,
      };
    });

    // Mock successful geolocation
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 11.8311,
          longitude: 13.1506,
          accuracy: 10,
        },
      });
    });
  });

  it('renders the form when open', () => {
    render(<IncidentCreationForm {...defaultProps} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('Create New Incident')).toBeInTheDocument();
    expect(screen.getByText('Manual Entry')).toBeInTheDocument();
    expect(screen.getByText('From Assessment')).toBeInTheDocument();
  });

  it('does not render when form is closed', () => {
    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          creationForm: { ...mockStoreState.creationForm, isOpen: false },
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        creationForm: { ...mockStoreState.creationForm, isOpen: false },
        ...mockActions,
      };
    });

    render(<IncidentCreationForm {...defaultProps} />);

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('fetches entities and assessments on mount', () => {
    render(<IncidentCreationForm {...defaultProps} />);

    expect(mockActions.fetchAvailableEntities).toHaveBeenCalledTimes(1);
    expect(mockActions.fetchPreliminaryAssessments).toHaveBeenCalledTimes(1);
  });

  it('switches between manual entry and assessment tabs', async () => {
    const user = userEvent.setup();
    render(<IncidentCreationForm {...defaultProps} />);

    // Start with manual entry tab active
    expect(screen.getByText('Manual Entry')).toHaveClass('bg-primary');
    
    // Switch to assessment tab
    await user.click(screen.getByText('From Assessment'));
    
    expect(screen.getByText('From Assessment')).toHaveClass('bg-primary');
  });

  it('handles manual incident creation form submission', async () => {
    const user = userEvent.setup();
    render(<IncidentCreationForm {...defaultProps} />);

    // Fill out the form
    await user.type(screen.getByLabelText(/incident name/i), 'Test Flood Incident');
    await user.selectOptions(screen.getByDisplayValue('Select incident type'), IncidentType.FLOOD);
    await user.selectOptions(screen.getByDisplayValue('Select severity'), IncidentSeverity.SEVERE);
    await user.type(screen.getByLabelText(/description/i), 'Severe flooding in affected areas');

    // Submit form
    await user.click(screen.getByText('Create Incident'));

    await waitFor(() => {
      expect(mockActions.createIncident).toHaveBeenCalledWith({
        name: 'Test Flood Incident',
        type: IncidentType.FLOOD,
        severity: IncidentSeverity.SEVERE,
        description: 'Severe flooding in affected areas',
        coordinatorId: 'coord-123',
        coordinatorName: 'John Coordinator',
        source: 'MANUAL',
        location: expect.any(Object),
        linkedEntityIds: [],
        linkedAssessmentIds: [],
      });
    });
  });

  it('handles GPS coordinate capture', async () => {
    const user = userEvent.setup();
    render(<IncidentCreationForm {...defaultProps} />);

    const captureButton = screen.getByText('Capture Current Location');
    await user.click(captureButton);

    await waitFor(() => {
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
      expect(screen.getByDisplayValue('11.8311')).toBeInTheDocument();
      expect(screen.getByDisplayValue('13.1506')).toBeInTheDocument();
    });
  });

  it('handles GPS permission denied', async () => {
    const user = userEvent.setup();
    
    // Mock geolocation error
    mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
      error({
        code: 1, // PERMISSION_DENIED
        message: 'User denied the request for Geolocation.',
      });
    });

    render(<IncidentCreationForm {...defaultProps} />);

    const captureButton = screen.getByText('Capture Current Location');
    await user.click(captureButton);

    await waitFor(() => {
      expect(screen.getByText(/Location access denied/i)).toBeInTheDocument();
    });
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<IncidentCreationForm {...defaultProps} />);

    // Try to submit without filling required fields
    await user.click(screen.getByText('Create Incident'));

    await waitFor(() => {
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Type is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Severity is required/i)).toBeInTheDocument();
    });

    expect(mockActions.createIncident).not.toHaveBeenCalled();
  });

  it('handles entity selection', async () => {
    const user = userEvent.setup();
    render(<IncidentCreationForm {...defaultProps} />);

    // Select entities
    const entityCheckbox1 = screen.getByLabelText('Maiduguri Camp A');
    const entityCheckbox2 = screen.getByLabelText('Bama Community Center');

    await user.click(entityCheckbox1);
    await user.click(entityCheckbox2);

    expect(entityCheckbox1).toBeChecked();
    expect(entityCheckbox2).toBeChecked();

    // Population should be calculated
    expect(screen.getByText('Total Affected Population: 23,500')).toBeInTheDocument();
  });

  it('creates incident from preliminary assessment', async () => {
    const user = userEvent.setup();
    render(<IncidentCreationForm {...defaultProps} />);

    // Switch to assessment tab
    await user.click(screen.getByText('From Assessment'));

    // Select an assessment
    const assessmentCard = screen.getByText('Maiduguri Camp A');
    await user.click(assessmentCard);

    // The form should be pre-filled
    expect(screen.getByDisplayValue('assess-1')).toBeInTheDocument();

    // Add incident name and submit
    await user.type(screen.getByLabelText(/incident name/i), 'Assessment-Based Incident');
    await user.click(screen.getByText('Create from Assessment'));

    await waitFor(() => {
      expect(mockActions.createIncident).toHaveBeenCalledWith({
        name: 'Assessment-Based Incident',
        coordinatorId: 'coord-123',
        coordinatorName: 'John Coordinator',
        source: 'ASSESSMENT',
        linkedAssessmentIds: ['assess-1'],
        linkedEntityIds: ['1'],
        type: expect.any(String),
        severity: expect.any(String),
      });
    });
  });

  it('shows loading state during creation', () => {
    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          isCreating: true,
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        isCreating: true,
        ...mockActions,
      };
    });

    render(<IncidentCreationForm {...defaultProps} />);

    expect(screen.getByText('Creating...')).toBeInTheDocument();
    expect(screen.getByText('Create Incident')).toBeDisabled();
  });

  it('shows loading state for entities and assessments', () => {
    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          creationForm: {
            ...mockStoreState.creationForm,
            isLoading: true,
          },
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        creationForm: {
          ...mockStoreState.creationForm,
          isLoading: true,
        },
        ...mockActions,
      };
    });

    render(<IncidentCreationForm {...defaultProps} />);

    expect(screen.getByText('Loading entities...')).toBeInTheDocument();
  });

  it('displays error state', () => {
    const errorMessage = 'Failed to load data';
    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          creationForm: {
            ...mockStoreState.creationForm,
            error: errorMessage,
          },
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        creationForm: {
          ...mockStoreState.creationForm,
          error: errorMessage,
        },
        ...mockActions,
      };
    });

    render(<IncidentCreationForm {...defaultProps} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('closes form when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<IncidentCreationForm {...defaultProps} />);

    await user.click(screen.getByText('Cancel'));

    expect(mockActions.closeCreationForm).toHaveBeenCalledTimes(1);
  });

  it('filters assessments by search term', async () => {
    const user = userEvent.setup();
    render(<IncidentCreationForm {...defaultProps} />);

    // Switch to assessment tab
    await user.click(screen.getByText('From Assessment'));

    // Search for specific assessment
    const searchInput = screen.getByPlaceholderText(/search assessments/i);
    await user.type(searchInput, 'Maiduguri');

    // Only matching assessment should be visible
    expect(screen.getByText('Maiduguri Camp A')).toBeInTheDocument();
    expect(screen.queryByText('Bama Community Center')).not.toBeInTheDocument();
  });

  it('filters entities by type and search', async () => {
    const user = userEvent.setup();
    render(<IncidentCreationForm {...defaultProps} />);

    // Filter by entity type
    const typeFilter = screen.getByDisplayValue('All Types');
    await user.selectOptions(typeFilter, EntityType.CAMP);

    // Only camp entities should be visible
    expect(screen.getByText('Maiduguri Camp A')).toBeInTheDocument();
    expect(screen.queryByText('Bama Community Center')).not.toBeInTheDocument();
  });

  it('handles coordinate validation', async () => {
    const user = userEvent.setup();
    render(<IncidentCreationForm {...defaultProps} />);

    // Enter invalid coordinates
    const latInput = screen.getByLabelText(/latitude/i);
    const lngInput = screen.getByLabelText(/longitude/i);

    await user.clear(latInput);
    await user.type(latInput, '200'); // Invalid latitude
    await user.clear(lngInput);
    await user.type(lngInput, '200'); // Invalid longitude

    await user.click(screen.getByText('Create Incident'));

    await waitFor(() => {
      expect(screen.getByText(/Latitude must be between -90 and 90/i)).toBeInTheDocument();
      expect(screen.getByText(/Longitude must be between -180 and 180/i)).toBeInTheDocument();
    });
  });
});