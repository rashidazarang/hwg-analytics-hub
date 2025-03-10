
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { DateRange, DateRangePreset, formatDateRange, getPresetDateRange } from '@/lib/dateUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger, 
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet';
import { useAtom } from 'jotai';
import { globalDateRangeAtom } from '@/contexts/DateFilterContext';

type DateRangeFilterProps = {
  dateRange?: DateRange;
  onChange: (range: DateRange) => void;
  isPerformancePage?: boolean;
};

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ dateRange, onChange, isPerformancePage = false }) => {
  // Use global date range atom if not performance page
  const [globalDateRange, setGlobalDateRange] = useAtom(globalDateRangeAtom);
  
  // Set default preset to 'mtd' (30 days) instead of 'ytd' (full year)
  const [preset, setPreset] = useState<DateRangePreset>('mtd');
  
  // Use local state for the calendar selection before applying
  const [tempDateRange, setTempDateRange] = useState<DateRange>(
    isPerformancePage 
      ? (dateRange || getPresetDateRange('mtd')) 
      : globalDateRange
  );
  
  // This is what's displayed in the UI
  const [localDateRange, setLocalDateRange] = useState<DateRange>(
    isPerformancePage 
      ? (dateRange || getPresetDateRange('mtd')) 
      : globalDateRange
  );
  
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  
  // Update local state when props change (only for performance page)
  useEffect(() => {
    if (isPerformancePage && dateRange) {
      setLocalDateRange(dateRange);
      setTempDateRange(dateRange);
    } else if (!isPerformancePage) {
      setLocalDateRange(globalDateRange);
      setTempDateRange(globalDateRange);
    }
  }, [dateRange, isPerformancePage, globalDateRange]);

  const handlePresetChange = useCallback((newPreset: DateRangePreset) => {
    setPreset(newPreset);
    const newRange = getPresetDateRange(newPreset);
    console.log(`Preset changed to ${newPreset}:`, newRange);
    
    // Only update temp date range, don't apply yet
    setTempDateRange(newRange);
    
    // Apply immediately for preset buttons only if not on mobile
    if (!isMobile) {
      handleApply(newRange);
    }
  }, [isMobile]);
  
  const handleCalendarSelect = useCallback((range: DateRange | undefined) => {
    if (range) {
      console.log("Calendar selection changed:", range);
      
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of current day
      
      // Start with current tempDateRange to preserve existing values
      let validRange = { ...tempDateRange };
      
      // If we have a 'from' date, update the start date
      if (range.from) {
        validRange.from = range.from;
        // Don't allow dates in the future
        if (validRange.from > today) {
          validRange.from = today;
          console.log("Adjusted start date to today (was in the future)");
        }
      }
      
      // If we have a 'to' date, update the end date
      if (range.to) {
        validRange.to = range.to;
        // Don't allow dates in the future
        if (validRange.to > today) {
          validRange.to = today;
          console.log("Adjusted end date to today (was in the future)");
        }
      }
      
      // Make sure end date is not before start date
      if (validRange.to < validRange.from) {
        // If user clicked on a date before the end date, it's likely they want to set the start date
        // rather than having the end date adjust automatically to match the start date
        if (range.from && !range.to) {
          // User is selecting a start date - ensure end date is not before it
          validRange.to = validRange.from;
          console.log("Adjusted end date to match new start date");
        } else {
          // Otherwise, preserve existing behavior
          validRange.to = validRange.from;
          console.log("Adjusted end date to match start date (was before start date)");
        }
      }
      
      setTempDateRange(validRange);
      setPreset('custom');
    }
  }, [tempDateRange]);

  const handleApply = useCallback((rangeToApply = tempDateRange) => {
    console.log("Applying date range:", rangeToApply);
    
    // Perform additional validation to protect against invalid date selections
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    let validRange = { ...rangeToApply };
    let hasChanges = false;
    
    // Validate that dates aren't in the future
    if (validRange.from > today) {
      validRange.from = today;
      hasChanges = true;
      console.log("Corrected future start date in handleApply");
    }
    
    if (validRange.to > today) {
      validRange.to = today;
      hasChanges = true;
      console.log("Corrected future end date in handleApply");
    }
    
    // Ensure end date is not before start date
    if (validRange.to < validRange.from) {
      validRange.to = validRange.from;
      hasChanges = true;
      console.log("Corrected end date that was before start date in handleApply");
    }
    
    // If we made corrections, update the temp state
    if (hasChanges) {
      setTempDateRange(validRange);
    }
    
    // Update the displayed date range
    setLocalDateRange(validRange);
    
    // Update global state if not performance page
    if (!isPerformancePage) {
      setGlobalDateRange(validRange);
    }
    
    // Notify parent component
    onChange(validRange);
    setIsOpen(false);
  }, [tempDateRange, onChange, setGlobalDateRange, isPerformancePage]);
  
  const handleCancel = useCallback(() => {
    // Reset temp range to current local range
    setTempDateRange(localDateRange);
    setIsOpen(false);
  }, [localDateRange]);

  // Calendar content shared between mobile and desktop
  const CalendarContent = (
    <>
      <div className="p-3 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-sm font-medium">Select Range</div>
          <div className="flex space-x-2">
            <Button 
              variant={preset === 'wtd' ? 'default' : 'outline'} 
              size="sm" 
              className="h-8 text-xs px-2"
              onClick={() => handlePresetChange('wtd')}
            >
              7 Days
            </Button>
            <Button 
              variant={preset === 'mtd' ? 'default' : 'outline'} 
              size="sm" 
              className="h-8 text-xs px-2"
              onClick={() => handlePresetChange('mtd')}
            >
              30 Days
            </Button>
            <Button 
              variant={preset === 'ytd' ? 'default' : 'outline'} 
              size="sm" 
              className="h-8 text-xs px-2"
              onClick={() => handlePresetChange('ytd')}
            >
              1 Year
            </Button>
          </div>
        </div>
      </div>

      <div className="p-2 sm:p-4 flex justify-center">
        <CalendarComponent
          mode="range"
          selected={{
            from: tempDateRange.from,
            to: tempDateRange.to,
          }}
          onSelect={handleCalendarSelect as any}
          numberOfMonths={isMobile ? 1 : 2}
          defaultMonth={tempDateRange.from}
          initialFocus
          className="rounded-md shadow-sm"
        />
      </div>

      <div className="p-3 border-t flex justify-between">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleCancel}
        >
          Cancel
        </Button>
        <Button 
          variant="default" 
          size="sm"
          onClick={() => handleApply()}
        >
          Apply
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div className="flex items-center space-x-1 xs:space-x-2 bg-white rounded-md px-1 xs:px-2 py-1.5 w-full xs:w-auto min-w-[110px] date-range-selector shadow-sm">
        <div className="inline-flex items-center">
          <CalendarIcon className="h-3 w-3 xs:h-4 xs:w-4 text-primary" />
        </div>
        
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              className="pl-1 xs:pl-2 pr-1 py-1 h-7 xs:h-8 hover:bg-accent date-range-selector text-xs xs:text-sm truncate flex-1 w-full justify-between"
            >
              <span className="font-medium truncate">{formatDateRange(localDateRange)}</span>
              <ChevronDown className="ml-1 h-3 w-3 text-muted-foreground flex-shrink-0" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="mobile-date-sheet pt-2 overflow-auto max-h-[90vh]">
            <SheetTitle className="text-center pb-2">Select Date Range</SheetTitle>
            <SheetDescription className="sr-only">Select a date range for filtering data</SheetDescription>
            <div className="rounded-t-xl bg-white date-range-mobile-wrapper">
              {CalendarContent}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1 xs:space-x-2 bg-white rounded-md px-1 xs:px-2 py-1.5 w-full xs:w-auto min-w-[110px] date-range-selector shadow-sm">
      <div className="inline-flex items-center">
        <CalendarIcon className="h-3 w-3 xs:h-4 xs:w-4 text-primary" />
      </div>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            className="pl-1 xs:pl-2 pr-1 py-1 h-7 xs:h-8 hover:bg-accent date-range-selector text-xs xs:text-sm truncate flex-1 w-full justify-between"
            onClick={() => setIsOpen(true)}
          >
            <span className="font-medium truncate">{formatDateRange(localDateRange)}</span>
            <ChevronDown className="ml-1 h-3 w-3 text-muted-foreground flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 shadow-lg" align="start">
          {CalendarContent}
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateRangeFilter;
