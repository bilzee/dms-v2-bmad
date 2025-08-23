import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AssessmentQueue } from '../AssessmentQueue';

// Mock the sync store
const mockUseSyncStore = {
  filteredQueue: [],
  currentFilters: {},
  isLoading: false,
  isRefreshing: false,
  error: null,
  loadQueue: jest.fn(),
  refreshQueue: jest.fn(),
  retryQueueItem: jest.fn(),
  removeQueueItem: jest.fn(),
  updateFilters: jest.fn(),
  clearError: jest.fn(),
};

jest.mock('@/stores/sync.store', () => ({
  useSyncStore: () => mockUseSyncStore,
}));

// Mock queue items for testing
const mockQueueItems = [
  {
    id: 'queue_1',
    type: 'ASSESSMENT' as const,
    action: 'CREATE' as const,
    data: { assessmentType: 'HEALTH', priority: 'HIGH' },
    retryCount: 0,
    priority: 'HIGH' as const,
    createdAt: new Date('2025-08-22T10:00:00Z'),
    lastAttempt: new Date('2025-08-22T10:05:00Z'),
    error: 'Network timeout',
  },
  {
    id: 'queue_2', 
    type: 'ASSESSMENT' as const,
    action: 'CREATE' as const,
    data: { assessmentType: 'WASH', priority: 'NORMAL' },
    retryCount: 1,
    priority: 'NORMAL' as const,
    createdAt: new Date('2025-08-22T09:30:00Z'),
  },
  {
    id: 'queue_3',
    type: 'MEDIA' as const,
    action: 'CREATE' as const,
    data: { fileName: 'emergency-photo.jpg' },
    retryCount: 0,
    priority: 'HIGH' as const,
    createdAt: new Date('2025-08-22T09:00:00Z'),
  },
];

