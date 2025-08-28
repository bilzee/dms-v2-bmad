import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PriorityRuleManager } from '@/components/features/sync/PriorityRuleManager';

// Mock the sync store
jest.mock('@/stores/sync.store', () => ({
  useSyncStore: () => ({
    priorityRules: mockPriorityRules,
    isLoadingRules: false,
    error: null,
    loadPriorityRules: mockLoadPriorityRules,
    createPriorityRule: mockCreatePriorityRule,
    updatePriorityRule: mockUpdatePriorityRule,
    deletePriorityRule: mockDeletePriorityRule,
  }),
}));

const mockPriorityRules = [
  {
    id: 'rule-1',
    name: 'Health Emergency Rule',
    entityType: 'ASSESSMENT',
    conditions: [],
    priorityModifier: 20,
    isActive: true,
    createdBy: 'test-user',
    createdAt: new Date(),
  }
];

// Mock functions
const mockLoadPriorityRules = jest.fn();
const mockCreatePriorityRule = jest.fn();
const mockUpdatePriorityRule = jest.fn();
const mockDeletePriorityRule = jest.fn();

describe('PriorityRuleManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders priority rules list correctly', async () => {
    render(<PriorityRuleManager />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Priority Rules')).toBeInTheDocument();
    });
    
    // Use getByRole instead of getByText to avoid multiple elements issue
    expect(screen.getByRole('heading', { name: /priority rules/i })).toBeInTheDocument();
    expect(screen.getByText('Health Emergency Rule')).toBeInTheDocument();
  });

  it('opens create rule modal when create button is clicked', async () => {
    const user = userEvent.setup();
    render(<PriorityRuleManager />);

    // Click the create rule button
    const createButton = screen.getByRole('button', { name: /create rule/i });
    await user.click(createButton);

    // Check modal is open
    await waitFor(() => {
      expect(screen.getByText('Create Priority Rule')).toBeInTheDocument();
    });
  });

  it('handles entity type selection correctly', async () => {
    const user = userEvent.setup();
    render(<PriorityRuleManager />);

    // Open create modal
    const createButton = screen.getByRole('button', { name: /create rule/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('entity-type-select')).toBeInTheDocument();
    });

    // Use more specific query for entity type selection
    const entityTypeSelect = screen.getByTestId('entity-type-select');
    await user.click(entityTypeSelect);

    // FIX: Use getAllByText to handle multiple "ASSESSMENT" text elements
    const assessmentOptions = screen.getAllByText('Assessment');
    expect(assessmentOptions.length).toBeGreaterThan(0);
    
    // Select the first option (the one in the dropdown)
    await user.click(assessmentOptions[0]);
    
    // Verify selection
    expect(entityTypeSelect).toHaveTextContent('Assessment');
  });

  it('shows examples for selected entity type', async () => {
    const user = userEvent.setup();
    render(<PriorityRuleManager />);

    // Open create modal
    const createButton = screen.getByRole('button', { name: /create rule/i });
    await user.click(createButton);

    await waitFor(() => {
      const examplesSection = screen.getByTestId('examples-section');
      expect(examplesSection).toBeInTheDocument();
    });

    // Check examples are shown for ASSESSMENT type (default)
    const examplesSection = screen.getByTestId('examples-section');
    expect(within(examplesSection).getByText('Health Emergency Priority')).toBeInTheDocument();
  });

  it('adds and removes conditions correctly', async () => {
    const user = userEvent.setup();
    render(<PriorityRuleManager />);

    // Open create modal
    const createButton = screen.getByRole('button', { name: /create rule/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('add-condition-btn')).toBeInTheDocument();
    });

    // Add a condition
    const addConditionBtn = screen.getByTestId('add-condition-btn');
    await user.click(addConditionBtn);

    // Check condition was added
    await waitFor(() => {
      expect(screen.getByText('Condition 1')).toBeInTheDocument();
    });

    // Remove the condition
    const removeConditionBtn = screen.getByTestId('remove-condition-0');
    await user.click(removeConditionBtn);

    // Check condition was removed
    await waitFor(() => {
      expect(screen.getByTestId('no-conditions-state')).toBeInTheDocument();
    });
  });

  it('creates a new priority rule successfully', async () => {
    const user = userEvent.setup();
    render(<PriorityRuleManager />);

    // Open create modal
    const createButton = screen.getByRole('button', { name: /create rule/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('rule-name-input')).toBeInTheDocument();
    });

    // Fill in rule name
    const nameInput = screen.getByTestId('rule-name-input');
    await user.type(nameInput, 'Test Emergency Rule');

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create rule/i });
    await user.click(submitButton);

    // Verify the rule creation was called
    await waitFor(() => {
      expect(mockCreatePriorityRule).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Emergency Rule',
          entityType: 'ASSESSMENT',
        })
      );
    });
  });

  it('edits existing rule correctly', async () => {
    const user = userEvent.setup();
    render(<PriorityRuleManager />);

    await waitFor(() => {
      expect(screen.getByTestId('edit-rule-rule-1')).toBeInTheDocument();
    });

    // Click edit button for the first rule
    const editButton = screen.getByTestId('edit-rule-rule-1');
    await user.click(editButton);

    // Modal should open with existing data
    await waitFor(() => {
      expect(screen.getByDisplayValue('Health Emergency Rule')).toBeInTheDocument();
    });
  });

  it('deletes rule with confirmation', async () => {
    // Mock window.confirm
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    
    const user = userEvent.setup();
    render(<PriorityRuleManager />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-rule-rule-1')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButton = screen.getByTestId('delete-rule-rule-1');
    await user.click(deleteButton);

    // Verify confirmation and deletion
    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this priority rule?');
    expect(mockDeletePriorityRule).toHaveBeenCalledWith('rule-1');
    
    confirmSpy.mockRestore();
  });

  // Additional tests for different entity types
  it.each([
    ['ASSESSMENT', 'Assessment'],
    ['RESPONSE', 'Response'],
    ['MEDIA', 'Media']
  ])('shows correct examples for %s entity type', async (entityType, displayName) => {
    const user = userEvent.setup();
    render(<PriorityRuleManager />);

    const createButton = screen.getByRole('button', { name: /create rule/i });
    await user.click(createButton);

    await waitFor(() => {
      const entityTypeSelect = screen.getByTestId('entity-type-select');
      expect(entityTypeSelect).toBeInTheDocument();
    });

    // Select entity type
    const entityTypeSelect = screen.getByTestId('entity-type-select');
    await user.click(entityTypeSelect);

    // FIX: Use getAllByText and find the right option
    const options = screen.getAllByText(displayName);
    const dropdownOption = options.find(option => 
      option.closest('[role="option"]') !== null
    );
    
    if (dropdownOption) {
      await user.click(dropdownOption);
    }

    // Verify examples section updates
    await waitFor(() => {
      const examplesSection = screen.getByTestId('examples-section');
      expect(within(examplesSection).getByText(`Example Rules for ${entityType}`)).toBeInTheDocument();
    });
  });
});