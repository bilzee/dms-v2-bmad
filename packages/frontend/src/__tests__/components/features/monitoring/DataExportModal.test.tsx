import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { DataExportModal } from '@/components/features/monitoring/DataExportModal';

global.fetch = jest.fn();

const mockExportResponse = {
  success: true,
  data: {
    exportId: 'export-123',
    status: 'processing',
    message: 'Export initiated successfully'
  }
};

const mockExportStatusResponse = {
  success: true,
  data: {
    exportId: 'export-123',
    status: 'completed',
    downloadUrl: '/downloads/export-123.csv',
    fileSize: 1024000,
    recordCount: 150
  }
};

const defaultFilters = {
  incidentIds: ['INC-001'],
  entityIds: ['ENT-001'],
  timeframe: {
    start: '2025-08-01T00:00:00Z',
    end: '2025-08-31T23:59:59Z'
  }
};

describe('DataExportModal', () => {
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExportResponse),
      })
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockExportStatusResponse),
      });
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('renders export modal correctly', () => {
    render(
      <DataExportModal
        dataType="assessments"
        filters={defaultFilters}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.getByText('Export Data')).toBeInTheDocument();
    expect(screen.getByText('Export assessments data with current filters')).toBeInTheDocument();
    expect(screen.getByText('Format')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('shows format selection options', () => {
    render(
      <DataExportModal
        dataType="assessments"
        filters={defaultFilters}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    // Check format radio buttons
    const csvRadio = screen.getByRole('radio', { name: /csv/i });
    const jsonRadio = screen.getByRole('radio', { name: /json/i });
    const pdfRadio = screen.getByRole('radio', { name: /pdf/i });

    expect(csvRadio).toBeInTheDocument();
    expect(jsonRadio).toBeInTheDocument();
    expect(pdfRadio).toBeInTheDocument();
    expect(csvRadio).toBeChecked(); // Default selection
  });

  it('shows column selection for CSV format', () => {
    render(
      <DataExportModal
        dataType="assessments"
        filters={defaultFilters}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.getByText('Select Columns')).toBeInTheDocument();
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Assessor')).toBeInTheDocument();
    expect(screen.getByText('Entity')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('updates column selection when checkboxes are clicked', () => {
    render(
      <DataExportModal
        dataType="assessments"
        filters={defaultFilters}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const idCheckbox = screen.getByRole('checkbox', { name: /id/i });
    const typeCheckbox = screen.getByRole('checkbox', { name: /type/i });

    expect(idCheckbox).toBeChecked();
    expect(typeCheckbox).toBeChecked();

    fireEvent.click(idCheckbox);
    expect(idCheckbox).not.toBeChecked();

    fireEvent.click(typeCheckbox);
    expect(typeCheckbox).not.toBeChecked();
  });

  it('hides column selection for non-CSV formats', () => {
    render(
      <DataExportModal
        dataType="assessments"
        filters={defaultFilters}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    // Switch to JSON format
    fireEvent.click(screen.getByRole('radio', { name: /json/i }));
    
    expect(screen.queryByText('Select Columns')).not.toBeInTheDocument();

    // Switch to PDF format
    fireEvent.click(screen.getByRole('radio', { name: /pdf/i }));
    
    expect(screen.queryByText('Select Columns')).not.toBeInTheDocument();
  });

  it('initiates export when Start Export button is clicked', async () => {
    render(
      <DataExportModal
        dataType="assessments"
        filters={defaultFilters}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    fireEvent.click(screen.getByText('Start Export'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/v1/monitoring/export/assessments',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"format":"csv"')
        })
      );
    });
  });

  it('shows export progress during processing', async () => {
    render(
      <DataExportModal
        dataType="assessments"
        filters={defaultFilters}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    fireEvent.click(screen.getByText('Start Export'));

    await waitFor(() => {
      expect(screen.getByText('Export in Progress')).toBeInTheDocument();
    });

    expect(screen.getByText('Preparing export...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows download option when export completes', async () => {
    render(
      <DataExportModal
        dataType="assessments"
        filters={defaultFilters}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    fireEvent.click(screen.getByText('Start Export'));

    // Advance timers to trigger status polling
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(screen.getByText('Export Completed')).toBeInTheDocument();
    });

    expect(screen.getByText('Download CSV')).toBeInTheDocument();
    expect(screen.getByText('150 records')).toBeInTheDocument();
    expect(screen.getByText('1.0 MB')).toBeInTheDocument();
  });

  it('handles export errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Export failed'));

    render(
      <DataExportModal
        dataType="assessments"
        filters={defaultFilters}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    fireEvent.click(screen.getByText('Start Export'));

    await waitFor(() => {
      expect(screen.getByText('Export Failed')).toBeInTheDocument();
    });

    expect(screen.getByText('Export failed. Please try again.')).toBeInTheDocument();
    expect(screen.getByText('Retry Export')).toBeInTheDocument();
  });

  it('shows export history', async () => {
    render(
      <DataExportModal
        dataType="assessments"
        filters={defaultFilters}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.getByText('Recent Exports')).toBeInTheDocument();
    expect(screen.getByText('No recent exports')).toBeInTheDocument();
  });

  it('closes modal when Cancel button is clicked', () => {
    render(
      <DataExportModal
        dataType="assessments"
        filters={defaultFilters}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('adapts column options based on data type', () => {
    const { rerender } = render(
      <DataExportModal
        dataType="assessments"
        filters={defaultFilters}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.getByText('Assessor')).toBeInTheDocument();

    rerender(
      <DataExportModal
        dataType="responses"
        filters={defaultFilters}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.getByText('Responder')).toBeInTheDocument();
  });

  it('includes filter summary in export', () => {
    render(
      <DataExportModal
        dataType="assessments"
        filters={defaultFilters}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.getByText('Applied Filters')).toBeInTheDocument();
    expect(screen.getByText('INC-001')).toBeInTheDocument();
    expect(screen.getByText('ENT-001')).toBeInTheDocument();
    expect(screen.getByText('Aug 1 - Aug 31, 2025')).toBeInTheDocument();
  });

  it('validates export requirements before starting', async () => {
    render(
      <DataExportModal
        dataType="assessments"
        filters={{}}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    // Uncheck all columns
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(checkbox => {
      if ((checkbox as HTMLInputElement).checked) {
        fireEvent.click(checkbox);
      }
    });

    fireEvent.click(screen.getByText('Start Export'));

    await waitFor(() => {
      expect(screen.getByText('Please select at least one column')).toBeInTheDocument();
    });

    expect(fetch).not.toHaveBeenCalled();
  });
});