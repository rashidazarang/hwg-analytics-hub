
import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type TimeframeOption = 'week' | 'month' | '6months' | 'year';

interface TimeframeFilterProps {
  selected: TimeframeOption;
  onChange: (timeframe: TimeframeOption) => void;
  className?: string;
}

const TimeframeFilter: React.FC<TimeframeFilterProps> = ({
  selected,
  onChange,
  className = '',
}) => {
  const options: Array<{ value: TimeframeOption; label: string }> = [
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: '6months', label: '6 Months' },
    { value: 'year', label: 'Year' },
  ];

  return (
    <div className={cn("flex items-center bg-gray-100 rounded-full p-1.5", className)}>
      {options.map((option) => (
        <Button
          key={option.value}
          variant={selected === option.value ? 'default' : 'ghost'}
          size="sm"
          className={cn(
            "h-8 px-4 text-sm font-medium rounded-full",
            selected === option.value 
              ? "bg-white text-black shadow-sm" 
              : "text-gray-500 hover:text-gray-700 hover:bg-transparent"
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
};

export default TimeframeFilter;
