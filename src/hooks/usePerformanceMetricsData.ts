
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useCallback, useMemo } from 'react';
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
  addYears,
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
      return {
        start: addWeeks(startOfWeek(now, { weekStartsOn: 1 }), offsetPeriods),
        end: addWeeks(endOfWeek(now, { weekStartsOn: 1 }), offsetPeriods)
      };
    
    case 'month':
      return {
        start: addMonths(startOfMonth(now), offsetPeriods),
        end: addMonths(endOfMonth(now), offsetPeriods)
      };
    
    case '6months':
      // For 6 Months: Correctly handle offset periods in 6-month increments
      return {
        start: startOfMonth(addMonths(now, offsetPeriods * 6)),  // Move in 6-month increments
        end: endOfMonth(addMonths(now, (offsetPeriods * 6) + 5)) // End date is 5 months after start
      };
    
    case 'year':
      // For Year: Correctly handle offset periods in 1-year increments
      return {
        start: startOfYear(addYears(now, offsetPeriods)),  // Move in 1-year increments
        end: endOfYear(addYears(now, offsetPeriods))
      };
      
    default:
      return { start: startOfWeek(now), end: endOfWeek(now) };
  }
}

// A more efficient function to fetch monthly counts directly from the database
async function fetchMonthlyAgreementCounts(startDate: Date, endDate: Date) {
  console.log(`Fetching monthly data from ${startDate.toISOString()} to ${endDate.toISOString()}`);
  
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
  // Calculate the date range based on timeframe and offset
  const { start: startDate, end: endDate } = useMemo(() => 
    getTimeframeDateRange(timeframe, offsetPeriods), 
    [timeframe, offsetPeriods]
  );
  
  // Format dates for Supabase query - use memo to prevent recalculation
  const formattedDates = useMemo(() => ({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  }), [startDate, endDate]);
  
  // Use a query key that doesn't change unless needed
  const queryKey = useMemo(() => 
    ['performance-metrics', timeframe, formattedDates.startDate, formattedDates.endDate], 
    [timeframe, formattedDates.startDate, formattedDates.endDate]
  );
  
  // Define query function that's stable across renders
  const queryFn = useCallback(async () => {
    console.log(`Fetching data for ${timeframe} from ${formattedDates.startDate} to ${formattedDates.endDate}`);
    
    // For 6months and year, use the optimized monthly fetching
    if (timeframe === '6months' || timeframe === 'year') {
      return await fetchMonthlyAgreementCounts(startDate, endDate);
    }
    
    // For week and month, fetch raw data and process on the client
    const { data, error } = await supabase
      .from('agreements')
      .select('EffectiveDate')
      .gte('EffectiveDate', formattedDates.startDate)
      .lte('EffectiveDate', formattedDates.endDate);
    
    if (error) {
      console.error("Error fetching agreement data:", error);
      throw new Error(error.message);
    }
    
    return data || [];
  }, [timeframe, formattedDates, startDate, endDate]);
  
  // Query to fetch agreement counts with better caching
  const { data, isLoading, error } = useQuery({
    queryKey: queryKey,
    queryFn: queryFn,
    staleTime: 5 * 60 * 1000, // Cache data for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch when window gets focus
    refetchOnMount: false, // Don't refetch when component mounts
  });
  
  // Process data using useMemo to prevent unnecessary processing
  const processedData = useMemo(() => {
    if (isLoading || !data) return [];
    
    // If we already have formatted data from the optimized query
    if (Array.isArray(data) && data.length > 0 && 'label' in data[0]) {
      return data as PerformanceDataPoint[];
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
    
    return formattedData;
  }, [data, isLoading, timeframe, startDate, endDate]);
  
  return {
    data: processedData,
    startDate,
    endDate,
    loading: isLoading,
    error: error as Error | null
  };
}
