import React from 'react';

export const Badge = ({ children, className, variant, ...props }: any) => (
  <span data-testid="badge" className={className} data-variant={variant} {...props}>
    {children}
  </span>
);