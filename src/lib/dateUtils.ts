
import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';

export type DateRange = {
  from: Date;
  to: Date;
};

export type DateRangePreset = 'wtd' | 'mtd' | 'ytd' | 'custom';

export function getPresetDateRange(preset: DateRangePreset): DateRange {
  const today = new Date();
  
  switch (preset) {
    case 'wtd': // Week to date
      return {
        from: startOfWeek(today, { weekStartsOn: 1 }), // Start from Monday
        to: today
      };
    case 'mtd': // Month to date
      return {
        from: startOfMonth(today),
        to: today
      };
    case 'ytd': // Year to date
      return {
        from: startOfYear(today),
        to: today
      };
    case 'custom':
      // Default to last 30 days for custom until user selects
      return {
        from: addDays(today, -30),
        to: today
      };
    default:
      return {
        from: addDays(today, -30),
        to: today
      };
  }
}

export function formatDateRange(range: DateRange): string {
  return `${format(range.from, 'MMM d, yyyy')} - ${format(range.to, 'MMM d, yyyy')}`;
}

export function isDateInRange(date: Date, range: DateRange): boolean {
  return date >= range.from && date <= range.to;
}
