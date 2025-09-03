import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { DetailedResponseView } from '@/components/features/monitoring/DetailedResponseView';

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

const mockResponseData = {
  success: true,
  data: [
    {
      id: 'RES-001',
      responseType: 'SUPPLIES',
      status: 'COMPLETED',
      plannedDate: '2025-08-31T10:00:00Z',
      deliveredDate: '2025-08-31T15:00:00Z',
      responderName: 'Team Alpha',
      entityName: 'Camp Alpha',
      entityType: 'CAMP',
      coordinates: { latitude: 12.3456, longitude: 14.7890 },
      assessmentType: 'SHELTER',
      donorName: 'World Food Programme',
      dataDetails: {
        itemsDelivered: [
          { item: 'Rice', quantity: 100, unit: 'kg' },
          { item: 'Oil', quantity: 50, unit: 'liters' }
        ],
        totalBeneficiaries: 250
      },
      deliveryItems: [
        { item: 'Rice (50kg bags)', quantity: 2, unit: 'bags' }
      ],
      evidenceCount: 4,
      verificationStatus: 'VERIFIED'
    },
    {
      id: 'RES-002',
      responseType: 'MEDICAL',
      status: 'IN_PROGRESS',
      plannedDate: '2025-08-31T12:00:00Z',
      responderName: 'Medical Team Beta',
      entityName: 'Community Beta',
      entityType: 'COMMUNITY',
      coordinates: { latitude: 12.1234, longitude: 14.5678 },
      assessmentType: 'HEALTHCARE',
      dataDetails: {
        patientsHelped: 45,
        medicinesDistributed: 120,
        medicalTeamSize: 6
      },
      deliveryItems: [],
      evidenceCount: 2,
      verificationStatus: 'PENDING'
    }
  ],
  meta: {
    totalRecords: 2,
    totalPages: 1,
    aggregations: {
      byStatus: {
        COMPLETED: 1,
        IN_PROGRESS: 1,
        PLANNED: 0,
        CANCELLED: 0
      }
    }
  }
};

describe('DetailedResponseView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponseData),
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
  });

  it('renders loading state initially', () => {
    render(<DetailedResponseView />);
    
    expect(screen.getByText('Detailed Response View')).toBeInTheDocument();
    expect(screen.getByText('Loading detailed response data...')).toBeInTheDocument();
  });

  it('displays response data after loading', async () => {
    render(<DetailedResponseView />);

    await waitFor(() => {
      expect(screen.getByText('RES-001')).toBeInTheDocument();
    });

    expect(screen.getByText('RES-002')).toBeInTheDocument();
    expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    expect(screen.getByText('Medical Team Beta')).toBeInTheDocument();
    expect(screen.getByText('World Food Programme')).toBeInTheDocument();
  });

  it('shows summary statistics correctly', async () => {
    render(<DetailedResponseView />);

    await waitFor(() => {
      expect(screen.getByText('Total Responses')).toBeInTheDocument();
    });

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Planned')).toBeInTheDocument();
  });

  it('renders supplies response details correctly', async () => {
    render(<DetailedResponseView />);

    await waitFor(() => {
      expect(screen.getByText('Items Delivered:')).toBeInTheDocument();
    });

    expect(screen.getByText('Rice:')).toBeInTheDocument();
    expect(screen.getByText('100 kg')).toBeInTheDocument();
    expect(screen.getByText('Oil:')).toBeInTheDocument();
    expect(screen.getByText('50 liters')).toBeInTheDocument();
    expect(screen.getByText('250')).toBeInTheDocument(); // Beneficiaries
  });

  it('renders medical response details correctly', async () => {
    render(<DetailedResponseView />);

    await waitFor(() => {
      expect(screen.getByText('Patients:')).toBeInTheDocument();
    });

    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('Medicines:')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('6 staff')).toBeInTheDocument();
  });

  it('displays delivery items section when present', async () => {
    render(<DetailedResponseView />);

    await waitFor(() => {
      expect(screen.getByText('Delivery Items')).toBeInTheDocument();
    });

    expect(screen.getByText('Rice (50kg bags):')).toBeInTheDocument();
    expect(screen.getByText('2 bags')).toBeInTheDocument();
  });

  it('handles filters correctly', async () => {
    const filters = {
      incidentIds: ['INC-001'],
      entityIds: ['ENT-001'],
      responseTypes: ['SUPPLIES'],
      status: ['COMPLETED']
    };

    render(<DetailedResponseView filters={filters} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('incidentIds=INC-001')
      );
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('entityIds=ENT-001')
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('responseTypes=SUPPLIES')
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('status=COMPLETED')
    );
  });

  it('calls onDrillDown when View Details button is clicked', async () => {
    const mockOnDrillDown = jest.fn();
    render(<DetailedResponseView onDrillDown={mockOnDrillDown} />);

    await waitFor(() => {
      expect(screen.getByText('RES-001')).toBeInTheDocument();
    });

    const viewDetailsButtons = screen.getAllByText('View Details');
    fireEvent.click(viewDetailsButtons[0]);

    expect(mockOnDrillDown).toHaveBeenCalledWith('RES-001');
  });

  it('calls onExport when Export button is clicked', async () => {
    const mockOnExport = jest.fn();
    render(<DetailedResponseView onExport={mockOnExport} />);

    await waitFor(() => {
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Export'));
    expect(mockOnExport).toHaveBeenCalledWith('responses');
  });

  it('displays verification status badges correctly', async () => {
    render(<DetailedResponseView />);

    await waitFor(() => {
      expect(screen.getByText('VERIFIED')).toBeInTheDocument();
    });

    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('formats response types correctly', async () => {
    render(<DetailedResponseView />);

    await waitFor(() => {
      expect(screen.getByText('Supplies')).toBeInTheDocument();
    });

    expect(screen.getByText('Medical')).toBeInTheDocument();
  });

  it('displays coordinates with correct precision', async () => {
    render(<DetailedResponseView />);

    await waitFor(() => {
      expect(screen.getByText(/12\.3456, 14\.7890/)).toBeInTheDocument();
    });

    expect(screen.getByText(/12\.1234, 14\.5678/)).toBeInTheDocument();
  });

  it('shows evidence count correctly', async () => {
    render(<DetailedResponseView />);

    await waitFor(() => {
      expect(screen.getByText('Evidence attachments: 4')).toBeInTheDocument();
    });

    expect(screen.getByText('Evidence attachments: 2')).toBeInTheDocument();
  });

  it('displays empty state when no responses found', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: [],
        meta: { totalRecords: 0, totalPages: 0, aggregations: { byStatus: {} } }
      }),
    });

    render(<DetailedResponseView />);

    await waitFor(() => {
      expect(screen.getByText('No responses found matching current filters')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    render(<DetailedResponseView />);

    await waitFor(() => {
      expect(screen.queryByText('Loading detailed response data...')).not.toBeInTheDocument();
    });
  });
});