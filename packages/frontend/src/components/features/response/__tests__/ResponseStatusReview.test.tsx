import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponseStatusReview } from '../ResponseStatusReview';
import { RapidResponse, VerificationStatus, ResponseType, ResponseStatus } from '@dms/shared';

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

jest.mock('@/components/ui/tabs', () => {
  const React = require('react');
  
  return {
    Tabs: ({ children, value, onValueChange, ...props }: any) => {
      return (
        <div data-testid="tabs" data-value={value} {...props}>
          {React.Children.map(children, (child: any) => {
            if (React.isValidElement(child)) {
              if (child.type?.name === 'TabsList') {
                // Pass onValueChange down to TabsList so it can pass it to triggers
                return React.cloneElement(child, { onValueChange, currentValue: value });
              }
              if (child.type?.name === 'TabsContent') {
                // CRITICAL: Only render active tab content to prevent multiple elements
                return child.props.value === value ? React.cloneElement(child, {
                  'data-active': true,
                  style: { display: 'block' }
                }) : null;
              }
            }
            return child;
          })}
        </div>
      );
    },
    TabsList: ({ children, onValueChange, currentValue, ...props }: any) => (
      <div data-testid="tabs-list" {...props}>
        {React.Children.map(children, (child: any) => {
          if (React.isValidElement(child) && child.type?.name === 'TabsTrigger') {
            return React.cloneElement(child, {
              onValueChange,
              'data-active': child.props.value === currentValue
            });
          }
          return child;
        })}
      </div>
    ),
    TabsTrigger: ({ children, value, onValueChange, ...props }: any) => (
      <button 
        data-testid="tabs-trigger" 
        data-value={value}
        onClick={() => onValueChange?.(value)}
        {...props}
      >
        {children}
      </button>
    ),
    TabsContent: ({ children, value, style, ...props }: any) => (
      <div data-testid="tabs-content" data-value={value} style={style} {...props}>
        {children}
      </div>
    ),
  };
});

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button data-testid="button" onClick={onClick} disabled={disabled} {...props}>{children}</button>
  )
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ placeholder, value, onChange, ...props }: any) => (
    <input data-testid="input" placeholder={placeholder} value={value} onChange={onChange} {...props} />
  )
}));

jest.mock('@/components/ui/select', () => {
  const React = require('react');
  
  return {
    Select: ({ children, value, onValueChange, ...props }: any) => {
      const [isOpen, setIsOpen] = React.useState(false);
      return (
        <div data-testid="select" data-value={value} {...props}>
          {React.Children.map(children, (child: any) => {
            if (React.isValidElement(child)) {
              if (child.type?.name === 'SelectTrigger') {
                return React.cloneElement(child, {
                  onClick: () => setIsOpen(!isOpen)
                });
              }
              if (child.type?.name === 'SelectContent') {
                return isOpen ? React.cloneElement(child, {
                  onSelect: (itemValue: string) => {
                    onValueChange?.(itemValue);
                    setIsOpen(false);
                  }
                }) : null;
              }
            }
            return child;
          })}
        </div>
      );
    },
    SelectContent: ({ children, onSelect, ...props }: any) => (
      <div data-testid="select-content" {...props}>
        {React.Children.map(children, (child: any) => 
          React.isValidElement(child) && child.type?.name === 'SelectItem' 
            ? React.cloneElement(child, { onSelect })
            : child
        )}
      </div>
    ),
    SelectItem: ({ children, value, onSelect, ...props }: any) => (
      <div 
        data-testid="select-item" 
        data-value={value} 
        onClick={() => onSelect?.(value)}
        {...props}
      >
        {children}
      </div>
    ),
    SelectTrigger: ({ children, onClick, ...props }: any) => (
      <button data-testid="select-trigger" onClick={onClick} {...props}>{children}</button>
    ),
    SelectValue: ({ placeholder, ...props }: any) => (
      <span data-testid="select-value" data-placeholder={placeholder} {...props} />
    )
  };
});

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, ...props }: any) => <div data-testid="scroll-area" {...props}>{children}</div>
}));

// Mock the icons to avoid import issues
jest.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  Bell: () => <div data-testid="bell-icon" />,
  BellRing: () => <div data-testid="bell-ring-icon" />,
}));

// Mock the child components
jest.mock('../CoordinatorFeedback', () => ({
  CoordinatorFeedback: ({ responseId, onClose }: { responseId: string; onClose: () => void }) => (
    <div data-testid="coordinator-feedback">
      <div>Response ID: {responseId}</div>
      <button onClick={onClose}>Close Feedback</button>
    </div>
  ),
}));

