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
  pending: number;
  active: number;
  cancelled: number;
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
  console.log(`[PERFORMANCE] Fetching aggregated monthly data from ${startDate.toISOString()} to ${endDate.toISOString()}`);

  const { data, error } = await supabase
    .from('agreements')
    .select('EffectiveDate, AgreementStatus')
    .gte('EffectiveDate', startDate.toISOString())
    .lte('EffectiveDate', endDate.toISOString());

  if (error) {
    console.error("Error fetching aggregated agreement data:", error);
    throw new Error(error.message);
  }

  const monthlyStats: Record<string, { total: number, pending: number, active: number, cancelled: number }> = {};
  const months = eachMonthOfInterval({ start: startDate, end: endDate });

  months.forEach(month => {
    const monthKey = format(month, 'yyyy-MM');
    monthlyStats[monthKey] = { total: 0, pending: 0, active: 0, cancelled: 0 };
  });

  if (data) {
    data.forEach(agreement => {
      const effectiveDate = new Date(agreement.EffectiveDate);
      const monthKey = format(effectiveDate, 'yyyy-MM');
      
      if (monthlyStats[monthKey]) {
        monthlyStats[monthKey].total++;
        
        const status = (agreement.AgreementStatus || '').toUpperCase();
        
        if (status === 'PENDING') {
          monthlyStats[monthKey].pending++;
        } else if (status === 'ACTIVE') {
          monthlyStats[monthKey].active++;
        } else if (status === 'CANCELLED') {
          monthlyStats[monthKey].cancelled++;
        }
      }
    });
  }

  return months.map(month => {
    const monthKey = format(month, 'yyyy-MM');
    const stats = monthlyStats[monthKey];
    return {
      label: format(month, 'MMM').toLowerCase(),
      value: stats.total,
      pending: stats.pending,
      active: stats.active,
      cancelled: stats.cancelled,
      rawDate: month
    };
  });
}

async function fetchAllAgreementsByStatus(startDate: Date, endDate: Date) {
  console.log(`[PERFORMANCE] Fetching all agreements by status from ${startDate.toISOString()} to ${endDate.toISOString()}`);
  
  const { data, error } = await supabase
    .from('agreements')
    .select('EffectiveDate, AgreementStatus')
    .gte('EffectiveDate', startDate.toISOString())
    .lte('EffectiveDate', endDate.toISOString());
  
  if (error) {
    console.error("Error fetching agreement data:", error);
    throw new Error(error.message);
  }
  
  console.log(`[PERFORMANCE] Total agreements fetched: ${data?.length || 0}`);
  return data || [];
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
    console.log(`[PERFORMANCE] Fetching data for ${timeframe} from ${formattedDates.startDate} to ${formattedDates.endDate}`);
    
    if (timeframe === '6months' || timeframe === 'year') {
      return await fetchMonthlyAgreementCounts(startDate, endDate);
    }
    
    return await fetchAllAgreementsByStatus(startDate, endDate);
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
      case 'week': {
        const weekDays = eachDayOfInterval({ start: startDate, end: endDate });
        
        formattedData = weekDays.map(day => {
          const dayAgreements = agreements.filter(agreement => {
            const effectiveDate = new Date(agreement.EffectiveDate);
            return format(effectiveDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
          });
          
          let pending = 0, active = 0, cancelled = 0;
          
          dayAgreements.forEach(agreement => {
            const status = (agreement.AgreementStatus || '').toUpperCase();
            if (status === 'PENDING') pending++;
            else if (status === 'ACTIVE') active++;
            else if (status === 'CANCELLED') cancelled++;
          });
          
          return {
            label: format(day, 'EEE').toLowerCase(),
            value: dayAgreements.length,
            pending,
            active,
            cancelled,
            rawDate: day
          };
        });
        break;
      }
        
      case 'month': {
        const monthDays = eachDayOfInterval({ start: startDate, end: endDate });
        
        formattedData = monthDays.map(day => {
          const dayAgreements = agreements.filter(agreement => {
            const effectiveDate = new Date(agreement.EffectiveDate);
            return format(effectiveDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
          });
          
          let pending = 0, active = 0, cancelled = 0;
          
          dayAgreements.forEach(agreement => {
            const status = (agreement.AgreementStatus || '').toUpperCase();
            if (status === 'PENDING') pending++;
            else if (status === 'ACTIVE') active++;
            else if (status === 'CANCELLED') cancelled++;
          });
          
          return {
            label: format(day, 'd'),
            value: dayAgreements.length,
            pending,
            active,
            cancelled,
            rawDate: day
          };
        });
        break;
      }
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
