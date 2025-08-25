import React from 'react';

export const Tabs = ({ children, defaultValue, value, onValueChange, ...props }: any) => (
  <div data-testid="tabs" data-value={value || defaultValue} {...props}>
    {children}
  </div>
);

export const TabsList = ({ children, className, ...props }: any) => (
  <div data-testid="tabs-list" className={className} {...props}>
    {children}
  </div>
);

export const TabsTrigger = ({ children, value, className, ...props }: any) => (
  <button data-testid="tabs-trigger" data-value={value} className={className} {...props}>
    {children}
  </button>
);

export const TabsContent = ({ children, value, className, ...props }: any) => (
  <div data-testid="tabs-content" data-value={value} className={className} {...props}>
    {children}
  </div>
);