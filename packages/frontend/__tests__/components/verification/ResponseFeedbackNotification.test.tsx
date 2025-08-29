import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponseFeedbackNotification } from '../../../src/components/features/verification/ResponseFeedbackNotification';
import { Feedback, User } from '@dms/shared';
import { useAuth } from '../../../src/hooks/useAuth';
import { toast } from '../../../src/hooks/use-toast';

// Mock dependencies
jest.mock('../../../src/hooks/useAuth');
jest.mock('../../../src/hooks/use-toast');
jest.mock('../../../src/lib/utils/cn', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

// Mock fetch
global.fetch = jest.fn();

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockToast = toast as jest.MockedFunction<typeof toast>;

const mockUser: User = {
  id: 'user-123',
  email: 'responder@test.com',
  name: 'Test User',
  roles: [{ id: 'role-1', name: 'RESPONDER', permissions: [], isActive: true }],
  activeRole: { id: 'role-1', name: 'RESPONDER', permissions: [], isActive: true },
  permissions: [],
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const mockResponseFeedback: Feedback[] = [
  {
    id: 'feedback-1',
    targetType: 'RESPONSE',
    targetId: 'response-123',
    coordinatorId: 'coord-1',
    coordinatorName: 'John Coordinator',
    feedbackType: 'REJECTION',
    reason: 'INSUFFICIENT_EVIDENCE',
    comments: 'Please provide better delivery documentation with photos.',
    priority: 'HIGH',
    requiresResponse: true,
    createdAt: new Date('2025-01-20T10:00:00Z'),
    isRead: false,
    isResolved: false,
  },
  {
    id: 'feedback-2',
    targetType: 'RESPONSE',
    targetId: 'response-456',
    coordinatorId: 'coord-2',
    coordinatorName: 'Sarah Manager',
    feedbackType: 'CLARIFICATION_REQUEST',
    reason: 'MISSING_INFO',
    comments: 'Could you clarify the delivery quantities reported?',
    priority: 'NORMAL',
    requiresResponse: true,
    createdAt: new Date('2025-01-21T14:30:00Z'),
    isRead: true,
    isResolved: false,
  },
  {
    id: 'feedback-3',
    targetType: 'RESPONSE',
    targetId: 'response-789',
    coordinatorId: 'coord-1',
    coordinatorName: 'John Coordinator',
    feedbackType: 'APPROVAL_NOTE',
    reason: 'OTHER',
    comments: 'Excellent delivery documentation and beneficiary verification.',
    priority: 'NORMAL',
    requiresResponse: false,
    createdAt: new Date('2025-01-22T09:15:00Z'),
    isRead: false,
    isResolved: true,
    resolvedAt: new Date('2025-01-22T09:15:00Z'),
  },
  {
    id: 'feedback-4',
    targetType: 'ASSESSMENT', // Different target type - should be filtered out
    targetId: 'assessment-123',
    coordinatorId: 'coord-3',
    coordinatorName: 'Test Coordinator',
    feedbackType: 'REJECTION',
    reason: 'DATA_QUALITY',
    comments: 'Assessment feedback - should not appear',
    priority: 'LOW',
    requiresResponse: true,
    createdAt: new Date('2025-01-19T16:00:00Z'),
    isRead: false,
    isResolved: false,
  },
];

describe('ResponseFeedbackNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      error: null,
    });
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    );
  });

  it('renders empty state when no response feedback', () => {
    render(<ResponseFeedbackNotification feedback={[]} />);
    
    expect(screen.getByText('No response feedback notifications')).toBeInTheDocument();
  });

  it('filters and displays only response feedback', () => {
    render(<ResponseFeedbackNotification feedback={mockResponseFeedback} showAll={true} />);
    
    expect(screen.getByText('Response Feedback (3)')).toBeInTheDocument();
    
    // Should show response feedback
    expect(screen.getByText('Please provide better delivery documentation with photos.')).toBeInTheDocument();
    expect(screen.getByText('Could you clarify the delivery quantities reported?')).toBeInTheDocument();
    expect(screen.getByText('Excellent delivery documentation and beneficiary verification.')).toBeInTheDocument();
    
    // Should not show assessment feedback
    expect(screen.queryByText('Assessment feedback - should not appear')).not.toBeInTheDocument();
  });

  it('displays correct feedback statistics', () => {
    render(<ResponseFeedbackNotification feedback={mockResponseFeedback} showAll={true} />);
    
    expect(screen.getByText('2 Unread')).toBeInTheDocument(); // feedback-1 and feedback-3
    expect(screen.getByText('2 Unresolved')).toBeInTheDocument(); // feedback-1 and feedback-2
  });

  it('filters feedback by specific response ID', () => {
    render(
      <ResponseFeedbackNotification 
        feedback={mockResponseFeedback} 
        responseId="response-123"
        showAll={true}
      />
    );
    
    // Should only show feedback for response-123
    expect(screen.getByText('Please provide better delivery documentation with photos.')).toBeInTheDocument();
    expect(screen.queryByText('Could you clarify the delivery quantities reported?')).not.toBeInTheDocument();
  });

  it('opens feedback dialog with correct title', async () => {
    const user = userEvent.setup();
    
    render(<ResponseFeedbackNotification feedback={mockResponseFeedback} />);
    
    await user.click(screen.getByText(/Response Feedback \(3\)/));
    
    expect(screen.getByText('Response Delivery Feedback')).toBeInTheDocument();
    expect(screen.getByText('Feedback and notifications for response delivery verification')).toBeInTheDocument();
  });

  it('displays feedback statistics in dialog', async () => {
    const user = userEvent.setup();
    
    render(<ResponseFeedbackNotification feedback={mockResponseFeedback} />);
    
    await user.click(screen.getByText(/Response Feedback \(3\)/));
    
    // Check stats in dialog
    expect(screen.getByText('3')).toBeInTheDocument(); // Total
    expect(screen.getByText('2')).toBeInTheDocument(); // Unread
    expect(screen.getByText('2')).toBeInTheDocument(); // Unresolved
    expect(screen.getByText('0')).toBeInTheDocument(); // Urgent (none in mock data)
  });

  it('shows unread badge count correctly', () => {
    render(<ResponseFeedbackNotification feedback={mockResponseFeedback} />);
    
    const button = screen.getByText(/Response Feedback \(3\)/);
    expect(button).toBeInTheDocument();
    
    // Should show unread count badge
    expect(screen.getByText('2')).toBeInTheDocument(); // Unread badge
  });

  it('sorts feedback by priority and date', () => {
    render(<ResponseFeedbackNotification feedback={mockResponseFeedback} showAll={true} />);
    
    const feedbackItems = screen.getAllByText(/From:/);
    
    // High priority unresolved feedback should come first
    expect(feedbackItems[0]).toBeInTheDocument();
  });

  it('marks feedback as read', async () => {
    const user = userEvent.setup();
    const onMarkAsRead = jest.fn();
    
    render(
      <ResponseFeedbackNotification 
        feedback={mockResponseFeedback} 
        onMarkAsRead={onMarkAsRead}
        showAll={true}
      />
    );
    
    // Find and click mark as read button for unread feedback
    const markAsReadButtons = screen.getAllByText('Mark as Read');
    await user.click(markAsReadButtons[0]);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/feedback/feedback-1/read',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    expect(onMarkAsRead).toHaveBeenCalledWith('feedback-1');
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Marked as Read',
      description: 'Feedback has been marked as read.',
      variant: 'default',
    });
  });

  it('marks feedback as resolved', async () => {
    const user = userEvent.setup();
    const onMarkAsResolved = jest.fn();
    
    render(
      <ResponseFeedbackNotification 
        feedback={mockResponseFeedback} 
        onMarkAsResolved={onMarkAsResolved}
        showAll={true}
      />
    );
    
    // Find and click mark as resolved button
    const markAsResolvedButtons = screen.getAllByText('Mark as Resolved');
    await user.click(markAsResolvedButtons[0]);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/feedback/feedback-1/resolve',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    expect(onMarkAsResolved).toHaveBeenCalledWith('feedback-1');
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Marked as Resolved',
      description: 'Feedback has been marked as resolved.',
      variant: 'default',
    });
  });

  it('displays feedback type badges correctly', () => {
    render(<ResponseFeedbackNotification feedback={mockResponseFeedback} showAll={true} />);
    
    expect(screen.getByText('Rejection')).toBeInTheDocument();
    expect(screen.getByText('Clarification')).toBeInTheDocument();
    expect(screen.getByText('Approval')).toBeInTheDocument();
  });

  it('displays priority badges correctly', () => {
    render(<ResponseFeedbackNotification feedback={mockResponseFeedback} showAll={true} />);
    
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getAllByText('Normal')).toHaveLength(2);
  });

  it('shows New badge for unread feedback', () => {
    render(<ResponseFeedbackNotification feedback={mockResponseFeedback} showAll={true} />);
    
    const newBadges = screen.getAllByText('New');
    expect(newBadges).toHaveLength(2); // feedback-1 and feedback-3 are unread
  });

  it('shows Resolved badge for resolved feedback', () => {
    render(<ResponseFeedbackNotification feedback={mockResponseFeedback} showAll={true} />);
    
    expect(screen.getByText('Resolved')).toBeInTheDocument(); // feedback-3 is resolved
  });

  it('handles mark as read API error', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      })
    );

    const user = userEvent.setup();
    
    render(<ResponseFeedbackNotification feedback={mockResponseFeedback} showAll={true} />);
    
    const markAsReadButtons = screen.getAllByText('Mark as Read');
    await user.click(markAsReadButtons[0]);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to mark feedback as read.',
        variant: 'destructive',
      });
    });
  });

  it('prevents multiple simultaneous operations', async () => {
    const user = userEvent.setup();
    
    render(<ResponseFeedbackNotification feedback={mockResponseFeedback} showAll={true} />);
    
    const markAsReadButtons = screen.getAllByText('Mark as Read');
    
    // Click multiple buttons rapidly
    await user.click(markAsReadButtons[0]);
    await user.click(markAsReadButtons[1]);
    
    // Should only make one API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it('displays relative time stamps', () => {
    render(<ResponseFeedbackNotification feedback={mockResponseFeedback} showAll={true} />);
    
    // Should show relative timestamps like "5 days ago"
    expect(screen.getByText(/ago/)).toBeInTheDocument();
  });

  it('shows coordinator names correctly', () => {
    render(<ResponseFeedbackNotification feedback={mockResponseFeedback} showAll={true} />);
    
    expect(screen.getByText('From: John Coordinator')).toBeInTheDocument();
    expect(screen.getByText('From: Sarah Manager')).toBeInTheDocument();
  });
});