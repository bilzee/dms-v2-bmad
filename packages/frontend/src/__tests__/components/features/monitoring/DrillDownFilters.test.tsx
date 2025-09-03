import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { DrillDownFilters } from '@/components/features/monitoring/DrillDownFilters';

const mockFilters = {
  incidentIds: ['INC-001'],
  entityIds: ['ENT-001'],
  timeframe: {
    start: '2025-08-01T00:00:00Z',
    end: '2025-08-31T23:59:59Z'
  },
  dataTypes: ['SHELTER'],
  statusFilters: ['VERIFIED']
};

describe('DrillDownFilters', () => {
  const mockOnFiltersChange = jest.fn();
  const mockOnClearFilters = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders filter controls correctly', () => {
    render(
      <DrillDownFilters
        dataType="assessments"
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    expect(screen.getByText('Drill-Down Filters')).toBeInTheDocument();
    expect(screen.getByText('Incident')).toBeInTheDocument();
    expect(screen.getByText('Entity')).toBeInTheDocument();
    expect(screen.getByText('Date Range')).toBeInTheDocument();
    expect(screen.getByText('Assessment Types')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('displays initial filters correctly', () => {
    render(
      <DrillDownFilters
        dataType="assessments"
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
        initialFilters={mockFilters}
      />
    );

    // Check that active filters are displayed
    expect(screen.getByText('Active Filters')).toBeInTheDocument();
    expect(screen.getByText('INC-001')).toBeInTheDocument();
    expect(screen.getByText('ENT-001')).toBeInTheDocument();
    expect(screen.getByText('SHELTER')).toBeInTheDocument();
    expect(screen.getByText('VERIFIED')).toBeInTheDocument();
  });

  it('adapts filter options based on data type', () => {
    const { rerender } = render(
      <DrillDownFilters
        dataType="assessments"
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    expect(screen.getByText('Assessment Types')).toBeInTheDocument();

    rerender(
      <DrillDownFilters
        dataType="responses"
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    expect(screen.getByText('Response Types')).toBeInTheDocument();
  });

  it('calls onFiltersChange when filter is updated', async () => {
    render(
      <DrillDownFilters
        dataType="assessments"
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    // Open incident select dropdown
    const incidentSelect = screen.getByRole('combobox', { name: /incident/i });
    fireEvent.click(incidentSelect);

    // Wait for options and select one
    await waitFor(() => {
      expect(screen.getByText('All Incidents')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('All Incidents'));

    expect(mockOnFiltersChange).toHaveBeenCalled();
  });

  it('calls onClearFilters when Clear All button is clicked', () => {
    render(
      <DrillDownFilters
        dataType="assessments"
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
        initialFilters={mockFilters}
      />
    );

    fireEvent.click(screen.getByText('Clear All'));
    expect(mockOnClearFilters).toHaveBeenCalled();
  });

  it('shows quick filter presets', () => {
    render(
      <DrillDownFilters
        dataType="assessments"
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    expect(screen.getByText('Quick Filters')).toBeInTheDocument();
    expect(screen.getByText('Last 24 Hours')).toBeInTheDocument();
    expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
    expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
    expect(screen.getByText('Pending Verification')).toBeInTheDocument();
  });

  it('applies quick filter presets correctly', () => {
    render(
      <DrillDownFilters
        dataType="assessments"
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    fireEvent.click(screen.getByText('Last 24 Hours'));

    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        timeframe: expect.objectContaining({
          start: expect.any(String),
          end: expect.any(String)
        })
      })
    );
  });

  it('handles date range selection', async () => {
    render(
      <DrillDownFilters
        dataType="assessments"
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    // Test custom date range
    const startDateInput = screen.getByDisplayValue(/start date/i);
    const endDateInput = screen.getByDisplayValue(/end date/i);

    fireEvent.change(startDateInput, { target: { value: '2025-08-01' } });
    fireEvent.change(endDateInput, { target: { value: '2025-08-31' } });

    await waitFor(() => {
      expect(mockOnFiltersChange).toHaveBeenCalled();
    });
  });

  it('removes individual filter tags correctly', () => {
    render(
      <DrillDownFilters
        dataType="assessments"
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
        initialFilters={mockFilters}
      />
    );

    // Find and click remove button for a filter tag
    const removeButtons = screen.getAllByLabelText('Remove filter');
    fireEvent.click(removeButtons[0]);

    expect(mockOnFiltersChange).toHaveBeenCalled();
  });

  it('displays filter count correctly', () => {
    render(
      <DrillDownFilters
        dataType="assessments"
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
        initialFilters={mockFilters}
      />
    );

    expect(screen.getByText('5 filters active')).toBeInTheDocument();
  });

  it('collapses and expands filter panel', () => {
    render(
      <DrillDownFilters
        dataType="assessments"
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    const collapseButton = screen.getByLabelText('Collapse filters');
    fireEvent.click(collapseButton);

    // Check that detailed filters are hidden
    expect(screen.queryByText('Assessment Types')).not.toBeInTheDocument();

    // Expand again
    fireEvent.click(collapseButton);
    expect(screen.getByText('Assessment Types')).toBeInTheDocument();
  });

  it('shows appropriate filter options for different data types', () => {
    const { rerender } = render(
      <DrillDownFilters
        dataType="assessments"
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    expect(screen.getByText('Assessment Types')).toBeInTheDocument();

    rerender(
      <DrillDownFilters
        dataType="responses"
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    expect(screen.getByText('Response Types')).toBeInTheDocument();

    rerender(
      <DrillDownFilters
        dataType="incidents"
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    expect(screen.getByText('Incident Types')).toBeInTheDocument();

    rerender(
      <DrillDownFilters
        dataType="entities"
        onFiltersChange={mockOnFiltersChange}
        onClearFilters={mockOnClearFilters}
      />
    );

    expect(screen.getByText('Entity Types')).toBeInTheDocument();
  });
});