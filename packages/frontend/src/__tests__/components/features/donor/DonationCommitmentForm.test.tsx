import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DonationCommitmentForm } from '@/components/features/donor/DonationCommitmentForm';
import { useDonorStore } from '@/stores/donor.store';
import { ResponseType } from '@dms/shared';

// Mock the donor store
jest.mock('@/stores/donor.store');
const mockUseDonorStore = useDonorStore as jest.MockedFunction<typeof useDonorStore>;

// Mock components
jest.mock('@/components/shared/AutoSaveIndicator', () => {
  return function AutoSaveIndicator({ isSaving, lastSaved }: any) {
    return (
      <div data-testid="auto-save-indicator">
        {isSaving ? 'Saving...' : lastSaved ? `Last saved: ${lastSaved.toLocaleTimeString()}` : ''}
      </div>
    );
  };
});

const mockStoreFunctions = {
  createCommitment: jest.fn(),
  isCreating: false,
  error: null,
  clearError: jest.fn(),
  availableEntities: [
    { id: 'entity-1', name: 'Test Camp', type: 'CAMP', lga: 'Test LGA', ward: 'Test Ward', longitude: 0, latitude: 0 },
    { id: 'entity-2', name: 'Test Community', type: 'COMMUNITY', lga: 'Test LGA', ward: 'Test Ward', longitude: 0, latitude: 0 },
  ],
  availableIncidents: [
    { id: 'incident-1', name: 'Test Flood', type: 'FLOOD', severity: 'MODERATE', status: 'ACTIVE' },
    { id: 'incident-2', name: 'Test Fire', type: 'FIRE', severity: 'SEVERE', status: 'ACTIVE' },
  ],
  loadDonorData: jest.fn(),
};

