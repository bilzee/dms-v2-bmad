import { render, screen } from '@testing-library/react';
import { SeverityIndicators } from '../SeverityIndicators';

const mockOverallSeverity = {
  Health: 'red' as const,
  WASH: 'yellow' as const,
  Food: 'green' as const,
  Shelter: 'red' as const,
  Security: 'yellow' as const,
};

describe('SeverityIndicators', () => {
  it('renders all assessment areas', () => {
    render(<SeverityIndicators overallSeverity={mockOverallSeverity} />);
    
    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByText('WASH')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Shelter')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('displays correct icons for each assessment area', () => {
    render(<SeverityIndicators overallSeverity={mockOverallSeverity} />);
    
    expect(screen.getByText('🏥')).toBeInTheDocument(); // Health
    expect(screen.getByText('💧')).toBeInTheDocument(); // WASH
    expect(screen.getByText('🍽️')).toBeInTheDocument(); // Food
    expect(screen.getByText('🏠')).toBeInTheDocument(); // Shelter
    expect(screen.getByText('🛡️')).toBeInTheDocument(); // Security
  });

  it('displays correct severity text for each assessment area', () => {
    render(<SeverityIndicators overallSeverity={mockOverallSeverity} />);
    
    // Should have 2 "Critical" badges (Health and Shelter are red)
    expect(screen.getAllByText('Critical')).toHaveLength(2);
    
    // Should have 2 "Moderate" badges (WASH and Security are yellow)
    expect(screen.getAllByText('Moderate')).toHaveLength(2);
    
    // Should have 1 "Minimal" badge (Food is green)
    expect(screen.getAllByText('Minimal')).toHaveLength(1);
  });

  it('applies correct color classes based on severity', () => {
    const { container } = render(<SeverityIndicators overallSeverity={mockOverallSeverity} />);
    
    // Check for red severity badges
    const redBadges = container.querySelectorAll('.bg-red-500');
    expect(redBadges).toHaveLength(2); // Health and Shelter
    
    // Check for yellow severity badges
    const yellowBadges = container.querySelectorAll('.bg-yellow-500');
    expect(yellowBadges).toHaveLength(2); // WASH and Security
    
    // Check for green severity badges
    const greenBadges = container.querySelectorAll('.bg-green-500');
    expect(greenBadges).toHaveLength(1); // Food
  });

  it('has proper accessibility with title attributes', () => {
    const { container } = render(<SeverityIndicators overallSeverity={mockOverallSeverity} />);
    
    // Find all badges by their CSS class selector since they don't have explicit role
    const badges = container.querySelectorAll('[title]');
    expect(badges).toHaveLength(5);
    
    badges.forEach(badge => {
      expect(badge).toHaveAttribute('title');
      const title = badge.getAttribute('title');
      expect(title).toMatch(/Health|WASH|Food|Shelter|Security/);
      expect(title).toMatch(/Critical|Moderate|Minimal/);
      expect(title).toMatch(/gaps$/);
    });
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-test-class';
    const { container } = render(
      <SeverityIndicators overallSeverity={mockOverallSeverity} className={customClass} />
    );
    
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer).toHaveClass(customClass);
  });

  it('has proper layout structure', () => {
    const { container } = render(<SeverityIndicators overallSeverity={mockOverallSeverity} />);
    
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer).toHaveClass('grid', 'grid-cols-1', 'gap-2.5');
    
    // Check that each row has proper alignment
    const rows = container.querySelectorAll('.flex.items-center.justify-between');
    expect(rows).toHaveLength(5); // One for each assessment area
  });

  it('handles all possible severity combinations', () => {
    const allRedSeverity = {
      Health: 'red' as const,
      WASH: 'red' as const,
      Food: 'red' as const,
      Shelter: 'red' as const,
      Security: 'red' as const,
    };

    render(<SeverityIndicators overallSeverity={allRedSeverity} />);
    
    expect(screen.getAllByText('Critical')).toHaveLength(5);
    expect(screen.queryByText('Moderate')).not.toBeInTheDocument();
    expect(screen.queryByText('Minimal')).not.toBeInTheDocument();
  });

  it('truncates long assessment area names properly', () => {
    render(<SeverityIndicators overallSeverity={mockOverallSeverity} />);
    
    const areaNames = screen.getAllByText(/Health|WASH|Food|Shelter|Security/);
    areaNames.forEach(name => {
      expect(name).toHaveClass('truncate');
    });
  });

  it('has proper spacing between elements', () => {
    const { container } = render(<SeverityIndicators overallSeverity={mockOverallSeverity} />);
    
    // Check that we have the main container with proper gap
    const mainContainer = container.querySelector('.gap-2\\.5');
    expect(mainContainer).toBeInTheDocument();
    
    // Check icon and text spacing
    const iconTextContainers = container.querySelectorAll('.gap-2');
    expect(iconTextContainers).toHaveLength(5);
  });

  it('uses appropriate font weights and colors', () => {
    render(<SeverityIndicators overallSeverity={mockOverallSeverity} />);
    
    // Assessment area names should have medium font weight
    const areaNames = screen.getAllByText(/Health|WASH|Food|Shelter|Security/);
    areaNames.forEach(name => {
      expect(name).toHaveClass('font-medium', 'text-gray-700');
    });
    
    // Badges should have medium font weight and shadow
    const { container } = render(<SeverityIndicators overallSeverity={mockOverallSeverity} />);
    const badges = container.querySelectorAll('[title]');
    badges.forEach(badge => {
      expect(badge).toHaveClass('font-medium', 'shadow-sm');
    });
  });

  it('maintains consistent icon sizing', () => {
    render(<SeverityIndicators overallSeverity={mockOverallSeverity} />);
    
    const icons = screen.getAllByText(/🏥|💧|🍽️|🏠|🛡️/);
    icons.forEach(icon => {
      expect(icon).toHaveClass('text-sm');
    });
  });
});