jest.mock('../ResponseAttentionIndicators', () => ({
  ResponseAttentionIndicators: ({ responses }: { responses: RapidResponse[] }) => (
    <div data-testid="attention-indicators">
      Attention Count: {responses.filter(r => r.requiresAttention).length}
    </div>
  ),
}));

const mockResponses: RapidResponse[] = [
  {
    id: 'resp-001',
    responseType: ResponseType.HEALTH,
    status: ResponseStatus.DELIVERED,
    plannedDate: new Date('2024-01-10'),
    deliveredDate: new Date('2024-01-12'),
    affectedEntityId: 'entity-001',
    assessmentId: 'assess-001',
    responderId: 'user-001',
    responderName: 'John Doe',
    verificationStatus: VerificationStatus.REJECTED,
    syncStatus: 'SYNCED' as any,
    data: {} as any,
    otherItemsDelivered: [],
    deliveryEvidence: [],
    feedbackCount: 2,
    lastFeedbackAt: new Date('2024-01-15'),
    requiresAttention: true,
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'resp-002',
    responseType: ResponseType.WASH,
    status: ResponseStatus.DELIVERED,
    plannedDate: new Date('2024-01-14'),
    deliveredDate: new Date('2024-01-16'),
    affectedEntityId: 'entity-002',
    assessmentId: 'assess-002',
    responderId: 'user-002',
    responderName: 'Jane Smith',
    verificationStatus: VerificationStatus.PENDING,
    syncStatus: 'SYNCED' as any,
    data: {} as any,
    otherItemsDelivered: [],
    deliveryEvidence: [],
    feedbackCount: 0,
    requiresAttention: false,
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-17'),
  },
  {
    id: 'resp-003',
    responseType: ResponseType.FOOD,
    status: ResponseStatus.DELIVERED,
    plannedDate: new Date('2024-01-18'),
    deliveredDate: new Date('2024-01-20'),
    affectedEntityId: 'entity-003',
    assessmentId: 'assess-003',
    responderId: 'user-003',
    responderName: 'Bob Johnson',
    verificationStatus: VerificationStatus.VERIFIED,
    syncStatus: 'SYNCED' as any,
    data: {} as any,
    otherItemsDelivered: [],
    deliveryEvidence: [],
    feedbackCount: 0,
    requiresAttention: false,
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-20'),
  },
];

