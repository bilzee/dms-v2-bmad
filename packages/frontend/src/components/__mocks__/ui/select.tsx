import React from 'react';

export const Select = ({ children, value, onValueChange, ...props }: any) => (
  <div data-testid="select" data-value={value} {...props}>
    {children}
  </div>
);

export const SelectContent = ({ children, ...props }: any) => (
  <div data-testid="select-content" {...props}>
    {children}
  </div>
);

export const SelectItem = ({ children, value, ...props }: any) => (
  <div data-testid="select-item" data-value={value} {...props}>
    {children}
  </div>
);

export const SelectTrigger = ({ children, className, ...props }: any) => (
  <div data-testid="select-trigger" className={className} {...props}>
    {children}
  </div>
);

export const SelectValue = ({ placeholder, ...props }: any) => (
  <span data-testid="select-value" data-placeholder={placeholder} {...props} />
);