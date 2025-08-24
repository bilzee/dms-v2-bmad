import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActualVsPlannedComparison } from '../ActualVsPlannedComparison';
import { ResponseType, ResponseStatus } from '@dms/shared';

const mockResponse = {
  id: 'response-123',
  responseType: ResponseType.HEALTH,
  status: ResponseStatus.PLANNED,
  plannedDate: new Date('2024-01-15T10:00:00Z'),
  affectedEntityId: 'entity-1',
  assessmentId: 'assessment-1',
  responderId: 'responder-1',
  responderName: 'John Doe',
  verificationStatus: 'PENDING' as any,
  syncStatus: 'SYNCED' as any,
  data: {
    medicinesDelivered: [],
    medicalSuppliesDelivered: [],
    healthWorkersDeployed: 2,
    patientsTreated: 50,
  },
  otherItemsDelivered: [
    { item: 'Paracetamol', quantity: 100, unit: 'tablets' },
    { item: 'Bandages', quantity: 25, unit: 'rolls' },
  ],
  deliveryEvidence: [],
  createdAt: new Date('2024-01-10T08:00:00Z'),
  updatedAt: new Date('2024-01-10T08:00:00Z'),
};

const mockActualVsPlannedItems = [
  {
    item: 'Paracetamol',
    plannedQuantity: 100,
    actualQuantity: 95,
    unit: 'tablets',
    variationPercentage: -5,
    variationReason: undefined,
  },
  {
    item: 'Bandages',
    plannedQuantity: 25,
    actualQuantity: 30,
    unit: 'rolls',
    variationPercentage: 20,
    variationReason: 'Extra supplies available',
  },
];

