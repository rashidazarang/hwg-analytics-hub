
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
    <div className={cn("flex items-center space-x-2 bg-white rounded-md p-2", className)}>
      {options.map((option) => (
        <Button
          key={option.value}
          variant={selected === option.value ? 'default' : 'outline'}
          size="sm"
          className={cn(
            "h-8 px-3 text-xs font-medium",
            selected === option.value ? "bg-primary text-primary-foreground" : "text-muted-foreground"
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
