import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { act } from '@testing-library/react';
import QualityThresholdSettings from '@/components/features/verification/QualityThresholdSettings';
import { QualityThreshold } from '@dms/shared';

// Mock the UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div data-testid="card" className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, type, min, max, disabled, ...props }: any) => (
    <input
      type={type}
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      disabled={disabled}
      data-testid={props['data-testid'] || 'input'}
      id={props.id}
    />
  ),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, disabled }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      disabled={disabled}
      data-testid="switch"
    />
  ),
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange, min, max, step, disabled }: any) => (
    <input
      type="range"
      value={value[0]}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      data-testid="slider"
    />
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

describe('QualityThresholdSettings', () => {
  const defaultThresholds: QualityThreshold = {
    dataCompletenessPercentage: 80,
    requiredFieldsComplete: true,
    hasMediaAttachments: false,
  };

  const mockProps = {
    thresholds: defaultThresholds,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders quality threshold settings', () => {
    render(<QualityThresholdSettings {...mockProps} />);

    expect(screen.getByText('Quality Thresholds')).toBeInTheDocument();
    expect(screen.getByText('Data Completeness Percentage')).toBeInTheDocument();
    expect(screen.getByText('Required Fields Complete')).toBeInTheDocument();
    expect(screen.getByText('Require Media Attachments')).toBeInTheDocument();
  });

  it('displays correct completeness percentage and label', () => {
    render(<QualityThresholdSettings {...mockProps} />);

    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('updates data completeness percentage via slider', async () => {
    render(<QualityThresholdSettings {...mockProps} />);

    const slider = screen.getByTestId('slider');
    
    await act(async () => {
      fireEvent.change(slider, { target: { value: '95' } });
    });

    expect(mockProps.onChange).toHaveBeenCalledWith({
      ...defaultThresholds,
      dataCompletenessPercentage: 95,
    });
  });

  it('toggles required fields complete', async () => {
    render(<QualityThresholdSettings {...mockProps} />);

    const switches = screen.getAllByTestId('switch');
    const requiredFieldsSwitch = switches[0]; // First switch should be required fields
    
    await act(async () => {
      fireEvent.click(requiredFieldsSwitch);
    });

    expect(mockProps.onChange).toHaveBeenCalledWith({
      ...defaultThresholds,
      requiredFieldsComplete: false,
    });
  });

  it('toggles media attachments requirement', async () => {
    render(<QualityThresholdSettings {...mockProps} />);

    const switches = screen.getAllByTestId('switch');
    const mediaAttachmentsSwitch = switches[1]; // Second switch should be media attachments
    
    await act(async () => {
      fireEvent.click(mediaAttachmentsSwitch);
    });

    expect(mockProps.onChange).toHaveBeenCalledWith({
      ...defaultThresholds,
      hasMediaAttachments: true,
    });
  });

  it('enables GPS accuracy settings when toggled', async () => {
    render(<QualityThresholdSettings {...mockProps} />);

    const switches = screen.getAllByTestId('switch');
    const gpsSwitch = switches[2]; // Third switch should be GPS accuracy
    
    await act(async () => {
      fireEvent.click(gpsSwitch);
    });

    expect(mockProps.onChange).toHaveBeenCalledWith({
      ...defaultThresholds,
      gpsAccuracyMeters: 10, // Default value
    });
  });

  it('displays GPS accuracy slider when enabled', () => {
    const thresholdsWithGPS = {
      ...defaultThresholds,
      gpsAccuracyMeters: 15,
    };

    render(<QualityThresholdSettings thresholds={thresholdsWithGPS} onChange={mockProps.onChange} />);

    expect(screen.getByText('GPS Accuracy Threshold (meters)')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument(); // GPS accuracy label
  });

  it('enables assessor reputation score when toggled', async () => {
    render(<QualityThresholdSettings {...mockProps} />);

    const switches = screen.getAllByTestId('switch');
    const reputationSwitch = switches[3]; // Fourth switch should be reputation
    
    await act(async () => {
      fireEvent.click(reputationSwitch);
    });

    expect(mockProps.onChange).toHaveBeenCalledWith({
      ...defaultThresholds,
      assessorReputationScore: 70, // Default value
    });
  });

  it('updates assessor reputation score input', async () => {
    const thresholdsWithReputation = {
      ...defaultThresholds,
      assessorReputationScore: 80,
    };

    render(<QualityThresholdSettings thresholds={thresholdsWithReputation} onChange={mockProps.onChange} />);

    const reputationInput = screen.getByDisplayValue('80');
    
    await act(async () => {
      fireEvent.change(reputationInput, { target: { value: '85' } });
    });

    expect(mockProps.onChange).toHaveBeenCalledWith({
      ...thresholdsWithReputation,
      assessorReputationScore: 85,
    });
  });

  it('enables time since submission when toggled', async () => {
    render(<QualityThresholdSettings {...mockProps} />);

    const switches = screen.getAllByTestId('switch');
    const timeSwitch = switches[4]; // Fifth switch should be time
    
    await act(async () => {
      fireEvent.click(timeSwitch);
    });

    expect(mockProps.onChange).toHaveBeenCalledWith({
      ...defaultThresholds,
      timeSinceSubmission: 60, // Default value
    });
  });

  it('enables batch size limit when toggled', async () => {
    render(<QualityThresholdSettings {...mockProps} />);

    const switches = screen.getAllByTestId('switch');
    const batchSizeSwitch = switches[5]; // Sixth switch should be batch size
    
    await act(async () => {
      fireEvent.click(batchSizeSwitch);
    });

    expect(mockProps.onChange).toHaveBeenCalledWith({
      ...defaultThresholds,
      maxBatchSize: 10, // Default value
    });
  });

  it('displays validation warning for low completeness threshold', () => {
    const lowThresholds = {
      ...defaultThresholds,
      dataCompletenessPercentage: 65,
    };

    render(<QualityThresholdSettings thresholds={lowThresholds} onChange={mockProps.onChange} />);

    expect(screen.getByText(/Low completeness threshold may result in poor quality/)).toBeInTheDocument();
  });

  it('displays validation warning for high GPS accuracy threshold', () => {
    const highGPSThresholds = {
      ...defaultThresholds,
      gpsAccuracyMeters: 30,
    };

    render(<QualityThresholdSettings thresholds={highGPSThresholds} onChange={mockProps.onChange} />);

    expect(screen.getByText(/High GPS accuracy threshold may allow inaccurate location data/)).toBeInTheDocument();
  });

  it('shows correct completeness quality labels', () => {
    // Test excellent rating (95%+)
    const excellentThresholds = { ...defaultThresholds, dataCompletenessPercentage: 95 };
    const { rerender } = render(<QualityThresholdSettings thresholds={excellentThresholds} onChange={mockProps.onChange} />);
    expect(screen.getByText('Excellent')).toBeInTheDocument();

    // Test good rating (85-94%)
    const goodThresholds = { ...defaultThresholds, dataCompletenessPercentage: 87 };
    rerender(<QualityThresholdSettings thresholds={goodThresholds} onChange={mockProps.onChange} />);
    expect(screen.getByText('Good')).toBeInTheDocument();

    // Test fair rating (70-84%)
    const fairThresholds = { ...defaultThresholds, dataCompletenessPercentage: 75 };
    rerender(<QualityThresholdSettings thresholds={fairThresholds} onChange={mockProps.onChange} />);
    expect(screen.getByText('Fair')).toBeInTheDocument();

    // Test poor rating (<70%)
    const poorThresholds = { ...defaultThresholds, dataCompletenessPercentage: 65 };
    rerender(<QualityThresholdSettings thresholds={poorThresholds} onChange={mockProps.onChange} />);
    expect(screen.getByText('Poor')).toBeInTheDocument();
  });

  it('shows correct GPS accuracy labels', () => {
    // Test very high accuracy (≤5m)
    const veryHighAccuracy = { ...defaultThresholds, gpsAccuracyMeters: 3 };
    const { rerender } = render(<QualityThresholdSettings thresholds={veryHighAccuracy} onChange={mockProps.onChange} />);
    expect(screen.getByText('Very High')).toBeInTheDocument();

    // Test high accuracy (6-10m)
    const highAccuracy = { ...defaultThresholds, gpsAccuracyMeters: 8 };
    rerender(<QualityThresholdSettings thresholds={highAccuracy} onChange={mockProps.onChange} />);
    expect(screen.getByText('High')).toBeInTheDocument();

    // Test medium accuracy (11-25m)
    const mediumAccuracy = { ...defaultThresholds, gpsAccuracyMeters: 20 };
    rerender(<QualityThresholdSettings thresholds={mediumAccuracy} onChange={mockProps.onChange} />);
    expect(screen.getByText('Medium')).toBeInTheDocument();

    // Test low accuracy (>25m)
    const lowAccuracy = { ...defaultThresholds, gpsAccuracyMeters: 35 };
    rerender(<QualityThresholdSettings thresholds={lowAccuracy} onChange={mockProps.onChange} />);
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('disables all controls when disabled prop is true', () => {
    render(<QualityThresholdSettings {...mockProps} disabled={true} />);

    const slider = screen.getByTestId('slider');
    const switches = screen.getAllByTestId('switch');

    expect(slider).toBeDisabled();
    switches.forEach(switchElement => {
      expect(switchElement).toBeDisabled();
    });
  });

  it('handles undefined optional threshold values gracefully', () => {
    const minimalThresholds: QualityThreshold = {
      dataCompletenessPercentage: 75,
      requiredFieldsComplete: true,
      // All optional fields undefined
    };

    render(<QualityThresholdSettings thresholds={minimalThresholds} onChange={mockProps.onChange} />);

    expect(screen.getByText('Quality Thresholds')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    
    // Should not crash and should show disabled state for optional features
    const switches = screen.getAllByTestId('switch');
    expect(switches.length).toBeGreaterThan(0);
  });
});