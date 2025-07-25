import React, { useState } from 'react';
import { Check, Filter, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  options: FilterOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  label?: string;
  className?: string;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  options,
  selectedValues,
  onChange,
  label = "Filter",
  className = "",
}) => {
  const [open, setOpen] = useState(false);

  const handleCheckboxToggle = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter((val) => val !== value)
      : [...selectedValues, value];
    
    onChange(newValues);
  };

  const handleClearFilters = () => {
    onChange([]);
    setOpen(false);
  };

  const activeFiltersCount = selectedValues.length;
  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn(
            hasActiveFilters 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground',
            'h-9 w-9 p-0 rounded-md transition-all duration-200',
            className
          )}
          aria-label={`Filter ${label}`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-foreground text-[10px] font-medium text-primary">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="end">
        <div className="space-y-1 mb-2">
          <h4 className="font-medium text-sm">Filter by {label}</h4>
          <p className="text-xs text-muted-foreground">
            Select options to filter the table
          </p>
        </div>
        
        <div className="space-y-2 max-h-60 overflow-y-auto my-2">
          {options.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`filter-${option.value}`}
                checked={selectedValues.includes(option.value)}
                onCheckedChange={() => handleCheckboxToggle(option.value)}
              />
              <label
                htmlFor={`filter-${option.value}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>
        
        <div className="flex justify-between items-center pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs hover:bg-transparent hover:underline p-0 h-auto"
            onClick={handleClearFilters}
          >
            Clear filters
          </Button>
          <Button 
            size="sm" 
            className="text-xs" 
            onClick={() => setOpen(false)}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default FilterDropdown;