describe('ActualVsPlannedComparison', () => {
  const mockOnItemsUpdate = jest.fn();
  const mockOnContinue = jest.fn();
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders delivery summary with correct statistics', () => {
      render(
        <ActualVsPlannedComparison
          response={mockResponse}
          actualVsPlannedItems={mockActualVsPlannedItems}
          onItemsUpdate={mockOnItemsUpdate}
          onContinue={mockOnContinue}
          onBack={mockOnBack}
        />
      );

      expect(screen.getByText('Delivery Summary')).toBeInTheDocument();
      expect(screen.getByText('Overall Completion')).toBeInTheDocument();
      expect(screen.getByText('Total Items')).toBeInTheDocument();
      expect(screen.getByText('Significant Variations')).toBeInTheDocument();
      expect(screen.getByText('Total Delivered')).toBeInTheDocument();
    });

    it('calculates and displays correct completion percentage', () => {
      render(
        <ActualVsPlannedComparison
          response={mockResponse}
          actualVsPlannedItems={mockActualVsPlannedItems}
          onItemsUpdate={mockOnItemsUpdate}
          onContinue={mockOnContinue}
          onBack={mockOnBack}
        />
      );

      // Total planned: 100 + 25 = 125
      // Total actual: 95 + 30 = 125
      // Completion: 100%
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('renders comparison table with all items', () => {
      render(
        <ActualVsPlannedComparison
          response={mockResponse}
          actualVsPlannedItems={mockActualVsPlannedItems}
          onItemsUpdate={mockOnItemsUpdate}
          onContinue={mockOnContinue}
          onBack={mockOnBack}
        />
      );

      expect(screen.getByText('Item-by-Item Comparison')).toBeInTheDocument();
      expect(screen.getByText('Paracetamol')).toBeInTheDocument();
      expect(screen.getByText('Bandages')).toBeInTheDocument();
      expect(screen.getByText('tablets')).toBeInTheDocument();
      expect(screen.getByText('rolls')).toBeInTheDocument();
    });
  });

  describe('Quantity Editing', () => {
    it('allows editing actual quantities', async () => {
      render(
        <ActualVsPlannedComparison
          response={mockResponse}
          actualVsPlannedItems={mockActualVsPlannedItems}
          onItemsUpdate={mockOnItemsUpdate}
          onContinue={mockOnContinue}
          onBack={mockOnBack}
        />
      );

      // Find the input for Paracetamol actual quantity
      const actualQuantityInputs = screen.getAllByDisplayValue(/95|30/);
      const paracetamolInput = actualQuantityInputs[0]; // First input should be Paracetamol

      await userEvent.clear(paracetamolInput);
      await userEvent.type(paracetamolInput, '90');

      expect(mockOnItemsUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            item: 'Paracetamol',
            quantity: 90,
            unit: 'tablets',
          }),
        ])
      );
    });

    it('calculates variation percentages correctly', () => {
      render(
        <ActualVsPlannedComparison
          response={mockResponse}
          actualVsPlannedItems={mockActualVsPlannedItems}
          onItemsUpdate={mockOnItemsUpdate}
          onContinue={mockOnContinue}
          onBack={mockOnBack}
        />
      );

      // Check for variation percentage badges
      expect(screen.getByText('-5%')).toBeInTheDocument();
      expect(screen.getByText('+20%')).toBeInTheDocument();
    });

    it('shows variation descriptions correctly', () => {
      render(
        <ActualVsPlannedComparison
          response={mockResponse}
          actualVsPlannedItems={mockActualVsPlannedItems}
          onItemsUpdate={mockOnItemsUpdate}
          onContinue={mockOnContinue}
          onBack={mockOnBack}
        />
      );

      expect(screen.getByText('On target')).toBeInTheDocument(); // -5% is within acceptable range
      expect(screen.getByText('Moderate over-delivery')).toBeInTheDocument(); // +20%
    });
  });

  describe('Variation Reasons', () => {
    it('shows reason dropdown for significant variations', () => {
      const itemsWithSignificantVariation = [
        {
          item: 'Paracetamol',
          plannedQuantity: 100,
          actualQuantity: 75, // -25% variation
          unit: 'tablets',
          variationPercentage: -25,
          variationReason: undefined,
        },
      ];

      render(
        <ActualVsPlannedComparison
          response={mockResponse}
          actualVsPlannedItems={itemsWithSignificantVariation}
          onItemsUpdate={mockOnItemsUpdate}
          onContinue={mockOnContinue}
          onBack={mockOnBack}
        />
      );

      expect(screen.getByText('Select reason...')).toBeInTheDocument();
    });

    it('hides reason dropdown for minor variations', () => {
      const itemsWithMinorVariation = [
        {
          item: 'Paracetamol',
          plannedQuantity: 100,
          actualQuantity: 98, // -2% variation
          unit: 'tablets',
          variationPercentage: -2,
          variationReason: undefined,
        },
      ];

      render(
        <ActualVsPlannedComparison
          response={mockResponse}
          actualVsPlannedItems={itemsWithMinorVariation}
          onItemsUpdate={mockOnItemsUpdate}
          onContinue={mockOnContinue}
          onBack={mockOnBack}
        />
      );

      expect(screen.getByText('Not required')).toBeInTheDocument();
    });
  });

  describe('Adding New Items', () => {
    it('renders add new item form', () => {
      render(
        <ActualVsPlannedComparison
          response={mockResponse}
          actualVsPlannedItems={mockActualVsPlannedItems}
          onItemsUpdate={mockOnItemsUpdate}
          onContinue={mockOnContinue}
          onBack={mockOnBack}
        />
      );

      expect(screen.getByText('Add Additional Items')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., Emergency blankets')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('pieces')).toBeInTheDocument();
    });

    it('allows adding new items not in original plan', async () => {
      render(
        <ActualVsPlannedComparison
          response={mockResponse}
          actualVsPlannedItems={mockActualVsPlannedItems}
          onItemsUpdate={mockOnItemsUpdate}
          onContinue={mockOnContinue}
          onBack={mockOnBack}
        />
      );

      const itemNameInput = screen.getByPlaceholderText('e.g., Emergency blankets');
      const quantityInput = screen.getByPlaceholderText('0');
      const unitInput = screen.getByPlaceholderText('pieces');
      const addButton = screen.getByText('Add Item');

      await userEvent.type(itemNameInput, 'Emergency Blankets');
      await userEvent.type(quantityInput, '10');
      await userEvent.type(unitInput, 'pieces');
      
      await userEvent.click(addButton);

      expect(mockOnItemsUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            item: 'Emergency Blankets',
            quantity: 10,
            unit: 'pieces',
          }),
        ])
      );
    });

    it('disables add button with incomplete form data', async () => {
      render(
        <ActualVsPlannedComparison
          response={mockResponse}
          actualVsPlannedItems={mockActualVsPlannedItems}
          onItemsUpdate={mockOnItemsUpdate}
          onContinue={mockOnContinue}
          onBack={mockOnBack}
        />
      );

      const addButton = screen.getByText('Add Item');
      expect(addButton).toBeDisabled();

      // Fill only item name
      const itemNameInput = screen.getByPlaceholderText('e.g., Emergency blankets');
      await userEvent.type(itemNameInput, 'Test Item');
      
      expect(addButton).toBeDisabled();
    });

    it('resets form after successfully adding item', async () => {
      render(
        <ActualVsPlannedComparison
          response={mockResponse}
          actualVsPlannedItems={mockActualVsPlannedItems}
          onItemsUpdate={mockOnItemsUpdate}
          onContinue={mockOnContinue}
          onBack={mockOnBack}
        />
      );

      const itemNameInput = screen.getByPlaceholderText('e.g., Emergency blankets');
      const quantityInput = screen.getByPlaceholderText('0');
      const unitInput = screen.getByPlaceholderText('pieces');
      const addButton = screen.getByText('Add Item');

      await userEvent.type(itemNameInput, 'Test Item');
      await userEvent.type(quantityInput, '5');
      await userEvent.type(unitInput, 'units');
      
      await userEvent.click(addButton);

      // Form should be reset
      expect(itemNameInput).toHaveValue('');
      expect(quantityInput).toHaveValue('');
      expect(unitInput).toHaveValue('');
    });
  });

  describe('Navigation', () => {
    it('calls onBack when back button is clicked', async () => {
      render(
        <ActualVsPlannedComparison
          response={mockResponse}
          actualVsPlannedItems={mockActualVsPlannedItems}
          onItemsUpdate={mockOnItemsUpdate}
          onContinue={mockOnContinue}
          onBack={mockOnBack}
        />
      );

      const backButton = screen.getByText('Back to Review');
      await userEvent.click(backButton);

      expect(mockOnBack).toHaveBeenCalled();
    });

    it('calls onContinue when continue button is clicked', async () => {
      render(
        <ActualVsPlannedComparison
          response={mockResponse}
          actualVsPlannedItems={mockActualVsPlannedItems}
          onItemsUpdate={mockOnItemsUpdate}
          onContinue={mockOnContinue}
          onBack={mockOnBack}
        />
      );

      const continueButton = screen.getByText('Continue to Completion');
      await userEvent.click(continueButton);

      expect(mockOnContinue).toHaveBeenCalled();
    });

    it('disables continue button when no items present', () => {
      render(
        <ActualVsPlannedComparison
          response={mockResponse}
          actualVsPlannedItems={[]}
          onItemsUpdate={mockOnItemsUpdate}
          onContinue={mockOnContinue}
          onBack={mockOnBack}
        />
      );

      const continueButton = screen.getByText('Continue to Completion');
      expect(continueButton).toBeDisabled();
    });
  });

  describe('Statistics Calculation', () => {
    it('calculates significant variations correctly', () => {
      const itemsWithVariations = [
        {
          item: 'Item 1',
          plannedQuantity: 100,
          actualQuantity: 95, // -5% (not significant)
          unit: 'units',
          variationPercentage: -5,
        },
        {
          item: 'Item 2',
          plannedQuantity: 100,
          actualQuantity: 75, // -25% (significant)
          unit: 'units',
          variationPercentage: -25,
        },
        {
          item: 'Item 3',
          plannedQuantity: 100,
          actualQuantity: 130, // +30% (significant)
          unit: 'units',
          variationPercentage: 30,
        },
      ];

      render(
        <ActualVsPlannedComparison
          response={mockResponse}
          actualVsPlannedItems={itemsWithVariations}
          onItemsUpdate={mockOnItemsUpdate}
          onContinue={mockOnContinue}
          onBack={mockOnBack}
        />
      );

      // Should show 2 significant variations (>10%)
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('handles zero planned quantity edge case', () => {
      const itemsWithZeroPlanned = [
        {
          item: 'Unexpected Item',
          plannedQuantity: 0,
          actualQuantity: 10,
          unit: 'units',
          variationPercentage: 100,
          variationReason: 'Additional item not in plan',
        },
      ];

      render(
        <ActualVsPlannedComparison
          response={mockResponse}
          actualVsPlannedItems={itemsWithZeroPlanned}
          onItemsUpdate={mockOnItemsUpdate}
          onContinue={mockOnContinue}
          onBack={mockOnBack}
        />
      );

      expect(screen.getByText('Unexpected Item')).toBeInTheDocument();
      expect(screen.getByText('+100%')).toBeInTheDocument();
    });
  });
});