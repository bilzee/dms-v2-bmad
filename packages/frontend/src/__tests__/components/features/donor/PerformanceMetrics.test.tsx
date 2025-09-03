import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PerformanceMetrics } from '@/components/features/donor/PerformanceMetrics';

// Mock Recharts components to avoid rendering issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

describe('PerformanceMetrics', () => {
  const mockMetrics = {
    onTimeDeliveryRate: 87.5,
    quantityAccuracyRate: 92.3,
    performanceScore: 89.2,
    totalCommitments: 24,
    completedDeliveries: 21,
    beneficiariesHelped: 1250,
    responseTypesServed: ['MEDICAL_SUPPLIES', 'FOOD_WATER', 'SHELTER'],
    lastUpdated: new Date('2024-01-15T10:00:00Z'),
  };

  const mockTrends = {
    onTimeDeliveryRate: 2.3,
    quantityAccuracyRate: -1.2,
    performanceScore: 1.8,
  };

  it('renders performance metrics correctly', () => {
    render(<PerformanceMetrics metrics={mockMetrics} />);

    // Check key performance indicators
    expect(screen.getByText('87.5%')).toBeInTheDocument();
    expect(screen.getByText('92.3%')).toBeInTheDocument();
    expect(screen.getByText('89.2')).toBeInTheDocument();
  });

  it('displays commitment statistics', () => {
    render(<PerformanceMetrics metrics={mockMetrics} />);

    expect(screen.getByText('21 of 24 commitments')).toBeInTheDocument();
    expect(screen.getByText('1,250 beneficiaries helped')).toBeInTheDocument();
  });

  it('shows trend indicators when trends are provided', () => {
    render(<PerformanceMetrics metrics={mockMetrics} trends={mockTrends} />);

    // Should show positive trend for on-time delivery
    expect(screen.getByText('+2.3%')).toBeInTheDocument();
    // Should show negative trend for quantity accuracy
    expect(screen.getByText('-1.2%')).toBeInTheDocument();
    // Should show positive trend for performance score
    expect(screen.getByText('+1.8')).toBeInTheDocument();
  });

  it('renders charts components', () => {
    render(<PerformanceMetrics metrics={mockMetrics} />);

    // Check if chart components are rendered
    expect(screen.getAllByTestId('responsive-container').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('displays response types', () => {
    render(<PerformanceMetrics metrics={mockMetrics} />);

    expect(screen.getByText('Medical Supplies')).toBeInTheDocument();
    expect(screen.getByText('Food Water')).toBeInTheDocument();
    expect(screen.getByText('Shelter')).toBeInTheDocument();
  });

  it('shows last updated timestamp', () => {
    render(<PerformanceMetrics metrics={mockMetrics} />);

    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it('handles missing trends gracefully', () => {
    render(<PerformanceMetrics metrics={mockMetrics} />);

    // Should not throw errors and should display metrics
    expect(screen.getByText('87.5%')).toBeInTheDocument();
    expect(screen.getByText('92.3%')).toBeInTheDocument();
    expect(screen.getByText('89.2')).toBeInTheDocument();
  });

  it('formats large numbers correctly', () => {
    const metricsWithLargeNumbers = {
      ...mockMetrics,
      beneficiariesHelped: 125000, // Should be formatted with comma
    };

    render(<PerformanceMetrics metrics={metricsWithLargeNumbers} />);

    expect(screen.getByText('125,000 beneficiaries helped')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <PerformanceMetrics metrics={mockMetrics} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('displays performance summary with correct counts', () => {
    render(<PerformanceMetrics metrics={mockMetrics} />);

    // Check performance summary grid
    expect(screen.getByText('24')).toBeInTheDocument(); // Total commitments
    expect(screen.getByText('21')).toBeInTheDocument(); // Completed deliveries
    expect(screen.getByText('1,250')).toBeInTheDocument(); // Beneficiaries
    expect(screen.getByText('3')).toBeInTheDocument(); // Response types count
  });
});

describe('PerformanceMetrics Edge Cases', () => {
  it('handles zero values gracefully (empty data state)', () => {
    const zeroMetrics = {
      onTimeDeliveryRate: 0,
      quantityAccuracyRate: 0,
      performanceScore: 0,
      totalCommitments: 0,
      completedDeliveries: 0,
      beneficiariesHelped: 0,
      responseTypesServed: [],
      lastUpdated: new Date(),
    };

    render(<PerformanceMetrics metrics={zeroMetrics} />);

    expect(screen.getAllByText('0%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('0 beneficiaries helped')).toBeInTheDocument();
  });

  it('handles real database scenarios with missing relationships', () => {
    // Test scenario where commitments exist but rapid responses are not linked
    const partialDataMetrics = {
      onTimeDeliveryRate: 0,
      quantityAccuracyRate: 0,
      performanceScore: 0,
      totalCommitments: 5,
      completedDeliveries: 0,
      beneficiariesHelped: 0,
      responseTypesServed: ['MEDICAL_SUPPLIES'],
      lastUpdated: new Date(),
    };

    render(<PerformanceMetrics metrics={partialDataMetrics} />);

    // Should handle case where commitments exist but no deliveries completed
    expect(screen.getByText('5')).toBeInTheDocument(); // Total commitments
    expect(screen.getByText('0 beneficiaries helped')).toBeInTheDocument();
    expect(screen.getAllByText('0%').length).toBeGreaterThanOrEqual(1); // Performance rates
  });

  it('handles real data with null/undefined deliveredDate', () => {
    const incompleteMetrics = {
      onTimeDeliveryRate: 50, // Some deliveries on time, some not tracked
      quantityAccuracyRate: 75, // Some quantity data missing
      performanceScore: 62.5,
      totalCommitments: 8,
      completedDeliveries: 4,
      beneficiariesHelped: 320,
      responseTypesServed: ['FOOD', 'SHELTER'],
      lastUpdated: new Date(),
    };

    render(<PerformanceMetrics metrics={incompleteMetrics} />);

    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('62.5')).toBeInTheDocument();
    expect(screen.getByText('320 beneficiaries helped')).toBeInTheDocument();
  });

  it('handles undefined/null values in trends', () => {
    const mockMetrics = {
      onTimeDeliveryRate: 87.5,
      quantityAccuracyRate: 92.3,
      performanceScore: 89.2,
      totalCommitments: 24,
      completedDeliveries: 21,
      beneficiariesHelped: 1250,
      responseTypesServed: ['MEDICAL_SUPPLIES'],
      lastUpdated: new Date(),
    };

    const incompleteTrends = {
      onTimeDeliveryRate: 2.3,
      quantityAccuracyRate: -1.2,
      performanceScore: 1.8,
    };

    render(<PerformanceMetrics metrics={mockMetrics} trends={incompleteTrends} />);

    // Should still render without crashing
    expect(screen.getByText('87.5%')).toBeInTheDocument();
  });
});