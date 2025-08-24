'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

interface CalendarProps {
  mode?: 'single';
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
  initialFocus?: boolean;
  className?: string;
}

export function Calendar({
  mode = 'single',
  selected,
  onSelect,
  disabled,
  className,
}: CalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(() => selected || new Date());
  
  const today = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  
  const previousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };
  
  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentYear, currentMonth, day);
    if (disabled && disabled(clickedDate)) return;
    
    if (onSelect) {
      onSelect(clickedDate);
    }
  };
  
  const isSelected = (day: number) => {
    if (!selected) return false;
    const dateToCheck = new Date(currentYear, currentMonth, day);
    return selected.toDateString() === dateToCheck.toDateString();
  };
  
  const isToday = (day: number) => {
    const dateToCheck = new Date(currentYear, currentMonth, day);
    return today.toDateString() === dateToCheck.toDateString();
  };
  
  const isDisabled = (day: number) => {
    if (!disabled) return false;
    const dateToCheck = new Date(currentYear, currentMonth, day);
    return disabled(dateToCheck);
  };
  
  const renderCalendarDays = () => {
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(day)}
          disabled={isDisabled(day)}
          className={cn(
            'p-2 text-sm rounded-md hover:bg-gray-100 focus:bg-gray-100 focus:outline-none',
            {
              'bg-blue-500 text-white hover:bg-blue-600': isSelected(day),
              'bg-gray-100 font-semibold': isToday(day) && !isSelected(day),
              'text-gray-400 cursor-not-allowed hover:bg-transparent': isDisabled(day),
            }
          )}
        >
          {day}
        </button>
      );
    }
    
    return days;
  };
  
  return (
    <div className={cn('p-4 bg-white border rounded-lg', className)}>
      <div className="flex items-center justify-between mb-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={previousMonth}
          className="p-1"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-medium">
          {monthNames[currentMonth]} {currentYear}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={nextMonth}
          className="p-1"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="p-2 text-xs font-medium text-gray-500 text-center">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {renderCalendarDays()}
      </div>
    </div>
  );
}