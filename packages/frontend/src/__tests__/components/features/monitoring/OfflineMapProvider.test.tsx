import React from 'react';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfflineMapProvider, OfflineMapStatus, useOfflineMap } from '@/components/features/monitoring/OfflineMapProvider';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Test component to access hook functionality
function TestComponent() {
  const { state, downloadTiles, clearCache, syncTiles } = useOfflineMap();
  
  return (
    <div>
      <div data-testid="online-status">{state.isOnline ? 'online' : 'offline'}</div>
      <div data-testid="tiles-downloaded">{state.tilesDownloaded}</div>
      <div data-testid="cache-size">{state.cacheSize}</div>
      <div data-testid="downloading">{state.isDownloading ? 'downloading' : 'idle'}</div>
      <button onClick={() => downloadTiles({ northEast: { lat: 13, lng: 15 }, southWest: { lat: 12, lng: 14 } }, 12)}>
        Download
      </button>
      <button onClick={clearCache}>Clear</button>
      <button onClick={syncTiles}>Sync</button>
    </div>
  );
}

describe('OfflineMapProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
    localStorageMock.getItem.mockReturnValue(null);
    (navigator as any).onLine = true;
  });

  it('provides offline map context', async () => {
    await act(async () => {
      render(
        <OfflineMapProvider>
          <TestComponent />
        </OfflineMapProvider>
      );
    });

    expect(screen.getByTestId('online-status')).toHaveTextContent('online');
    expect(screen.getByTestId('tiles-downloaded')).toHaveTextContent('0');
    expect(screen.getByTestId('cache-size')).toHaveTextContent('0');
  });

  it('handles online/offline status changes', async () => {
    await act(async () => {
      render(
        <OfflineMapProvider>
          <TestComponent />
        </OfflineMapProvider>
      );
    });

    expect(screen.getByTestId('online-status')).toHaveTextContent('online');

    // Simulate going offline
    await act(async () => {
      (navigator as any).onLine = false;
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('online-status')).toHaveTextContent('offline');
    });
  });

  it('handles tile download functionality', async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      render(
        <OfflineMapProvider>
          <TestComponent />
        </OfflineMapProvider>
      );
    });

    const downloadButton = screen.getByText('Download');
    
    await act(async () => {
      await user.click(downloadButton);
    });

    expect(screen.getByTestId('downloading')).toHaveTextContent('downloading');
    
    // Wait for download to complete
    await waitFor(() => {
      expect(screen.getByTestId('downloading')).toHaveTextContent('idle');
    }, { timeout: 3000 });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'map-cache-info',
      expect.stringContaining('tilesDownloaded')
    );
  });

  it('handles cache clearing', async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      render(
        <OfflineMapProvider>
          <TestComponent />
        </OfflineMapProvider>
      );
    });

    const clearButton = screen.getByText('Clear');
    
    await act(async () => {
      await user.click(clearButton);
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('map-cache-info');
    expect(screen.getByTestId('tiles-downloaded')).toHaveTextContent('0');
    expect(screen.getByTestId('cache-size')).toHaveTextContent('0');
  });

  it('handles sync functionality when online', async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      render(
        <OfflineMapProvider>
          <TestComponent />
        </OfflineMapProvider>
      );
    });

    const syncButton = screen.getByText('Sync');
    
    await act(async () => {
      await user.click(syncButton);
    });

    expect(screen.getByTestId('downloading')).toHaveTextContent('downloading');
    
    await waitFor(() => {
      expect(screen.getByTestId('downloading')).toHaveTextContent('idle');
    }, { timeout: 2000 });
  });
});

describe('OfflineMapStatus Component', () => {
  it('renders offline map status correctly', async () => {
    await act(async () => {
      render(
        <OfflineMapProvider>
          <OfflineMapStatus />
        </OfflineMapProvider>
      );
    });

    expect(screen.getByText('Offline Map Status')).toBeInTheDocument();
    expect(screen.getByText('Connection Status:')).toBeInTheDocument();
    expect(screen.getByText('Cached Tiles:')).toBeInTheDocument();
    expect(screen.getByText('Cache Size:')).toBeInTheDocument();
  });

  it('displays sync and clear cache buttons', async () => {
    await act(async () => {
      render(
        <OfflineMapProvider>
          <OfflineMapStatus />
        </OfflineMapProvider>
      );
    });

    expect(screen.getByText('Sync')).toBeInTheDocument();
    expect(screen.getByText('Clear Cache')).toBeInTheDocument();
  });
});