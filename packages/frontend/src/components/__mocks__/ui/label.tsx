import React from 'react';

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={className}
    style={{ pointerEvents: 'auto' }}
    {...props}
  />
));

Label.displayName = 'Label';