describe('DonationCommitmentForm', () => {
  beforeEach(() => {
    mockUseDonorStore.mockReturnValue(mockStoreFunctions);
    jest.clearAllMocks();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  test('renders form with all required fields', () => {
    render(<DonationCommitmentForm />);

    // Check that response type tabs are present
    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByText('WASH')).toBeInTheDocument();
    expect(screen.getByText('Shelter')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Population')).toBeInTheDocument();

    // Check required form fields
    expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/unit/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/target delivery date/i)).toBeInTheDocument();

    // Check optional fields
    expect(screen.getByLabelText(/specific incident/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/specific location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();

    // Check action buttons
    expect(screen.getByText('Save Draft')).toBeInTheDocument();
    expect(screen.getByText('Register Commitment')).toBeInTheDocument();
  });

  test('validates required fields and shows error messages', async () => {
    const user = userEvent.setup();
    render(<DonationCommitmentForm />);

    // Try to submit without filling required fields
    const submitButton = screen.getByText('Register Commitment');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/quantity must be at least 1/i)).toBeInTheDocument();
      expect(screen.getByText(/unit is required/i)).toBeInTheDocument();
    });
  });

  test('enforces quantity range validation (1-999999)', async () => {
    const user = userEvent.setup();
    render(<DonationCommitmentForm />);

    const quantityInput = screen.getByLabelText(/quantity/i);

    // Test invalid minimum
    await user.clear(quantityInput);
    await user.type(quantityInput, '0');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/quantity must be at least 1/i)).toBeInTheDocument();
    });

    // Test invalid maximum
    await user.clear(quantityInput);
    await user.type(quantityInput, '1000000');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/quantity cannot exceed 999,999/i)).toBeInTheDocument();
    });

    // Test valid value
    await user.clear(quantityInput);
    await user.type(quantityInput, '500');
    await user.tab();

    await waitFor(() => {
      expect(screen.queryByText(/quantity must be at least 1/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/quantity cannot exceed 999,999/i)).not.toBeInTheDocument();
    });
  });

  test('enforces unit character limit (50 characters)', async () => {
    const user = userEvent.setup();
    render(<DonationCommitmentForm />);

    const unitInput = screen.getByLabelText(/unit/i);
    const longUnit = 'a'.repeat(51);

    await user.type(unitInput, longUnit);
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/unit cannot exceed 50 characters/i)).toBeInTheDocument();
    });
  });

  test('enforces future date validation (minimum tomorrow)', async () => {
    const user = userEvent.setup();
    render(<DonationCommitmentForm />);

    const dateInput = screen.getByLabelText(/target delivery date/i);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    await user.type(dateInput, yesterdayString);
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/target date must be at least tomorrow/i)).toBeInTheDocument();
    });
  });

  test('switches response types correctly', async () => {
    const user = userEvent.setup();
    render(<DonationCommitmentForm />);

    // Initially Health should be selected
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Health');

    // Switch to WASH
    const washTab = screen.getByText('WASH');
    await user.click(washTab);

    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('WASH');
  });

  test('shows unit suggestions based on response type', async () => {
    const user = userEvent.setup();
    render(<DonationCommitmentForm />);

    const unitInput = screen.getByLabelText(/unit/i);
    await user.click(unitInput);

    // Should show health-related unit suggestions
    await waitFor(() => {
      expect(screen.getByText('kits')).toBeInTheDocument();
      expect(screen.getByText('units')).toBeInTheDocument();
      expect(screen.getByText('doses')).toBeInTheDocument();
    });
  });

  test('auto-saves form data to localStorage', async () => {
    const user = userEvent.setup();
    const mockSetItem = jest.fn();
    Object.defineProperty(window, 'localStorage', {
      value: { ...window.localStorage, setItem: mockSetItem },
      writable: true,
    });

    render(<DonationCommitmentForm />);

    // Fill form fields
    await user.type(screen.getByLabelText(/quantity/i), '100');
    await user.type(screen.getByLabelText(/unit/i), 'kg');

    // Wait for auto-save
    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalledWith(
        'donor-commitment-draft',
        expect.stringContaining('"quantity":100')
      );
    }, { timeout: 3000 });
  });

  test('loads draft from localStorage on mount', () => {
    const mockGetItem = jest.fn(() => JSON.stringify({
      responseType: ResponseType.FOOD,
      quantity: 250,
      unit: 'kg',
      targetDate: new Date('2024-12-01').toISOString(),
      notes: 'Test draft',
    }));
    
    Object.defineProperty(window, 'localStorage', {
      value: { ...window.localStorage, getItem: mockGetItem },
      writable: true,
    });

    render(<DonationCommitmentForm />);

    expect(mockGetItem).toHaveBeenCalledWith('donor-commitment-draft');
    expect(screen.getByDisplayValue('250')).toBeInTheDocument();
    expect(screen.getByDisplayValue('kg')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test draft')).toBeInTheDocument();
  });

  test('submits form with valid data', async () => {
    const user = userEvent.setup();
    const mockCreateCommitment = jest.fn().mockResolvedValue({});
    const mockOnSuccess = jest.fn();

    mockUseDonorStore.mockReturnValue({
      ...mockStoreFunctions,
      createCommitment: mockCreateCommitment,
    });

    render(<DonationCommitmentForm onSuccess={mockOnSuccess} />);

    // Fill required fields
    await user.type(screen.getByLabelText(/quantity/i), '100');
    await user.type(screen.getByLabelText(/unit/i), 'kg');
    
    const dateInput = screen.getByLabelText(/target delivery date/i);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const futureDateString = futureDate.toISOString().split('T')[0];
    await user.type(dateInput, futureDateString);

    // Submit form
    const submitButton = screen.getByText('Register Commitment');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateCommitment).toHaveBeenCalledWith({
        responseType: ResponseType.HEALTH,
        quantity: 100,
        unit: 'kg',
        targetDate: expect.any(Date),
        notes: '',
      });
    });

    expect(mockOnSuccess).toHaveBeenCalled();
  });

  test('shows loading state during submission', async () => {
    const user = userEvent.setup();
    const mockCreateCommitment = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));

    mockUseDonorStore.mockReturnValue({
      ...mockStoreFunctions,
      createCommitment: mockCreateCommitment,
      isCreating: true,
    });

    render(<DonationCommitmentForm />);

    // Submit button should show loading state
    expect(screen.getByText('Register Commitment')).toBeDisabled();
    expect(screen.getByRole('button', { name: /register commitment/i })).toHaveClass('disabled');
  });

  test('handles API errors gracefully', async () => {
    const user = userEvent.setup();
    const mockCreateCommitment = jest.fn().mockRejectedValue(new Error('API Error'));

    mockUseDonorStore.mockReturnValue({
      ...mockStoreFunctions,
      createCommitment: mockCreateCommitment,
      error: 'API Error',
    });

    render(<DonationCommitmentForm />);

    expect(screen.getByText('API Error')).toBeInTheDocument();
    
    const dismissButton = screen.getByText('Dismiss');
    await user.click(dismissButton);
    
    expect(mockStoreFunctions.clearError).toHaveBeenCalled();
  });

  test('shows commitment preview when quantity and unit are filled', async () => {
    const user = userEvent.setup();
    render(<DonationCommitmentForm />);

    await user.type(screen.getByLabelText(/quantity/i), '500');
    await user.type(screen.getByLabelText(/unit/i), 'blankets');

    await waitFor(() => {
      expect(screen.getByText(/500 blankets of Health supplies/i)).toBeInTheDocument();
    });
  });

  test('shows date preview with days calculation', async () => {
    const user = userEvent.setup();
    render(<DonationCommitmentForm />);

    const dateInput = screen.getByLabelText(/target delivery date/i);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    const futureDateString = futureDate.toISOString().split('T')[0];
    
    await user.type(dateInput, futureDateString);

    await waitFor(() => {
      expect(screen.getByText(/14 days from now/i)).toBeInTheDocument();
    });
  });

  test('clears draft from localStorage after successful submission', async () => {
    const user = userEvent.setup();
    const mockRemoveItem = jest.fn();
    const mockCreateCommitment = jest.fn().mockResolvedValue({});
    
    Object.defineProperty(window, 'localStorage', {
      value: { ...window.localStorage, removeItem: mockRemoveItem },
      writable: true,
    });

    mockUseDonorStore.mockReturnValue({
      ...mockStoreFunctions,
      createCommitment: mockCreateCommitment,
    });

    render(<DonationCommitmentForm />);

    // Fill and submit form
    await user.type(screen.getByLabelText(/quantity/i), '100');
    await user.type(screen.getByLabelText(/unit/i), 'kg');
    
    const dateInput = screen.getByLabelText(/target delivery date/i);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    await user.type(dateInput, futureDate.toISOString().split('T')[0]);

    await user.click(screen.getByText('Register Commitment'));

    await waitFor(() => {
      expect(mockRemoveItem).toHaveBeenCalledWith('donor-commitment-draft');
    });
  });
});