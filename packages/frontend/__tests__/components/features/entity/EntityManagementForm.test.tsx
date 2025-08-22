import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntityManagementForm } from '@/components/features/entity/EntityManagementForm';
import { db } from '@/lib/offline/db';

// Mock dependencies
jest.mock('@/hooks/useGPS', () => ({
  useGPS: () => ({
    coordinates: null,
    captureLocation: jest.fn(),
    isLoading: false,
    error: null,
  }),
}));

jest.mock('@/stores/offline.store', () => ({
  useOfflineStore: () => ({
    isOnline: true,
    addToQueue: jest.fn(),
  }),
}));

jest.mock('@/lib/offline/db', () => ({
  db: {
    saveEntityDraft: jest.fn(),
    saveEntity: jest.fn(),
  },
}));

describe('EntityManagementForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnSaveDraft = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form with default camp type', () => {
    render(<EntityManagementForm onSubmit={mockOnSubmit} />);

    expect(screen.getByRole('heading', { name: /create affected entity/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /entity type/i })).toBeInTheDocument();
    expect(screen.getByText(/camp details/i)).toBeInTheDocument();
  });

  it('switches to community fields when community type is selected', async () => {
    const user = userEvent.setup();
    render(<EntityManagementForm onSubmit={mockOnSubmit} />);

    const typeSelect = screen.getByRole('combobox', { name: /entity type/i });
    await user.selectOptions(typeSelect, 'COMMUNITY');

    expect(screen.getByText(/community details/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/community name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contact person name/i)).toBeInTheDocument();
  });

  it('validates required fields for camp entity', async () => {
    const user = userEvent.setup();
    render(<EntityManagementForm onSubmit={mockOnSubmit} />);

    const submitButton = screen.getByRole('button', { name: /create entity/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/entity name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/lga is required/i)).toBeInTheDocument();
      expect(screen.getByText(/ward is required/i)).toBeInTheDocument();
      expect(screen.getByText(/camp name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/camp coordinator name is required/i)).toBeInTheDocument();
    });
  });

  it('validates required fields for community entity', async () => {
    const user = userEvent.setup();
    render(<EntityManagementForm onSubmit={mockOnSubmit} />);

    const typeSelect = screen.getByRole('combobox', { name: /entity type/i });
    await user.selectOptions(typeSelect, 'COMMUNITY');

    const submitButton = screen.getByRole('button', { name: /create entity/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/community name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/contact person name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/contact person role is required/i)).toBeInTheDocument();
    });
  });

  it('validates GPS coordinates', async () => {
    const user = userEvent.setup();
    render(<EntityManagementForm onSubmit={mockOnSubmit} />);

    const latInput = screen.getByLabelText(/latitude/i);
    const lngInput = screen.getByLabelText(/longitude/i);

    // Invalid coordinates
    await user.type(latInput, '91'); // Invalid latitude
    await user.type(lngInput, '181'); // Invalid longitude

    await waitFor(() => {
      expect(screen.getByText(/coordinates out of valid range/i)).toBeInTheDocument();
    });

    // Clear and add valid coordinates
    await user.clear(latInput);
    await user.clear(lngInput);
    await user.type(latInput, '11.8469');
    await user.type(lngInput, '13.1511');

    await waitFor(() => {
      expect(screen.getByText(/coordinates are valid/i)).toBeInTheDocument();
    });
  });

  it('warns for coordinates outside Nigeria bounds', async () => {
    const user = userEvent.setup();
    render(<EntityManagementForm onSubmit={mockOnSubmit} />);

    const latInput = screen.getByLabelText(/latitude/i);
    const lngInput = screen.getByLabelText(/longitude/i);

    // Valid coordinates but outside Nigeria
    await user.type(latInput, '40.7128'); // New York latitude
    await user.type(lngInput, '-74.0060'); // New York longitude

    await waitFor(() => {
      expect(screen.getByText(/warning.*outside nigeria bounds/i)).toBeInTheDocument();
    });
  });

  it('successfully submits camp entity form', async () => {
    const user = userEvent.setup();
    const mockSaveEntity = db.saveEntity as jest.Mock;
    mockSaveEntity.mockResolvedValueOnce('entity-123');

    render(<EntityManagementForm onSubmit={mockOnSubmit} />);

    // Fill out camp form
    await user.type(screen.getByLabelText(/entity name/i), 'Test IDP Camp');
    await user.type(screen.getByLabelText(/lga/i), 'Maiduguri');
    await user.type(screen.getByLabelText(/ward/i), 'Central Ward');
    await user.type(screen.getByLabelText(/latitude/i), '11.8469');
    await user.type(screen.getByLabelText(/longitude/i), '13.1511');
    await user.type(screen.getByLabelText(/camp name/i), 'Maiduguri IDP Camp');
    await user.type(screen.getByLabelText(/coordinator name/i), 'Ahmad Hassan');
    await user.type(screen.getByLabelText(/coordinator phone/i), '+2348012345678');

    const submitButton = screen.getByRole('button', { name: /create entity/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSaveEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CAMP',
          name: 'Test IDP Camp',
          lga: 'Maiduguri',
          ward: 'Central Ward',
          latitude: 11.8469,
          longitude: 13.1511,
          campDetails: expect.objectContaining({
            campName: 'Maiduguri IDP Camp',
            campCoordinatorName: 'Ahmad Hassan',
            campCoordinatorPhone: '+2348012345678',
          }),
        })
      );
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  it('successfully submits community entity form', async () => {
    const user = userEvent.setup();
    const mockSaveEntity = db.saveEntity as jest.Mock;
    mockSaveEntity.mockResolvedValueOnce('entity-456');

    render(<EntityManagementForm onSubmit={mockOnSubmit} />);

    // Switch to community
    const typeSelect = screen.getByRole('combobox', { name: /entity type/i });
    await user.selectOptions(typeSelect, 'COMMUNITY');

    // Fill out community form
    await user.type(screen.getByLabelText(/entity name/i), 'Test Community');
    await user.type(screen.getByLabelText(/lga/i), 'Konduga');
    await user.type(screen.getByLabelText(/ward/i), 'Kawuri Ward');
    await user.type(screen.getByLabelText(/latitude/i), '11.7500');
    await user.type(screen.getByLabelText(/longitude/i), '13.2000');
    await user.type(screen.getByLabelText(/community name/i), 'Kawuri Community');
    await user.type(screen.getByLabelText(/contact person name/i), 'Usman Mohammed');
    await user.type(screen.getByLabelText(/contact person phone/i), '+2348098765432');
    await user.type(screen.getByLabelText(/contact person role/i), 'Village Head');

    const submitButton = screen.getByRole('button', { name: /create entity/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSaveEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'COMMUNITY',
          name: 'Test Community',
          communityDetails: expect.objectContaining({
            communityName: 'Kawuri Community',
            contactPersonName: 'Usman Mohammed',
            contactPersonPhone: '+2348098765432',
            contactPersonRole: 'Village Head',
          }),
        })
      );
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  it('handles form reset', async () => {
    const user = userEvent.setup();
    render(<EntityManagementForm onSubmit={mockOnSubmit} />);

    // Fill some fields
    await user.type(screen.getByLabelText(/entity name/i), 'Test Entity');
    await user.type(screen.getByLabelText(/lga/i), 'Test LGA');

    // Reset form
    const resetButton = screen.getByRole('button', { name: /reset/i });
    await user.click(resetButton);

    expect((screen.getByLabelText(/entity name/i) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/lga/i) as HTMLInputElement).value).toBe('');
  });

  it('loads initial data for editing', () => {
    const initialData = {
      type: 'COMMUNITY' as const,
      name: 'Existing Community',
      lga: 'Borno',
      ward: 'Test Ward',
      latitude: 12.0,
      longitude: 14.0,
      communityDetails: {
        communityName: 'Existing Community',
        contactPersonName: 'John Doe',
        contactPersonPhone: '+234123456789',
        contactPersonRole: 'Chief',
        estimatedHouseholds: 100,
      },
    };

    render(
      <EntityManagementForm
        onSubmit={mockOnSubmit}
        initialData={initialData}
        editingId="entity-123"
      />
    );

    expect(screen.getByRole('heading', { name: /edit affected entity/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /entity type/i })).toHaveValue('COMMUNITY');
    // Check for input values using more specific queries
    expect(screen.getByDisplayValue('Borno')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Ward')).toBeInTheDocument();
  });

  it('handles auto-save functionality', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const mockSaveEntityDraft = db.saveEntityDraft as jest.Mock;
    mockSaveEntityDraft.mockResolvedValueOnce('draft-123');

    render(<EntityManagementForm onSubmit={mockOnSubmit} onSaveDraft={mockOnSaveDraft} />);

    // Make a change to trigger auto-save
    await user.type(screen.getByLabelText(/entity name/i), 'Auto-save Test');

    // Fast-forward to trigger auto-save
    jest.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(mockSaveEntityDraft).toHaveBeenCalled();
      expect(mockOnSaveDraft).toHaveBeenCalled();
    });

    jest.useRealTimers();
  }, 15000);
});