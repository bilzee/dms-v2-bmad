import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AutoApprovalIndicators, { 
  AutoApprovalStatusBadge, 
  AutoApprovalFilterIndicator 
} from '@/components/features/verification/AutoApprovalIndicators';
import { AutoApprovalStatsResponse, VerificationStatus } from '@dms/shared';

// Mock the UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size }: any) => (
    <button onClick={onClick} data-variant={variant} data-size={size} data-testid="button">
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => (
    <div data-testid="progress" data-value={value}>
      Progress: {value}%
    </div>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <div data-testid="tooltip-provider">{children}</div>,
  Tooltip: ({ children }: any) => <div data-testid="tooltip">{children}</div>,
  TooltipTrigger: ({ children }: any) => <div data-testid="tooltip-trigger">{children}</div>,
  TooltipContent: ({ children }: any) => <div data-testid="tooltip-content">{children}</div>,
}));

// Mock date-fns format
jest.mock('date-fns', () => ({
  format: jest.fn().mockImplementation((date, formatStr) => {
    if (formatStr === 'MMM dd, yyyy HH:mm:ss') {
      return 'Jan 15, 2024 14:30:00';
    }
    if (formatStr === 'MMM dd, HH:mm') {
      return 'Jan 15, 14:30';
    }
    return 'formatted-date';
  }),
}));

describe('AutoApprovalIndicators', () => {
  const mockStats: AutoApprovalStatsResponse['data'] = {
    totalAutoApproved: 156,
    autoApprovalRate: 76.8,
    averageProcessingTime: 3.7,
    rulePerformance: [
      {
        ruleId: 'rule-health-basic',
        applicationsCount: 62,
        successRate: 92.5,
      },
      {
        ruleId: 'rule-wash-standard',
        applicationsCount: 47,
        successRate: 87.8,
      },
      {
        ruleId: 'rule-shelter-emergency',
        applicationsCount: 31,
        successRate: 94.2,
      },
    ],
    overridesCount: 7,
    timeRange: 'Last 24h',
  };

  const mockProps = {
    stats: mockStats,
    onViewConfiguration: jest.fn(),
    onViewDetailedStats: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders auto-approval statistics overview', () => {
    render(<AutoApprovalIndicators {...mockProps} />);

    expect(screen.getByText('156')).toBeInTheDocument(); // Total auto-approved
    expect(screen.getByText('76.8%')).toBeInTheDocument(); // Approval rate
    expect(screen.getByText('3.7s')).toBeInTheDocument(); // Processing time
    expect(screen.getByText('7')).toBeInTheDocument(); // Overrides count
  });

  it('displays performance indicators with progress bars', () => {
    render(<AutoApprovalIndicators {...mockProps} />);

    expect(screen.getByText('Auto-Approval Performance')).toBeInTheDocument();
    expect(screen.getByTestId('progress')).toHaveAttribute('data-value', '76.8');
    expect(screen.getByText('Above target')).toBeInTheDocument(); // 76.8% is above 70% target
  });

  it('shows rule performance details', () => {
    render(<AutoApprovalIndicators {...mockProps} />);

    expect(screen.getByText('Rule Performance (3 rules)')).toBeInTheDocument();
    expect(screen.getByText('rule-health-b...')).toBeInTheDocument(); // Truncated rule ID
    expect(screen.getByText('62 applications')).toBeInTheDocument();
    expect(screen.getByText('92.5% success')).toBeInTheDocument();
  });

  it('calls onViewConfiguration when configure button is clicked', () => {
    render(<AutoApprovalIndicators {...mockProps} />);

    const configureButton = screen.getByText('Configure');
    fireEvent.click(configureButton);

    expect(mockProps.onViewConfiguration).toHaveBeenCalled();
  });

  it('calls onViewDetailedStats when details button is clicked', () => {
    render(<AutoApprovalIndicators {...mockProps} />);

    const detailsButton = screen.getByText('Details');
    fireEvent.click(detailsButton);

    expect(mockProps.onViewDetailedStats).toHaveBeenCalled();
  });

  it('displays correct color coding for approval rate', () => {
    // Test high approval rate (green)
    const highRateStats = { ...mockStats, autoApprovalRate: 85 };
    const { rerender } = render(<AutoApprovalIndicators stats={highRateStats} />);
    expect(screen.getByText('85%')).toHaveClass('text-green-600');

    // Test medium approval rate (yellow)
    const mediumRateStats = { ...mockStats, autoApprovalRate: 65 };
    rerender(<AutoApprovalIndicators stats={mediumRateStats} />);
    expect(screen.getByText('65%')).toHaveClass('text-yellow-600');

    // Test low approval rate (red)
    const lowRateStats = { ...mockStats, autoApprovalRate: 45 };
    rerender(<AutoApprovalIndicators stats={lowRateStats} />);
    expect(screen.getByText('45%')).toHaveClass('text-red-600');
  });

  it('displays correct color coding for processing time', () => {
    // Test fast processing time (green)
    const fastTimeStats = { ...mockStats, averageProcessingTime: 2.1 };
    const { rerender } = render(<AutoApprovalIndicators stats={fastTimeStats} />);
    expect(screen.getByText('2.1s')).toHaveClass('text-green-600');

    // Test normal processing time (yellow)
    const normalTimeStats = { ...mockStats, averageProcessingTime: 12.5 };
    rerender(<AutoApprovalIndicators stats={normalTimeStats} />);
    expect(screen.getByText('12.5s')).toHaveClass('text-yellow-600');

    // Test slow processing time (red)
    const slowTimeStats = { ...mockStats, averageProcessingTime: 25.8 };
    rerender(<AutoApprovalIndicators stats={slowTimeStats} />);
    expect(screen.getByText('25.8s')).toHaveClass('text-red-600');
  });

  it('shows below target message for low approval rates', () => {
    const lowRateStats = { ...mockStats, autoApprovalRate: 65 };
    render(<AutoApprovalIndicators stats={lowRateStats} />);

    expect(screen.getByText('Below target')).toBeInTheDocument();
  });

  it('displays message when stats are not available', () => {
    render(<AutoApprovalIndicators stats={undefined} />);

    expect(screen.getByText('Auto-approval statistics not available')).toBeInTheDocument();
  });

  it('shows last updated timestamp', () => {
    render(<AutoApprovalIndicators {...mockProps} />);

    expect(screen.getByText('Last updated: Jan 15, 2024 14:30:00')).toBeInTheDocument();
  });

  it('handles empty rule performance array', () => {
    const statsWithoutRules = { ...mockStats, rulePerformance: [] };
    render(<AutoApprovalIndicators stats={statsWithoutRules} />);

    expect(screen.queryByText('Rule Performance')).not.toBeInTheDocument();
  });
});