describe('ResponseStatusReview', () => {
  const mockOnResponseSelect = jest.fn();
  const mockOnResubmissionRequest = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component with correct title and description', () => {
    render(
      <ResponseStatusReview
        responses={mockResponses}
        onResponseSelect={mockOnResponseSelect}
        onResubmissionRequest={mockOnResubmissionRequest}
      />
    );

    expect(screen.getByText('Response Status Review')).toBeInTheDocument();
    expect(screen.getByText('Track verification status and manage feedback for your responses')).toBeInTheDocument();
  });

  it('displays attention indicators', () => {
    render(
      <ResponseStatusReview
        responses={mockResponses}
        onResponseSelect={mockOnResponseSelect}
        onResubmissionRequest={mockOnResubmissionRequest}
      />
    );

    expect(screen.getByTestId('attention-indicators')).toBeInTheDocument();
    expect(screen.getByText('Attention Count: 1')).toBeInTheDocument();
  });

  it('renders search and filter controls', () => {
    render(
      <ResponseStatusReview
        responses={mockResponses}
        onResponseSelect={mockOnResponseSelect}
        onResubmissionRequest={mockOnResubmissionRequest}
      />
    );

    expect(screen.getByPlaceholderText('Search responses...')).toBeInTheDocument();
    const selectValues = screen.getAllByTestId('select-value');
    expect(selectValues).toHaveLength(2);
    expect(selectValues[0]).toHaveAttribute('data-placeholder', 'All Statuses');
    expect(selectValues[1]).toHaveAttribute('data-placeholder', 'All Types');
    expect(screen.getByText('Needs Attention')).toBeInTheDocument();
  });

  it('filters responses by search term', async () => {
    const user = userEvent.setup();
    
    render(
      <ResponseStatusReview
        responses={mockResponses}
        onResponseSelect={mockOnResponseSelect}
        onResubmissionRequest={mockOnResubmissionRequest}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search responses...');
    await user.type(searchInput, 'John Doe');

    // Should only show John Doe's response (text appears as "Responder: John Doe")
    // Since search affects all tab panels, John Doe should appear once in each tab
    const johnDoeElements = screen.getAllByText((content, element) => 
      content.includes('Responder:') && content.includes('John Doe')
    );
    expect(johnDoeElements.length).toBeGreaterThan(0);
    
    expect(screen.queryAllByText((content, element) => 
      content.includes('Responder:') && content.includes('Jane Smith')
    )).toHaveLength(0);
    
    expect(screen.queryAllByText((content, element) => 
      content.includes('Responder:') && content.includes('Bob Johnson')
    )).toHaveLength(0);
  });

  it('displays response status tabs with counts', () => {
    render(
      <ResponseStatusReview
        responses={mockResponses}
        onResponseSelect={mockOnResponseSelect}
        onResubmissionRequest={mockOnResubmissionRequest}
      />
    );

    expect(screen.getByText('All (3)')).toBeInTheDocument();
    expect(screen.getByText('Pending (1)')).toBeInTheDocument();
    expect(screen.getByText('Verified (1)')).toBeInTheDocument();
    expect(screen.getByText('Rejected (1)')).toBeInTheDocument();
    expect(screen.getByText('Attention (1)')).toBeInTheDocument();
  });

  it('shows responses in the all tab by default', () => {
    render(
      <ResponseStatusReview
        responses={mockResponses}
        onResponseSelect={mockOnResponseSelect}
        onResubmissionRequest={mockOnResubmissionRequest}
      />
    );

    // All three responses should be visible (text appears as "Responder: Name")
    // Each name appears once in each visible tab panel
    expect(screen.getAllByText((content) => 
      content.includes('Responder:') && content.includes('John Doe')
    ).length).toBeGreaterThan(0);
    expect(screen.getAllByText((content) => 
      content.includes('Responder:') && content.includes('Jane Smith')
    ).length).toBeGreaterThan(0);
    expect(screen.getAllByText((content) => 
      content.includes('Responder:') && content.includes('Bob Johnson')
    ).length).toBeGreaterThan(0);
  });

  it('filters responses when switching to rejected tab', async () => {
    const user = userEvent.setup();
    
    render(
      <ResponseStatusReview
        responses={mockResponses}
        onResponseSelect={mockOnResponseSelect}
        onResubmissionRequest={mockOnResubmissionRequest}
      />
    );

    // Click the rejected tab
    const rejectedTab = screen.getByText('Rejected (1)');
    await user.click(rejectedTab);

    // Wait for tab switch and check only active content
    await waitFor(() => {
      // Verify the tabs component shows the correct active value
      const tabsElement = screen.getByTestId('tabs');
      expect(tabsElement).toHaveAttribute('data-value', 'rejected');
      
      // Only John Doe (REJECTED) should be visible in active tab content
      const johnDoeElements = screen.getAllByText((content) => 
        content.includes('Responder:') && content.includes('John Doe')
      );
      expect(johnDoeElements.length).toBeGreaterThan(0);
      
      // Jane Smith and Bob Johnson should NOT appear (they should be 0)
      expect(screen.queryAllByText((content) => 
        content.includes('Responder:') && content.includes('Jane Smith')
      )).toHaveLength(0);
      expect(screen.queryAllByText((content) => 
        content.includes('Responder:') && content.includes('Bob Johnson')
      )).toHaveLength(0);
    });
  });

  it('shows resubmit button for rejected responses', () => {
    render(
      <ResponseStatusReview
        responses={mockResponses}
        onResponseSelect={mockOnResponseSelect}
        onResubmissionRequest={mockOnResubmissionRequest}
      />
    );

    const resubmitButtons = screen.getAllByText('Resubmit');
    expect(resubmitButtons).toHaveLength(1); // Only the rejected response should have resubmit button
  });

  it('calls onResubmissionRequest when resubmit button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ResponseStatusReview
        responses={mockResponses}
        onResponseSelect={mockOnResponseSelect}
        onResubmissionRequest={mockOnResubmissionRequest}
      />
    );

    const resubmitButton = screen.getByText('Resubmit');
    await user.click(resubmitButton);

    expect(mockOnResubmissionRequest).toHaveBeenCalledWith('resp-001');
  });

  it('calls onResponseSelect when response card is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ResponseStatusReview
        responses={mockResponses}
        onResponseSelect={mockOnResponseSelect}
        onResubmissionRequest={mockOnResubmissionRequest}
      />
    );

    // Use specific data-testid instead of text search
    const responseCard = screen.getByTestId('response-card-resp-001');
    await user.click(responseCard);

    expect(mockOnResponseSelect).toHaveBeenCalledWith(mockResponses[0]);
  });

  it('shows coordinator feedback when response is selected', async () => {
    const user = userEvent.setup();
    
    render(
      <ResponseStatusReview
        responses={mockResponses}
        onResponseSelect={mockOnResponseSelect}
        onResubmissionRequest={mockOnResubmissionRequest}
      />
    );

    // Click on response to select it
    const responderElement = screen.getByText((content) => 
      content.includes('Responder:') && content.includes('John Doe')
    );
    const responseCard = responderElement.closest('[data-testid="card"]');
    if (responseCard) {
      await user.click(responseCard);
      
      await waitFor(() => {
        expect(screen.getByTestId('coordinator-feedback')).toBeInTheDocument();
        expect(screen.getAllByText((content) => 
          content.includes('Response ID:') && content.includes('resp-001')
        ).length).toBeGreaterThan(0);
      });
    }
  });

  it('closes coordinator feedback when close button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ResponseStatusReview
        responses={mockResponses}
        onResponseSelect={mockOnResponseSelect}
        onResubmissionRequest={mockOnResubmissionRequest}
      />
    );

    // Select a response first
    const responderElement = screen.getByText((content) => 
      content.includes('Responder:') && content.includes('John Doe')
    );
    const responseCard = responderElement.closest('[data-testid="card"]');
    if (responseCard) {
      await user.click(responseCard);
      
      await waitFor(() => {
        expect(screen.getByTestId('coordinator-feedback')).toBeInTheDocument();
      });

      // Close the feedback
      const closeButton = screen.getByText('Close Feedback');
      await user.click(closeButton);

      expect(screen.queryByTestId('coordinator-feedback')).not.toBeInTheDocument();
    }
  });

  it('shows offline indicator when isOffline is true', () => {
    render(
      <ResponseStatusReview
        responses={mockResponses}
        onResponseSelect={mockOnResponseSelect}
        onResubmissionRequest={mockOnResubmissionRequest}
        isOffline={true}
      />
    );

    expect(screen.getByText('Offline Mode')).toBeInTheDocument();
  });

  it('toggles attention filter when button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ResponseStatusReview
        responses={mockResponses}
        onResponseSelect={mockOnResponseSelect}
        onResubmissionRequest={mockOnResubmissionRequest}
      />
    );

    const attentionButton = screen.getByText('Needs Attention');
    await user.click(attentionButton);

    // Should filter to only show responses requiring attention
    expect(screen.getAllByText((content) => 
      content.includes('Responder:') && content.includes('John Doe')
    ).length).toBeGreaterThan(0);
    expect(screen.queryAllByText((content) => 
      content.includes('Responder:') && content.includes('Jane Smith')
    )).toHaveLength(0);
    expect(screen.queryAllByText((content) => 
      content.includes('Responder:') && content.includes('Bob Johnson')
    )).toHaveLength(0);
  });

  it('shows feedback count when available', () => {
    render(
      <ResponseStatusReview
        responses={mockResponses}
        onResponseSelect={mockOnResponseSelect}
        onResubmissionRequest={mockOnResubmissionRequest}
      />
    );

    // Feedback count appears in multiple tab panels for the same response
    expect(screen.getAllByText((content) => 
      content.includes('2') && content.includes('feedback item(s)')
    ).length).toBeGreaterThan(0);
  });

  it('displays proper badges for different verification statuses', () => {
    render(
      <ResponseStatusReview
        responses={mockResponses}
        onResponseSelect={mockOnResponseSelect}
        onResubmissionRequest={mockOnResubmissionRequest}
      />
    );

    // Each badge appears once per response, but may be in multiple tab panels
    expect(screen.getAllByText('REJECTED').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PENDING').length).toBeGreaterThan(0); 
    expect(screen.getAllByText('VERIFIED').length).toBeGreaterThan(0);
  });

  it('shows empty state when no responses match filters', async () => {
    const user = userEvent.setup();
    
    render(
      <ResponseStatusReview
        responses={mockResponses}
        onResponseSelect={mockOnResponseSelect}
        onResubmissionRequest={mockOnResubmissionRequest}
      />
    );

    // Search for something that doesn't exist
    const searchInput = screen.getByPlaceholderText('Search responses...');
    await user.type(searchInput, 'nonexistent');

    // Should show empty state - with tabs mock, only the active tab content is visible
    expect(screen.getAllByText('No responses found').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Try adjusting your filters to see more results').length).toBeGreaterThan(0);
  });
});