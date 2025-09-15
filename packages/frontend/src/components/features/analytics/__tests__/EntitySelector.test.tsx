import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EntitySelector } from '../EntitySelector';
import { useAnalyticsStore } from '@/stores/analytics.store';

// Mock the analytics store
jest.mock('@/stores/analytics.store');
const mockUseAnalyticsStore = useAnalyticsStore as jest.MockedFunction<typeof useAnalyticsStore>;

// Mock fetch
global.fetch = jest.fn();

describe('EntitySelector', () => {
  const mockOnEntityChange = jest.fn();
  const mockSelectedIncident = {
    id: 'incident-1',
    name: 'Test Incident',
    type: 'Flood',
    status: 'ACTIVE' as const,
    declarationDate: '2023-01-01',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAnalyticsStore.mockReturnValue({
      selectedIncident: mockSelectedIncident,
    } as any);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders message when no incident is selected', () => {
    mockUseAnalyticsStore.mockReturnValue({
      selectedIncident: null,
    } as any);

    render(
      <EntitySelector 
        onEntityChange={mockOnEntityChange} 
        selectedEntityId={null} 
      />
    );

    expect(screen.getByText('Select an incident to view affected entities')).toBeInTheDocument();
  });

  it('fetches entities when incident is selected', async () => {
    const mockEntities = [
      { id: 'all', name: 'All Affected Entities', type: 'aggregate' },
      { id: 'entity-1', name: 'Lagos LGA', type: 'LGA', coordinates: [3.4, 6.5] },
      { id: 'entity-2', name: 'Abuja Ward', type: 'Ward', coordinates: [7.5, 9.1] },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { entities: mockEntities },
      }),
    });

    render(
      <EntitySelector 
        onEntityChange={mockOnEntityChange} 
        selectedEntityId={null} 
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/v1/monitoring/analytics/entities/by-incident/${mockSelectedIncident.id}`
      );
    });

    // Should auto-select "All Affected Entities"
    await waitFor(() => {
      expect(mockOnEntityChange).toHaveBeenCalledWith('all');
    });
  });

  it('displays loading state while fetching entities', async () => {
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );

    render(
      <EntitySelector 
        onEntityChange={mockOnEntityChange} 
        selectedEntityId={null} 
      />
    );

    expect(screen.getByText(/Loading entities for Test Incident/)).toBeInTheDocument();
  });

  it('handles fetch error gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(
      <EntitySelector 
        onEntityChange={mockOnEntityChange} 
        selectedEntityId={null} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Error loading entities: Network error/)).toBeInTheDocument();
    });
  });

  it('handles API error response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    render(
      <EntitySelector 
        onEntityChange={mockOnEntityChange} 
        selectedEntityId={null} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Error loading entities/)).toBeInTheDocument();
    });
  });

  it('allows entity selection from dropdown', async () => {
    const mockEntities = [
      { id: 'all', name: 'All Affected Entities', type: 'aggregate' },
      { id: 'entity-1', name: 'Lagos LGA', type: 'LGA' },
      { id: 'entity-2', name: 'Abuja Ward', type: 'Ward' },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { entities: mockEntities },
      }),
    });

    render(
      <EntitySelector 
        onEntityChange={mockOnEntityChange} 
        selectedEntityId="all" 
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    // Click the select trigger
    fireEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByText('Lagos LGA')).toBeInTheDocument();
      expect(screen.getByText('Abuja Ward')).toBeInTheDocument();
    });

    // Select an entity
    fireEvent.click(screen.getByText('Lagos LGA'));

    expect(mockOnEntityChange).toHaveBeenCalledWith('entity-1');
  });

  it('displays entity count when entities are loaded', async () => {
    const mockEntities = [
      { id: 'all', name: 'All Affected Entities', type: 'aggregate' },
      { id: 'entity-1', name: 'Lagos LGA', type: 'LGA' },
      { id: 'entity-2', name: 'Abuja Ward', type: 'Ward' },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { entities: mockEntities },
      }),
    });

    render(
      <EntitySelector 
        onEntityChange={mockOnEntityChange} 
        selectedEntityId={null} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText('3 entities available')).toBeInTheDocument();
    });
  });

  it('shows entity type badges in dropdown', async () => {
    const mockEntities = [
      { id: 'all', name: 'All Affected Entities', type: 'aggregate' },
      { id: 'entity-1', name: 'Lagos LGA', type: 'LGA' },
      { id: 'entity-2', name: 'Abuja Ward', type: 'Ward' },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { entities: mockEntities },
      }),
    });

    render(
      <EntitySelector 
        onEntityChange={mockOnEntityChange} 
        selectedEntityId="all" 
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    // Click the select trigger
    fireEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByText('LGA')).toBeInTheDocument();
      expect(screen.getByText('Ward')).toBeInTheDocument();
    });
  });

  it('refetches entities when incident changes', async () => {
    const { rerender } = render(
      <EntitySelector 
        onEntityChange={mockOnEntityChange} 
        selectedEntityId={null} 
      />
    );

    // Change incident
    const newIncident = {
      id: 'incident-2',
      name: 'New Incident',
      type: 'Fire',
      status: 'ACTIVE' as const,
      declarationDate: '2023-01-02',
    };

    mockUseAnalyticsStore.mockReturnValue({
      selectedIncident: newIncident,
    } as any);

    rerender(
      <EntitySelector 
        onEntityChange={mockOnEntityChange} 
        selectedEntityId={null} 
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/v1/monitoring/analytics/entities/by-incident/incident-2`
      );
    });
  });
});