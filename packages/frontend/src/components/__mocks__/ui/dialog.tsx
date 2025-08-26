import React from 'react';

interface DialogContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextType | null>(null);

export const Dialog = ({ children, open, onOpenChange, ...props }: any) => {
  const [isOpen, setIsOpen] = React.useState(open || false);
  
  React.useEffect(() => {
    if (typeof open !== 'undefined') {
      setIsOpen(open);
    }
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };
  
  return (
    <DialogContext.Provider value={{ isOpen, setIsOpen: handleOpenChange }}>
      <div data-testid="dialog" data-state={isOpen ? 'open' : 'closed'} {...props}>
        {children}
      </div>
    </DialogContext.Provider>
  );
};

export const DialogTrigger = ({ children, asChild, ...props }: any) => {
  const context = React.useContext(DialogContext);
  
  const handleClick = () => {
    context?.setIsOpen(true);
  };
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...children.props,
      onClick: (e: any) => {
        children.props.onClick?.(e);
        handleClick();
      },
      ...props,
    });
  }
  
  return (
    <button data-testid="dialog-trigger" onClick={handleClick} {...props}>
      {children}
    </button>
  );
};

export const DialogContent = ({ children, className, ...props }: any) => {
  const context = React.useContext(DialogContext);
  
  if (!context?.isOpen) {
    return null;
  }
  
  return (
    <div 
      data-testid="dialog-content" 
      className={className} 
      data-state="open"
      {...props}
    >
      {children}
    </div>
  );
};

export const DialogHeader = ({ children, ...props }: any) => (
  <div data-testid="dialog-header" {...props}>
    {children}
  </div>
);

export const DialogTitle = ({ children, ...props }: any) => (
  <h2 data-testid="dialog-title" {...props}>
    {children}
  </h2>
);

export const DialogDescription = ({ children, ...props }: any) => (
  <p data-testid="dialog-description" {...props}>
    {children}
  </p>
);

export const DialogFooter = ({ children, ...props }: any) => (
  <div data-testid="dialog-footer" {...props}>
    {children}
  </div>
);