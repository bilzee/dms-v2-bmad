import { render, screen } from '@testing-library/react';
import { LeftPanel } from '../LeftPanel';

jest.mock('../IncidentSelector', () => ({
  IncidentSelector: ({ className }: { className?: string }) => (
    <div data-testid="incident-selector" className={className}>Incident Selector</div>
  ),
}));

jest.mock('../IncidentTimeline', () => ({
  IncidentTimeline: ({ className }: { className?: string }) => (
    <div data-testid="incident-timeline" className={className}>Incident Timeline</div>
  ),
}));

jest.mock('../PopulationImpactSummary', () => ({
  PopulationImpactSummary: ({ className }: { className?: string }) => (
    <div data-testid="population-impact-summary" className={className}>Population Impact Summary</div>
  ),
}));

describe('LeftPanel', () => {
  it('renders all three main components', () => {
    render(<LeftPanel />);
    
    expect(screen.getByTestId('incident-selector')).toBeInTheDocument();
    expect(screen.getByTestId('incident-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('population-impact-summary')).toBeInTheDocument();
  });

  it('applies correct layout structure', () => {
    const { container } = render(<LeftPanel />);
    
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer).toHaveClass('h-full');
    expect(mainContainer).toHaveClass('flex');
    expect(mainContainer).toHaveClass('flex-col');
    expect(mainContainer).toHaveClass('space-y-4');
    expect(mainContainer).toHaveClass('overflow-y-auto');
  });

  it('applies correct classes to child components', () => {
    render(<LeftPanel />);
    
    const incidentSelector = screen.getByTestId('incident-selector');
    expect(incidentSelector).toHaveClass('flex-shrink-0');
    
    const incidentTimeline = screen.getByTestId('incident-timeline');
    expect(incidentTimeline).toHaveClass('flex-shrink-0');
    
    const populationImpact = screen.getByTestId('population-impact-summary');
    expect(populationImpact).toHaveClass('flex-1');
    expect(populationImpact).toHaveClass('min-h-0');
  });
});