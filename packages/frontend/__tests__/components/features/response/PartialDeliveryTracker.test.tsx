import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PartialDeliveryTracker } from '@/components/features/response/PartialDeliveryTracker';
import { ItemCompletionData } from '@dms/shared';

// Mock the UI components
jest.mock('@/components/ui/input', () => ({
  Input: ({ onChange, value, ...props }: any) => (
    <input onChange={onChange} value={value} {...props} data-testid="quantity-input" />
  ),
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, ...props }: any) => (
    <div data-testid="progress-bar" data-value={value} {...props}>
      {value}%
    </div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, ...props }: any) => (
    <span data-testid="badge" data-variant={variant} {...props}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
  CardDescription: ({ children, ...props }: any) => <div data-testid="card-description" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <div data-testid="card-title" {...props}>{children}</div>,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

describe('PartialDeliveryTracker', () => {
  const mockPlannedItems = [
    { item: 'Rice', quantity: 100, unit: 'kg' },
    { item: 'Cooking Oil', quantity: 20, unit: 'liters' },
    { item: 'Blankets', quantity: 50, unit: 'pieces' },
  ];

  const mockInitialCompletionData: ItemCompletionData[] = [
    {
      item: 'Rice',
      plannedQuantity: 100,
      deliveredQuantity: 80,
      remainingQuantity: 20,
      percentageComplete: 80,
      unit: 'kg',
      reasonCodes: [],
      followUpRequired: true,
    },
    {
      item: 'Cooking Oil',
      plannedQuantity: 20,
      deliveredQuantity: 20,
      remainingQuantity: 0,
      percentageComplete: 100,
      unit: 'liters',
      reasonCodes: [],
      followUpRequired: false,
    },
  ];

  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders overall progress summary correctly', () => {
    render(
      <PartialDeliveryTracker
        plannedItems={mockPlannedItems}
        initialCompletionData={mockInitialCompletionData}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Overall Delivery Progress')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getByText('Partial')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Total Items')).toBeInTheDocument();
  });

  it('initializes with planned items when no initial completion data provided', () => {
    render(
      <PartialDeliveryTracker
        plannedItems={mockPlannedItems}
        onChange={mockOnChange}
      />
    );

    // Should show all items as pending initially
    expect(screen.getByText('3')).toBeInTheDocument(); // Total items
    expect(screen.getByText('Rice')).toBeInTheDocument();
    expect(screen.getByText('Cooking Oil')).toBeInTheDocument();
    expect(screen.getByText('Blankets')).toBeInTheDocument();
  });

  it('displays correct completion statistics', async () => {
    render(
      <PartialDeliveryTracker
        plannedItems={mockPlannedItems}
        initialCompletionData={mockInitialCompletionData}
        onChange={mockOnChange}
      />
    );

    await waitFor(() => {
      // Should calculate overall percentage (80% + 100% + 0%) / 3 = 60%
      expect(screen.getByText('60.0%')).toBeInTheDocument();
    });
  });

  it('updates quantity and calls onChange when input changes', async () => {
    render(
      <PartialDeliveryTracker
        plannedItems={mockPlannedItems}
        onChange={mockOnChange}
      />
    );

    // Find the first quantity input (for Rice)
    const inputs = screen.getAllByTestId('quantity-input');
    const riceInput = inputs[0];

    fireEvent.change(riceInput, { target: { value: '75' } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            item: 'Rice',
            deliveredQuantity: 75,
            percentageComplete: 75,
            remainingQuantity: 25,
            followUpRequired: true,
          }),
        ])
      );
    });
  });

  it('calculates percentage completion correctly', async () => {
    render(
      <PartialDeliveryTracker
        plannedItems={[{ item: 'Rice', quantity: 100, unit: 'kg' }]}
        onChange={mockOnChange}
      />
    );

    const input = screen.getByTestId('quantity-input');
    fireEvent.change(input, { target: { value: '75' } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          percentageComplete: 75,
          remainingQuantity: 25,
        }),
      ]);
    });
  });

  it('handles 100% completion correctly', async () => {
    render(
      <PartialDeliveryTracker
        plannedItems={[{ item: 'Rice', quantity: 100, unit: 'kg' }]}
        onChange={mockOnChange}
      />
    );

    const input = screen.getByTestId('quantity-input');
    fireEvent.change(input, { target: { value: '100' } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          percentageComplete: 100,
          remainingQuantity: 0,
          followUpRequired: false,
        }),
      ]);
    });
  });

  it('prevents negative quantities', async () => {
    render(
      <PartialDeliveryTracker
        plannedItems={[{ item: 'Rice', quantity: 100, unit: 'kg' }]}
        onChange={mockOnChange}
      />
    );

    const input = screen.getByTestId('quantity-input');
    fireEvent.change(input, { target: { value: '-5' } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          deliveredQuantity: 0,
          percentageComplete: 0,
        }),
      ]);
    });
  });

  it('caps percentage at 100% when delivered exceeds planned', async () => {
    render(
      <PartialDeliveryTracker
        plannedItems={[{ item: 'Rice', quantity: 100, unit: 'kg' }]}
        onChange={mockOnChange}
      />
    );

    const input = screen.getByTestId('quantity-input');
    fireEvent.change(input, { target: { value: '150' } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          deliveredQuantity: 150,
          percentageComplete: 100, // Should be capped at 100%
          remainingQuantity: 0, // Should not be negative
        }),
      ]);
    });
  });

  it('displays correct status badges and icons', () => {
    render(
      <PartialDeliveryTracker
        plannedItems={mockPlannedItems}
        initialCompletionData={mockInitialCompletionData}
        onChange={mockOnChange}
      />
    );

    // Should show different status badges for different completion levels
    const badges = screen.getAllByTestId('badge');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('is read-only when isReadOnly prop is true', () => {
    render(
      <PartialDeliveryTracker
        plannedItems={mockPlannedItems}
        onChange={mockOnChange}
        isReadOnly={true}
      />
    );

    const inputs = screen.getAllByTestId('quantity-input');
    inputs.forEach(input => {
      expect(input).toBeDisabled();
    });
  });

  it('shows empty state when no planned items', () => {
    render(
      <PartialDeliveryTracker
        plannedItems={[]}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('No Items to Track')).toBeInTheDocument();
    expect(screen.getByText('No planned items available for delivery tracking. Please ensure the response plan includes items to deliver.')).toBeInTheDocument();
  });

  it('updates follow-up required flag based on completion', async () => {
    render(
      <PartialDeliveryTracker
        plannedItems={[{ item: 'Rice', quantity: 100, unit: 'kg' }]}
        onChange={mockOnChange}
      />
    );

    const input = screen.getByTestId('quantity-input');
    
    // Partial completion should require follow-up
    fireEvent.change(input, { target: { value: '50' } });
    
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          followUpRequired: true,
        }),
      ]);
    });

    // Full completion should not require follow-up
    fireEvent.change(input, { target: { value: '100' } });
    
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          followUpRequired: false,
        }),
      ]);
    });
  });

  it('handles multiple items independently', async () => {
    render(
      <PartialDeliveryTracker
        plannedItems={mockPlannedItems}
        onChange={mockOnChange}
      />
    );

    const inputs = screen.getAllByTestId('quantity-input');
    
    // Update Rice quantity
    fireEvent.change(inputs[0], { target: { value: '80' } });
    
    // Update Cooking Oil quantity
    fireEvent.change(inputs[1], { target: { value: '15' } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          item: 'Rice',
          deliveredQuantity: 80,
          percentageComplete: 80,
        }),
        expect.objectContaining({
          item: 'Cooking Oil',
          deliveredQuantity: 15,
          percentageComplete: 75,
        }),
        expect.objectContaining({
          item: 'Blankets',
          deliveredQuantity: 0,
          percentageComplete: 0,
        }),
      ]);
    });
  });

  it('rounds percentage to 2 decimal places', async () => {
    render(
      <PartialDeliveryTracker
        plannedItems={[{ item: 'Test Item', quantity: 3, unit: 'pieces' }]}
        onChange={mockOnChange}
      />
    );

    const input = screen.getByTestId('quantity-input');
    fireEvent.change(input, { target: { value: '1' } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          percentageComplete: 33.33, // 1/3 * 100 = 33.333... should round to 33.33
        }),
      ]);
    });
  });
});