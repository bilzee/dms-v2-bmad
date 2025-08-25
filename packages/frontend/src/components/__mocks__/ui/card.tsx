import React from 'react';

export const Card = ({ children, className, ...props }: any) => (
  <div data-testid="card" className={className} {...props}>
    {children}
  </div>
);

export const CardContent = ({ children, className, ...props }: any) => (
  <div data-testid="card-content" className={className} {...props}>
    {children}
  </div>
);

export const CardDescription = ({ children, className, ...props }: any) => (
  <div data-testid="card-description" className={className} {...props}>
    {children}
  </div>
);

export const CardHeader = ({ children, className, ...props }: any) => (
  <div data-testid="card-header" className={className} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ children, className, ...props }: any) => (
  <h3 data-testid="card-title" className={className} {...props}>
    {children}
  </h3>
);