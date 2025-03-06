
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
  subYears
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
      return {
        start: addMonths(subMonths(now, 6), offsetPeriods * 6),
        end: addMonths(now, offsetPeriods * 6)
      };
    
    case 'year':
      return {
        start: addMonths(subYears(now, 1), offsetPeriods * 12),
        end: addMonths(now, offsetPeriods * 12)
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
            label: format(day, 'EEE'),
            value: dayAgreements.length,
            rawDate: day
          };
        });
        break;
        
      case 'month':
        // Group by weeks
        const monthWeeks = eachWeekOfInterval(
          { start: startDate, end: endDate },
          { weekStartsOn: 1 }
        );
        
        formattedData = monthWeeks.map((weekStart, index) => {
          const weekEnd = index < monthWeeks.length - 1 
            ? new Date(monthWeeks[index + 1].getTime() - 1) 
            : endDate;
            
          const weekAgreements = agreements.filter(agreement => {
            const effectiveDate = new Date(agreement.EffectiveDate);
            return effectiveDate >= weekStart && effectiveDate <= weekEnd;
          });
          
          return {
            label: `Week ${index + 1}`,
            value: weekAgreements.length,
            rawDate: weekStart
          };
        });
        break;
        
      case '6months':
      case 'year':
        // Group by months
        const months = eachMonthOfInterval({ start: startDate, end: endDate });
        formattedData = months.map(month => {
          const monthEnd = new Date(month);
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          monthEnd.setDate(0); // Last day of the month
          
          const monthAgreements = agreements.filter(agreement => {
            const effectiveDate = new Date(agreement.EffectiveDate);
            return (
              effectiveDate >= month && 
              effectiveDate <= monthEnd
            );
          });
          
          return {
            label: format(month, 'MMM'),
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
