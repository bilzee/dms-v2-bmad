import { render, screen } from '@testing-library/react';
import { SkeletonBadge } from '../skeleton-badge';

describe('SkeletonBadge', () => {
  it('should show loading state', () => {
    render(<SkeletonBadge loading={true} />);
    
    const loadingElement = screen.getByRole('generic');
    expect(loadingElement).toHaveClass('animate-pulse');
  });

  it('should show error state', () => {
    render(<SkeletonBadge error="Failed to fetch" />);
    
    expect(screen.getByText('!')).toBeInTheDocument();
  });

  it('should display value when provided', () => {
    render(<SkeletonBadge value={5} />);
    
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should display fallback when value is undefined', () => {
    render(<SkeletonBadge fallback={3} />);
    
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});