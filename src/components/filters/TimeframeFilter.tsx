
import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  
  const options: Array<{ value: TimeframeOption; label: string; mobileLabel?: string }> = [
    { value: 'week', label: 'Week', mobileLabel: 'W' },
    { value: 'month', label: 'Month', mobileLabel: 'M' },
    { value: '6months', label: '6 Months', mobileLabel: '6M' },
    { value: 'year', label: 'Year', mobileLabel: 'Y' },
  ];

  return (
    <div className={cn(
      "flex items-center bg-gray-100 rounded-full p-1.5",
      isMobile ? "max-w-full" : "",
      className
    )}>
      {options.map((option) => (
        <Button
          key={option.value}
          variant={selected === option.value ? 'default' : 'ghost'}
          size="sm"
          className={cn(
            "h-8 text-sm font-medium rounded-full transition-all duration-200",
            selected === option.value 
              ? "bg-white text-black shadow-sm" 
              : "text-gray-500 hover:text-gray-700 hover:bg-transparent",
            isMobile 
              ? "px-3" 
              : "px-4"
          )}
          onClick={() => onChange(option.value)}
        >
          {isMobile && option.mobileLabel ? option.mobileLabel : option.label}
        </Button>
      ))}
    </div>
  );
};

export default TimeframeFilter;
