import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CoordinatorFeedback } from '../CoordinatorFeedback';
import { Feedback } from '@dms/shared';

// Mock PointerEvent for shadcn/ui components
function createMockPointerEvent(type: string, props: PointerEventInit = {}): PointerEvent {
  const event = new Event(type, props) as PointerEvent;
  Object.assign(event, {
    button: props.button || 0,
    ctrlKey: props.ctrlKey || false,
    pointerType: props.pointerType || "mouse",
  });
  return event;
}

// Setup PointerEvent and HTMLElement methods
beforeAll(() => {
  (window as any).PointerEvent = createMockPointerEvent;
  Object.assign(window.HTMLElement.prototype, {
    scrollIntoView: jest.fn(),
    releasePointerCapture: jest.fn(),
    hasPointerCapture: jest.fn(),
    setPointerCapture: jest.fn(),
  });
});

jest.mock('@/components/ui/collapsible', () => {
  const React = require('react');
  
  return {
    Collapsible: ({ children, open, onOpenChange, ...props }: any) => {
      return (
        <div data-testid="collapsible" data-open={open} {...props}>
          {React.Children.map(children, (child: any) => {
            if (React.isValidElement(child)) {
              if (child.type?.name === 'CollapsibleTrigger') {
                return React.cloneElement(child, {
                  onClick: () => onOpenChange?.(!open)
                });
              }
              if (child.type?.name === 'CollapsibleContent') {
                return open ? child : null;
              }
            }
            return child;
          })}
        </div>
      );
    },
    CollapsibleContent: ({ children, ...props }: any) => (
      <div data-testid="collapsible-content" {...props}>{children}</div>
    ),
    CollapsibleTrigger: ({ children, onClick, ...props }: any) => (
      <button data-testid="collapsible-trigger" onClick={onClick} {...props}>
        {children}
      </button>
    ),
  };
});

// Mock shadcn/ui components
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span data-testid="badge" {...props}>{children}</span>
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
  CardDescription: ({ children, ...props }: any) => <div data-testid="card-description" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 data-testid="card-title" {...props}>{children}</h3>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button data-testid="button" onClick={onClick} disabled={disabled} {...props}>{children}</button>
  )
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, ...props }: any) => <div data-testid="scroll-area" {...props}>{children}</div>
}));

// Mock the icons
jest.mock('lucide-react', () => ({
  X: () => <div data-testid="x-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  MessageSquare: () => <div data-testid="message-square-icon" />,
  History: () => <div data-testid="history-icon" />,
  User: () => <div data-testid="user-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
}));

// Mock the offline store
jest.mock('@/stores/offline.store', () => ({
  useOfflineStore: {
    getState: () => ({
      getCachedData: () => ({ feedback: [], resubmissionHistory: [] }),
    }),
  },
}));

// Mock fetch
global.fetch = jest.fn();

const mockOnClose = jest.fn();

const mockFeedbackResponse = {
  data: {
    feedback: [
      {
        id: 'feedback-1',
        targetType: 'RESPONSE' as const,
        targetId: 'resp-001',
        coordinatorId: 'coord-1',
        coordinatorName: 'John Smith',
        feedbackType: 'REJECTION' as const,
        reason: 'INSUFFICIENT_EVIDENCE' as const,
        comments: 'The delivery evidence photos are too blurry to verify the actual items delivered.',
        priority: 'HIGH' as const,
        requiresResponse: true,
        createdAt: new Date('2024-01-15T10:30:00Z'),
        isRead: true,
        isResolved: false,
      },
      {
        id: 'feedback-2',
        targetType: 'RESPONSE' as const,
        targetId: 'resp-001',
        coordinatorId: 'coord-2', 
        coordinatorName: 'Sarah Johnson',
        feedbackType: 'CLARIFICATION_REQUEST' as const,
        reason: 'MISSING_INFO' as const,
        comments: 'Could you please clarify the household selection criteria?',
        priority: 'NORMAL' as const,
        requiresResponse: true,
        createdAt: new Date('2024-01-14T14:20:00Z'),
        isRead: true,
        isResolved: true,
        resolvedAt: new Date('2024-01-15T09:00:00Z'),
      }
    ],
    resubmissionHistory: [
      {
        id: 'resubmission-1',
        responseId: 'resp-001',
        version: 2,
        previousVersion: 1,
        resubmittedBy: 'user-001',
        resubmittedAt: new Date('2024-01-16T08:00:00Z'),
        changesDescription: 'Provided clearer photos and selection criteria.',
        addressedFeedbackIds: ['feedback-1', 'feedback-2'],
        dataChanges: [
          {
            field: 'deliveryEvidence',
            oldValue: '2 blurry photos',
            newValue: '5 clear photos'
          }
        ],
        status: 'PENDING' as const
      }
    ]
  }
};

