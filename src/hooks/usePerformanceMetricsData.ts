
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useCallback } from 'react';
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

// A more efficient function to fetch monthly counts directly from the database
async function fetchMonthlyAgreementCounts(timeframe: TimeframeOption, startDate: Date, endDate: Date) {
  console.log(`Efficiently fetching monthly aggregated data from ${startDate.toISOString()} to ${endDate.toISOString()}`);
  
  const { data, error } = await supabase
    .from('agreements')
    .select('EffectiveDate')
    .gte('EffectiveDate', startDate.toISOString())
    .lte('EffectiveDate', endDate.toISOString());
  
  if (error) {
    console.error("Error fetching agreement data:", error);
    throw new Error(error.message);
  }
  
  // Process the data by month
  const monthlyData: Record<string, number> = {};
  const months = eachMonthOfInterval({ start: startDate, end: endDate });
  
  // Initialize all months with zero to ensure we have entries for months with no data
  months.forEach(month => {
    const monthKey = format(month, 'yyyy-MM');
    monthlyData[monthKey] = 0;
  });
  
  // Count agreements by month
  if (data) {
    data.forEach(agreement => {
      const date = new Date(agreement.EffectiveDate);
      const monthKey = format(date, 'yyyy-MM');
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });
  }
  
  // Convert to array format for the chart
  return months.map(month => {
    const monthKey = format(month, 'yyyy-MM');
    return {
      label: format(month, 'MMM').toLowerCase(),
      value: monthlyData[monthKey] || 0,
      rawDate: month
    };
  });
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
  
  // Use a more efficient query strategy based on timeframe
  const queryFn = useCallback(async () => {
    // Only log once per fetch to reduce console noise
    console.log(`Fetching data for ${timeframe} from ${formattedStartDate} to ${formattedEndDate}`);
    
    // For 6months and year, use the optimized monthly fetching
    if (timeframe === '6months' || timeframe === 'year') {
      return await fetchMonthlyAgreementCounts(timeframe, startDate, endDate);
    }
    
    // For week and month, fetch raw data and process on the client
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
  }, [timeframe, formattedStartDate, formattedEndDate, startDate, endDate]);
  
  // Query to fetch agreement counts with better caching and fewer fetches
  const { data, isLoading, error } = useQuery({
    queryKey: ['performance-metrics', timeframe, formattedStartDate, formattedEndDate],
    queryFn: queryFn,
    staleTime: 5 * 60 * 1000, // Cache data for 5 minutes
    refetchOnWindowFocus: false // Don't refetch when window gets focus
  });
  
  useEffect(() => {
    if (isLoading || !data) return;
    
    // If we already have formatted data from the optimized query
    if (Array.isArray(data) && data.length > 0 && 'label' in data[0]) {
      setTimeframeData(data as PerformanceDataPoint[]);
      return;
    }
    
    // For week and month views, process the raw data
    const agreements = data as any[] || [];
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
