import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { DateRange, DateRangePreset, formatDateRange, getPresetDateRange } from '@/lib/dateUtils';

type DateRangeFilterProps = {
  onChange: (range: DateRange) => void;
};

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ onChange }) => {
  // Set default preset to 'ytd' instead of 'mtd'
  const [preset, setPreset] = useState<DateRangePreset>('ytd');
  const [dateRange, setDateRange] = useState<DateRange>(getPresetDateRange('ytd'));
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetChange = (newPreset: DateRangePreset) => {
    setPreset(newPreset);
    const newRange = getPresetDateRange(newPreset);
    setDateRange(newRange);
    onChange(newRange);
    if (newPreset !== 'custom') {
      setIsOpen(false);
    }
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setDateRange(range);
      setPreset('custom');
      onChange(range);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="inline-flex items-center space-x-1 text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span className="text-sm font-medium">Date Range:</span>
      </div>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="pl-3 pr-2 py-1 h-9 border border-input bg-background hover:bg-accent date-range-selector"
            onClick={() => setIsOpen(true)}
          >
            <span className="text-sm font-medium">{formatDateRange(dateRange)}</span>
            <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 border-b">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Select Range</div>
              <div className="flex space-x-1">
                <Button 
                  variant={preset === 'wtd' ? 'default' : 'outline'} 
                  size="sm" 
                  className="h-7 text-xs py-0 px-2"
                  onClick={() => handlePresetChange('wtd')}
                >
                  WTD
                </Button>
                <Button 
                  variant={preset === 'mtd' ? 'default' : 'outline'} 
                  size="sm" 
                  className="h-7 text-xs py-0 px-2"
                  onClick={() => handlePresetChange('mtd')}
                >
                  MTD
                </Button>
                <Button 
                  variant={preset === 'ytd' ? 'default' : 'outline'} 
                  size="sm" 
                  className="h-7 text-xs py-0 px-2"
                  onClick={() => handlePresetChange('ytd')}
                >
                  YTD
                </Button>
              </div>
            </div>
          </div>
          <CalendarComponent
            mode="range"
            selected={{
              from: dateRange.from,
              to: dateRange.to,
            }}
            onSelect={handleDateRangeChange as any}
            numberOfMonths={2}
            defaultMonth={dateRange.from}
            initialFocus
          />
          <div className="p-3 border-t flex justify-end">
            <Button 
              variant="default" 
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateRangeFilter;
