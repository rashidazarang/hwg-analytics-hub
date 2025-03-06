
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear, 
  addDays, 
  addMonths, 
  addWeeks, 
  format, 
  eachDayOfInterval, 
  eachWeekOfInterval, 
  eachMonthOfInterval,
  subMonths,
  subYears,
  subDays
} from 'date-fns';
import { TimeframeOption } from '@/components/filters/TimeframeFilter';

export interface PerformanceDataPoint {
  label: string;
  value: number;
  rawDate: Date;
}

export interface PerformanceData {
  data: PerformanceDataPoint[];
  startDate: Date;
  endDate: Date;
  loading: boolean;
  error: Error | null;
}

export function getTimeframeDateRange(timeframe: TimeframeOption, offsetPeriods: number = 0): { start: Date; end: Date } {
  const now = new Date();
  
  switch (timeframe) {
    case 'week':
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Start on Monday
      return {
        start: addDays(weekStart, offsetPeriods * 7),
        end: addDays(endOfWeek(now, { weekStartsOn: 1 }), offsetPeriods * 7)
      };
    
    case 'month':
      return {
        start: addMonths(startOfMonth(now), offsetPeriods),
        end: addMonths(endOfMonth(now), offsetPeriods)
      };
    
    case '6months':
      // For 6 Months: Show exactly previous 6 months (e.g., Oct 2024 - Mar 2025)
      const currentMonthEnd = offsetPeriods === 0 ? now : addMonths(endOfMonth(now), offsetPeriods * 6);
      const sixMonthsAgoStart = startOfMonth(subMonths(currentMonthEnd, 5)); // Go back 5 months from current month
      
      return {
        start: sixMonthsAgoStart,
        end: offsetPeriods === 0 ? now : currentMonthEnd
      };
    
    case 'year':
      // For Year: Show exactly 12 months (e.g., Mar 2024 - Mar 2025)
      const currentYearEnd = offsetPeriods === 0 ? now : addMonths(endOfMonth(now), offsetPeriods * 12);
      const oneYearAgoStart = startOfMonth(subMonths(currentYearEnd, 11)); // Go back 11 months from current month
      
      return {
        start: oneYearAgoStart,
        end: offsetPeriods === 0 ? now : currentYearEnd
      };
      
    default:
      return { start: startOfWeek(now), end: endOfWeek(now) };
  }
}

export function usePerformanceMetricsData(
  timeframe: TimeframeOption,
  offsetPeriods: number = 0
): PerformanceData {
  const [timeframeData, setTimeframeData] = useState<PerformanceDataPoint[]>([]);
  
  // Calculate the date range based on timeframe and offset
  const { start: startDate, end: endDate } = getTimeframeDateRange(timeframe, offsetPeriods);
  
  // Format dates for Supabase query
  const formattedStartDate = startDate.toISOString();
  const formattedEndDate = endDate.toISOString();
  
  // Query to fetch agreement counts
  const { data, isLoading, error } = useQuery({
    queryKey: ['performance-metrics', timeframe, offsetPeriods, formattedStartDate, formattedEndDate],
    queryFn: async () => {
      console.log(`Fetching data for ${timeframe} from ${formattedStartDate} to ${formattedEndDate}`);
      
      // Fetch agreement data from Supabase
      const { data, error } = await supabase
        .from('agreements')
        .select('EffectiveDate')
        .gte('EffectiveDate', formattedStartDate)
        .lte('EffectiveDate', formattedEndDate);
      
      if (error) {
        console.error("Error fetching agreement data:", error);
        throw new Error(error.message);
      }
      
      return data || [];
    }
  });
  
  useEffect(() => {
    if (!data || isLoading) return;
    
    // Group and format data based on the timeframe
    const agreements = data || [];
    let formattedData: PerformanceDataPoint[] = [];
    
    switch (timeframe) {
      case 'week':
        // Group by days of week
        const weekDays = eachDayOfInterval({ start: startDate, end: endDate });
        formattedData = weekDays.map(day => {
          const dayAgreements = agreements.filter(agreement => {
            const effectiveDate = new Date(agreement.EffectiveDate);
            return format(effectiveDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
          });
          
          return {
            label: format(day, 'EEE').toLowerCase(),
            value: dayAgreements.length,
            rawDate: day
          };
        });
        break;
        
      case 'month':
        // Group by days for the month
        const monthDays = eachDayOfInterval({ start: startDate, end: endDate });
        formattedData = monthDays.map(day => {
          const dayAgreements = agreements.filter(agreement => {
            const effectiveDate = new Date(agreement.EffectiveDate);
            return format(effectiveDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
          });
          
          return {
            label: format(day, 'd'),
            value: dayAgreements.length,
            rawDate: day
          };
        });
        break;
        
      case '6months':
        // Group by days for 6 months
        const months = eachMonthOfInterval({ start: startDate, end: endDate });
        formattedData = months.map(month => {
          const monthEnd = endOfMonth(month);
          
          const monthAgreements = agreements.filter(agreement => {
            const effectiveDate = new Date(agreement.EffectiveDate);
            return (
              effectiveDate >= month && 
              effectiveDate <= monthEnd
            );
          });
          
          return {
            label: format(month, 'MMM').toLowerCase(),
            value: monthAgreements.length,
            rawDate: month
          };
        });
        break;
        
      case 'year':
        // Group by months for year
        const yearMonths = eachMonthOfInterval({ start: startDate, end: endDate });
        formattedData = yearMonths.map(month => {
          const monthEnd = endOfMonth(month);
          
          const monthAgreements = agreements.filter(agreement => {
            const effectiveDate = new Date(agreement.EffectiveDate);
            return (
              effectiveDate >= month && 
              effectiveDate <= monthEnd
            );
          });
          
          return {
            label: format(month, 'MMM').toLowerCase(),
            value: monthAgreements.length,
            rawDate: month
          };
        });
        break;
    }
    
    setTimeframeData(formattedData);
  }, [data, isLoading, timeframe, startDate, endDate]);
  
  return {
    data: timeframeData,
    startDate,
    endDate,
    loading: isLoading,
    error: error as Error | null
  };
}
