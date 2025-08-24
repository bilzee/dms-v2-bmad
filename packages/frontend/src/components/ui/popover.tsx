'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';

interface PopoverProps {
  children: React.ReactNode;
}

interface PopoverTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

interface PopoverContentProps {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

const PopoverContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>({ open: false, setOpen: () => {} });

export function Popover({ children }: PopoverProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">
        {children}
      </div>
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({ children }: PopoverTriggerProps) {
  const { open, setOpen } = React.useContext(PopoverContext);

  return (
    <div onClick={() => setOpen(!open)}>
      {children}
    </div>
  );
}

export function PopoverContent({ children, className, align = 'center' }: PopoverContentProps) {
  const { open, setOpen } = React.useContext(PopoverContext);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, setOpen]);

  if (!open) return null;

  const alignmentClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0'
  };

  return (
    <div 
      ref={ref}
      className={cn(
        'absolute z-50 mt-2 w-72 rounded-md border bg-white p-4 shadow-lg',
        alignmentClasses[align],
        className
      )}
    >
      {children}
    </div>
  );
}