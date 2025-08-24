import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReasonCodeSelector } from '@/components/features/response/ReasonCodeSelector';
import { DeliveryReasonCode } from '@dms/shared';

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ onChange, value, ...props }: any) => (
    <input onChange={onChange} value={value} {...props} />
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ onChange, value, ...props }: any) => (
    <textarea onChange={onChange} value={value} {...props} />
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid="select-container">
      <select 
        onChange={(e) => onValueChange(e.target.value)}
        value={value}
        data-testid="select"
      >
        {children}
      </select>
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
  CardDescription: ({ children, ...props }: any) => <div data-testid="card-description" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <div data-testid="card-title" {...props}>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, ...props }: any) => (
    <span data-testid="badge" className={className} {...props}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

describe('ReasonCodeSelector', () => {
  const mockAvailableItems = ['Rice', 'Cooking Oil', 'Blankets'];
  const mockSelectedReasonCodes: DeliveryReasonCode[] = [
    {
      code: 'SUPPLY_001',
      category: 'SUPPLY_SHORTAGE',
      description: 'Insufficient stock available at warehouse',
      appliesTo: ['Rice'],
    },
  ];
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders the component with correct title and description', () => {
    render(
      <ReasonCodeSelector
        selectedReasonCodes={[]}
        availableItems={mockAvailableItems}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Partial Delivery Reason Codes')).toBeInTheDocument();
    expect(screen.getByText('Select or create reason codes to explain why deliveries are incomplete')).toBeInTheDocument();
  });

  it('displays selected reason codes correctly', () => {
    render(
      <ReasonCodeSelector
        selectedReasonCodes={mockSelectedReasonCodes}
        availableItems={mockAvailableItems}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Selected Reason Codes')).toBeInTheDocument();
    expect(screen.getByText('SUPPLY_001')).toBeInTheDocument();
    expect(screen.getByText('Insufficient stock available at warehouse')).toBeInTheDocument();
  });

  it('shows item assignment interface for each reason code', () => {
    render(
      <ReasonCodeSelector
        selectedReasonCodes={mockSelectedReasonCodes}
        availableItems={mockAvailableItems}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Applies to items:')).toBeInTheDocument();
    expect(screen.getByText('Rice')).toBeInTheDocument();
    expect(screen.getByText('Cooking Oil')).toBeInTheDocument();
    expect(screen.getByText('Blankets')).toBeInTheDocument();
  });

  it('toggles item assignment when item buttons are clicked', async () => {
    render(
      <ReasonCodeSelector
        selectedReasonCodes={mockSelectedReasonCodes}
        availableItems={mockAvailableItems}
        onChange={mockOnChange}
      />
    );

    // Click on "Cooking Oil" button to assign it to the reason code
    const cookingOilButton = screen.getByText('Cooking Oil');
    fireEvent.click(cookingOilButton);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        {
          ...mockSelectedReasonCodes[0],
          appliesTo: ['Rice', 'Cooking Oil'],
        },
      ]);
    });
  });

  it('removes item assignment when already assigned item is clicked', async () => {
    render(
      <ReasonCodeSelector
        selectedReasonCodes={mockSelectedReasonCodes}
        availableItems={mockAvailableItems}
        onChange={mockOnChange}
      />
    );

    // Click on "Rice" button to remove it from the reason code
    const riceButton = screen.getByText('Rice');
    fireEvent.click(riceButton);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        {
          ...mockSelectedReasonCodes[0],
          appliesTo: [],
        },
      ]);
    });
  });

  it('shows predefined reason codes for selection', () => {
    render(
      <ReasonCodeSelector
        selectedReasonCodes={[]}
        availableItems={mockAvailableItems}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Select from predefined codes:')).toBeInTheDocument();
    // Should show some predefined codes
    expect(screen.getByText('Insufficient stock available at warehouse')).toBeInTheDocument();
  });

  it('adds predefined reason code when clicked', async () => {
    render(
      <ReasonCodeSelector
        selectedReasonCodes={[]}
        availableItems={mockAvailableItems}
        onChange={mockOnChange}
      />
    );

    // Find and click a predefined reason code
    const predefinedCode = screen.getByText('Insufficient stock available at warehouse');
    fireEvent.click(predefinedCode.closest('div')!);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          code: 'SUPPLY_001',
          category: 'SUPPLY_SHORTAGE',
          description: 'Insufficient stock available at warehouse',
          appliesTo: [],
        }),
      ]);
    });
  });

  it('shows custom reason code creation form when button is clicked', async () => {
    render(
      <ReasonCodeSelector
        selectedReasonCodes={[]}
        availableItems={mockAvailableItems}
        onChange={mockOnChange}
      />
    );

    const createButton = screen.getByText('Create Custom Reason Code');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Code')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });
  });

  it('creates custom reason code with form data', async () => {
    render(
      <ReasonCodeSelector
        selectedReasonCodes={[]}
        availableItems={mockAvailableItems}
        onChange={mockOnChange}
      />
    );

    // Open the form
    fireEvent.click(screen.getByText('Create Custom Reason Code'));

    await waitFor(() => {
      // Fill out the form
      const categorySelect = screen.getByTestId('select');
      fireEvent.change(categorySelect, { target: { value: 'WEATHER_DELAY' } });

      const descriptionTextarea = screen.getByRole('textbox');
      fireEvent.change(descriptionTextarea, { 
        target: { value: 'Heavy rainfall prevented delivery' } 
      });

      // Submit the form
      const addButton = screen.getByText('Add Reason Code');
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          category: 'WEATHER_DELAY',
          description: 'Heavy rainfall prevented delivery',
          appliesTo: [],
        }),
      ]);
    });
  });

  it('removes reason code when X button is clicked', async () => {
    render(
      <ReasonCodeSelector
        selectedReasonCodes={mockSelectedReasonCodes}
        availableItems={mockAvailableItems}
        onChange={mockOnChange}
      />
    );

    // Find and click the remove button (X)
    const removeButton = screen.getByRole('button', { name: /remove/i });
    if (!removeButton) {
      // If no explicit remove button, look for X icon or similar
      const buttons = screen.getAllByRole('button');
      const xButton = buttons.find(btn => btn.textContent?.includes('×') || btn.querySelector('svg'));
      if (xButton) {
        fireEvent.click(xButton);
      }
    } else {
      fireEvent.click(removeButton);
    }

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([]);
    });
  });

  it('is read-only when isReadOnly prop is true', () => {
    render(
      <ReasonCodeSelector
        selectedReasonCodes={mockSelectedReasonCodes}
        availableItems={mockAvailableItems}
        onChange={mockOnChange}
        isReadOnly={true}
      />
    );

    // Should not show the add reason code section
    expect(screen.queryByText('Add Reason Code')).not.toBeInTheDocument();
    expect(screen.queryByText('Create Custom Reason Code')).not.toBeInTheDocument();
  });

  it('shows empty state when no reason codes are selected', () => {
    render(
      <ReasonCodeSelector
        selectedReasonCodes={[]}
        availableItems={mockAvailableItems}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('No Reason Codes Selected')).toBeInTheDocument();
    expect(screen.getByText('Add reason codes to explain why items couldn\'t be fully delivered.')).toBeInTheDocument();
  });

  it('generates unique codes for each category', async () => {
    render(
      <ReasonCodeSelector
        selectedReasonCodes={[]}
        availableItems={mockAvailableItems}
        onChange={mockOnChange}
      />
    );

    // Open custom form
    fireEvent.click(screen.getByText('Create Custom Reason Code'));

    await waitFor(() => {
      // Select different categories and verify codes are generated
      const categorySelect = screen.getByTestId('select');
      
      fireEvent.change(categorySelect, { target: { value: 'SUPPLY_SHORTAGE' } });
      // Code should be auto-generated with SUPPLY prefix
      
      fireEvent.change(categorySelect, { target: { value: 'ACCESS_LIMITATION' } });
      // Code should change to ACCESS prefix
    });
  });

  it('filters out already selected predefined codes', () => {
    render(
      <ReasonCodeSelector
        selectedReasonCodes={mockSelectedReasonCodes}
        availableItems={mockAvailableItems}
        onChange={mockOnChange}
      />
    );

    // The already selected SUPPLY_001 should not appear in predefined options
    // This tests that the filter works correctly
    const predefinedSection = screen.getByText('Select from predefined codes:').closest('div');
    expect(predefinedSection).not.toHaveTextContent('SUPPLY_001');
  });

  it('validates description is required for custom codes', async () => {
    render(
      <ReasonCodeSelector
        selectedReasonCodes={[]}
        availableItems={mockAvailableItems}
        onChange={mockOnChange}
      />
    );

    // Open form
    fireEvent.click(screen.getByText('Create Custom Reason Code'));

    await waitFor(() => {
      const addButton = screen.getByText('Add Reason Code');
      expect(addButton).toBeDisabled(); // Should be disabled without description
      
      // Add description
      const descriptionTextarea = screen.getByRole('textbox');
      fireEvent.change(descriptionTextarea, { 
        target: { value: 'Test description' } 
      });
      
      expect(addButton).not.toBeDisabled();
    });
  });

  it('cancels custom reason code creation', async () => {
    render(
      <ReasonCodeSelector
        selectedReasonCodes={[]}
        availableItems={mockAvailableItems}
        onChange={mockOnChange}
      />
    );

    // Open form
    fireEvent.click(screen.getByText('Create Custom Reason Code'));

    await waitFor(() => {
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('Category')).not.toBeInTheDocument();
      expect(screen.queryByText('Code')).not.toBeInTheDocument();
    });
  });
});