describe('AutoApprovalStatusBadge', () => {
  it('renders AUTO_VERIFIED status correctly', () => {
    const mockDate = new Date('2024-01-15T14:30:00Z');
    render(
      <AutoApprovalStatusBadge 
        status={VerificationStatus.AUTO_VERIFIED}
        autoApprovedAt={mockDate}
        ruleId="rule-123"
      />
    );

    expect(screen.getByText('Auto-Verified')).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'default');
  });

  it('renders VERIFIED status correctly', () => {
    render(<AutoApprovalStatusBadge status={VerificationStatus.VERIFIED} />);

    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'default');
  });

  it('renders PENDING status correctly', () => {
    render(<AutoApprovalStatusBadge status={VerificationStatus.PENDING} />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'secondary');
  });

  it('renders REJECTED status correctly', () => {
    render(<AutoApprovalStatusBadge status={VerificationStatus.REJECTED} />);

    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'destructive');
  });

  it('displays tooltip with additional information', () => {
    const mockDate = new Date('2024-01-15T14:30:00Z');
    render(
      <AutoApprovalStatusBadge 
        status={VerificationStatus.AUTO_VERIFIED}
        autoApprovedAt={mockDate}
        ruleId="rule-123"
        overriddenAt={mockDate}
      />
    );

    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip-trigger')).toBeInTheDocument();
  });
});

describe('AutoApprovalFilterIndicator', () => {
  const mockProps = {
    showAutoApproved: true,
    onToggle: jest.fn(),
    autoApprovedCount: 45,
    totalCount: 78,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders filter indicator with counts', () => {
    render(<AutoApprovalFilterIndicator {...mockProps} />);

    expect(screen.getByText('Auto-Approved')).toBeInTheDocument();
    expect(screen.getByText('45/78')).toBeInTheDocument();
  });

  it('shows active state when filter is enabled', () => {
    render(<AutoApprovalFilterIndicator {...mockProps} />);

    const button = screen.getByTestId('button');
    expect(button).toHaveAttribute('data-variant', 'default');
  });

  it('shows inactive state when filter is disabled', () => {
    const inactiveProps = { ...mockProps, showAutoApproved: false };
    render(<AutoApprovalFilterIndicator {...inactiveProps} />);

    const button = screen.getByTestId('button');
    expect(button).toHaveAttribute('data-variant', 'outline');
  });

  it('calls onToggle when clicked', () => {
    render(<AutoApprovalFilterIndicator {...mockProps} />);

    const button = screen.getByTestId('button');
    fireEvent.click(button);

    expect(mockProps.onToggle).toHaveBeenCalledWith(false); // Should toggle to opposite state
  });

  it('toggles filter state correctly', () => {
    const inactiveProps = { ...mockProps, showAutoApproved: false };
    render(<AutoApprovalFilterIndicator {...inactiveProps} />);

    const button = screen.getByTestId('button');
    fireEvent.click(button);

    expect(mockProps.onToggle).toHaveBeenCalledWith(true); // Should toggle to true
  });
});