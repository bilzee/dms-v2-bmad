import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { DetailedAssessmentView } from '@/components/features/monitoring/DetailedAssessmentView';

global.fetch = jest.fn();

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

const mockAssessmentResponse = {
  success: true,
  data: [
    {
      id: 'ASS-001',
      type: 'SHELTER',
      date: '2025-08-31T10:00:00Z',
      assessorName: 'John Smith',
      verificationStatus: 'VERIFIED',
      entityName: 'Camp Alpha',
      entityType: 'CAMP',
      coordinates: { latitude: 12.3456, longitude: 14.7890 },
      incidentName: 'Flood Response 2025',
      dataDetails: {
        shelterCount: 15,
        shelterCondition: 'GOOD',
        occupancyRate: 85
      },
      mediaCount: 3,
      syncStatus: 'SYNCED'
    },
    {
      id: 'ASS-002',
      type: 'HEALTHCARE',
      date: '2025-08-31T11:00:00Z',
      assessorName: 'Dr. Jane Doe',
      verificationStatus: 'PENDING',
      entityName: 'Community Beta',
      entityType: 'COMMUNITY',
      coordinates: { latitude: 12.1234, longitude: 14.5678 },
      dataDetails: {
        facilitiesOperational: 2,
        staffPresent: 8,
        medicalSupplies: 'ADEQUATE'
      },
      mediaCount: 5,
      syncStatus: 'SYNCING'
    }
  ],
  meta: {
    totalRecords: 2,
    totalPages: 1,
    aggregations: {
      byStatus: {
        VERIFIED: 1,
        PENDING: 1,
        REJECTED: 0
      },
      byType: {
        SHELTER: 1,
        HEALTHCARE: 1,
        WASH: 0
      }
    }
  }
};

describe('DetailedAssessmentView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAssessmentResponse),
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
  });

  it('renders loading state initially', () => {
    render(<DetailedAssessmentView />);
    
    expect(screen.getByText('Detailed Assessment View')).toBeInTheDocument();
    expect(screen.getByText('Loading detailed assessment data...')).toBeInTheDocument();
  });

  it('displays assessment data after loading', async () => {
    render(<DetailedAssessmentView />);

    await waitFor(() => {
      expect(screen.getByText('ASS-001')).toBeInTheDocument();
    });

    expect(screen.getByText('ASS-002')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Dr. Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Camp Alpha')).toBeInTheDocument();
    expect(screen.getByText('Community Beta')).toBeInTheDocument();
  });

  it('shows summary statistics correctly', async () => {
    render(<DetailedAssessmentView />);

    await waitFor(() => {
      expect(screen.getByText('Total Assessments')).toBeInTheDocument();
    });

    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('renders shelter assessment details correctly', async () => {
    render(<DetailedAssessmentView />);

    await waitFor(() => {
      expect(screen.getByText('Shelters:')).toBeInTheDocument();
    });

    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('GOOD')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('renders healthcare assessment details correctly', async () => {
    render(<DetailedAssessmentView />);

    await waitFor(() => {
      expect(screen.getByText('Facilities:')).toBeInTheDocument();
    });

    expect(screen.getByText('Staff:')).toBeInTheDocument();
    expect(screen.getByText('ADEQUATE')).toBeInTheDocument();
  });

  it('handles filters correctly', async () => {
    const filters = {
      incidentIds: ['INC-001'],
      entityIds: ['ENT-001'],
      assessmentTypes: ['SHELTER'],
      verificationStatus: ['VERIFIED']
    };

    render(<DetailedAssessmentView filters={filters} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('incidentIds=INC-001')
      );
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('entityIds=ENT-001')
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('assessmentTypes=SHELTER')
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('verificationStatus=VERIFIED')
    );
  });

  it('calls onDrillDown when View Details button is clicked', async () => {
    const mockOnDrillDown = jest.fn();
    render(<DetailedAssessmentView onDrillDown={mockOnDrillDown} />);

    await waitFor(() => {
      expect(screen.getByText('ASS-001')).toBeInTheDocument();
    });

    const viewDetailsButtons = screen.getAllByText('View Details');
    fireEvent.click(viewDetailsButtons[0]);

    expect(mockOnDrillDown).toHaveBeenCalledWith('ASS-001');
  });

  it('calls onExport when Export button is clicked', async () => {
    const mockOnExport = jest.fn();
    render(<DetailedAssessmentView onExport={mockOnExport} />);

    await waitFor(() => {
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Export'));
    expect(mockOnExport).toHaveBeenCalledWith('assessments');
  });

  it('refreshes data when Refresh button is clicked', async () => {
    render(<DetailedAssessmentView />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByText('Refresh'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('displays empty state when no assessments found', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: [],
        meta: { totalRecords: 0, totalPages: 0, aggregations: { byStatus: {}, byType: {} } }
      }),
    });

    render(<DetailedAssessmentView />);

    await waitFor(() => {
      expect(screen.getByText('No assessments found matching current filters')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    render(<DetailedAssessmentView />);

    await waitFor(() => {
      expect(screen.getByText('Loading detailed assessment data...')).toBeInTheDocument();
    });

    // Component should handle error and stop loading
    await waitFor(() => {
      expect(screen.queryByText('Loading detailed assessment data...')).not.toBeInTheDocument();
    });
  });

  it('formats assessment types correctly', async () => {
    render(<DetailedAssessmentView />);

    await waitFor(() => {
      expect(screen.getByText('Shelter')).toBeInTheDocument();
    });

    expect(screen.getByText('Healthcare')).toBeInTheDocument();
  });

  it('displays verification status badges with correct variants', async () => {
    render(<DetailedAssessmentView />);

    await waitFor(() => {
      const verifiedBadges = screen.getAllByText('VERIFIED');
      const pendingBadges = screen.getAllByText('PENDING');
      
      expect(verifiedBadges.length).toBeGreaterThan(0);
      expect(pendingBadges.length).toBeGreaterThan(0);
    });
  });

  it('displays coordinates with correct precision', async () => {
    render(<DetailedAssessmentView />);

    await waitFor(() => {
      expect(screen.getByText(/12\.3456, 14\.7890/)).toBeInTheDocument();
    });

    expect(screen.getByText(/12\.1234, 14\.5678/)).toBeInTheDocument();
  });

  it('handles pagination correctly', async () => {
    const multiPageResponse = {
      ...mockAssessmentResponse,
      meta: {
        ...mockAssessmentResponse.meta,
        totalPages: 3,
        totalRecords: 25
      }
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(multiPageResponse),
    });

    render(<DetailedAssessmentView />);

    await waitFor(() => {
      expect(screen.getByText('Page 1 of 3 (25 total)')).toBeInTheDocument();
    });

    expect(screen.getByText('Previous')).toBeDisabled();
    expect(screen.getByText('Next')).toBeEnabled();
  });
});