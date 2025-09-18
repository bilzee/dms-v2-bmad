import { render, screen } from '@testing-library/react';
import { QuickStatistics } from '../QuickStatistics';

jest.mock('../SeverityIndicators', () => ({
  SeverityIndicators: ({ overallSeverity }: { overallSeverity: any }) => (
    <div data-testid="severity-indicators">
      Severity Indicators for {Object.keys(overallSeverity).length} areas
    </div>
  ),
}));

const mockStatistics = {
  overallSeverity: {
    Health: 'red' as const,
    WASH: 'yellow' as const,
    Food: 'green' as const,
    Shelter: 'red' as const,
    Security: 'yellow' as const,
  },
  totalCriticalGaps: 12,
  totalModerateGaps: 8,
  totalMinimalGaps: 5,
};

describe('QuickStatistics', () => {
  it('renders loading state correctly', () => {
    const { container } = render(<QuickStatistics statistics={mockStatistics} isLoading={true} />);
    
    expect(screen.getByText('Quick Statistics')).toBeInTheDocument();
    // Loading state shows animated skeleton elements
    const loadingElements = container.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('renders statistics correctly when not loading', () => {
    render(<QuickStatistics statistics={mockStatistics} isLoading={false} />);
    
    expect(screen.getByText('Quick Statistics')).toBeInTheDocument();
    expect(screen.getByText('Assessment Areas')).toBeInTheDocument();
    expect(screen.getByText('Gap Summary')).toBeInTheDocument();
    expect(screen.getByTestId('severity-indicators')).toBeInTheDocument();
  });

  it('displays gap counts correctly', () => {
    render(<QuickStatistics statistics={mockStatistics} isLoading={false} />);
    
    expect(screen.getByText('12')).toBeInTheDocument(); // Critical gaps
    expect(screen.getByText('8')).toBeInTheDocument();  // Moderate gaps
    expect(screen.getByText('5')).toBeInTheDocument();  // Minimal gaps
    
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('Minimal')).toBeInTheDocument();
  });

  it('applies correct color schemes to gap summary boxes', () => {
    const { container } = render(<QuickStatistics statistics={mockStatistics} isLoading={false} />);
    
    // Check for critical (red) styling
    const criticalBox = container.querySelector('.bg-red-50');
    expect(criticalBox).toBeInTheDocument();
    expect(criticalBox).toHaveClass('border-red-200');
    
    // Check for moderate (yellow) styling
    const moderateBox = container.querySelector('.bg-yellow-50');
    expect(moderateBox).toBeInTheDocument();
    expect(moderateBox).toHaveClass('border-yellow-200');
    
    // Check for minimal (green) styling
    const minimalBox = container.querySelector('.bg-green-50');
    expect(minimalBox).toBeInTheDocument();
    expect(minimalBox).toHaveClass('border-green-200');
  });

  it('passes correct props to SeverityIndicators', () => {
    render(<QuickStatistics statistics={mockStatistics} isLoading={false} />);
    
    expect(screen.getByTestId('severity-indicators')).toBeInTheDocument();
    expect(screen.getByText('Severity Indicators for 5 areas')).toBeInTheDocument();
  });

  it('applies hover effects to gap summary boxes', () => {
    const { container } = render(<QuickStatistics statistics={mockStatistics} isLoading={false} />);
    
    const gapBoxes = container.querySelectorAll('.hover\\:shadow-md');
    expect(gapBoxes).toHaveLength(3); // Critical, Moderate, Minimal
  });

  it('has proper section separation', () => {
    const { container } = render(<QuickStatistics statistics={mockStatistics} isLoading={false} />);
    
    // Check for horizontal rule separator
    const separator = container.querySelector('hr');
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveClass('border-gray-300');
  });

  it('uses proper typography hierarchy', () => {
    render(<QuickStatistics statistics={mockStatistics} isLoading={false} />);
    
    // Main title
    const mainTitle = screen.getByText('Quick Statistics');
    expect(mainTitle).toHaveClass('text-sm', 'font-semibold');
    
    // Section headers
    const assessmentHeader = screen.getByText('Assessment Areas');
    expect(assessmentHeader).toHaveClass('text-xs', 'font-semibold', 'uppercase', 'tracking-wide');
    
    const gapSummaryHeader = screen.getByText('Gap Summary');
    expect(gapSummaryHeader).toHaveClass('text-xs', 'font-semibold', 'uppercase', 'tracking-wide');
  });

  it('displays large numbers correctly', () => {
    const largeNumberStats = {
      ...mockStatistics,
      totalCriticalGaps: 1234,
      totalModerateGaps: 567,
      totalMinimalGaps: 89,
    };

    render(<QuickStatistics statistics={largeNumberStats} isLoading={false} />);
    
    expect(screen.getByText('1234')).toBeInTheDocument();
    expect(screen.getByText('567')).toBeInTheDocument();
    expect(screen.getByText('89')).toBeInTheDocument();
  });

  it('has proper layout structure', () => {
    const { container } = render(<QuickStatistics statistics={mockStatistics} isLoading={false} />);
    
    // Check main card has visual accent
    const card = container.querySelector('.border-l-4.border-l-green-500');
    expect(card).toBeInTheDocument();
    
    // Check gap summary uses grid layout
    const gridContainer = container.querySelector('.grid.grid-cols-3');
    expect(gridContainer).toBeInTheDocument();
  });

  it('has correct spacing between elements', () => {
    const { container } = render(<QuickStatistics statistics={mockStatistics} isLoading={false} />);
    
    // Check content has proper spacing
    const contentContainer = container.querySelector('.space-y-5');
    expect(contentContainer).toBeInTheDocument();
    
    // Check gap between grid items
    const gapContainer = container.querySelector('.gap-3');
    expect(gapContainer).toBeInTheDocument();
  });
});