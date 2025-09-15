import { renderHook, act } from '@testing-library/react';
import { useAnalyticsStore, useAnalyticsIncidents, useAnalyticsSummary } from '../analytics.store';

// Mock zustand middleware
jest.mock('zustand/middleware', () => ({
  subscribeWithSelector: (fn: any) => fn,
}));

// Mock fetch globally
global.fetch = jest.fn();

const mockIncidentResponse = {
  id: '1',
  name: 'Test Incident',
  type: 'FLOOD',
  status: 'ACTIVE' as const,
  date: '2025-01-10T10:00:00Z',
  coordinates: {
    latitude: 11.8333,
    longitude: 13.1500,
  }
};

const mockIncident = {
  id: '1',
  name: 'Test Incident',
  type: 'FLOOD',
  status: 'ACTIVE' as const,
  declarationDate: '2025-01-10T10:00:00Z',
  coordinates: {
    latitude: 11.8333,
    longitude: 13.1500,
  }
};

const mockIncidentSummary = {
  incident: {
    id: '1',
    title: 'Test Incident',
    status: 'ACTIVE' as const,
    declarationDate: '2025-01-10T10:00:00Z',
    currentDate: '2025-01-15T15:30:00Z',
    duration: {
      days: 5,
      hours: 5,
      formatted: '5 days, 5 hours',
    },
  },
  populationImpact: {
    livesLost: 25,
    injured: 150,
    displaced: 800,
    housesAffected: 200,
  },
  aggregates: {
    affectedEntities: 5,
    totalAffectedPopulation: 2000,
    totalAffectedHouseholds: 450,
  },
};

describe('useAnalyticsStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockReset();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useAnalyticsStore());

    expect(result.current.selectedIncident).toBeNull();
    expect(result.current.incidentSummary).toBeNull();
    expect(result.current.incidents).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isLoadingIncidents).toBe(false);
    expect(result.current.isLoadingSummary).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.lastRefresh).toBeNull();
  });

  it('fetches incidents successfully', async () => {
    const mockResponse = {
      success: true,
      data: {
        incidents: [mockIncidentResponse],
      },
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useAnalyticsStore());

    await act(async () => {
      await result.current.fetchIncidents();
    });

    expect(result.current.incidents).toEqual([mockIncident]);
    expect(result.current.isLoadingIncidents).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.lastRefresh).toBeTruthy();
  });

  it('handles fetch incidents error', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAnalyticsStore());

    await act(async () => {
      await result.current.fetchIncidents();
    });

    expect(result.current.isLoadingIncidents).toBe(false);
    expect(result.current.error).toBe('Network error');
  });

  it('sets selected incident', () => {
    const { result } = renderHook(() => useAnalyticsStore());

    act(() => {
      result.current.setSelectedIncident(mockIncident);
    });

    expect(result.current.selectedIncident).toEqual(mockIncident);
    expect(result.current.incidentSummary).toBeNull(); // Reset on new selection
  });

  it('fetches incident summary successfully', async () => {
    const mockResponse = {
      success: true,
      data: {
        summary: mockIncidentSummary,
      },
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useAnalyticsStore());

    await act(async () => {
      await result.current.fetchIncidentSummary('1');
    });

    expect(result.current.incidentSummary).toEqual(mockIncidentSummary);
    expect(result.current.isLoadingSummary).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles fetch incident summary error', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('API error'));

    const { result } = renderHook(() => useAnalyticsStore());

    await act(async () => {
      await result.current.fetchIncidentSummary('1');
    });

    expect(result.current.isLoadingSummary).toBe(false);
    expect(result.current.error).toBe('API error');
  });

  it('refreshes incidents data', async () => {
    const mockIncidentsResponse = {
      success: true,
      data: { incidents: [mockIncidentResponse] },
    };

    (fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => mockIncidentsResponse });

    const { result } = renderHook(() => useAnalyticsStore());

    await act(async () => {
      await result.current.refreshData();
    });

    expect(result.current.incidents).toEqual([mockIncident]);
    expect(result.current.isLoading).toBe(false);
  });

  it('resets store to initial state', () => {
    const { result } = renderHook(() => useAnalyticsStore());

    // Modify state
    act(() => {
      result.current.setSelectedIncident(mockIncident);
    });

    expect(result.current.selectedIncident).toEqual(mockIncident);

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.selectedIncident).toBeNull();
    expect(result.current.incidents).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});

describe('useAnalyticsIncidents hook', () => {
  it('returns correct incident-related state and actions', () => {
    const { result } = renderHook(() => useAnalyticsIncidents());

    expect(result.current).toHaveProperty('incidents');
    expect(result.current).toHaveProperty('selectedIncident');
    expect(result.current).toHaveProperty('isLoadingIncidents');
    expect(result.current).toHaveProperty('fetchIncidents');
    expect(result.current).toHaveProperty('setSelectedIncident');
  });
});

describe('useAnalyticsSummary hook', () => {
  it('returns correct summary-related state and actions', () => {
    const { result } = renderHook(() => useAnalyticsSummary());

    expect(result.current).toHaveProperty('incidentSummary');
    expect(result.current).toHaveProperty('isLoadingSummary');
    expect(result.current).toHaveProperty('fetchIncidentSummary');
  });
});