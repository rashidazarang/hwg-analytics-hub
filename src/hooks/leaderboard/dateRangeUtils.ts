
import { DateRange } from '@/lib/dateUtils';

/**
 * Sets up a date range with precise start/end times for consistent querying
 */
export function getFormattedDateRange(dateRange: DateRange): { 
  startDate: Date, 
  endDate: Date 
} {
  // Set time to start of day for from date and end of day for to date
  const startDate = new Date(dateRange.from);
  startDate.setUTCHours(0, 0, 0, 0);  // Start at 00:00:00 UTC

  const endDate = new Date(dateRange.to);
  endDate.setUTCHours(23, 59, 59, 999);  // End at 23:59:59 UTC
  
  return { startDate, endDate };
}
