import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CoordinatorDashboard from '@/app/(dashboard)/coordinator/dashboard/page';

// Mock the hooks
jest.mock('@/hooks/useQueueManagement', () => ({
  useQueueManagement: () => ({
    assessmentQueue: [
      {
        assessment: {
          id: 'test-assessment-1',
          type: 'HEALTH',
          verificationStatus: 'PENDING',
          date: new Date('2024-01-01'),
          assessorId: 'assessor-1',
          affectedEntityId: 'entity-1',
        },
        priority: 'HIGH',
        assessorName: 'John Doe',
        affectedEntity: {
          name: 'Test Community',
          lga: 'Test LGA',
          ward: 'Test Ward'
        },
        requiresAttention: true,
        feedbackCount: 0
      }
    ],
    responseQueue: [
      {
        response: {
          id: 'test-response-1',
          responseType: 'FOOD',
          verificationStatus: 'PENDING',
          plannedDate: new Date('2024-01-01'),
          responderId: 'responder-1',
          status: 'PLANNED'
        },
        priority: 'NORMAL',
        responderName: 'Jane Smith',
        affectedEntity: {
          name: 'Test Community',
          lga: 'Test LGA',
          ward: 'Test Ward'
        },
        requiresAttention: false,
        feedbackCount: 1
      }
    ],
    assessmentMetrics: {
      totalPending: 8,
      averageProcessingTime: 45,
      queueVelocity: 12,
      bottleneckThreshold: 60,
      isBottleneck: false,
      trendDirection: 'STABLE'
    },
    responseMetrics: {
      totalPending: 5,
      averageProcessingTime: 75,
      queueVelocity: 8,
      bottleneckThreshold: 60,
      isBottleneck: true,
      trendDirection: 'UP'
    },
    combinedMetrics: {
      totalPending: 13,
      totalVelocity: 20,
      hasBottleneck: true
    },
    refreshQueues: jest.fn(),
    previewItem: null,
    previewType: null,
    openPreview: jest.fn(),
    closePreview: jest.fn(),
    isLoading: false,
    error: null
  })
}));

jest.mock('@/hooks/useVerificationActions', () => ({
  useVerificationActions: () => ({
    verifyItem: jest.fn(),
    rejectItem: jest.fn(),
    isVerifying: false,
    isRejecting: false
  })
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('CoordinatorDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dashboard header correctly', async () => {
    render(<CoordinatorDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Coordination Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Real-time assessment and response queue management with direct verification')).toBeInTheDocument();
    });
  });

  it('displays metrics cards with correct values', async () => {
    render(<CoordinatorDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Pending Assessments')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      
      expect(screen.getByText('Pending Responses')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      
      expect(screen.getByText('Queue Velocity')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
    });
  });

  it('shows bottleneck alerts when bottleneck is detected', async () => {
    render(<CoordinatorDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Bottleneck Alerts')).toBeInTheDocument();
      expect(screen.getByText(/Response queue processing is.*above threshold/)).toBeInTheDocument();
    });
  });

  it('renders tab navigation correctly', async () => {
    render(<CoordinatorDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Combined View')).toBeInTheDocument();
      expect(screen.getByText('Assessments')).toBeInTheDocument();
      expect(screen.getByText('Responses')).toBeInTheDocument();
    });
  });

  it('switches between tabs correctly', async () => {
    render(<CoordinatorDashboard />);
    
    await waitFor(() => {
      const assessmentTab = screen.getByText('Assessments');
      fireEvent.click(assessmentTab);
      
      expect(screen.getByText('Assessment Queue')).toBeInTheDocument();
    });
  });

  it('displays quick action buttons', async () => {
    render(<CoordinatorDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Manage Incidents')).toBeInTheDocument();
      expect(screen.getByText('Auto-Approval')).toBeInTheDocument();
      expect(screen.getByText('Conflicts (3)')).toBeInTheDocument();
    });
  });

  it('shows live updates indicator', async () => {
    render(<CoordinatorDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Live Updates')).toBeInTheDocument();
    });
  });

  it('renders assessment and response queues in combined view', async () => {
    render(<CoordinatorDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Assessment Queue')).toBeInTheDocument();
      expect(screen.getByText('Response Queue')).toBeInTheDocument();
      expect(screen.getByText('8 pending')).toBeInTheDocument();
      expect(screen.getByText('5 pending')).toBeInTheDocument();
    });
  });
});

describe('CoordinatorDashboard Error States', () => {
  it('shows loading state initially', () => {
    // Mock the getDashboardMetrics to never resolve
    const mockGetDashboardMetrics = jest.fn(() => new Promise(() => {}));
    
    render(<CoordinatorDashboard />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});

describe('CoordinatorDashboard Accessibility', () => {
  it('has proper heading structure', async () => {
    render(<CoordinatorDashboard />);
    
    await waitFor(() => {
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('Coordination Dashboard');
      
      const subHeadings = screen.getAllByRole('heading', { level: 2 });
      expect(subHeadings.length).toBeGreaterThan(0);
    });
  });

  it('has proper tab navigation', async () => {
    render(<CoordinatorDashboard />);
    
    await waitFor(() => {
      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeInTheDocument();
      
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);
    });
  });
});