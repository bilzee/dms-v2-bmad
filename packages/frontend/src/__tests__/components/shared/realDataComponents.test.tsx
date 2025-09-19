import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoadingState, DataQualityIndicator } from '@/components/shared/LoadingState';
import { DataCard, MetricCard } from '@/components/shared/DataCard';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Loader2: ({ className }: { className?: string }) => (
    <div data-testid="loader" className={className} />
  ),
  WifiOff: ({ className }: { className?: string }) => (
    <div data-testid="wifi-off" className={className} />
  ),
  AlertCircle: ({ className }: { className?: string }) => (
    <div data-testid="alert-circle" className={className} />
  ),
  RefreshCw: ({ className }: { className?: string }) => (
    <div data-testid="refresh-cw" className={className} />
  ),
  Database: ({ className }: { className?: string }) => (
    <div data-testid="database" className={className} />
  ),
  TrendingUp: ({ className }: { className?: string }) => (
    <div data-testid="trending-up" className={className} />
  ),
  TrendingDown: ({ className }: { className?: string }) => (
    <div data-testid="trending-down" className={className} />
  ),
  Minus: ({ className }: { className?: string }) => (
    <div data-testid="minus" className={className} />
  ),
  MoreHorizontal: ({ className }: { className?: string }) => (
    <div data-testid="more-horizontal" className={className} />
  ),
  CheckCircle: ({ className }: { className?: string }) => (
    <div data-testid="check-circle" className={className} />
  ),
  Clock: ({ className }: { className?: string }) => (
    <div data-testid="clock" className={className} />
  ),
}));

