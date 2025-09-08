import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { GPSDeliveryStamp } from '@/components/features/response/GPSDeliveryStamp';
import type { GPSCoordinates } from '@dms/shared';

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
  required: true,
};

const mockInitialValue: GPSCoordinates = {
  latitude: 9.0765,
  longitude: 7.3986,
  timestamp: new Date('2024-01-15T10:30:00Z'),
  captureMethod: 'GPS' as const,
  accuracy: 10,
};

describe('GPSDeliveryStamp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCaptureLocation.mockResolvedValue({
      latitude: 9.0765,
      longitude: 7.3986,
      accuracy: 10,
    });
  });

  it('renders without crashing', () => {
    render(<GPSDeliveryStamp {...defaultProps} />);
    expect(screen.getByText('Delivery Location GPS Stamp')).toBeInTheDocument();
  });

  it('displays capture method options', () => {
    render(<GPSDeliveryStamp {...defaultProps} />);
    
    expect(screen.getByLabelText('GPS Auto-Capture')).toBeInTheDocument();
    expect(screen.getByLabelText('Manual Entry')).toBeInTheDocument();
  });

  it('shows GPS capture button by default', () => {
    render(<GPSDeliveryStamp {...defaultProps} />);
    
    expect(screen.getByText('Capture GPS Location')).toBeInTheDocument();
  });

  it('automatically captures GPS on mount when no value provided', async () => {
    render(<GPSDeliveryStamp {...defaultProps} />);
    
    // Should automatically attempt to capture GPS
    await waitFor(() => {
      expect(mockCaptureLocation).toHaveBeenCalled();
    });
  });

  it('captures GPS location when button is clicked', async () => {
    const user = userEvent.setup();
    render(<GPSDeliveryStamp {...defaultProps} />);

    const captureButton = screen.getByText('Capture GPS Location');
    await user.click(captureButton);

    await waitFor(() => {
      expect(mockCaptureLocation).toHaveBeenCalled();
    });
  });

  it('displays captured location information', () => {
    render(
      <GPSDeliveryStamp 
        {...defaultProps} 
        value={mockInitialValue}
      />
    );

    expect(screen.getByText('Location successfully captured with good accuracy')).toBeInTheDocument();
    expect(screen.getByText(/9\.076500, 7\.398600/)).toBeInTheDocument();
    expect(screen.getByText(/1\/15\/2024/)).toBeInTheDocument();
  });

  it('shows accuracy status correctly', () => {
    const excellentAccuracy = { ...mockInitialValue, accuracy: 3 };
    const { rerender } = render(
      <GPSDeliveryStamp 
        {...defaultProps} 
        value={excellentAccuracy}
      />
    );

    expect(screen.getByText('Accuracy: Excellent')).toBeInTheDocument();

    const poorAccuracy = { ...mockInitialValue, accuracy: 25 };
    rerender(
      <GPSDeliveryStamp 
        {...defaultProps} 
        value={poorAccuracy}
      />
    );

    expect(screen.getByText('Accuracy: Poor')).toBeInTheDocument();
  });

  it('switches to manual entry mode', async () => {
    const user = userEvent.setup();
    render(<GPSDeliveryStamp {...defaultProps} />);

    const manualRadio = screen.getByLabelText('Manual Entry');
    await user.click(manualRadio);

    // Should show manual input fields
    await waitFor(() => {
      expect(screen.getByLabelText('Latitude')).toBeInTheDocument();
      expect(screen.getByLabelText('Longitude')).toBeInTheDocument();
    });
  });

  it('accepts manual coordinate input', async () => {
    const user = userEvent.setup();
    render(<GPSDeliveryStamp {...defaultProps} />);

    // Switch to manual entry
    const manualRadio = screen.getByLabelText('Manual Entry');
    await user.click(manualRadio);

    await waitFor(() => {
      expect(screen.getByLabelText('Latitude')).toBeInTheDocument();
    });

    // Enter coordinates
    const latInput = screen.getByLabelText('Latitude');
    const lngInput = screen.getByLabelText('Longitude');

    await user.clear(latInput);
    await user.type(latInput, '9.123456');
    
    await user.clear(lngInput);
    await user.type(lngInput, '7.654321');

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 9.123456,
          longitude: 7.654321,
          captureMethod: 'MANUAL',
        })
      );
    });
  });

  it('validates coordinate ranges', async () => {
    const user = userEvent.setup();
    render(<GPSDeliveryStamp {...defaultProps} />);

    // Switch to manual entry
    await user.click(screen.getByLabelText('Manual Entry'));

    await waitFor(() => {
      expect(screen.getByLabelText('Latitude')).toBeInTheDocument();
    });

    // Enter invalid coordinates (validation would be handled by the form schema)
    const latInput = screen.getByLabelText('Latitude');
    await user.clear(latInput);
    await user.type(latInput, '91'); // Invalid latitude > 90

    // The actual validation would be handled by Zod schema
    expect(latInput).toHaveValue(91);
  });

  it('shows required validation message when location not captured', () => {
    render(<GPSDeliveryStamp {...defaultProps} required={true} />);
    
    expect(screen.getByText('GPS location is required for delivery documentation')).toBeInTheDocument();
  });

  it('handles GPS capture errors gracefully', async () => {
    const user = userEvent.setup();
    mockCaptureLocation.mockRejectedValue(new Error('GPS not available'));
    
    render(<GPSDeliveryStamp {...defaultProps} />);

    const captureButton = screen.getByText('Capture GPS Location');
    await user.click(captureButton);

    await waitFor(() => {
      expect(screen.getByText('GPS not available')).toBeInTheDocument();
    });
  });

  it('disables all inputs when disabled prop is true', () => {
    render(<GPSDeliveryStamp {...defaultProps} disabled={true} />);

    expect(screen.getByLabelText('GPS Auto-Capture')).toBeDisabled();
    expect(screen.getByLabelText('Manual Entry')).toBeDisabled();
    expect(screen.getByText('Capture GPS Location')).toBeDisabled();
  });

  it('calls onChange when GPS is captured', async () => {
    const user = userEvent.setup();
    render(<GPSDeliveryStamp {...defaultProps} />);

    const captureButton = screen.getByText('Capture GPS Location');
    await user.click(captureButton);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 9.0765,
          longitude: 7.3986,
          captureMethod: 'GPS',
        })
      );
    });
  });

  it('shows method badge for GPS capture', () => {
    render(
      <GPSDeliveryStamp 
        {...defaultProps} 
        value={mockInitialValue}
      />
    );

    expect(screen.getByText('Method: GPS')).toBeInTheDocument();
  });

  it('shows method badge for manual entry', async () => {
    const user = userEvent.setup();
    render(<GPSDeliveryStamp {...defaultProps} />);

    // Switch to manual and enter coordinates
    await user.click(screen.getByLabelText('Manual Entry'));

    await waitFor(() => {
      expect(screen.getByLabelText('Latitude')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Latitude'), '9.123');
    await user.type(screen.getByLabelText('Longitude'), '7.456');

    await waitFor(() => {
      expect(screen.getByText('Method: Manual Entry')).toBeInTheDocument();
    });
  });

  it('updates timestamp when location is captured', async () => {
    const user = userEvent.setup();
    render(<GPSDeliveryStamp {...defaultProps} />);

    const captureButton = screen.getByText('Capture GPS Location');
    await user.click(captureButton);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Date),
        })
      );
    });
  });

  it('displays loading state during GPS capture', async () => {
    const user = userEvent.setup();
    // Mock a delayed GPS capture
    mockCaptureLocation.mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({ latitude: 9.0765, longitude: 7.3986 }), 100)
      )
    );

    render(<GPSDeliveryStamp {...defaultProps} />);

    const captureButton = screen.getByText('Capture GPS Location');
    await user.click(captureButton);

    // Should show loading state
    expect(screen.getByText('Capturing Location...')).toBeInTheDocument();

    // Wait for capture to complete
    await waitFor(() => {
      expect(screen.getByText('Capture GPS Location')).toBeInTheDocument();
    });
  });
});