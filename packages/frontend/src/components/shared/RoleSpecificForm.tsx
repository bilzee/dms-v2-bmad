'use client'

import { ReactNode, useMemo, useCallback } from 'react';
import { useRoleInterface } from '@/hooks/useRoleInterface';
import { FieldGuard, PermissionGuard } from './PermissionGuard';

interface RoleSpecificFormProps {
  formType: string;
  children: ReactNode;
  className?: string;
  onFieldVisibilityChange?: (fieldName: string, visible: boolean) => void;
}

interface ConditionalFieldProps {
  formType: string;
  fieldName: string;
  children: ReactNode;
  fallback?: ReactNode;
  requiredPermissions?: string[];
}

interface FormFieldWrapperProps {
  formType: string;
  fieldName: string;
  children: ReactNode;
  label?: string;
  required?: boolean;
  description?: string;
  className?: string;
}

interface OrderedFieldsProps {
  formType: string;
  children: Record<string, ReactNode>;
  className?: string;
}

interface RoleFormConfigProps {
  formType: string;
  children: (config: {
    isFieldVisible: (fieldName: string) => boolean;
    getFieldOrder: () => string[];
    getDefaultValue: (fieldName: string) => any;
    getValidationRules: (fieldName: string) => any;
    isFieldRequired: (fieldName: string) => boolean;
  }) => ReactNode;
}

