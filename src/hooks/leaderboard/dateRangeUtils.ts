
import { DateRange, setCSTHours } from '@/lib/dateUtils';

/**
 * Sets up a date range with precise start/end times for consistent querying
 * using Central Standard Time (CST) instead of UTC
 */
export function getFormattedDateRange(dateRange: DateRange): { 
  startDate: Date, 
  endDate: Date 
} {
  // Set time to start of day (CST) for from date 
  const startDate = setCSTHours(new Date(dateRange.from), 0, 0, 0, 0);  // Start at 00:00:00 CST

  // Set time to end of day (CST) for to date
  const endDate = setCSTHours(new Date(dateRange.to), 23, 59, 59, 999);  // End at 23:59:59 CST
  
  return { startDate, endDate };
}
