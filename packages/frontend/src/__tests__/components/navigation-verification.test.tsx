import { render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import DashboardPage from '@/app/(dashboard)/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock QueueSummary component
jest.mock('@/components/features/sync', () => ({
  QueueSummary: ({ onViewQueue }: { onViewQueue: () => void }) => (
    <div data-testid="queue-summary">Queue Summary</div>
  ),
}));

describe('Navigation Verification', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    mockPush.mockClear();
  });

  test('should render all navigation sections', () => {
    render(<DashboardPage />);

    // Check for section headers
    expect(screen.getByText('Core Tools')).toBeInTheDocument();
    expect(screen.getByText('Coordinator Tools')).toBeInTheDocument();
    expect(screen.getByText('Monitoring Tools')).toBeInTheDocument();
  });

  test('should render coordinator tools links', () => {
    render(<DashboardPage />);

    expect(screen.getByText('Donor Coordination')).toBeInTheDocument();
    expect(screen.getByText('System Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Coordinate donors and manage resource planning')).toBeInTheDocument();
    expect(screen.getByText('Monitor system performance and health metrics')).toBeInTheDocument();
  });

  test('should render monitoring tools links', () => {
    render(<DashboardPage />);

    expect(screen.getByText('Situation Display')).toBeInTheDocument();
    expect(screen.getByText('Interactive Map')).toBeInTheDocument();
    expect(screen.getByText('Real-time monitoring and dashboard analytics')).toBeInTheDocument();
    expect(screen.getByText('Geographic visualization and mapping interface')).toBeInTheDocument();
  });

  test('should navigate correctly when clicking coordinator tools', () => {
    render(<DashboardPage />);

    // Test donor coordination navigation
    const donorCard = screen.getByText('Donor Coordination').closest('[role="button"]');
    expect(donorCard).toBeInTheDocument();
    
    // Test system monitoring navigation
    const systemCard = screen.getByText('System Monitoring').closest('[role="button"]');
    expect(systemCard).toBeInTheDocument();
  });

  test('should navigate correctly when clicking monitoring tools', () => {
    render(<DashboardPage />);

    // Test situation display navigation
    const situationCard = screen.getByText('Situation Display').closest('[role="button"]');
    expect(situationCard).toBeInTheDocument();
    
    // Test interactive map navigation
    const mapCard = screen.getByText('Interactive Map').closest('[role="button"]');
    expect(mapCard).toBeInTheDocument();
  });
});