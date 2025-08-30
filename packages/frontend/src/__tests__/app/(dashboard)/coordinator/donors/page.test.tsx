import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { jest } from '@jest/globals';
import DonorCoordinationPage from '@/app/(dashboard)/coordinator/donors/page';

// Mock the hooks and components
jest.mock('@/hooks/useDonorCoordination', () => ({
  useDonorCoordination: () => ({
    donors: [
      {
        id: '1',
        name: 'ActionAid Nigeria',
        organization: 'ActionAid Nigeria',
        email: 'coordinator@actionaid.org.ng',
        phone: '+234-812-345-6789',
        performanceScore: 95,
        commitments: [
          {
            id: 'c1',
            donorId: '1',
            responseType: 'FOOD',
            quantity: 500,
            unit: 'kg',
            targetDate: new Date('2024-09-15'),
            status: 'PLANNED',
            createdAt: new Date('2024-08-20'),
            updatedAt: new Date('2024-08-20'),
          }
        ],
        achievements: [],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-08-20'),
      }
    ],
    resourceAvailability: {
      resources: [
        {
          responseType: 'FOOD',
          totalCommitted: 1200,
          totalAllocated: 800,
          totalAvailable: 400,
          unit: 'kg',
          commitments: [],
          allocations: [],
          projectedShortfall: 0,
          earliestAvailable: new Date('2024-09-12'),
          lastUpdated: new Date('2024-08-25'),
        }
      ],
      summary: {
        totalResourceTypes: 4,
        resourcesWithShortfalls: 2,
        resourcesFullyAllocated: 1,
        totalCommitments: 5,
        totalAllocations: 3,
        criticalShortfalls: [
          {
            responseType: 'WASH',
            shortfall: 100,
            unit: 'units',
            percentage: 20
          }
        ],
        upcomingDeadlines: [
          {
            responseType: 'FOOD',
            affectedEntityName: 'Maiduguri IDP Camp',
            quantity: 300,
            unit: 'kg',
            targetDate: new Date('2024-09-10'),
            priority: 'HIGH',
            daysUntilDeadline: 2
          }
        ]
      }
    },
    coordinationWorkspace: [
      {
        id: 'ws-1',
        type: 'RESOURCE_ALLOCATION',
        title: 'Food allocation for Maiduguri IDP Camp',
        description: 'Coordinate 500kg rice delivery from ActionAid Nigeria',
        priority: 'HIGH',
        status: 'PENDING',
        assignedTo: 'current-coordinator',
        assignedToName: 'Current Coordinator',
        donorId: '1',
        donorName: 'ActionAid Nigeria',
        affectedEntityId: 'entity-1',
        affectedEntityName: 'Maiduguri IDP Camp',
        responseType: 'FOOD',
        quantity: 500,
        unit: 'kg',
        dueDate: new Date('2024-09-15'),
        createdAt: new Date('2024-08-25'),
        updatedAt: new Date('2024-08-25'),
        actions: [
          {
            id: 'action-1',
            type: 'CONFIRM_WITH_DONOR',
            description: 'Confirm availability and delivery schedule',
            completed: false,
            dueDate: new Date('2024-09-01'),
          }
        ]
      }
    ],
    stats: {
      totalDonors: 5,
      activeDonors: 3,
      totalCommitments: 6,
      pendingCommitments: 4,
      byResourceType: {
        FOOD: 2,
        WASH: 2,
        HEALTH: 1,
        SHELTER: 1,
        SECURITY: 0,
        POPULATION: 0,
      }
    },
    loading: false,
    error: null,
    refreshData: jest.fn(),
    updateDonor: jest.fn(),
    createAllocation: jest.fn(),
    resolveConflict: jest.fn(),
  })
}));

// Mock the components with simple implementations
jest.mock('@/components/features/donors/DonorList', () => ({
  DonorList: ({ donors, onUpdateDonor, onRefresh }: any) => (
    <div data-testid="donor-list">
      <h3>Donor List ({donors.length} donors)</h3>
      {donors.map((donor: any) => (
        <div key={donor.id} data-testid={`donor-${donor.id}`}>
          {donor.name} - {donor.performanceScore}%
        </div>
      ))}
    </div>
  )
}));

jest.mock('@/components/features/donors/ResourceAvailabilityGrid', () => ({
  ResourceAvailabilityGrid: ({ resourceAvailability, onCreateAllocation, onRefresh }: any) => (
    <div data-testid="resource-availability-grid">
      <h3>Resource Availability</h3>
      <div>Total Resource Types: {resourceAvailability?.summary?.totalResourceTypes || 0}</div>
      <div>Critical Shortfalls: {resourceAvailability?.summary?.criticalShortfalls?.length || 0}</div>
    </div>
  )
}));

jest.mock('@/components/features/donors/CoordinationWorkspace', () => ({
  CoordinationWorkspace: ({ workspaceItems, onResolveConflict, onRefresh }: any) => (
    <div data-testid="coordination-workspace">
      <h3>Coordination Workspace</h3>
      <div>Active Items: {workspaceItems.filter((item: any) => item.status === 'PENDING' || item.status === 'IN_PROGRESS').length}</div>
      {workspaceItems.map((item: any) => (
        <div key={item.id} data-testid={`workspace-item-${item.id}`}>
          {item.title} - {item.status}
        </div>
      ))}
    </div>
  )
}));

