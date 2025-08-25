import React from 'react';

export const ScrollArea = ({ children, className, ...props }: any) => (
  <div data-testid="scroll-area" className={className} {...props}>
    {children}
  </div>
);