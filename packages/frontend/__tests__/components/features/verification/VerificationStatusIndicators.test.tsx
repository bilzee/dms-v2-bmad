import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  StatusBadge,
  PriorityIndicator,
  AssessmentTypeIndicator,
  NotificationCounter,
  AttentionIndicator,
  AssessmentStatusDisplay,
} from '@/components/features/verification/VerificationStatusIndicators';
import { VerificationStatus, AssessmentType } from '@shared/types/entities';

describe('StatusBadge', () => {
  it('renders pending status correctly', () => {
    render(<StatusBadge status={VerificationStatus.PENDING} />);
    
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('⏳')).toBeInTheDocument();
  });

  it('renders verified status correctly', () => {
    render(<StatusBadge status={VerificationStatus.VERIFIED} />);
    
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('✅')).toBeInTheDocument();
  });

  it('renders rejected status correctly', () => {
    render(<StatusBadge status={VerificationStatus.REJECTED} />);
    
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('❌')).toBeInTheDocument();
  });

  it('renders auto-verified status correctly', () => {
    render(<StatusBadge status={VerificationStatus.AUTO_VERIFIED} />);
    
    expect(screen.getByText('Auto-Verified')).toBeInTheDocument();
    expect(screen.getByText('🤖')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<StatusBadge status={VerificationStatus.PENDING} className="custom-class" />);
    
    const badge = screen.getByText('Pending').closest('.custom-class');
    expect(badge).toBeInTheDocument();
  });

  it('has proper ARIA labels', () => {
    render(<StatusBadge status={VerificationStatus.VERIFIED} />);
    
    expect(screen.getByLabelText('Verification status: Verified')).toBeInTheDocument();
  });
});

describe('PriorityIndicator', () => {
  it('renders high priority with animation', () => {
    render(<PriorityIndicator priority="HIGH" />);
    
    const indicator = screen.getByTitle('High Priority');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('animate-pulse');
  });

  it('renders medium priority without animation', () => {
    render(<PriorityIndicator priority="MEDIUM" />);
    
    const indicator = screen.getByTitle('Medium Priority');
    expect(indicator).toBeInTheDocument();
    expect(indicator).not.toHaveClass('animate-pulse');
  });

  it('renders low priority correctly', () => {
    render(<PriorityIndicator priority="LOW" />);
    
    expect(screen.getByTitle('Low Priority')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<PriorityIndicator priority="HIGH" className="custom-priority" />);
    
    const container = screen.getByTitle('High Priority').closest('.custom-priority');
    expect(container).toBeInTheDocument();
  });
});

describe('AssessmentTypeIndicator', () => {
  it('renders health assessment type', () => {
    render(<AssessmentTypeIndicator type={AssessmentType.HEALTH} />);
    
    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByText('🏥')).toBeInTheDocument();
  });

  it('renders WASH assessment type', () => {
    render(<AssessmentTypeIndicator type={AssessmentType.WASH} />);
    
    expect(screen.getByText('WASH')).toBeInTheDocument();
    expect(screen.getByText('💧')).toBeInTheDocument();
  });

  it('renders without label when showLabel is false', () => {
    render(<AssessmentTypeIndicator type={AssessmentType.HEALTH} showLabel={false} />);
    
    expect(screen.queryByText('Health')).not.toBeInTheDocument();
    expect(screen.getByText('🏥')).toBeInTheDocument();
  });

  it('has proper ARIA labels', () => {
    render(<AssessmentTypeIndicator type={AssessmentType.SECURITY} />);
    
    expect(screen.getByLabelText('Assessment type: Security')).toBeInTheDocument();
  });
});

