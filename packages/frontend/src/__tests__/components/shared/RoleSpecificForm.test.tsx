import { render, screen, fireEvent } from '@testing-library/react';
import { 
  RoleSpecificForm,
  ConditionalField,
  FormFieldWrapper,
  OrderedFields,
  RoleFormConfig,
  RoleSpecificInput,
  RoleSpecificSelect,
  RoleSpecificTextarea 
} from '@/components/shared/RoleSpecificForm';
import { useRoleInterface } from '@/hooks/useRoleInterface';
import { useRoleContext } from '@/components/providers/RoleContextProvider';

jest.mock('@/hooks/useRoleInterface');
jest.mock('@/components/providers/RoleContextProvider');

const mockUseRoleInterface = useRoleInterface as jest.MockedFunction<typeof useRoleInterface>;
const mockUseRoleContext = useRoleContext as jest.MockedFunction<typeof useRoleContext>;

describe('RoleSpecificForm Components', () => {
  const mockRoleInterface = {
    currentInterface: {
      roleId: 'ASSESSOR_001',
      roleName: 'ASSESSOR' as const,
      forms: {
        conditionalFields: {
          'assessment': ['location', 'severity', 'notes'],
        },
        defaultValues: {
          'assessment.type': 'HEALTH',
          'assessment.severity': 'MEDIUM',
        },
        validationRules: {
          'assessment.severity': { min: 1, max: 5 },
        },
        fieldVisibility: {
          'assessment.location': true,
          'assessment.internal-notes': false,
        },
        fieldOrder: {
          'assessment': ['type', 'location', 'severity', 'description'],
        },
        requiredFields: {
          'assessment': ['type', 'location'],
        },
      },
      dashboard: { layout: 'three-column' as const, widgets: [], refreshInterval: 15000 },
      navigation: { primaryMenuItems: [] },
      preferences: {},
    },
    isFieldVisible: jest.fn(),
    getFieldOrder: jest.fn(),
    hasWidgetAccess: jest.fn(),
  };

  const mockRoleContext = {
    activeRole: { id: 'ASSESSOR_001', name: 'ASSESSOR' as const, permissions: [], isActive: true },
    hasPermission: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoleInterface.mockReturnValue({
      ...mockRoleInterface,
      isLoading: false,
      error: null,
      updatePreferences: jest.fn(),
      resetInterface: jest.fn(),
      getWidgetsByPriority: jest.fn(),
      getVisibleNavigation: jest.fn(),
      canPerformQuickAction: jest.fn(),
      refreshInterface: jest.fn(),
    });
    
    mockUseRoleContext.mockReturnValue({
      ...mockRoleContext,
      assignedRoles: [],
      availableRoles: [],
      isMultiRole: false,
      canSwitchRoles: false,
      switchRole: jest.fn(),
      hasRole: jest.fn(),
      isLoading: false,
      error: null,
      permissions: [],
      hasAnyRole: jest.fn(),
      canAccess: jest.fn(),
      activeRoleName: 'ASSESSOR',
      sessionData: { preferences: {}, workflowState: {}, lastActivity: '', offlineData: false },
      rollbackLastSwitch: jest.fn(),
      savePreferences: jest.fn(),
      saveWorkflowState: jest.fn(),
      getRoleContext: jest.fn(),
      performanceMs: null,
    });
  });

  describe('ConditionalField', () => {
    it('should render field when visible', () => {
      mockRoleInterface.isFieldVisible.mockReturnValue(true);

      render(
        <ConditionalField formType="assessment" fieldName="location">
          <input placeholder="Location field" />
        </ConditionalField>
      );

      expect(screen.getByPlaceholderText('Location field')).toBeInTheDocument();
    });

    it('should not render field when hidden', () => {
      mockRoleInterface.isFieldVisible.mockReturnValue(false);

      render(
        <ConditionalField formType="assessment" fieldName="internal-notes">
          <input placeholder="Internal notes field" />
        </ConditionalField>
      );

      expect(screen.queryByPlaceholderText('Internal notes field')).not.toBeInTheDocument();
    });

    it('should render fallback when field is hidden', () => {
      mockRoleInterface.isFieldVisible.mockReturnValue(false);

      render(
        <ConditionalField 
          formType="assessment" 
          fieldName="internal-notes"
          fallback={<div>Field not available</div>}
        >
          <input placeholder="Internal notes field" />
        </ConditionalField>
      );

      expect(screen.getByText('Field not available')).toBeInTheDocument();
    });
  });

  describe('FormFieldWrapper', () => {
    it('should render field with label and required indicator', () => {
      mockRoleInterface.isFieldVisible.mockReturnValue(true);

      render(
        <FormFieldWrapper 
          formType="assessment" 
          fieldName="type"
          label="Assessment Type"
          required={true}
        >
          <input placeholder="Assessment type" />
        </FormFieldWrapper>
      );

      expect(screen.getByText('Assessment Type')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Assessment type')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      mockRoleInterface.isFieldVisible.mockReturnValue(true);

      render(
        <FormFieldWrapper 
          formType="assessment" 
          fieldName="severity"
          label="Severity"
          description="Rate the severity from 1-5"
        >
          <input placeholder="Severity" />
        </FormFieldWrapper>
      );

      expect(screen.getByText('Rate the severity from 1-5')).toBeInTheDocument();
    });
  });

  describe('OrderedFields', () => {
    it('should render fields in specified order', () => {
      mockRoleInterface.getFieldOrder.mockReturnValue(['severity', 'location', 'type']);

      const fields = {
        type: <div data-testid="type-field">Type Field</div>,
        location: <div data-testid="location-field">Location Field</div>,
        severity: <div data-testid="severity-field">Severity Field</div>,
      };

      render(
        <OrderedFields formType="assessment">
          {fields}
        </OrderedFields>
      );

      const fieldElements = screen.getAllByTestId(/.*-field/);
      expect(fieldElements[0]).toHaveAttribute('data-testid', 'severity-field');
      expect(fieldElements[1]).toHaveAttribute('data-testid', 'location-field');
      expect(fieldElements[2]).toHaveAttribute('data-testid', 'type-field');
    });

    it('should handle fields not in order at the end', () => {
      mockRoleInterface.getFieldOrder.mockReturnValue(['type']);

      const fields = {
        type: <div data-testid="type-field">Type Field</div>,
        location: <div data-testid="location-field">Location Field</div>,
        extra: <div data-testid="extra-field">Extra Field</div>,
      };

      render(
        <OrderedFields formType="assessment">
          {fields}
        </OrderedFields>
      );

      const fieldElements = screen.getAllByTestId(/.*-field/);
      expect(fieldElements[0]).toHaveAttribute('data-testid', 'type-field');
      expect(fieldElements.length).toBe(3);
    });
  });

  describe('RoleFormConfig', () => {
    it('should provide form configuration to children', () => {
      mockRoleInterface.isFieldVisible.mockImplementation((formType, fieldName) => 
        fieldName !== 'internal-notes'
      );
      mockRoleInterface.getFieldOrder.mockReturnValue(['type', 'location']);

      render(
        <RoleFormConfig formType="assessment">
          {({ isFieldVisible, getFieldOrder, getDefaultValue, isFieldRequired }) => (
            <div>
              <div data-testid="field-visible">{isFieldVisible('location').toString()}</div>
              <div data-testid="field-hidden">{isFieldVisible('internal-notes').toString()}</div>
              <div data-testid="field-order">{getFieldOrder().join(',')}</div>
              <div data-testid="default-value">{getDefaultValue('type')}</div>
              <div data-testid="required-field">{isFieldRequired('type').toString()}</div>
            </div>
          )}
        </RoleFormConfig>
      );

      expect(screen.getByTestId('field-visible')).toHaveTextContent('true');
      expect(screen.getByTestId('field-hidden')).toHaveTextContent('false');
      expect(screen.getByTestId('field-order')).toHaveTextContent('type,location');
      expect(screen.getByTestId('default-value')).toHaveTextContent('HEALTH');
      expect(screen.getByTestId('required-field')).toHaveTextContent('true');
    });
  });

  describe('RoleSpecificInput', () => {
    beforeEach(() => {
      mockRoleInterface.isFieldVisible.mockReturnValue(true);
      mockRoleContext.hasPermission.mockReturnValue(true);
    });

    it('should render input with default value', () => {
      render(
        <RoleSpecificInput
          formType="assessment"
          fieldName="type"
          label="Assessment Type"
          placeholder="Enter type"
        />
      );

      const input = screen.getByPlaceholderText('Enter type') as HTMLInputElement;
      expect(input.value).toBe('HEALTH');
    });

    it('should handle value changes', () => {
      const mockOnChange = jest.fn();

      render(
        <RoleSpecificInput
          formType="assessment"
          fieldName="description"
          placeholder="Description"
          onChange={mockOnChange}
        />
      );

      const input = screen.getByPlaceholderText('Description');
      fireEvent.change(input, { target: { value: 'Test description' } });

      expect(mockOnChange).toHaveBeenCalledWith('Test description');
    });

    it('should not render when field is hidden', () => {
      mockRoleInterface.isFieldVisible.mockReturnValue(false);

      render(
        <RoleSpecificInput
          formType="assessment"
          fieldName="internal-notes"
          placeholder="Internal notes"
        />
      );

      expect(screen.queryByPlaceholderText('Internal notes')).not.toBeInTheDocument();
    });

    it('should enforce required validation', () => {
      render(
        <RoleSpecificInput
          formType="assessment"
          fieldName="type"
          label="Assessment Type"
          placeholder="Enter type"
        />
      );

      const input = screen.getByPlaceholderText('Enter type');
      expect(input).toHaveAttribute('required');
    });
  });

  describe('RoleSpecificSelect', () => {
    const selectOptions = [
      { value: 'HEALTH', label: 'Health Assessment' },
      { value: 'WASH', label: 'WASH Assessment' },
      { value: 'SHELTER', label: 'Shelter Assessment' },
    ];

    beforeEach(() => {
      mockRoleInterface.isFieldVisible.mockReturnValue(true);
      mockRoleContext.hasPermission.mockReturnValue(true);
    });

    it('should render select with options', () => {
      render(
        <RoleSpecificSelect
          formType="assessment"
          fieldName="type"
          options={selectOptions}
          label="Assessment Type"
        />
      );

      expect(screen.getByText('Health Assessment')).toBeInTheDocument();
      expect(screen.getByText('WASH Assessment')).toBeInTheDocument();
      expect(screen.getByText('Shelter Assessment')).toBeInTheDocument();
    });

    it('should set default value from configuration', () => {
      render(
        <RoleSpecificSelect
          formType="assessment"
          fieldName="type"
          options={selectOptions}
          label="Assessment Type"
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('HEALTH');
    });

    it('should handle selection changes', () => {
      const mockOnChange = jest.fn();

      render(
        <RoleSpecificSelect
          formType="assessment"
          fieldName="type"
          options={selectOptions}
          onChange={mockOnChange}
        />
      );

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'WASH' } });

      expect(mockOnChange).toHaveBeenCalledWith('WASH');
    });
  });

  describe('RoleSpecificTextarea', () => {
    beforeEach(() => {
      mockRoleInterface.isFieldVisible.mockReturnValue(true);
      mockRoleContext.hasPermission.mockReturnValue(true);
    });

    it('should render textarea with correct attributes', () => {
      render(
        <RoleSpecificTextarea
          formType="assessment"
          fieldName="description"
          label="Description"
          placeholder="Enter description"
          rows={5}
        />
      );

      const textarea = screen.getByPlaceholderText('Enter description') as HTMLTextAreaElement;
      expect(textarea.rows).toBe(5);
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('should handle text changes', () => {
      const mockOnChange = jest.fn();

      render(
        <RoleSpecificTextarea
          formType="assessment"
          fieldName="notes"
          placeholder="Notes"
          onChange={mockOnChange}
        />
      );

      const textarea = screen.getByPlaceholderText('Notes');
      fireEvent.change(textarea, { target: { value: 'Test notes' } });

      expect(mockOnChange).toHaveBeenCalledWith('Test notes');
    });

    it('should apply default values from role configuration', () => {
      render(
        <RoleSpecificTextarea
          formType="assessment"
          fieldName="type"
          placeholder="Type"
        />
      );

      const textarea = screen.getByPlaceholderText('Type') as HTMLTextAreaElement;
      expect(textarea.value).toBe('HEALTH');
    });
  });

  describe('Integration Tests', () => {
    it('should integrate form components with role interface configuration', () => {
      mockRoleInterface.isFieldVisible.mockImplementation((formType, fieldName) => {
        return fieldName !== 'internal-notes';
      });
      
      mockRoleInterface.getFieldOrder.mockReturnValue(['type', 'location', 'severity']);

      render(
        <RoleSpecificForm formType="assessment">
          <OrderedFields formType="assessment">
            {{
              severity: (
                <RoleSpecificSelect
                  formType="assessment"
                  fieldName="severity"
                  options={[
                    { value: 'LOW', label: 'Low' },
                    { value: 'MEDIUM', label: 'Medium' },
                    { value: 'HIGH', label: 'High' },
                  ]}
                  label="Severity"
                />
              ),
              location: (
                <RoleSpecificInput
                  formType="assessment"
                  fieldName="location"
                  label="Location"
                  placeholder="Enter location"
                />
              ),
              type: (
                <RoleSpecificSelect
                  formType="assessment"
                  fieldName="type"
                  options={[
                    { value: 'HEALTH', label: 'Health' },
                    { value: 'WASH', label: 'WASH' },
                  ]}
                  label="Type"
                />
              ),
              'internal-notes': (
                <RoleSpecificTextarea
                  formType="assessment"
                  fieldName="internal-notes"
                  label="Internal Notes"
                  placeholder="Internal notes"
                />
              ),
            }}
          </OrderedFields>
        </RoleSpecificForm>
      );

      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Severity')).toBeInTheDocument();
      expect(screen.queryByText('Internal Notes')).not.toBeInTheDocument();
    });

    it('should handle form without interface configuration', () => {
      mockUseRoleInterface.mockReturnValue({
        ...mockRoleInterface,
        currentInterface: null,
      });

      render(
        <RoleSpecificForm formType="assessment">
          <div>Form content</div>
        </RoleSpecificForm>
      );

      expect(screen.getByText('Form content')).toBeInTheDocument();
    });

    it('should validate required fields correctly', () => {
      mockRoleInterface.isFieldVisible.mockReturnValue(true);

      render(
        <RoleSpecificInput
          formType="assessment"
          fieldName="type"
          label="Assessment Type"
          placeholder="Type"
        />
      );

      const input = screen.getByPlaceholderText('Type');
      const label = screen.getByText('Assessment Type');
      
      expect(input).toHaveAttribute('required');
      expect(label.textContent).toContain('*');
    });

    it('should apply validation rules to form fields', () => {
      mockRoleInterface.isFieldVisible.mockReturnValue(true);

      render(
        <RoleSpecificInput
          formType="assessment"
          fieldName="severity"
          type="number"
          label="Severity"
          placeholder="Severity"
        />
      );

      const input = screen.getByPlaceholderText('Severity');
      expect(input).toHaveAttribute('min', '1');
      expect(input).toHaveAttribute('max', '5');
    });
  });

  describe('Permission Integration', () => {
    it('should respect permission requirements for form fields', () => {
      mockRoleContext.hasPermission.mockReturnValue(false);
      mockRoleInterface.isFieldVisible.mockReturnValue(true);

      render(
        <RoleSpecificInput
          formType="assessment"
          fieldName="confidential-data"
          label="Confidential Data"
          placeholder="Confidential"
          requiredPermissions={['assessments:write-confidential']}
        />
      );

      expect(screen.queryByPlaceholderText('Confidential')).not.toBeInTheDocument();
    });

    it('should show form fields when permissions are granted', () => {
      mockRoleContext.hasPermission.mockReturnValue(true);
      mockRoleInterface.isFieldVisible.mockReturnValue(true);

      render(
        <RoleSpecificInput
          formType="assessment"
          fieldName="location"
          label="Location"
          placeholder="Location"
          requiredPermissions={['assessments:create']}
        />
      );

      expect(screen.getByPlaceholderText('Location')).toBeInTheDocument();
    });
  });

  describe('Form State Management', () => {
    it('should handle controlled input values correctly', () => {
      mockRoleInterface.isFieldVisible.mockReturnValue(true);
      const mockOnChange = jest.fn();

      render(
        <RoleSpecificInput
          formType="assessment"
          fieldName="location"
          value="Test Location"
          onChange={mockOnChange}
          placeholder="Location"
        />
      );

      const input = screen.getByPlaceholderText('Location') as HTMLInputElement;
      expect(input.value).toBe('Test Location');

      fireEvent.change(input, { target: { value: 'New Location' } });
      expect(mockOnChange).toHaveBeenCalledWith('New Location');
    });

    it('should use default values when no value is provided', () => {
      mockRoleInterface.isFieldVisible.mockReturnValue(true);

      render(
        <RoleSpecificSelect
          formType="assessment"
          fieldName="type"
          options={[
            { value: 'HEALTH', label: 'Health' },
            { value: 'WASH', label: 'WASH' },
          ]}
          placeholder="Select type"
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('HEALTH');
    });
  });
});