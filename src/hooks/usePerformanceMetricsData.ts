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
      return {
        start: startOfMonth(addMonths(now, offsetPeriods * 6)),
        end: endOfMonth(addMonths(now, (offsetPeriods * 6) + 5))
      };
    
    case 'year':
      return {
        start: startOfYear(addYears(now, offsetPeriods)),
        end: endOfYear(addYears(now, offsetPeriods))
      };
      
    default:
      return { start: startOfWeek(now), end: endOfWeek(now) };
  }
}

async function fetchMonthlyAgreementCounts(startDate: Date, endDate: Date) {
  console.log(`Fetching aggregated monthly data from ${startDate.toISOString()} to ${endDate.toISOString()}`);

  const { data, error } = await supabase.rpc('fetch_monthly_agreement_counts', {
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
  });

  if (error) {
    console.error("Error fetching aggregated agreement data:", error);
    throw new Error(error.message);
  }

  const monthlyCounts: Record<string, number> = {};
  const months = eachMonthOfInterval({ start: startDate, end: endDate });

  months.forEach(month => {
    const monthKey = format(month, 'yyyy-MM');
    monthlyCounts[monthKey] = 0;
  });

  if (data) {
    data.forEach(({ month, total }) => {
      monthlyCounts[month] = total;
    });
  }

  return months.map(month => {
    const monthKey = format(month, 'yyyy-MM');
    return {
      label: format(month, 'MMM').toLowerCase(),
      value: monthlyCounts[monthKey] || 0,
      rawDate: month
    };
  });
}

async function fetchAllAgreementsByStatus(startDate: Date, endDate: Date) {
  console.log(`Fetching all agreements by status from ${startDate.toISOString()} to ${endDate.toISOString()}`);
  
  let allAgreements: any[] = [];
  let offset = 0;
  const limit = 1000;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('agreements')
      .select('AgreementStatus')
      .gte('EffectiveDate', startDate.toISOString())
      .lte('EffectiveDate', endDate.toISOString())
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error("Error fetching agreement data with pagination:", error);
      throw new Error(error.message);
    }
    
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allAgreements = [...allAgreements, ...data];
      offset += data.length;
      
      if (data.length < limit) {
        hasMore = false;
      }
    }
  }
  
  console.log(`Total agreements fetched with pagination: ${allAgreements.length}`);
  return allAgreements;
}

export function usePerformanceMetricsData(
  timeframe: TimeframeOption,
  offsetPeriods: number = 0
): PerformanceData {
  const { start: startDate, end: endDate } = useMemo(() => 
    getTimeframeDateRange(timeframe, offsetPeriods), 
    [timeframe, offsetPeriods]
  );
  
  const formattedDates = useMemo(() => ({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  }), [startDate, endDate]);
  
  const queryKey = useMemo(() => 
    ['performance-metrics', timeframe, formattedDates.startDate, formattedDates.endDate], 
    [timeframe, formattedDates.startDate, formattedDates.endDate]
  );
  
  const queryFn = useCallback(async () => {
    console.log(`Fetching data for ${timeframe} from ${formattedDates.startDate} to ${formattedDates.endDate}`);
    
    if (timeframe === '6months' || timeframe === 'year') {
      return await fetchMonthlyAgreementCounts(startDate, endDate);
    }
    
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
  
  const { data, isLoading, error } = useQuery({
    queryKey: queryKey,
    queryFn: queryFn,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  
  const processedData = useMemo(() => {
    if (isLoading || !data) return [];
    
    if (Array.isArray(data) && data.length > 0 && 'label' in data[0]) {
      return data as PerformanceDataPoint[];
    }
    
    const agreements = data as any[] || [];
    let formattedData: PerformanceDataPoint[] = [];
    
    switch (timeframe) {
      case 'week':
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
