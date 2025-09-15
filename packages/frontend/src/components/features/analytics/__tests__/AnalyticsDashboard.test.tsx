import { render, screen } from '@testing-library/react';
import { AnalyticsDashboard } from '../AnalyticsDashboard';

// Mock the panel components
jest.mock('../LeftPanel', () => ({
  LeftPanel: () => <div data-testid="left-panel">Left Panel</div>
}));

jest.mock('../CenterPanel', () => ({
  CenterPanel: () => <div data-testid="center-panel">Center Panel</div>
}));

jest.mock('../RightPanel', () => ({
  RightPanel: () => <div data-testid="right-panel">Right Panel</div>
}));

describe('AnalyticsDashboard', () => {
  it('renders all three panels', () => {
    render(<AnalyticsDashboard />);
    
    expect(screen.getByTestId('left-panel')).toBeInTheDocument();
    expect(screen.getByTestId('center-panel')).toBeInTheDocument();
    expect(screen.getByTestId('right-panel')).toBeInTheDocument();
  });

  it('has proper grid layout structure', () => {
    const { container } = render(<AnalyticsDashboard />);
    
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toHaveClass('h-screen');
    expect(gridContainer).toHaveClass('lg:grid-cols-12');
  });

  it('applies full-screen height optimized for monitoring displays', () => {
    const { container } = render(<AnalyticsDashboard />);
    
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer).toHaveClass('flex-1');
    expect(mainContainer).toHaveClass('min-h-screen');
  });
});