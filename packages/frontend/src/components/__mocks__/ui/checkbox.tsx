import React from 'react';

export const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }
>(({ className, checked, onCheckedChange, onChange, ...props }, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e);
    onCheckedChange?.(e.target.checked);
  };

  return (
    <input
      ref={ref}
      type="checkbox"
      className={className}
      checked={checked}
      onChange={handleChange}
      style={{ pointerEvents: 'auto' }}
      {...props}
    />
  );
});

Checkbox.displayName = 'Checkbox';