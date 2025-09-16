import { render, screen } from '@testing-library/react';
import { EntityGapsGrid } from '../EntityGapsGrid';

const mockEntityGaps = [
  {
    entityId: 'entity-1',
    entityName: 'Maiduguri Metropolitan',
    assessmentAreas: {
      Health: 'red' as const,
      WASH: 'yellow' as const,
      Food: 'green' as const,
      Shelter: 'red' as const,
      Security: 'yellow' as const,
    },
  },
  {
    entityId: 'entity-2',
    entityName: 'Jere Local Government',
    assessmentAreas: {
      Health: 'green' as const,
      WASH: 'green' as const,
      Food: 'yellow' as const,
      Shelter: 'green' as const,
      Security: 'red' as const,
    },
  },
];

describe('EntityGapsGrid', () => {
  it('renders loading state correctly', () => {
    const { container } = render(<EntityGapsGrid entityGaps={[]} isLoading={true} />);
    
    expect(screen.getByText('Entity Gaps Summary')).toBeInTheDocument();
    
    // Check for animate-pulse class which indicates loading state
    const loadingElements = container.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('renders empty state when no entity gaps', () => {
    render(<EntityGapsGrid entityGaps={[]} isLoading={false} />);
    
    expect(screen.getByText('Entity Gaps Summary')).toBeInTheDocument();
    expect(screen.getByText('No entity data available for selected incident')).toBeInTheDocument();
  });

  it('renders entity gaps correctly', () => {
    render(<EntityGapsGrid entityGaps={mockEntityGaps} isLoading={false} />);
    
    expect(screen.getByText('Entity Gaps Summary')).toBeInTheDocument();
    expect(screen.getByText('Maiduguri Metropolitan')).toBeInTheDocument();
    expect(screen.getByText('Jere Local Government')).toBeInTheDocument();
  });

  it('displays all assessment areas for each entity', () => {
    render(<EntityGapsGrid entityGaps={mockEntityGaps} isLoading={false} />);
    
    // Check that assessment area icons are displayed (emojis)
    expect(screen.getAllByText('🏥')).toHaveLength(2); // Health
    expect(screen.getAllByText('💧')).toHaveLength(2); // WASH
    expect(screen.getAllByText('🍽️')).toHaveLength(2); // Food
    expect(screen.getAllByText('🏠')).toHaveLength(2); // Shelter
    expect(screen.getAllByText('🛡️')).toHaveLength(2); // Security
  });

  it('applies correct severity colors to badges', () => {
    const { container } = render(<EntityGapsGrid entityGaps={mockEntityGaps} isLoading={false} />);
    
    // Check for red severity badges (should have bg-red-500 class)
    const redBadges = container.querySelectorAll('.bg-red-500');
    expect(redBadges.length).toBeGreaterThan(0);
    
    // Check for yellow severity badges
    const yellowBadges = container.querySelectorAll('.bg-yellow-500');
    expect(yellowBadges.length).toBeGreaterThan(0);
    
    // Check for green severity badges
    const greenBadges = container.querySelectorAll('.bg-green-500');
    expect(greenBadges.length).toBeGreaterThan(0);
  });

  it('shows entity names with proper truncation', () => {
    const longNameEntity = {
      entityId: 'entity-3',
      entityName: 'Very Long Entity Name That Should Be Truncated In The UI',
      assessmentAreas: {
        Health: 'green' as const,
        WASH: 'green' as const,
        Food: 'green' as const,
        Shelter: 'green' as const,
        Security: 'green' as const,
      },
    };

    render(<EntityGapsGrid entityGaps={[longNameEntity]} isLoading={false} />);
    
    const entityName = screen.getByText(longNameEntity.entityName);
    expect(entityName).toHaveClass('truncate');
    expect(entityName).toHaveAttribute('title', longNameEntity.entityName);
  });

  it('applies correct hover effects', () => {
    const { container } = render(<EntityGapsGrid entityGaps={mockEntityGaps} isLoading={false} />);
    
    const entityContainers = container.querySelectorAll('.hover\\:bg-gray-100');
    expect(entityContainers.length).toBe(2); // One for each entity
  });

  it('has proper accessibility attributes', () => {
    const { container } = render(<EntityGapsGrid entityGaps={mockEntityGaps} isLoading={false} />);
    
    // Check that assessment area badges have proper title attributes for tooltips
    const assessmentBadges = container.querySelectorAll('[title*="Health"], [title*="WASH"], [title*="Food"], [title*="Shelter"], [title*="Security"]');
    expect(assessmentBadges.length).toBeGreaterThan(0);
    
    assessmentBadges.forEach(badge => {
      expect(badge).toHaveAttribute('title');
      const title = badge.getAttribute('title');
      expect(title).toMatch(/Health|WASH|Food|Shelter|Security/);
      expect(title).toMatch(/red|yellow|green/);
    });
  });

  it('applies responsive design classes', () => {
    render(<EntityGapsGrid entityGaps={mockEntityGaps} isLoading={false} />);
    
    // Check for responsive text visibility
    const responsiveText = screen.getAllByText('Health');
    responsiveText.forEach(text => {
      expect(text).toHaveClass('hidden', 'sm:inline');
    });
  });

  it('has proper visual hierarchy with border accent', () => {
    const { container } = render(<EntityGapsGrid entityGaps={mockEntityGaps} isLoading={false} />);
    
    const card = container.querySelector('.border-l-4.border-l-blue-500');
    expect(card).toBeInTheDocument();
  });
});