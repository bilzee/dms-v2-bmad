import React from 'react';

export const Button = ({ children, className, variant, size, onClick, disabled, ...props }: any) => (
  <button 
    data-testid="button" 
    className={className} 
    data-variant={variant}
    data-size={size}
    onClick={onClick}
    disabled={disabled}
    {...props}
  >
    {children}
  </button>
);