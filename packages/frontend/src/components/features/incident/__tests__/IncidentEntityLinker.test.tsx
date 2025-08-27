import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IncidentEntityLinker } from '../IncidentEntityLinker';
import { useIncidentStore } from '@/stores/incident.store';
import { EntityType } from '@dms/shared';

// Mock the incident store
jest.mock('@/stores/incident.store');

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

// Mock map component
jest.mock('@/components/common/MapView', () => {
  return function MockMapView({ entities, center, onEntityClick }: any) {
    return (
      <div data-testid="map-view">
        <div>Map Center: {center?.latitude}, {center?.longitude}</div>
        {entities?.map((entity: any) => (
          <button
            key={entity.id}
            data-testid={`map-entity-${entity.id}`}
            onClick={() => onEntityClick?.(entity)}
          >
            {entity.name}
          </button>
        ))}
      </div>
    );
  };
});

const mockUseIncidentStore = useIncidentStore as jest.MockedFunction<typeof useIncidentStore>;

const mockLinkedEntities = [
  {
    id: '1',
    name: 'Maiduguri Camp A',
    type: EntityType.CAMP,
    lga: 'Maiduguri',
    ward: 'Bolori Ward',
    latitude: 11.8311,
    longitude: 13.1506,
    population: 15000,
    linkDate: new Date('2024-08-20'),
    impactLevel: 'HIGH' as const,
  },
  {
    id: '3',
    name: 'Monguno Camp B',
    type: EntityType.CAMP,
    lga: 'Monguno',
    ward: 'Town Ward',
    latitude: 12.6743,
    longitude: 13.6092,
    population: 12000,
    linkDate: new Date('2024-08-21'),
    impactLevel: 'MEDIUM' as const,
  },
];

const mockAvailableEntities = [
  {
    id: '2',
    name: 'Bama Community Center',
    type: EntityType.COMMUNITY,
    lga: 'Bama',
    ward: 'Central Ward',
    latitude: 11.5204,
    longitude: 13.6896,
    population: 8500,
  },
  {
    id: '4',
    name: 'Konduga Village',
    type: EntityType.COMMUNITY,
    lga: 'Konduga',
    ward: 'Konduga Ward',
    latitude: 11.8833,
    longitude: 13.4167,
    population: 5200,
  },
];

const mockIncident = {
  id: '1',
  name: 'Test Flood Incident',
  type: 'FLOOD',
  status: 'ACTIVE',
  linkedEntities: mockLinkedEntities,
};

