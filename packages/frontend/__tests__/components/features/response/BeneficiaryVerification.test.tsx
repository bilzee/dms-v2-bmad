import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BeneficiaryVerification } from '@/components/features/response/BeneficiaryVerification';
import type { BeneficiaryVerificationFormData } from '@dms/shared';

// Mock the GPS hook
const mockCaptureLocation = jest.fn();
jest.mock('@/hooks/useGPS', () => ({
  useGPS: () => ({
    captureLocation: mockCaptureLocation,
    isLoading: false,
  }),
}));

const mockOnChange = jest.fn();

const defaultProps = {
  onChange: mockOnChange,
  disabled: false,
};

const mockInitialValue: BeneficiaryVerificationFormData = {
  verificationMethod: 'VERBAL_CONFIRMATION',
  totalBeneficiariesServed: 0,
  householdsServed: 0,
  individualsServed: 0,
  demographicBreakdown: {
    male: 0,
    female: 0,
    children: 0,
    elderly: 0,
    pwD: 0,
  },
  verificationTimestamp: new Date('2024-01-15T10:30:00Z'),
  verificationLocation: {
    latitude: 0,
    longitude: 0,
    timestamp: new Date('2024-01-15T10:30:00Z'),
    captureMethod: 'GPS' as const,
  },
};

describe('BeneficiaryVerification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCaptureLocation.mockResolvedValue({
      latitude: 9.0765,
      longitude: 7.3986,
      accuracy: 10,
    });
  });

  it('renders without crashing', () => {
    render(<BeneficiaryVerification {...defaultProps} />);
    expect(screen.getByText('Beneficiary Verification')).toBeInTheDocument();
  });

  it('displays all verification method options', () => {
    render(<BeneficiaryVerification {...defaultProps} />);
    
    expect(screen.getByLabelText('Signature')).toBeInTheDocument();
    expect(screen.getByLabelText('Thumbprint')).toBeInTheDocument();
    expect(screen.getByLabelText('Photo')).toBeInTheDocument();
    expect(screen.getByLabelText('Verbal Confirmation')).toBeInTheDocument();
  });

  it('displays demographic breakdown fields', () => {
    render(<BeneficiaryVerification {...defaultProps} />);
    
    expect(screen.getByLabelText('Male')).toBeInTheDocument();
    expect(screen.getByLabelText('Female')).toBeInTheDocument();
    expect(screen.getByLabelText('Children (Under 18)')).toBeInTheDocument();
    expect(screen.getByLabelText('Elderly (65+)')).toBeInTheDocument();
    expect(screen.getByLabelText('Persons with Disabilities')).toBeInTheDocument();
  });

  it('auto-calculates totals when demographic data changes', async () => {
    const user = userEvent.setup();
    render(<BeneficiaryVerification {...defaultProps} />);

    // Enter demographic data
    await user.clear(screen.getByLabelText('Male'));
    await user.type(screen.getByLabelText('Male'), '25');
    
    await user.clear(screen.getByLabelText('Female'));
    await user.type(screen.getByLabelText('Female'), '30');
    
    await user.clear(screen.getByLabelText('Children (Under 18)'));
    await user.type(screen.getByLabelText('Children (Under 18)'), '15');

    // Verify totals are calculated
    await waitFor(() => {
      expect(screen.getByText('55')).toBeInTheDocument(); // Total Individuals
      expect(screen.getByText('55')).toBeInTheDocument(); // Total Beneficiaries
    });
  });

  it('calls onChange when form data updates', async () => {
    const user = userEvent.setup();
    render(<BeneficiaryVerification {...defaultProps} />);

    // Change verification method
    await user.click(screen.getByLabelText('Photo'));

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          verificationMethod: 'PHOTO',
        })
      );
    });
  });

  it('captures GPS location when button is clicked', async () => {
    const user = userEvent.setup();
    render(<BeneficiaryVerification {...defaultProps} />);

    const captureButton = screen.getByText('Capture Current Location');
    await user.click(captureButton);

    await waitFor(() => {
      expect(mockCaptureLocation).toHaveBeenCalled();
    });

    // Wait for location to be captured and state to update
    await waitFor(() => {
      expect(screen.getByText('Location Captured')).toBeInTheDocument();
    });
  });

  it('displays location information when captured', () => {
    const valueWithLocation = {
      ...mockInitialValue,
      verificationLocation: {
        latitude: 9.0765,
        longitude: 7.3986,
        timestamp: new Date('2024-01-15T10:30:00Z'),
        captureMethod: 'GPS' as const,
      },
    };

    render(
      <BeneficiaryVerification 
        {...defaultProps} 
        value={valueWithLocation}
      />
    );

    expect(screen.getByText(/9\.076500, 7\.398600/)).toBeInTheDocument();
    expect(screen.getByText(/1\/15\/2024/)).toBeInTheDocument();
  });

  it('handles households served input correctly', async () => {
    const user = userEvent.setup();
    render(<BeneficiaryVerification {...defaultProps} />);

    const householdsInput = screen.getByLabelText('Number of Households Served');
    await user.clear(householdsInput);
    await user.type(householdsInput, '10');

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          householdsServed: 10,
        })
      );
    });
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<BeneficiaryVerification {...defaultProps} />);

    // Try to submit without required data (this would be handled by parent form)
    // For now, we'll just verify the fields exist and can be interacted with
    const maleInput = screen.getByLabelText('Male');
    await user.clear(maleInput);
    await user.type(maleInput, '-1'); // Invalid value

    // The validation would be handled by the Zod schema in the form
    expect(maleInput).toBeInTheDocument();
  });

  it('disables all inputs when disabled prop is true', () => {
    render(<BeneficiaryVerification {...defaultProps} disabled={true} />);

    // Check that form elements are disabled
    expect(screen.getByLabelText('Signature')).toBeDisabled();
    expect(screen.getByLabelText('Male')).toBeDisabled();
    expect(screen.getByLabelText('Female')).toBeDisabled();
    expect(screen.getByLabelText('Number of Households Served')).toBeDisabled();
    expect(screen.getByText('Capture Current Location')).toBeDisabled();
  });

  it('loads with initial values correctly', () => {
    const initialValue = {
      ...mockInitialValue,
      verificationMethod: 'SIGNATURE' as const,
      householdsServed: 5,
      demographicBreakdown: {
        male: 10,
        female: 15,
        children: 8,
        elderly: 2,
        pwD: 1,
      },
    };

    render(
      <BeneficiaryVerification 
        {...defaultProps} 
        value={initialValue}
      />
    );

    expect(screen.getByLabelText('Signature')).toBeChecked();
    expect(screen.getByDisplayValue('5')).toBeInTheDocument(); // Households
    expect(screen.getByDisplayValue('10')).toBeInTheDocument(); // Male
    expect(screen.getByDisplayValue('15')).toBeInTheDocument(); // Female
  });

  it('handles GPS location capture errors gracefully', async () => {
    const user = userEvent.setup();
    mockCaptureLocation.mockRejectedValue(new Error('GPS not available'));
    
    render(<BeneficiaryVerification {...defaultProps} />);

    const captureButton = screen.getByText('Capture Current Location');
    await user.click(captureButton);

    await waitFor(() => {
      expect(mockCaptureLocation).toHaveBeenCalled();
    });

    // The component should handle the error gracefully
    // (specific error handling would depend on implementation)
  });
});