describe('NotificationCounter', () => {
  it('renders pending notification count', () => {
    render(<NotificationCounter count={5} type="pending" />);
    
    const counter = screen.getByLabelText('5 pending assessments');
    expect(counter).toBeInTheDocument();
    expect(counter).toHaveTextContent('5');
  });

  it('renders attention notification with animation', () => {
    render(<NotificationCounter count={3} type="attention" />);
    
    const counter = screen.getByLabelText('3 assessments requiring attention');
    expect(counter).toHaveClass('animate-pulse');
    expect(counter).toHaveTextContent('3');
  });

  it('renders high priority notification', () => {
    render(<NotificationCounter count={2} type="high-priority" />);
    
    expect(screen.getByLabelText('2 high priority assessments')).toBeInTheDocument();
  });

  it('shows 99+ for counts over 99', () => {
    render(<NotificationCounter count={150} type="pending" />);
    
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('does not render when count is 0', () => {
    render(<NotificationCounter count={0} type="pending" />);
    
    expect(screen.queryByLabelText(/pending assessments/)).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<NotificationCounter count={5} type="pending" className="custom-counter" />);
    
    expect(screen.getByLabelText('5 pending assessments')).toHaveClass('custom-counter');
  });
});

describe('AttentionIndicator', () => {
  it('renders urgent attention indicator', () => {
    render(<AttentionIndicator requiresAttention={true} />);
    
    const indicator = screen.getByLabelText('Requires immediate attention');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('animate-pulse');
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('renders feedback indicator', () => {
    render(<AttentionIndicator requiresAttention={false} feedbackCount={2} />);
    
    expect(screen.getByLabelText('2 feedback(s) received')).toBeInTheDocument();
    expect(screen.getByText('💬')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('does not render when no attention or feedback', () => {
    render(<AttentionIndicator requiresAttention={false} feedbackCount={0} />);
    
    expect(screen.queryByText('⚠️')).not.toBeInTheDocument();
    expect(screen.queryByText('💬')).not.toBeInTheDocument();
  });

  it('includes time information in title when provided', () => {
    const lastFeedback = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    
    render(
      <AttentionIndicator 
        requiresAttention={false} 
        feedbackCount={1} 
        lastFeedbackAt={lastFeedback} 
      />
    );
    
    const indicator = screen.getByLabelText('1 feedback(s) received');
    expect(indicator).toHaveAttribute('title', expect.stringContaining('2 hours ago'));
  });
});

describe('AssessmentStatusDisplay', () => {
  const defaultProps = {
    verificationStatus: VerificationStatus.PENDING,
    assessmentType: AssessmentType.HEALTH,
    priority: 'HIGH' as const,
    requiresAttention: false,
  };

  it('renders all status components', () => {
    render(<AssessmentStatusDisplay {...defaultProps} />);
    
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByTitle('High Priority')).toBeInTheDocument();
  });

  it('renders attention indicator when needed', () => {
    render(
      <AssessmentStatusDisplay 
        {...defaultProps} 
        requiresAttention={true}
        feedbackCount={1}
      />
    );
    
    expect(screen.getByLabelText('Requires immediate attention')).toBeInTheDocument();
  });

  it('renders in compact mode', () => {
    render(<AssessmentStatusDisplay {...defaultProps} compact={true} />);
    
    // In compact mode, assessment type label should be hidden
    expect(screen.getByText('🏥')).toBeInTheDocument();
    expect(screen.queryByText('Health')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<AssessmentStatusDisplay {...defaultProps} className="custom-status" />);
    
    const container = screen.getByText('Pending').closest('.custom-status');
    expect(container).toBeInTheDocument();
  });
});

describe('Time formatting', () => {
  it('formats recent times correctly', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    render(
      <AttentionIndicator 
        requiresAttention={false} 
        feedbackCount={1} 
        lastFeedbackAt={oneHourAgo} 
      />
    );
    
    const indicator = screen.getByLabelText('1 feedback(s) received');
    expect(indicator).toHaveAttribute('title', expect.stringContaining('1 hour ago'));
  });

  it('formats day-old times correctly', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    
    render(
      <AttentionIndicator 
        requiresAttention={false} 
        feedbackCount={1} 
        lastFeedbackAt={twoDaysAgo} 
      />
    );
    
    const indicator = screen.getByLabelText('1 feedback(s) received');
    expect(indicator).toHaveAttribute('title', expect.stringContaining('2 days ago'));
  });
});