describe('CoordinatorFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockFeedbackResponse,
    });
  });

  it('renders loading state initially', () => {
    render(
      <CoordinatorFeedback
        responseId="resp-001"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders component title and description after loading', async () => {
    render(
      <CoordinatorFeedback
        responseId="resp-001"
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Coordinator Feedback')).toBeInTheDocument();
      expect(screen.getByText((content) => 
        content.includes('Response ID:') && content.includes('resp-001')
      )).toBeInTheDocument();
      expect(screen.getByText((content) => 
        content.includes('2') && content.includes('feedback item')
      )).toBeInTheDocument();
    });
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <CoordinatorFeedback
        responseId="resp-001"
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Coordinator Feedback')).toBeInTheDocument();
    });

    // Find the close button by its variant="ghost" and X icon
    const buttons = screen.getAllByTestId('button');
    const closeButton = buttons.find(button => 
      button.getAttribute('variant') === 'ghost' && 
      button.querySelector('[data-testid="x-icon"]')
    );
    if (closeButton) {
      await user.click(closeButton);
    }

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('displays feedback items with correct information', async () => {
    render(
      <CoordinatorFeedback
        responseId="resp-001"
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText('REJECTION')).toBeInTheDocument();
      expect(screen.getByText('CLARIFICATION REQUEST')).toBeInTheDocument();
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('NORMAL')).toBeInTheDocument();
    });
  });

  it('shows resolved badge for resolved feedback', async () => {
    render(
      <CoordinatorFeedback
        responseId="resp-001"
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      const resolvedElements = screen.getAllByText('Resolved');
      expect(resolvedElements.length).toBeGreaterThan(0);
    });
  });

  it('expands feedback details when clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <CoordinatorFeedback
        responseId="resp-001"
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });

    // Click on the first feedback item to expand it
    const feedbackItem = screen.getByText('John Smith').closest('button');
    if (feedbackItem) {
      await user.click(feedbackItem);

      await waitFor(() => {
        const fullCommentsElements = screen.getAllByText('Full Comments:');
        expect(fullCommentsElements.length).toBeGreaterThan(0);
        const commentElements = screen.getAllByText('The delivery evidence photos are too blurry to verify the actual items delivered.');
        expect(commentElements.length).toBeGreaterThan(0);
      });
    }
  });

  it('shows resubmission history when expanded', async () => {
    const user = userEvent.setup();
    
    render(
      <CoordinatorFeedback
        responseId="resp-001"
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Resubmission History (1)')).toBeInTheDocument();
    });

    const historyButton = screen.getByText('Resubmission History (1)');
    await user.click(historyButton);

    await waitFor(() => {
      expect(screen.getByText('Version 2')).toBeInTheDocument();
      expect(screen.getByText('Provided clearer photos and selection criteria.')).toBeInTheDocument();
      expect(screen.getByText('Data Changes:')).toBeInTheDocument();
      expect(screen.getByText('deliveryEvidence:')).toBeInTheDocument();
    });
  });

  it('handles empty feedback state', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          feedback: [],
          resubmissionHistory: []
        }
      }),
    });

    render(
      <CoordinatorFeedback
        responseId="resp-002"
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      const noFeedbackElements = screen.getAllByText((content, element) =>
        content.includes('No Feedback Available') || content.includes("This response hasn't received any coordinator feedback yet")
      );
      expect(noFeedbackElements.length).toBeGreaterThan(0);
    });
  });

  it('shows offline indicator when in offline mode', async () => {
    render(
      <CoordinatorFeedback
        responseId="resp-001"
        onClose={mockOnClose}
        isOffline={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Feedback data cached offline')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(
      <CoordinatorFeedback
        responseId="resp-001"
        onClose={mockOnClose}
      />
    );

    // Should still render with mock data fallback
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
  });

  it('displays feedback priority badges with correct variants', async () => {
    render(
      <CoordinatorFeedback
        responseId="resp-001"
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      const highPriorityBadges = screen.getAllByText('HIGH');
      const normalPriorityBadges = screen.getAllByText('NORMAL');
      
      expect(highPriorityBadges.length).toBeGreaterThan(0);
      expect(normalPriorityBadges.length).toBeGreaterThan(0);
      
      // Check that HIGH priority has destructive styling (red)
      expect(highPriorityBadges[0].closest('[data-testid="badge"][variant="destructive"]')).toBeTruthy();
    });
  });

  it('shows feedback type icons correctly', async () => {
    render(
      <CoordinatorFeedback
        responseId="resp-001"
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByTestId('alert-circle-icon')).toHaveLength(2); // One for rejection, one for attention
      expect(screen.getByTestId('message-square-icon')).toBeInTheDocument();
    });
  });

  it('sorts feedback by creation date (newest first)', async () => {
    render(
      <CoordinatorFeedback
        responseId="resp-001"
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      const feedbackItems = screen.getAllByText(/Smith|Johnson/);
      expect(feedbackItems[0]).toHaveTextContent('John Smith'); // Created on Jan 15 (newer)
      expect(feedbackItems[1]).toHaveTextContent('Sarah Johnson'); // Created on Jan 14 (older)
    });
  });

  it('shows data changes with proper formatting in resubmission history', async () => {
    const user = userEvent.setup();
    
    render(
      <CoordinatorFeedback
        responseId="resp-001"
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Resubmission History (1)')).toBeInTheDocument();
    });

    const historyButton = screen.getByText('Resubmission History (1)');
    await user.click(historyButton);

    await waitFor(() => {
      expect(screen.getByText('2 blurry photos')).toBeInTheDocument(); // Old value
      expect(screen.getByText('5 clear photos')).toBeInTheDocument(); // New value
    });
  });
});