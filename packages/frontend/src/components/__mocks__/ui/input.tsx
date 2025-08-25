import React from 'react';

export const Input = ({ className, type, placeholder, value, onChange, ...props }: any) => (
  <input
    data-testid="input"
    className={className}
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    {...props}
  />
);