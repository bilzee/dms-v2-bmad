import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IncidentSelector } from '../IncidentSelector';

jest.mock('@/stores/analytics.store', () => ({
  useAnalyticsIncidents: jest.fn(),
  useAnalyticsRefresh: jest.fn(),
}));

const mockUseAnalyticsIncidents = require('@/stores/analytics.store').useAnalyticsIncidents;
const mockUseAnalyticsRefresh = require('@/stores/analytics.store').useAnalyticsRefresh;

const mockIncidents = [
  {
    id: '1',
    name: 'Flood in Maiduguri',
    type: 'FLOOD',
    status: 'ACTIVE',
    declarationDate: '2025-01-10T10:00:00Z',
  },
  {
    id: '2',
    name: 'Drought in Bama',
    type: 'DROUGHT',
    status: 'CONTAINED',
    declarationDate: '2025-01-05T08:00:00Z',
  },
  {
    id: '3',
    name: 'Conflict in Monguno',
    type: 'CONFLICT',
    status: 'RESOLVED',
    declarationDate: '2024-12-20T12:00:00Z',
  },
];

describe('IncidentSelector', () => {
  const mockFetchIncidents = jest.fn();
  const mockSetSelectedIncident = jest.fn();
  const mockRefreshData = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAnalyticsIncidents.mockReturnValue({
      incidents: mockIncidents,
      selectedIncident: null,
      isLoadingIncidents: false,
      fetchIncidents: mockFetchIncidents,
      setSelectedIncident: mockSetSelectedIncident,
    });

    mockUseAnalyticsRefresh.mockReturnValue({
      refreshData: mockRefreshData,
      isLoading: false,
      error: null,
    });
  });

  it('renders the incident selector with title', () => {
    render(<IncidentSelector />);
    
    expect(screen.getByText('Incident Selection')).toBeInTheDocument();
    expect(screen.getByText('Select Active Incident')).toBeInTheDocument();
  });

  it('fetches incidents when component mounts and no incidents exist', async () => {
    mockUseAnalyticsIncidents.mockReturnValue({
      incidents: [],
      selectedIncident: null,
      isLoadingIncidents: false,
      fetchIncidents: mockFetchIncidents,
      setSelectedIncident: mockSetSelectedIncident,
    });

    render(<IncidentSelector />);
    
    await waitFor(() => {
      expect(mockFetchIncidents).toHaveBeenCalledTimes(1);
    });
  });

  it('displays loading state correctly', () => {
    mockUseAnalyticsIncidents.mockReturnValue({
      incidents: [],
      selectedIncident: null,
      isLoadingIncidents: true,
      fetchIncidents: mockFetchIncidents,
      setSelectedIncident: mockSetSelectedIncident,
    });

    render(<IncidentSelector />);
    
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('displays error message when there is an error', () => {
    mockUseAnalyticsRefresh.mockReturnValue({
      refreshData: mockRefreshData,
      isLoading: false,
      error: 'Failed to fetch incidents',
    });

    render(<IncidentSelector />);
    
    expect(screen.getByText('Failed to fetch incidents')).toBeInTheDocument();
  });

  it('renders select trigger for incident selection', () => {
    render(<IncidentSelector />);
    
    const selectTrigger = screen.getByRole('combobox');
    expect(selectTrigger).toBeInTheDocument();
    expect(screen.getByText('Select an incident')).toBeInTheDocument();
  });

  it('displays incidents when select is available', () => {
    render(<IncidentSelector />);
    
    // The component should have access to incidents through the store
    expect(screen.getByText('Showing 3 incidents')).toBeInTheDocument();
  });

  it('displays selected incident information', () => {
    mockUseAnalyticsIncidents.mockReturnValue({
      incidents: mockIncidents,
      selectedIncident: mockIncidents[0],
      isLoadingIncidents: false,
      fetchIncidents: mockFetchIncidents,
      setSelectedIncident: mockSetSelectedIncident,
    });

    render(<IncidentSelector />);
    
    expect(screen.getByText('Selected Incident')).toBeInTheDocument();
    expect(screen.getAllByText('Flood in Maiduguri')).toHaveLength(2); // Appears in both the select value and selected incident info
    expect(screen.getByText(/Declared: Jan 10, 2025/)).toBeInTheDocument();
  });

  it('handles refresh button click', async () => {
    const user = userEvent.setup();
    render(<IncidentSelector />);
    
    const refreshButton = screen.getByRole('button');
    await user.click(refreshButton);
    
    expect(mockRefreshData).toHaveBeenCalledTimes(1);
  });

  it('disables refresh button when loading', () => {
    mockUseAnalyticsRefresh.mockReturnValue({
      refreshData: mockRefreshData,
      isLoading: true,
      error: null,
    });

    render(<IncidentSelector />);
    
    const refreshButton = screen.getByRole('button');
    expect(refreshButton).toBeDisabled();
  });

  it('shows incident count', () => {
    render(<IncidentSelector />);
    
    expect(screen.getByText('Showing 3 incidents')).toBeInTheDocument();
  });

  it('shows no incidents available when list is empty', () => {
    mockUseAnalyticsIncidents.mockReturnValue({
      incidents: [],
      selectedIncident: null,
      isLoadingIncidents: false,
      fetchIncidents: mockFetchIncidents,
      setSelectedIncident: mockSetSelectedIncident,
    });

    render(<IncidentSelector />);
    
    const selectTrigger = screen.getByRole('combobox');
    expect(selectTrigger).toBeDisabled();
  });

  it('renders dropdown trigger with proper accessibility', () => {
    render(<IncidentSelector />);
    
    const selectTrigger = screen.getByRole('combobox');
    expect(selectTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(selectTrigger).not.toBeDisabled();
  });
});