jest.mock('@/components/features/donors/DonorPerformanceChart', () => ({
  DonorPerformanceChart: ({ donors }: any) => (
    <div data-testid="donor-performance-chart">
      <h3>Donor Performance Chart</h3>
      <div>Average Performance: {donors.length > 0 ? Math.round(donors.reduce((sum: number, d: any) => sum + d.performanceScore, 0) / donors.length) : 0}%</div>
    </div>
  )
}));

describe('DonorCoordinationPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the donor coordination dashboard with all main sections', async () => {
    render(<DonorCoordinationPage />);
    
    // Check main title
    expect(screen.getByText('Donor Coordination')).toBeInTheDocument();
    expect(screen.getByText('Manage donor relationships and coordinate resource allocation')).toBeInTheDocument();
    
    // Check stats cards
    expect(screen.getByText('5')).toBeInTheDocument(); // Total Donors
    expect(screen.getByText('4')).toBeInTheDocument(); // Pending Commitments
    expect(screen.getByText('2')).toBeInTheDocument(); // Critical Shortfalls
    expect(screen.getByText('1')).toBeInTheDocument(); // Pending Actions
    
    // Check that tabs are present
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Donors')).toBeInTheDocument();
    expect(screen.getByText('Resources')).toBeInTheDocument();
    expect(screen.getByText('Coordination')).toBeInTheDocument();
  });

  it('displays critical alerts section when there are shortfalls and deadlines', async () => {
    render(<DonorCoordinationPage />);
    
    // Check for critical shortfalls alert
    expect(screen.getByText('Critical Resource Shortfalls')).toBeInTheDocument();
    expect(screen.getByText('WASH')).toBeInTheDocument();
    expect(screen.getByText('100 units needed (20% short)')).toBeInTheDocument();
    
    // Check for upcoming deadlines alert
    expect(screen.getByText('Upcoming Deadlines')).toBeInTheDocument();
    expect(screen.getByText('Maiduguri IDP Camp')).toBeInTheDocument();
    expect(screen.getByText('300 kg food')).toBeInTheDocument();
  });

  it('switches between tabs correctly', async () => {
    render(<DonorCoordinationPage />);
    
    // Initially should show overview with performance chart
    expect(screen.getByTestId('donor-performance-chart')).toBeInTheDocument();
    
    // Click on Donors tab
    fireEvent.click(screen.getByText('Donors'));
    await waitFor(() => {
      expect(screen.getByTestId('donor-list')).toBeInTheDocument();
      expect(screen.getByText('Donor List (1 donors)')).toBeInTheDocument();
    });
    
    // Click on Resources tab
    fireEvent.click(screen.getByText('Resources'));
    await waitFor(() => {
      expect(screen.getByTestId('resource-availability-grid')).toBeInTheDocument();
      expect(screen.getByText('Total Resource Types: 4')).toBeInTheDocument();
    });
    
    // Click on Coordination tab
    fireEvent.click(screen.getByText('Coordination'));
    await waitFor(() => {
      expect(screen.getByTestId('coordination-workspace')).toBeInTheDocument();
      expect(screen.getByText('Active Items: 1')).toBeInTheDocument();
    });
  });

  it('displays resource distribution chart in overview', async () => {
    render(<DonorCoordinationPage />);
    
    // Check that resource distribution is shown
    expect(screen.getByText('Resource Distribution')).toBeInTheDocument();
    expect(screen.getByText('Breakdown of committed resources by type')).toBeInTheDocument();
    
    // Check for individual resource types
    expect(screen.getByText('FOOD')).toBeInTheDocument();
    expect(screen.getByText('WASH')).toBeInTheDocument();
    expect(screen.getByText('HEALTH')).toBeInTheDocument();
    expect(screen.getByText('SHELTER')).toBeInTheDocument();
  });

  it('shows refresh button and last updated time', async () => {
    render(<DonorCoordinationPage />);
    
    // Check for refresh button
    const refreshButtons = screen.getAllByText('Refresh');
    expect(refreshButtons.length).toBeGreaterThan(0);
    
    // Check for last updated time
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it('shows add donor button in header', async () => {
    render(<DonorCoordinationPage />);
    
    expect(screen.getByText('Add Donor')).toBeInTheDocument();
  });

  it('displays individual donor information correctly', async () => {
    render(<DonorCoordinationPage />);
    
    // Switch to Donors tab
    fireEvent.click(screen.getByText('Donors'));
    
    await waitFor(() => {
      expect(screen.getByTestId('donor-1')).toBeInTheDocument();
      expect(screen.getByText('ActionAid Nigeria - 95%')).toBeInTheDocument();
    });
  });

  it('displays workspace items correctly', async () => {
    render(<DonorCoordinationPage />);
    
    // Switch to Coordination tab
    fireEvent.click(screen.getByText('Coordination'));
    
    await waitFor(() => {
      expect(screen.getByTestId('workspace-item-ws-1')).toBeInTheDocument();
      expect(screen.getByText('Food allocation for Maiduguri IDP Camp - PENDING')).toBeInTheDocument();
    });
  });
});