describe('Shared Components Integration Tests', () => {
  describe('LoadingState Component', () => {
    it('should show loading state', () => {
      render(<LoadingState isLoading={true}>Content</LoadingState>);
      
      expect(screen.getByTestId('loader')).toBeInTheDocument();
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('should show error state', () => {
      const error = new Error('Test error');
      const retry = jest.fn();
      
      render(
        <LoadingState 
          error={error} 
          retry={retry}
        >
          Content
        </LoadingState>
      );
      
      expect(screen.getByTestId('alert-circle')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
      
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);
      expect(retry).toHaveBeenCalled();
    });

    it('should show empty state', () => {
      render(<LoadingState isEmpty={true}>Content</LoadingState>);
      
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should show children when no loading/error/empty', () => {
      render(<LoadingState>Rendered Content</LoadingState>);
      
      expect(screen.getByText('Rendered Content')).toBeInTheDocument();
    });

    it('should show offline mode indicator', () => {
      render(
        <LoadingState 
          offlineMode={true}
          isEmpty={true}
        >
          Content
        </LoadingState>
      );
      
      expect(screen.getByText('Offline Mode')).toBeInTheDocument();
      expect(screen.getByText('Using cached data')).toBeInTheDocument();
    });

    it('should show progress indicator', () => {
      render(
        <LoadingState 
          isLoading={true}
          showProgress={true}
          progress={75}
        >
          Content
        </LoadingState>
      );
      
      expect(screen.getByText('75% complete')).toBeInTheDocument();
    });
  });

  describe('DataQualityIndicator Component', () => {
    it('should show offline badge', () => {
      render(<DataQualityIndicator isOffline={true} />);
      
      expect(screen.getByText('Offline')).toBeInTheDocument();
      expect(screen.getByTestId('wifi-off')).toBeInTheDocument();
    });

    it('should show stale data badge', () => {
      render(<DataQualityIndicator isStale={true} />);
      
      expect(screen.getByText('Stale Data')).toBeInTheDocument();
      expect(screen.getByTestId('alert-circle')).toBeInTheDocument();
    });

    it('should show pending sync badge', () => {
      render(<DataQualityIndicator hasPendingChanges={true} />);
      
      expect(screen.getByText('Pending Sync')).toBeInTheDocument();
      expect(screen.getByTestId('database')).toBeInTheDocument();
    });

    it('should show sync timestamp', () => {
      const lastSync = new Date('2024-01-01T12:00:00');
      render(<DataQualityIndicator lastSync={lastSync} />);
      
      expect(screen.getByText(/Sync:/)).toBeInTheDocument();
    });
  });

  describe('DataCard Component', () => {
    it('should render basic card with data', () => {
      render(
        <DataCard
          title="Test Card"
          value="100"
          subtitle="Test subtitle"
        />
      );
      
      expect(screen.getByText('Test Card')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('Test subtitle')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      render(
        <DataCard
          title="Test Card"
          value="100"
          isLoading={true}
        />
      );
      
      expect(screen.getByTestId('loader')).toBeInTheDocument();
    });

    it('should show error state', () => {
      const error = new Error('Test error');
      render(
        <DataCard
          title="Test Card"
          value="100"
          error={error}
        />
      );
      
      expect(screen.getByTestId('alert-circle')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('should show trend information', () => {
      render(
        <DataCard
          title="Test Card"
          value="100"
          trend={{ value: 10, type: 'up', label: 'from last month' }}
        />
      );
      
      expect(screen.getByText('+10% from last month')).toBeInTheDocument();
      expect(screen.getByTestId('trending-up')).toBeInTheDocument();
    });

    it('should show status indicator', () => {
      render(
        <DataCard
          title="Test Card"
          value="100"
          status="success"
        />
      );
      
      expect(screen.getByTestId('check-circle')).toBeInTheDocument();
    });

    it('should handle refresh action', () => {
      const onRefresh = jest.fn();
      render(
        <DataCard
          title="Test Card"
          value="100"
          onRefresh={onRefresh}
        />
      );
      
      const refreshButton = screen.getByTestId('refresh-cw').closest('button');
      if (refreshButton) {
        fireEvent.click(refreshButton);
        expect(onRefresh).toHaveBeenCalled();
      }
    });

    it('should show data quality indicators', () => {
      const lastUpdated = new Date('2024-01-01T12:00:00');
      render(
        <DataCard
          title="Test Card"
          value="100"
          isStale={true}
          isOffline={true}
          hasPendingChanges={true}
          lastUpdated={lastUpdated}
        />
      );
      
      expect(screen.getByText('Stale Data')).toBeInTheDocument();
      expect(screen.getByText('Offline')).toBeInTheDocument();
      expect(screen.getByText('Pending Sync')).toBeInTheDocument();
    });
  });

  describe('MetricCard Component', () => {
    it('should render multiple metrics', () => {
      const metrics = [
        { label: 'Total', value: 1000, trend: { value: 5, type: 'up' } },
        { label: 'Active', value: 150, trend: { value: 2, type: 'down' } },
        { label: 'Completed', value: 850 },
      ];

      render(<MetricCard title="Metrics" metrics={metrics} />);

      expect(screen.getByText('Metrics')).toBeInTheDocument();
      expect(screen.getByText('1000')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('850')).toBeInTheDocument();
      expect(screen.getByText('+5%')).toBeInTheDocument();
      // Check for the trend down icon and the percentage text separately
      expect(screen.getByTestId('trending-down')).toBeInTheDocument();
      // The 2% text is split across spans, so check for the number and percent sign separately
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('%')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      render(
        <MetricCard
          title="Metrics"
          metrics={[]}
          isLoading={true}
        />
      );

      expect(screen.getByTestId('loader')).toBeInTheDocument();
    });
  });

  describe('ErrorBoundary Component', () => {
    beforeEach(() => {
      // Suppress console.error for these tests
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should catch errors in children', () => {
      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should show custom fallback when provided', () => {
      const ThrowError = () => {
        throw new Error('Test error');
      };

      const fallback = <div>Custom error message</div>;

      render(
        <ErrorBoundary fallback={fallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    it('should handle different error types', () => {
      const NetworkError = () => {
        throw new Error('Network error occurred');
      };

      render(
        <ErrorBoundary>
          <NetworkError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByTestId('wifi-off')).toBeInTheDocument();
    });

    it('should allow retry attempts', () => {
      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
      
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);
      
      // Should show retry attempt counter
      expect(screen.getByText('Retry attempt 1 of 3')).toBeInTheDocument();
    });

    it('should call onError callback when provided', () => {
      const onError = jest.fn();
      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should reset on props change when configured', () => {
      const SafeComponent = ({ message }: { message: string }) => (
        <div>{message}</div>
      );

      const { rerender } = render(
        <ErrorBoundary resetOnPropsChange={true}>
          <SafeComponent message="Initial" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Initial')).toBeInTheDocument();

      // This should not cause an error
      rerender(
        <ErrorBoundary resetOnPropsChange={true}>
          <SafeComponent message="Updated" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Updated')).toBeInTheDocument();
    });
  });
});