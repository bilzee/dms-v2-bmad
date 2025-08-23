import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueueSummary } from '../QueueSummary';

// Mock the sync store
const mockUseSyncStore = {
  queueSummary: null,
  loadQueueSummary: jest.fn(),
};

jest.mock('@/stores/sync.store', () => ({
  useSyncStore: () => mockUseSyncStore,
}));

// Mock summary data
const mockSummaryData = {
  totalItems: 5,
  pendingItems: 2,
  failedItems: 1,
  syncingItems: 1,
  highPriorityItems: 2,
  lastUpdated: new Date('2025-08-22T12:00:00Z'),
  oldestPendingItem: {
    id: 'queue_old',
    type: 'ASSESSMENT',
    createdAt: new Date('2025-08-22T08:00:00Z'),
    priority: 'HIGH',
  },
};

describe('QueueSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders loading state when no summary data', () => {
    render(<QueueSummary />);
    
    // Should show loading skeleton
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('loads summary on mount and sets up interval', () => {
    render(<QueueSummary />);
    
    expect(mockUseSyncStore.loadQueueSummary).toHaveBeenCalledTimes(1);
    
    // Fast-forward time to check interval
    jest.advanceTimersByTime(60000); // 1 minute
    expect(mockUseSyncStore.loadQueueSummary).toHaveBeenCalledTimes(2);
    
    jest.advanceTimersByTime(60000); // Another minute
    expect(mockUseSyncStore.loadQueueSummary).toHaveBeenCalledTimes(3);
  });

  it('renders summary data correctly', () => {
    const storeWithSummary = { ...mockUseSyncStore, queueSummary: mockSummaryData };
    jest.mocked(require('@/stores/sync.store').useSyncStore).mockReturnValue(storeWithSummary);
    
    render(<QueueSummary />);
    
    expect(screen.getByText('Sync Queue')).toBeInTheDocument();
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    expect(screen.getByText('5 total items in queue')).toBeInTheDocument();
  });

  it('displays error status when there are failed items', () => {
    const storeWithSummary = { ...mockUseSyncStore, queueSummary: mockSummaryData };
    jest.mocked(require('@/stores/sync.store').useSyncStore).mockReturnValue(storeWithSummary);
    
    render(<QueueSummary />);
    
    expect(screen.getByText('Items need attention')).toBeInTheDocument();
  });

  it('displays syncing status when items are syncing', () => {
    const syncingSummary = {
      ...mockSummaryData,
      failedItems: 0,
      syncingItems: 2,
    };
    const storeWithSummary = { ...mockUseSyncStore, queueSummary: syncingSummary };
    jest.mocked(require('@/stores/sync.store').useSyncStore).mockReturnValue(storeWithSummary);
    
    render(<QueueSummary />);
    
    expect(screen.getByText('Syncing in progress')).toBeInTheDocument();
  });

  it('displays pending status when items are pending', () => {
    const pendingSummary = {
      ...mockSummaryData,
      failedItems: 0,
      syncingItems: 0,
      pendingItems: 3,
    };
    const storeWithSummary = { ...mockUseSyncStore, queueSummary: pendingSummary };
    jest.mocked(require('@/stores/sync.store').useSyncStore).mockReturnValue(storeWithSummary);
    
    render(<QueueSummary />);
    
    expect(screen.getByText('Items pending sync')).toBeInTheDocument();
  });

  it('displays synced status when all items are synced', () => {
    const syncedSummary = {
      ...mockSummaryData,
      totalItems: 0,
      failedItems: 0,
      syncingItems: 0,
      pendingItems: 0,
    };
    const storeWithSummary = { ...mockUseSyncStore, queueSummary: syncedSummary };
    jest.mocked(require('@/stores/sync.store').useSyncStore).mockReturnValue(storeWithSummary);
    
    render(<QueueSummary />);
    
    expect(screen.getByText('All items synced')).toBeInTheDocument();
  });

  it('shows statistics correctly', () => {
    const storeWithSummary = { ...mockUseSyncStore, queueSummary: mockSummaryData };
    jest.mocked(require('@/stores/sync.store').useSyncStore).mockReturnValue(storeWithSummary);
    
    render(<QueueSummary />);
    
    expect(screen.getByText('2')).toBeInTheDocument(); // Pending items
    expect(screen.getByText('Pending')).toBeInTheDocument();
    
    expect(screen.getByText('1')).toBeInTheDocument(); // Failed items
    expect(screen.getByText('Failed')).toBeInTheDocument();
    
    expect(screen.getByText('2')).toBeInTheDocument(); // High priority items
    expect(screen.getByText('High Priority')).toBeInTheDocument();
    
    expect(screen.getByText('1')).toBeInTheDocument(); // Syncing items
    expect(screen.getByText('Syncing')).toBeInTheDocument();
  });

  it('displays oldest pending item information', () => {
    const storeWithSummary = { ...mockUseSyncStore, queueSummary: mockSummaryData };
    jest.mocked(require('@/stores/sync.store').useSyncStore).mockReturnValue(storeWithSummary);
    
    render(<QueueSummary />);
    
    expect(screen.getByText('Oldest pending item:')).toBeInTheDocument();
    expect(screen.getByText('ASSESSMENT (HIGH priority)')).toBeInTheDocument();
  });

  it('shows View Queue button when there are items', () => {
    const mockOnViewQueue = jest.fn();
    const storeWithSummary = { ...mockUseSyncStore, queueSummary: mockSummaryData };
    jest.mocked(require('@/stores/sync.store').useSyncStore).mockReturnValue(storeWithSummary);
    
    render(<QueueSummary onViewQueue={mockOnViewQueue} />);
    
    const viewQueueButton = screen.getByRole('button', { name: /view queue/i });
    expect(viewQueueButton).toBeInTheDocument();
    
    fireEvent.click(viewQueueButton);
    expect(mockOnViewQueue).toHaveBeenCalled();
  });

  it('does not show View Queue button when no items', () => {
    const emptySummary = {
      ...mockSummaryData,
      totalItems: 0,
      pendingItems: 0,
      failedItems: 0,
      syncingItems: 0,
      highPriorityItems: 0,
    };
    const storeWithSummary = { ...mockUseSyncStore, queueSummary: emptySummary };
    jest.mocked(require('@/stores/sync.store').useSyncStore).mockReturnValue(storeWithSummary);
    
    render(<QueueSummary />);
    
    expect(screen.queryByRole('button', { name: /view queue/i })).not.toBeInTheDocument();
  });

  it('displays empty state when no items in queue', () => {
    const emptySummary = {
      ...mockSummaryData,
      totalItems: 0,
      pendingItems: 0,
      failedItems: 0,
      syncingItems: 0,
      highPriorityItems: 0,
    };
    const storeWithSummary = { ...mockUseSyncStore, queueSummary: emptySummary };
    jest.mocked(require('@/stores/sync.store').useSyncStore).mockReturnValue(storeWithSummary);
    
    render(<QueueSummary />);
    
    expect(screen.getByText('All caught up!')).toBeInTheDocument();
    expect(screen.getByText('No items in the sync queue.')).toBeInTheDocument();
  });

  it('displays correct status icons', () => {
    const storeWithSummary = { ...mockUseSyncStore, queueSummary: mockSummaryData };
    jest.mocked(require('@/stores/sync.store').useSyncStore).mockReturnValue(storeWithSummary);
    
    render(<QueueSummary />);
    
    // Should have AlertTriangle icon for error status (failed items > 0)
    const alertIcon = document.querySelector('[data-testid="alert-triangle"], .lucide-alert-triangle');
    expect(alertIcon).toBeInTheDocument();
  });

  it('formats timestamps correctly', () => {
    const storeWithSummary = { ...mockUseSyncStore, queueSummary: mockSummaryData };
    jest.mocked(require('@/stores/sync.store').useSyncStore).mockReturnValue(storeWithSummary);
    
    render(<QueueSummary />);
    
    // Should format the lastUpdated timestamp
    expect(screen.getByText(/Last updated: \d{1,2}:\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it('cleans up interval on unmount', () => {
    const { unmount } = render(<QueueSummary />);
    
    // Spy on clearInterval
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    
    unmount();
    
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it('applies custom className', () => {
    const storeWithSummary = { ...mockUseSyncStore, queueSummary: mockSummaryData };
    jest.mocked(require('@/stores/sync.store').useSyncStore).mockReturnValue(storeWithSummary);
    
    render(<QueueSummary className="custom-class" />);
    
    const container = screen.getByText('Sync Queue').closest('div');
    expect(container).toHaveClass('custom-class');
  });

  it('handles missing oldest pending item gracefully', () => {
    const summaryWithoutOldest = {
      ...mockSummaryData,
      oldestPendingItem: undefined,
    };
    const storeWithSummary = { ...mockUseSyncStore, queueSummary: summaryWithoutOldest };
    jest.mocked(require('@/stores/sync.store').useSyncStore).mockReturnValue(storeWithSummary);
    
    render(<QueueSummary />);
    
    expect(screen.queryByText('Oldest pending item:')).not.toBeInTheDocument();
  });
});