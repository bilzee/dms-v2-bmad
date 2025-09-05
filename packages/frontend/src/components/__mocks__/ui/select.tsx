import React from 'react';

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextType | null>(null);

export const Select = ({ children, value, onValueChange, ...props }: any) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen }}>
      <div data-testid="select" data-value={value} {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

export const SelectContent = ({ children, ...props }: any) => {
  const context = React.useContext(SelectContext);
  
  if (!context?.isOpen) {
    return null;
  }
  
  return (
    <div data-testid="select-content" {...props}>
      {children}
    </div>
  );
};

export const SelectItem = ({ children, value, ...props }: any) => {
  const context = React.useContext(SelectContext);
  
  const handleClick = () => {
    context?.onValueChange(value);
    context?.setIsOpen(false);
  };
  
  return (
    <div 
      data-testid="select-item" 
      data-value={value} 
      role="option"
      aria-selected={context?.value === value}
      onClick={handleClick}
      style={{ cursor: 'pointer', pointerEvents: 'auto' }}
      {...props}
    >
      {children}
    </div>
  );
};

export const SelectTrigger = ({ children, className, id, ...props }: any) => {
  const context = React.useContext(SelectContext);
  
  const handleClick = () => {
    context?.setIsOpen(!context?.isOpen);
  };
  
  const triggerId = id || 'select-trigger';
  const contentId = `${triggerId}-content`;
  
  return (
    <button 
      data-testid="select-trigger" 
      className={className}
      id={triggerId}
      role="combobox"
      aria-expanded={context?.isOpen}
      aria-controls={contentId}
      aria-haspopup="listbox"
      onClick={handleClick}
      type="button"
      style={{ pointerEvents: 'auto' }}
      {...props}
    >
      {children}
    </button>
  );
};

export const SelectValue = ({ placeholder, ...props }: any) => {
  const context = React.useContext(SelectContext);
  
  return (
    <span data-testid="select-value" data-placeholder={placeholder} {...props}>
      {context?.value || placeholder}
    </span>
  );
};