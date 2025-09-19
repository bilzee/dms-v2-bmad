import { render, screen, waitFor } from '@testing-library/react';
import { TeamAssignmentPanel } from '@/components/features/coordinator/TeamAssignmentPanel';
import { useDashboardBadges } from '@/hooks/useDashboardBadges';

// Mock the hooks
jest.mock('@/hooks/useDashboardBadges');
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockUseDashboardBadges = useDashboardBadges as jest.MockedFunction<typeof useDashboardBadges>;

describe('TeamAssignmentPanel', () => {
  const mockBadgesData = {
    assessmentQueue: 15,
    responseQueue: 8,
    assessmentReviews: 5,
    incidentManagement: 2,
    activeIncidents: 2,
    totalLocations: 9,
    activeUsers: 8
  };

  beforeEach(() => {
    mockUseDashboardBadges.mockReturnValue({
      badges: mockBadgesData,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders team assignment panel with correct structure', () => {
    render(<TeamAssignmentPanel />);

    expect(screen.getByText(/Team Assignment/i)).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Assigned')).toBeInTheDocument();
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
  });

  it('displays loading state when fetching data', () => {
    mockUseDashboardBadges.mockReturnValue({
      badges: null,
      loading: true,
      error: null,
      refetch: jest.fn(),
    });

    render(<TeamAssignmentPanel />);

    expect(screen.getByText(/Loading team data.../)).toBeInTheDocument();
  });

  it('displays error state when API fails', () => {
    mockUseDashboardBadges.mockReturnValue({
      badges: null,
      loading: false,
      error: 'Failed to fetch team data',
      refetch: jest.fn(),
    });

    render(<TeamAssignmentPanel />);

    expect(screen.getByText('Error: Failed to fetch team data')).toBeInTheDocument();
  });

  it('displays team members with correct availability status', async () => {
    const mockTeamData = {
      success: true,
      data: {
        teamAssignments: [
          {
            userId: 'user1',
            name: 'John Doe',
            email: 'john@example.com',
            organization: 'Test Org',
            activeRole: 'Assessor',
            roles: ['Assessor'],
            availabilityStatus: 'available' as const,
            totalAssignments: 3,
            activeAssignments: 1,
            lastSync: new Date(),
            assignments: []
          },
          {
            userId: 'user2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            organization: 'Test Org',
            activeRole: 'Responder',
            roles: ['Responder'],
            availabilityStatus: 'assigned' as const,
            totalAssignments: 5,
            activeAssignments: 2,
            lastSync: new Date(),
            assignments: []
          },
          {
            userId: 'user3',
            name: 'Bob Johnson',
            email: 'bob@example.com',
            organization: 'Test Org',
            activeRole: 'Verifier',
            roles: ['Verifier'],
            availabilityStatus: 'unavailable' as const,
            totalAssignments: 2,
            activeAssignments: 0,
            lastSync: new Date(),
            assignments: []
          }
        ]
      }
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTeamData)
    });

    render(<TeamAssignmentPanel />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      
      // Check availability indicators
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('Assigned')).toBeInTheDocument();
      expect(screen.getByText('Unavailable')).toBeInTheDocument();
    });
  });

  it('filters team members by availability status', async () => {
    const mockTeamData = {
      success: true,
      data: {
        teamAssignments: [
          {
            userId: 'user1',
            name: 'John Doe',
            email: 'john@example.com',
            organization: 'Test Org',
            activeRole: 'Assessor',
            roles: ['Assessor'],
            availabilityStatus: 'available' as const,
            totalAssignments: 3,
            activeAssignments: 1,
            lastSync: new Date(),
            assignments: []
          },
          {
            userId: 'user2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            organization: 'Test Org',
            activeRole: 'Responder',
            roles: ['Responder'],
            availabilityStatus: 'assigned' as const,
            totalAssignments: 5,
            activeAssignments: 2,
            lastSync: new Date(),
            assignments: []
          }
        ]
      }
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTeamData)
    });

    render(<TeamAssignmentPanel />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Filter to show only available team members
    const availableTab = screen.getByText('Available');
    availableTab.click();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('displays workload progress bars correctly', async () => {
    const mockTeamData = {
      success: true,
      data: {
        teamAssignments: [
          {
            userId: 'user1',
            name: 'John Doe',
            email: 'john@example.com',
            organization: 'Test Org',
            activeRole: 'Assessor',
            roles: ['Assessor'],
            availabilityStatus: 'available' as const,
            totalAssignments: 8,
            activeAssignments: 3,
            lastSync: new Date(),
            assignments: []
          }
        ]
      }
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTeamData)
    });

    render(<TeamAssignmentPanel />);

    await waitFor(() => {
      // With maxLoad of 10, 8 assignments should show 80% workload
      expect(screen.getByText('8')).toBeInTheDocument(); // Total assignments
      expect(screen.getByText('3')).toBeInTheDocument(); // Active assignments
    });
  });

  it('shows user avatars and contact information', async () => {
    const mockTeamData = {
      success: true,
      data: {
        teamAssignments: [
          {
            userId: 'user1',
            name: 'John Doe',
            email: 'john@example.com',
            organization: 'Test Org',
            activeRole: 'Assessor',
            roles: ['Assessor'],
            availabilityStatus: 'available' as const,
            totalAssignments: 3,
            activeAssignments: 1,
            lastSync: new Date(),
            assignments: []
          }
        ]
      }
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTeamData)
    });

    render(<TeamAssignmentPanel />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Test Org')).toBeInTheDocument();
      expect(screen.getByText('Assessor')).toBeInTheDocument();
    });
  });

  it('displays assignment history when available', async () => {
    const mockTeamData = {
      success: true,
      data: {
        teamAssignments: [
          {
            userId: 'user1',
            name: 'John Doe',
            email: 'john@example.com',
            organization: 'Test Org',
            activeRole: 'Assessor',
            roles: ['Assessor'],
            availabilityStatus: 'available' as const,
            totalAssignments: 2,
            activeAssignments: 1,
            lastSync: new Date(),
            assignments: [
              {
                id: 'assignment1',
                type: 'assessment' as const,
                title: 'Health Assessment - Northern Ward 1',
                entityName: 'Northern Ward 1',
                scheduledDate: new Date(),
                status: 'COMPLETED'
              }
            ]
          }
        ]
      }
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTeamData)
    });

    render(<TeamAssignmentPanel />);

    await waitFor(() => {
      expect(screen.getByText('Health Assessment - Northern Ward 1')).toBeInTheDocument();
      expect(screen.getByText('Northern Ward 1')).toBeInTheDocument();
    });
  });

  it('calls refresh function when refresh button is clicked', async () => {
    const mockTeamData = {
      success: true,
      data: { teamAssignments: [] }
    };

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTeamData)
    });

    global.fetch = mockFetch;

    render(<TeamAssignmentPanel />);

    const refreshButton = screen.getByText('Refresh');
    refreshButton.click();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/coordinator/assignments')
    );
  });
});