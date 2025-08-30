import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup, within } from '@testing-library/react';
import { UserActivityMonitor } from '@/components/features/monitoring/UserActivityMonitor';

// Mock fetch globally
global.fetch = jest.fn();

// Suppress React DOM 16.8+ act warnings for component internal async operations
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (/Warning.*not wrapped in act/.test(args[0])) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

const mockUserActivityResponse = {
  success: true,
  data: {
    users: [
      {
        userId: 'user-1',
        userName: 'Sarah Johnson',
        role: 'ASSESSOR',
        sessionStart: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        lastActivity: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        actionsCount: 45,
        currentPage: '/assessments',
        isActive: true,
      },
      {
        userId: 'user-2',
        userName: 'Michael Chen',
        role: 'RESPONDER',
        sessionStart: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        lastActivity: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
        actionsCount: 78,
        currentPage: '/responses/plan',
        isActive: true,
      },
      {
        userId: 'user-3',
        userName: 'Emma Wilson',
        role: 'COORDINATOR',
        sessionStart: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20 minutes ago
        lastActivity: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
        actionsCount: 12,
        currentPage: '/donors',
        isActive: false,
      }
    ],
    stats: {
      totalActiveUsers: 2,
      totalSessions: 3,
      averageSessionDuration: 2.5,
      totalActions: 135,
      roleBreakdown: {
        ASSESSOR: 1,
        RESPONDER: 1,
        COORDINATOR: 1,
        DONOR: 0,
        ADMIN: 0,
      },
      topPages: [
        { page: '/assessments', users: 15, percentage: 30 },
        { page: '/responses/plan', users: 12, percentage: 24 },
        { page: '/verification/queue', users: 10, percentage: 20 },
      ],
    },
  },
  message: 'Retrieved 3 user activities',
  timestamp: new Date().toISOString(),
};