export function RoleSpecificForm({ 
  formType, 
  children, 
  className = "",
  onFieldVisibilityChange 
}: RoleSpecificFormProps) {
  const { currentInterface, getFieldOrder } = useRoleInterface();

  const fieldOrder = useMemo(() => getFieldOrder(formType), [formType, getFieldOrder]);

  const formConfig = useMemo(() => {
    if (!currentInterface) return null;
    return currentInterface.forms;
  }, [currentInterface]);

  if (!currentInterface) {
    return (
      <div className={`space-y-4 ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`} data-form-type={formType}>
      {children}
    </div>
  );
}

export function ConditionalField({ 
  formType, 
  fieldName, 
  children, 
  fallback = null,
  requiredPermissions = []
}: ConditionalFieldProps) {
  const { isFieldVisible } = useRoleInterface();

  const isVisible = isFieldVisible(formType, fieldName);

  if (!isVisible) {
    return <>{fallback}</>;
  }

  if (requiredPermissions.length > 0) {
    return (
      <PermissionGuard requiredPermissions={requiredPermissions} fallback={fallback}>
        {children}
      </PermissionGuard>
    );
  }

  return <>{children}</>;
}

export function FormFieldWrapper({ 
  formType, 
  fieldName, 
  children, 
  label,
  required = false,
  description,
  className = ""
}: FormFieldWrapperProps) {
  const { currentInterface } = useRoleInterface();

  const isFieldRequired = useMemo(() => {
    if (!currentInterface) return required;
    
    const requiredFields = currentInterface.forms.requiredFields?.[formType];
    return requiredFields?.includes(fieldName) ?? required;
  }, [currentInterface, formType, fieldName, required]);

  return (
    <ConditionalField formType={formType} fieldName={fieldName}>
      <div className={`space-y-2 ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
            {isFieldRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        {children}
        {description && (
          <p className="text-sm text-gray-500">{description}</p>
        )}
      </div>
    </ConditionalField>
  );
}

export function OrderedFields({ formType, children, className = "" }: OrderedFieldsProps) {
  const { getFieldOrder } = useRoleInterface();
  
  const fieldOrder = getFieldOrder(formType);
  const fieldEntries = Object.entries(children);

  const orderedFields = useMemo(() => {
    if (fieldOrder.length === 0) {
      return fieldEntries;
    }

    const ordered: Array<[string, ReactNode]> = [];
    const unordered: Array<[string, ReactNode]> = [];

    fieldEntries.forEach(([fieldName, fieldComponent]) => {
      const orderIndex = fieldOrder.indexOf(fieldName);
      if (orderIndex >= 0) {
        ordered[orderIndex] = [fieldName, fieldComponent];
      } else {
        unordered.push([fieldName, fieldComponent]);
      }
    });

    return ordered.filter(Boolean).concat(unordered);
  }, [fieldOrder, fieldEntries]);

  return (
    <div className={`space-y-4 ${className}`}>
      {orderedFields.map(([fieldName, fieldComponent]) => (
        <div key={fieldName}>
          {fieldComponent}
        </div>
      ))}
    </div>
  );
}

export function RoleFormConfig({ formType, children }: RoleFormConfigProps) {
  const { currentInterface, isFieldVisible, getFieldOrder } = useRoleInterface();

  const getDefaultValue = useCallback((fieldName: string) => {
    if (!currentInterface) return undefined;
    return currentInterface.forms.defaultValues[fieldName];
  }, [currentInterface]);

  const getValidationRules = useCallback((fieldName: string) => {
    if (!currentInterface) return {};
    return currentInterface.forms.validationRules[fieldName] || {};
  }, [currentInterface]);

  const isFieldRequired = useCallback((fieldName: string) => {
    if (!currentInterface) return false;
    const requiredFields = currentInterface.forms.requiredFields?.[formType];
    return requiredFields?.includes(fieldName) ?? false;
  }, [currentInterface, formType]);

  return (
    <>
      {children({
        isFieldVisible: (fieldName: string) => isFieldVisible(formType, fieldName),
        getFieldOrder: () => getFieldOrder(formType),
        getDefaultValue,
        getValidationRules,
        isFieldRequired,
      })}
    </>
  );
}

interface RoleSpecificInputProps {
  formType: string;
  fieldName: string;
  type?: 'text' | 'email' | 'number' | 'tel' | 'url' | 'password';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  description?: string;
  className?: string;
  requiredPermissions?: string[];
}

export function RoleSpecificInput({
  formType,
  fieldName,
  type = 'text',
  placeholder,
  value,
  onChange,
  label,
  description,
  className = "",
  requiredPermissions = []
}: RoleSpecificInputProps) {
  return (
    <RoleFormConfig formType={formType}>
      {({ isFieldVisible, getDefaultValue, getValidationRules, isFieldRequired }) => {
        if (!isFieldVisible(fieldName)) return null;

        const defaultValue = getDefaultValue(fieldName);
        const validationRules = getValidationRules(fieldName);
        const required = isFieldRequired(fieldName);

        return (
          <PermissionGuard requiredPermissions={requiredPermissions}>
            <FormFieldWrapper
              formType={formType}
              fieldName={fieldName}
              label={label}
              required={required}
              description={description}
              className={className}
            >
              <input
                type={type}
                placeholder={placeholder}
                value={value ?? defaultValue ?? ''}
                onChange={(e) => onChange?.(e.target.value)}
                required={required}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                {...validationRules}
              />
            </FormFieldWrapper>
          </PermissionGuard>
        );
      }}
    </RoleFormConfig>
  );
}

interface RoleSpecificSelectProps {
  formType: string;
  fieldName: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  description?: string;
  placeholder?: string;
  className?: string;
  requiredPermissions?: string[];
}

export function RoleSpecificSelect({
  formType,
  fieldName,
  options,
  value,
  onChange,
  label,
  description,
  placeholder = "Select an option",
  className = "",
  requiredPermissions = []
}: RoleSpecificSelectProps) {
  return (
    <RoleFormConfig formType={formType}>
      {({ isFieldVisible, getDefaultValue, isFieldRequired }) => {
        if (!isFieldVisible(fieldName)) return null;

        const defaultValue = getDefaultValue(fieldName);
        const required = isFieldRequired(fieldName);

        return (
          <PermissionGuard requiredPermissions={requiredPermissions}>
            <FormFieldWrapper
              formType={formType}
              fieldName={fieldName}
              label={label}
              required={required}
              description={description}
              className={className}
            >
              <select
                value={value ?? defaultValue ?? ''}
                onChange={(e) => onChange?.(e.target.value)}
                required={required}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="" disabled>
                  {placeholder}
                </option>
                {options.map((option) => (
                  <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormFieldWrapper>
          </PermissionGuard>
        );
      }}
    </RoleFormConfig>
  );
}

interface RoleSpecificTextareaProps {
  formType: string;
  fieldName: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  description?: string;
  rows?: number;
  className?: string;
  requiredPermissions?: string[];
}

export function RoleSpecificTextarea({
  formType,
  fieldName,
  placeholder,
  value,
  onChange,
  label,
  description,
  rows = 3,
  className = "",
  requiredPermissions = []
}: RoleSpecificTextareaProps) {
  return (
    <RoleFormConfig formType={formType}>
      {({ isFieldVisible, getDefaultValue, isFieldRequired }) => {
        if (!isFieldVisible(fieldName)) return null;

        const defaultValue = getDefaultValue(fieldName);
        const required = isFieldRequired(fieldName);

        return (
          <PermissionGuard requiredPermissions={requiredPermissions}>
            <FormFieldWrapper
              formType={formType}
              fieldName={fieldName}
              label={label}
              required={required}
              description={description}
              className={className}
            >
              <textarea
                placeholder={placeholder}
                value={value ?? defaultValue ?? ''}
                onChange={(e) => onChange?.(e.target.value)}
                required={required}
                rows={rows}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </FormFieldWrapper>
          </PermissionGuard>
        );
      }}
    </RoleFormConfig>
  );
}