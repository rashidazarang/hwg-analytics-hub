
import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format, subMonths } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

export type DateRange = {
  from: Date;
  to: Date;
};

export type DateRangePreset = 'wtd' | 'mtd' | 'ytd' | 'custom';

// The CST timezone string to use consistently throughout the app
export const CST_TIMEZONE = 'America/Chicago';

// Convert a UTC date to CST
export function toCSTDate(date: Date): Date {
  return utcToZonedTime(date, CST_TIMEZONE);
}

// Convert a CST date to UTC for storage/transmission
export function toUTCDate(date: Date): Date {
  return zonedTimeToUtc(date, CST_TIMEZONE);
}

// Format a date as an ISO string in the CST timezone
export function toCSTISOString(date: Date): string {
  const cstDate = toCSTDate(date);
  return cstDate.toISOString();
}

// Set hours, minutes, seconds, and milliseconds in CST timezone
export function setCSTHours(date: Date, hours: number, minutes = 0, seconds = 0, ms = 0): Date {
  const cstDate = toCSTDate(date);
  cstDate.setHours(hours, minutes, seconds, ms);
  return toUTCDate(cstDate);
}

// Function to get today's date
export function today(): Date {
  return new Date();
}

// Function to get date of 1 month ago
export function lastMonth(): Date {
  return subMonths(new Date(), 1);
}

export function getPresetDateRange(preset: DateRangePreset): DateRange {
  const today = new Date();
  
  switch (preset) {
    case 'wtd': // Week to date - Rolling week (7 days back)
      return {
        from: addDays(today, -7),
        to: today
      };
    case 'mtd': // Month to date - Rolling month (30 days back)
      return {
        from: addDays(today, -30),
        to: today
      };
    case 'ytd': // Year to date - Rolling year (365 days back)
      // Get same date from previous year
      const fromDate = new Date(today);
      fromDate.setFullYear(today.getFullYear() - 1);
      return {
        from: fromDate,
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
        from: addDays(today, -30), // Default to month-to-date
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
