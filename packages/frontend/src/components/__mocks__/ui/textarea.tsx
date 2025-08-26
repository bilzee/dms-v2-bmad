import React from 'react';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={className}
    style={{ pointerEvents: 'auto' }}
    {...props}
  />
));

Textarea.displayName = 'Textarea';