describe('AssessmentQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component correctly', () => {
    render(<AssessmentQueue />);
    
    expect(screen.getByText('Assessment Queue')).toBeInTheDocument();
    expect(screen.getByText(/items/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it('loads queue on mount', () => {
    render(<AssessmentQueue />);
    
    expect(mockUseSyncStore.loadQueue).toHaveBeenCalledWith({});
  });

  it('displays loading state correctly', () => {
    const loadingStore = { ...mockUseSyncStore, isLoading: true };
    jest.mocked(require('@/stores/sync.store').useSyncStore).mockReturnValue(loadingStore);
    
    render(<AssessmentQueue />);
    
    expect(screen.getByText('Loading queue...')).toBeInTheDocument();
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument(); // Loading spinner
  });

  it('displays queue items with proper priority indicators', () => {
    const storeWithItems = { ...mockUseSyncStore, filteredQueue: mockQueueItems };
    jest.mocked(require('@/stores/sync.store').useSyncStore).mockReturnValue(storeWithItems);
    
    render(<AssessmentQueue />);
    
    // Check for health emergency indicator
    expect(screen.getByText('Health Emergency')).toBeInTheDocument();
    expect(screen.getByText('High Priority')).toBeInTheDocument();
    
    // Check for different assessment types
    expect(screen.getByText('HEALTH Assessment')).toBeInTheDocument();
    expect(screen.getByText('WASH Assessment')).toBeInTheDocument();
    expect(screen.getByText('Media File')).toBeInTheDocument();
  });

  it('displays correct status badges', () => {
    const storeWithItems = { ...mockUseSyncStore, filteredQueue: mockQueueItems };
    jest.mocked(require('@/stores/sync.store').useSyncStore).mockReturnValue(storeWithItems);
    
    render(<AssessmentQueue />);
    
    expect(screen.getByText('Failed')).toBeInTheDocument(); // First item has error
    expect(screen.getByText('Syncing')).toBeInTheDocument(); // Second item has retryCount > 0
    expect(screen.getByText('Pending')).toBeInTheDocument(); // Third item is pending
  });

  it('shows and hides filters correctly', () => {
    render(<AssessmentQueue />);
    
    const filtersButton = screen.getByRole('button', { name: /filters/i });
    
    // Filters should be hidden initially
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
    
    // Show filters
    fireEvent.click(filtersButton);
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Priority')).toBeInTheDocument();
    expect(screen.getByLabelText('Type')).toBeInTheDocument();
    
    // Hide filters
    fireEvent.click(filtersButton);
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
  });

  it('handles filter changes correctly', () => {
    render(<AssessmentQueue />);
    
    // Show filters
    fireEvent.click(screen.getByRole('button', { name: /filters/i }));
    
    // Change status filter
    const statusSelect = screen.getByLabelText('Status');
    fireEvent.change(statusSelect, { target: { value: 'FAILED' } });
    
    expect(mockUseSyncStore.updateFilters).toHaveBeenCalledWith({
      status: 'FAILED',
    });
    
    // Change priority filter
    const prioritySelect = screen.getByLabelText('Priority');
    fireEvent.change(prioritySelect, { target: { value: 'HIGH' } });
    
    expect(mockUseSyncStore.updateFilters).toHaveBeenCalledWith({
      priority: 'HIGH',
    });
  });

  it('handles refresh action correctly', async () => {
    render(<AssessmentQueue />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    
    expect(mockUseSyncStore.refreshQueue).toHaveBeenCalled();
  });

  it('shows refresh animation when refreshing', () => {
    const refreshingStore = { ...mockUseSyncStore, isRefreshing: true };
    jest.mocked(require('@/stores/sync.store').useSyncStore).mockReturnValue(refreshingStore);
    
    render(<AssessmentQueue />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    expect(refreshButton).toBeDisabled();
    
    // Check for animation class (this would need to be verified through visual testing)
    const refreshIcon = refreshButton.querySelector('svg');
    expect(refreshIcon).toHaveClass('animate-spin');
  });

  it('displays error messages correctly', () => {
    const storeWithError = { ...mockUseSyncStore, error: 'Failed to load queue' };
    jest.mocked(require('@/stores/sync.store').useSyncStore).mockReturnValue(storeWithError);
    
    render(<AssessmentQueue />);
    
    expect(screen.getByText('Failed to load queue')).toBeInTheDocument();
    
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);
    
    expect(mockUseSyncStore.clearError).toHaveBeenCalled();
  });

  it('displays empty state when no items', () => {
    render(<AssessmentQueue />);
    
    expect(screen.getByText('Queue is empty')).toBeInTheDocument();
    expect(screen.getByText('All assessments are up to date.')).toBeInTheDocument();
  });

  it('counts health emergencies correctly', () => {
    const storeWithItems = { ...mockUseSyncStore, filteredQueue: mockQueueItems };
    jest.mocked(require('@/stores/sync.store').useSyncStore).mockReturnValue(storeWithItems);
    
    render(<AssessmentQueue />);
    
    // One health assessment with HIGH priority = 1 health emergency
    expect(screen.getByText('3 items • 1 health emergencies')).toBeInTheDocument();
  });

  it('handles retry action from queue items', async () => {
    const storeWithItems = { ...mockUseSyncStore, filteredQueue: mockQueueItems };
    jest.mocked(require('@/stores/sync.store').useSyncStore).mockReturnValue(storeWithItems);
    
    render(<AssessmentQueue />);
    
    // Open actions menu for failed item
    const actionButtons = screen.getAllByLabelText('Queue item actions');
    fireEvent.click(actionButtons[0]); // First item (failed)
    
    // Click retry
    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);
    
    await waitFor(() => {
      expect(mockUseSyncStore.retryQueueItem).toHaveBeenCalledWith('queue_1');
    });
  });

  it('handles remove action from queue items', async () => {
    const storeWithItems = { ...mockUseSyncStore, filteredQueue: mockQueueItems };
    jest.mocked(require('@/stores/sync.store').useSyncStore).mockReturnValue(storeWithItems);
    
    // Mock window.confirm
    window.confirm = jest.fn(() => true);
    
    render(<AssessmentQueue />);
    
    // Open actions menu for any item
    const actionButtons = screen.getAllByLabelText('Queue item actions');
    fireEvent.click(actionButtons[0]);
    
    // Click remove
    const removeButton = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(removeButton);
    
    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to remove this item from the queue?');
      expect(mockUseSyncStore.removeQueueItem).toHaveBeenCalledWith('queue_1');
    });
  });

  it('applies correct styling for health emergencies', () => {
    const storeWithItems = { ...mockUseSyncStore, filteredQueue: mockQueueItems };
    jest.mocked(require('@/stores/sync.store').useSyncStore).mockReturnValue(storeWithItems);
    
    render(<AssessmentQueue />);
    
    // First item should have health emergency styling
    const healthEmergencyItem = screen.getByText('HEALTH Emergency').closest('div[class*="border-l-4"]');
    expect(healthEmergencyItem).toHaveClass('border-l-red-500');
  });

  it('displays retry count and last attempt information', () => {
    const storeWithItems = { ...mockUseSyncStore, filteredQueue: mockQueueItems };
    jest.mocked(require('@/stores/sync.store').useSyncStore).mockReturnValue(storeWithItems);
    
    render(<AssessmentQueue />);
    
    // Second item has retryCount = 1
    expect(screen.getByText(/Retry attempts: 1/)).toBeInTheDocument();
    
    // First item has lastAttempt
    expect(screen.getByText(/Last attempt:/)).toBeInTheDocument();
  });
});