describe('IncidentEntityLinker', () => {
  const defaultProps = {
    coordinatorId: 'coord-123',
    coordinatorName: 'John Coordinator',
  };

  const mockActions = {
    fetchLinkedEntities: jest.fn(),
    fetchAvailableEntities: jest.fn(),
    linkEntitiesToIncident: jest.fn(),
    unlinkEntityFromIncident: jest.fn(),
    fetchEntityRelationshipDetails: jest.fn(),
    openEntityLinkingForm: jest.fn(),
    closeEntityLinkingForm: jest.fn(),
    calculateImpactAnalytics: jest.fn(),
  };

  const mockStoreState = {
    selectedIncident: mockIncident,
    linkedEntities: mockLinkedEntities,
    availableEntities: mockAvailableEntities,
    entityLinkingForm: {
      isOpen: false,
    },
    impactAnalytics: {
      totalPopulation: 27000,
      affectedLGAs: ['Maiduguri', 'Monguno'],
      avgDistanceFromIncident: 25.5,
      riskProfile: {
        high: 1,
        medium: 1,
        low: 0,
      },
      resourceRequirements: {
        shelters: 2,
        medicalUnits: 1,
        waterTrucks: 3,
      },
    },
    selectedEntityDetails: null,
    isLoading: false,
    error: null,
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
  });

  it('renders the entity linker interface', () => {
    render(<IncidentEntityLinker {...defaultProps} />);

    expect(screen.getByText('Entity Relations Management')).toBeInTheDocument();
    expect(screen.getByText('Entities')).toBeInTheDocument();
    expect(screen.getByText('Map View')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('fetches data on mount', () => {
    render(<IncidentEntityLinker {...defaultProps} />);

    expect(mockActions.fetchLinkedEntities).toHaveBeenCalledWith('1');
    expect(mockActions.fetchAvailableEntities).toHaveBeenCalledTimes(1);
    expect(mockActions.calculateImpactAnalytics).toHaveBeenCalledWith('1');
  });

  it('displays linked entities list', () => {
    render(<IncidentEntityLinker {...defaultProps} />);

    expect(screen.getByText('Maiduguri Camp A')).toBeInTheDocument();
    expect(screen.getByText('Monguno Camp B')).toBeInTheDocument();
    expect(screen.getByText('15,000 people')).toBeInTheDocument();
    expect(screen.getByText('12,000 people')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
  });

  it('opens entity linking form', async () => {
    const user = userEvent.setup();
    render(<IncidentEntityLinker {...defaultProps} />);

    await user.click(screen.getByText('Link New Entities'));

    expect(mockActions.openEntityLinkingForm).toHaveBeenCalledWith('1');
  });

  it('displays entity linking form when open', () => {
    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          entityLinkingForm: {
            isOpen: true,
          },
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        entityLinkingForm: {
          isOpen: true,
        },
        ...mockActions,
      };
    });

    render(<IncidentEntityLinker {...defaultProps} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('Link Entities to Incident')).toBeInTheDocument();
  });

  it('handles entity linking', async () => {
    const user = userEvent.setup();
    
    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          entityLinkingForm: {
            isOpen: true,
          },
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        entityLinkingForm: {
          isOpen: true,
        },
        ...mockActions,
      };
    });

    render(<IncidentEntityLinker {...defaultProps} />);

    // Select entities to link
    const entity1Checkbox = screen.getByLabelText('Bama Community Center');
    const entity2Checkbox = screen.getByLabelText('Konduga Village');

    await user.click(entity1Checkbox);
    await user.click(entity2Checkbox);

    expect(entity1Checkbox).toBeChecked();
    expect(entity2Checkbox).toBeChecked();

    // Submit
    await user.click(screen.getByText('Link Selected Entities'));

    expect(mockActions.linkEntitiesToIncident).toHaveBeenCalledWith('1', {
      entityIds: ['2', '4'],
      coordinatorId: 'coord-123',
      coordinatorName: 'John Coordinator',
    });
  });

  it('handles entity unlinking', async () => {
    const user = userEvent.setup();
    render(<IncidentEntityLinker {...defaultProps} />);

    // Click unlink button for first entity
    const unlinkButtons = screen.getAllByText('Unlink');
    await user.click(unlinkButtons[0]);

    // Confirm unlinking
    await user.click(screen.getByText('Yes, Unlink'));

    expect(mockActions.unlinkEntityFromIncident).toHaveBeenCalledWith('1', '1');
  });

  it('filters entities by type', async () => {
    const user = userEvent.setup();
    render(<IncidentEntityLinker {...defaultProps} />);

    // Filter by CAMP type
    const typeFilter = screen.getByDisplayValue('All Types');
    await user.selectOptions(typeFilter, EntityType.CAMP);

    // Only camp entities should be visible
    expect(screen.getByText('Maiduguri Camp A')).toBeInTheDocument();
    expect(screen.getByText('Monguno Camp B')).toBeInTheDocument();
  });

  it('searches entities by name', async () => {
    const user = userEvent.setup();
    render(<IncidentEntityLinker {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/search entities/i);
    await user.type(searchInput, 'Maiduguri');

    // Only matching entities should be visible
    expect(screen.getByText('Maiduguri Camp A')).toBeInTheDocument();
    expect(screen.queryByText('Monguno Camp B')).not.toBeInTheDocument();
  });

  it('switches between tabs', async () => {
    const user = userEvent.setup();
    render(<IncidentEntityLinker {...defaultProps} />);

    // Switch to Map View tab
    await user.click(screen.getByText('Map View'));
    expect(screen.getByTestId('map-view')).toBeInTheDocument();

    // Switch to Analytics tab
    await user.click(screen.getByText('Analytics'));
    expect(screen.getByText('Impact Analytics')).toBeInTheDocument();
  });

  it('displays map view with entities', async () => {
    const user = userEvent.setup();
    render(<IncidentEntityLinker {...defaultProps} />);

    // Switch to Map View
    await user.click(screen.getByText('Map View'));

    expect(screen.getByTestId('map-view')).toBeInTheDocument();
    expect(screen.getByTestId('map-entity-1')).toBeInTheDocument();
    expect(screen.getByTestId('map-entity-3')).toBeInTheDocument();
  });

  it('handles map entity click', async () => {
    const user = userEvent.setup();
    render(<IncidentEntityLinker {...defaultProps} />);

    // Switch to Map View
    await user.click(screen.getByText('Map View'));

    // Click on entity in map
    await user.click(screen.getByTestId('map-entity-1'));

    expect(mockActions.fetchEntityRelationshipDetails).toHaveBeenCalledWith('1', '1');
  });

  it('displays analytics information', async () => {
    const user = userEvent.setup();
    render(<IncidentEntityLinker {...defaultProps} />);

    // Switch to Analytics tab
    await user.click(screen.getByText('Analytics'));

    expect(screen.getByText('Total Population Impact')).toBeInTheDocument();
    expect(screen.getByText('27,000')).toBeInTheDocument();
    expect(screen.getByText('Affected LGAs')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Risk Distribution')).toBeInTheDocument();
  });

  it('shows entity details when selected', () => {
    const mockEntityDetails = {
      entity: mockLinkedEntities[0],
      relationship: {
        linkDate: new Date('2024-08-20'),
        impactLevel: 'HIGH' as const,
        estimatedDistance: 15,
        lastAssessment: new Date('2024-08-25'),
      },
      impactAssessment: {
        peopleAffected: 15000,
        infrastructureDamage: 'Moderate',
        accessibilityStatus: 'Limited',
        immediateNeeds: ['Clean Water', 'Emergency Shelter'],
      },
    };

    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          selectedEntityDetails: mockEntityDetails,
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        selectedEntityDetails: mockEntityDetails,
        ...mockActions,
      };
    });

    render(<IncidentEntityLinker {...defaultProps} />);

    expect(screen.getByText('Entity Details: Maiduguri Camp A')).toBeInTheDocument();
    expect(screen.getByText('15,000 people affected')).toBeInTheDocument();
    expect(screen.getByText('Moderate infrastructure damage')).toBeInTheDocument();
    expect(screen.getByText('Clean Water')).toBeInTheDocument();
    expect(screen.getByText('Emergency Shelter')).toBeInTheDocument();
  });

  it('sorts entities by different criteria', async () => {
    const user = userEvent.setup();
    render(<IncidentEntityLinker {...defaultProps} />);

    // Sort by population
    const sortSelect = screen.getByDisplayValue('Name');
    await user.selectOptions(sortSelect, 'population');

    // Higher population should appear first
    const entityCards = screen.getAllByTestId(/entity-card-/);
    expect(entityCards[0]).toHaveTextContent('Maiduguri Camp A');
    expect(entityCards[1]).toHaveTextContent('Monguno Camp B');
  });

  it('shows loading state', () => {
    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          isLoading: true,
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        isLoading: true,
        ...mockActions,
      };
    });

    render(<IncidentEntityLinker {...defaultProps} />);

    expect(screen.getByText('Loading entity relationships...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    const errorMessage = 'Failed to load entity data';
    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          error: errorMessage,
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        error: errorMessage,
        ...mockActions,
      };
    });

    render(<IncidentEntityLinker {...defaultProps} />);

    expect(screen.getByText(/Failed to load entity relationships/i)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('shows empty state when no entities linked', () => {
    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          linkedEntities: [],
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        linkedEntities: [],
        ...mockActions,
      };
    });

    render(<IncidentEntityLinker {...defaultProps} />);

    expect(screen.getByText('No entities linked to this incident')).toBeInTheDocument();
    expect(screen.getByText('Link your first entity to begin tracking impact')).toBeInTheDocument();
  });

  it('validates entity linking form', async () => {
    const user = userEvent.setup();
    
    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          entityLinkingForm: {
            isOpen: true,
          },
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        entityLinkingForm: {
          isOpen: true,
        },
        ...mockActions,
      };
    });

    render(<IncidentEntityLinker {...defaultProps} />);

    // Try to submit without selecting entities
    await user.click(screen.getByText('Link Selected Entities'));

    expect(screen.getByText('Please select at least one entity to link')).toBeInTheDocument();
    expect(mockActions.linkEntitiesToIncident).not.toHaveBeenCalled();
  });

  it('calculates total selected population in linking form', async () => {
    const user = userEvent.setup();
    
    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          entityLinkingForm: {
            isOpen: true,
          },
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        entityLinkingForm: {
          isOpen: true,
        },
        ...mockActions,
      };
    });

    render(<IncidentEntityLinker {...defaultProps} />);

    // Select entities
    await user.click(screen.getByLabelText('Bama Community Center'));
    await user.click(screen.getByLabelText('Konduga Village'));

    // Should show total population
    expect(screen.getByText('Total Population: 13,700')).toBeInTheDocument();
  });

  it('handles no incident selected', () => {
    mockUseIncidentStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          ...mockStoreState,
          selectedIncident: null,
          ...mockActions,
        });
      }
      return {
        ...mockStoreState,
        selectedIncident: null,
        ...mockActions,
      };
    });

    render(<IncidentEntityLinker {...defaultProps} />);

    expect(screen.getByText('No incident selected')).toBeInTheDocument();
    expect(screen.getByText('Please select an incident to manage entity relationships')).toBeInTheDocument();
  });
});