describe('UserActivityMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUserActivityResponse),
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    render(<UserActivityMonitor refreshInterval={1000} />);
    
    expect(screen.getByText('Loading user activity data...')).toBeInTheDocument();
    expect(screen.getByText('User Activity Monitor')).toBeInTheDocument();
  });

  it('displays user activity overview after loading', async () => {
    render(<UserActivityMonitor refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('User Activity Overview')).toBeInTheDocument();
    });

    expect(screen.getByText('2')).toBeInTheDocument(); // Active users
    expect(screen.getByText('3')).toBeInTheDocument(); // Total sessions
    expect(screen.getByText('2.5h')).toBeInTheDocument(); // Average session
    expect(screen.getByText('135')).toBeInTheDocument(); // Total actions
  });

  it('shows role breakdown correctly', async () => {
    render(<UserActivityMonitor refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('Role Breakdown')).toBeInTheDocument();
    });

    // Use getAllByText for multiple elements
    const assessorBadges = screen.getAllByText('ASSESSOR');
    expect(assessorBadges.length).toBeGreaterThan(0);
    
    const responderBadges = screen.getAllByText('RESPONDER');
    expect(responderBadges.length).toBeGreaterThan(0);
    
    const coordinatorBadges = screen.getAllByText('COORDINATOR');
    expect(coordinatorBadges.length).toBeGreaterThan(0);
  });

  it('displays top pages section', async () => {
    render(<UserActivityMonitor refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('Top Pages')).toBeInTheDocument();
    });

    expect(screen.getByText('/assessments')).toBeInTheDocument();
    expect(screen.getByText('/responses/plan')).toBeInTheDocument();
    expect(screen.getByText('30% of users')).toBeInTheDocument();
  });

  it('shows active user sessions', async () => {
    render(<UserActivityMonitor refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('Active User Sessions')).toBeInTheDocument();
    });

    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    expect(screen.getByText('Michael Chen')).toBeInTheDocument();
    expect(screen.getByText('45 actions')).toBeInTheDocument();
    expect(screen.getByText('78 actions')).toBeInTheDocument();
  });

  it('handles role filter changes', async () => {
    render(<UserActivityMonitor refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const roleFilter = screen.getByRole('combobox');
    fireEvent.click(roleFilter);

    await waitFor(() => {
      expect(screen.getByText('Assessor')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Assessor'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('role=ASSESSOR')
      );
    });
  });

  it('toggles inactive users visibility', async () => {
    render(<UserActivityMonitor refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('Show Inactive')).toBeInTheDocument();
    });

    const toggleButton = screen.getByText('Show Inactive');
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByText('Hide Inactive')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('includeInactive=true')
    );
  });

  it('displays correct activity status indicators', async () => {
    render(<UserActivityMonitor refreshInterval={1000} />);

    await waitFor(() => {
      const userSessions = screen.getAllByText(/Session:/);
      expect(userSessions.length).toBeGreaterThan(0);
    });

    // Check for session duration formatting
    expect(screen.getByText(/2h \d+m/)).toBeInTheDocument();
    expect(screen.getByText(/4h \d+m/)).toBeInTheDocument();
  });

  it('formats last activity time correctly', async () => {
    render(<UserActivityMonitor refreshInterval={1000} />);

    await waitFor(() => {
      const activityTimes = screen.getAllByText(/\d+m ago/);
      expect(activityTimes.length).toBeGreaterThan(0);
    });
  });

  it('handles empty user list', async () => {
    const emptyResponse = {
      ...mockUserActivityResponse,
      data: {
        ...mockUserActivityResponse.data,
        users: [],
        stats: {
          ...mockUserActivityResponse.data.stats,
          totalActiveUsers: 0,
          totalSessions: 0,
        },
      },
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(emptyResponse),
    });

    render(<UserActivityMonitor refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('No user sessions found')).toBeInTheDocument();
    });

    expect(screen.getByText('Users will appear here when they become active')).toBeInTheDocument();
  });

  it('displays user initials correctly', async () => {
    render(<UserActivityMonitor refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('SJ')).toBeInTheDocument(); // Sarah Johnson
      expect(screen.getByText('MC')).toBeInTheDocument(); // Michael Chen
    });
  });

  it('shows correct badge variants for different roles', async () => {
    render(<UserActivityMonitor refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('User Activity Overview')).toBeInTheDocument();
    });

    const assessorBadges = screen.getAllByText('ASSESSOR');
    const responderBadges = screen.getAllByText('RESPONDER');
    expect(assessorBadges.length).toBeGreaterThan(0);
    expect(responderBadges.length).toBeGreaterThan(0);
  });

  it('makes API call with correct parameters', async () => {
    render(<UserActivityMonitor refreshInterval={1000} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/v1/system/performance/users?includeInactive=false&timeRange=24h');
    });
  });

  it('handles API error gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    render(<UserActivityMonitor refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('No user sessions found')).toBeInTheDocument();
    });
  });

  it('limits displayed users based on maxDisplayUsers prop', async () => {
    render(<UserActivityMonitor refreshInterval={1000} maxDisplayUsers={2} />);

    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText('Michael Chen')).toBeInTheDocument();
    });

    // Should show truncation message if there are more users
    const moreUsersResponse = {
      ...mockUserActivityResponse,
      data: {
        ...mockUserActivityResponse.data,
        users: [
          ...mockUserActivityResponse.data.users,
          {
            userId: 'user-4',
            userName: 'John Doe',
            role: 'ADMIN',
            sessionStart: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            actionsCount: 10,
            currentPage: '/admin',
            isActive: true,
          }
        ],
      },
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(moreUsersResponse),
    });

    // Re-render with updated data
    render(<UserActivityMonitor refreshInterval={1000} maxDisplayUsers={2} />);

    await waitFor(() => {
      expect(screen.getByText(/Showing 2 of 4 users/)).toBeInTheDocument();
    });
  });
});