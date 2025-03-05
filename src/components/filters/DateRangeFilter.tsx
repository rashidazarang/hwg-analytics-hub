
import React, { useState, useEffect } from 'react';
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
  
  // Ensure the date range is applied on mount with a slight delay to ensure all components are ready
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log("Initial DateRange applied:", dateRange);
      onChange(dateRange);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const handlePresetChange = (newPreset: DateRangePreset) => {
    setPreset(newPreset);
    const newRange = getPresetDateRange(newPreset);
    console.log(`Preset changed to ${newPreset}:`, newRange);
    setDateRange(newRange);
    onChange(newRange);
    if (newPreset !== 'custom') {
      setIsOpen(false);
    }
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      console.log("Custom date range selected:", range);
      setDateRange(range);
      setPreset('custom');
      onChange(range);
    }
  };

  // Add a forced refresh whenever dateRange changes
  useEffect(() => {
    console.log("DateRange updated:", dateRange);
  }, [dateRange]);

  return (
    <div className="flex items-center space-x-1 xs:space-x-2 bg-white rounded-md px-1 xs:px-2 py-1.5 w-full xs:w-auto min-w-[110px]">
      <div className="inline-flex items-center">
        <Calendar className="h-3 w-3 xs:h-4 xs:w-4 text-muted-foreground" />
      </div>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            className="pl-1 xs:pl-2 pr-1 py-1 h-7 xs:h-8 hover:bg-accent date-range-selector text-xs xs:text-sm truncate flex-1 w-full justify-between"
            onClick={() => setIsOpen(true)}
          >
            <span className="font-medium truncate">{formatDateRange(dateRange)}</span>
            <ChevronDown className="ml-1 h-3 w-3 text-muted-foreground flex-shrink-0" />
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
          <div className="overflow-auto" style={{ maxHeight: 'min(calc(100vh - 200px), 350px)' }}>
            <CalendarComponent
              mode="range"
              selected={{
                from: dateRange.from,
                to: dateRange.to,
              }}
              onSelect={handleDateRangeChange as any}
              numberOfMonths={1}
              defaultMonth={dateRange.from}
              initialFocus
            />
          </div>
          <div className="p-3 border-t flex justify-end">
            <Button 
              variant="default" 
              size="sm"
              onClick={() => {
                // Force reapply the current dateRange to trigger a refetch
                onChange({...dateRange});
                setIsOpen(false);
              }}
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
