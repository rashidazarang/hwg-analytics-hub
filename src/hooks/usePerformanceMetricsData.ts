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
import { toCSTISOString, setCSTHours, CST_TIMEZONE, toCSTDate } from '@/lib/dateUtils';
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

// Helper function to normalize status codes
function normalizeStatus(status: string): 'PENDING' | 'ACTIVE' | 'CANCELLED' {
  status = (status || '').toUpperCase();
  
  if (status === 'PENDING') {
    return 'PENDING';
  } else if (status === 'ACTIVE' || status === 'CLAIMABLE') {
    return 'ACTIVE';
  } else if (status === 'CANCELLED' || status === 'VOID') {
    return 'CANCELLED';
  } else {
    // Default unrecognized statuses to ACTIVE for now
    console.log(`[PERFORMANCE] Normalizing unrecognized status: ${status} to ACTIVE`);
    return 'ACTIVE';
  }
}

async function fetchMonthlyAgreementCounts(startDate: Date, endDate: Date, dealerFilter: string = '') {
  // Format dates simply without timezone conversion
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();
  
  console.log(`[PERFORMANCE] Fetching aggregated monthly data from ${startIso} to ${endIso}${dealerFilter ? ` with dealer filter ${dealerFilter}` : ''}`);

  // Build the query
  let query = supabase
    .from('agreements')
    .select('EffectiveDate, AgreementStatus')
    .gte('EffectiveDate', startIso)
    .lte('EffectiveDate', endIso);
  
  // Apply dealer filter if provided
  if (dealerFilter) {
    query = query.eq('DealerUUID', dealerFilter);
  }
  
  const { data, error } = await query;

  if (error) {
    console.error("[PERFORMANCE] Error fetching aggregated agreement data:", error);
    throw new Error(error.message);
  }
  
  // Log total count for debugging
  console.log(`[PERFORMANCE] Monthly data fetch returned ${data?.length || 0} agreements`);
  
  // Log status distribution for debugging
  if (data && data.length > 0) {
    const statusCounts: Record<string, number> = {};
    data.forEach(agreement => {
      const status = (agreement.AgreementStatus || '').toUpperCase();
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    console.log('[PERFORMANCE] Status distribution in monthly data:', statusCounts);
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
      // Simplify - just use the date as is
      const monthKey = format(effectiveDate, 'yyyy-MM');
      
      if (monthlyStats[monthKey]) {
        monthlyStats[monthKey].total++; // Always increment total
        
        // Normalize status for consistent counting
        const normalizedStatus = normalizeStatus(agreement.AgreementStatus);
        
        if (normalizedStatus === 'PENDING') {
          monthlyStats[monthKey].pending++;
        } else if (normalizedStatus === 'ACTIVE') {
          monthlyStats[monthKey].active++;
        } else if (normalizedStatus === 'CANCELLED') {
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

async function fetchAllAgreementsByStatus(startDate: Date, endDate: Date, dealerFilter: string = '') {
  // Format dates - no need for complex timezone conversion here
  // Just use the dates as is, since timezone handling will be done on the server
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();
  
  console.log(`[PERFORMANCE] Fetching all agreements by status from ${startIso} to ${endIso}${dealerFilter ? ` with dealer filter ${dealerFilter}` : ''}`);
  
  // Build the query
  let query = supabase
    .from('agreements')
    .select('EffectiveDate, AgreementStatus')
    .gte('EffectiveDate', startIso)
    .lte('EffectiveDate', endIso);
  
  // Apply dealer filter if provided
  if (dealerFilter) {
    query = query.eq('DealerUUID', dealerFilter);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error("[PERFORMANCE] Error fetching agreement data:", error);
    throw new Error(error.message);
  }
  
  console.log(`[PERFORMANCE] Total agreements fetched: ${data?.length || 0}`);
  
  // Log status distribution for debugging
  if (data && data.length > 0) {
    const statusCounts: Record<string, number> = {};
    data.forEach(agreement => {
      const status = (agreement.AgreementStatus || '').toUpperCase();
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    console.log('[PERFORMANCE] Status distribution in raw data:', statusCounts);
  }
  
  return data || [];
}

export function usePerformanceMetricsData(
  timeframe: TimeframeOption,
  offsetPeriods: number = 0,
  dealerFilter: string = ''
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
    ['performance-metrics', timeframe, formattedDates.startDate, formattedDates.endDate, dealerFilter], 
    [timeframe, formattedDates.startDate, formattedDates.endDate, dealerFilter]
  );
  
  const queryFn = useCallback(async () => {
    console.log(`[PERFORMANCE] Fetching data for ${timeframe} from ${formattedDates.startDate} to ${formattedDates.endDate}${dealerFilter ? ` with dealer filter ${dealerFilter}` : ''}`);
    
    if (timeframe === '6months' || timeframe === 'year') {
      return await fetchMonthlyAgreementCounts(startDate, endDate, dealerFilter);
    }
    
    return await fetchAllAgreementsByStatus(startDate, endDate, dealerFilter);
  }, [timeframe, formattedDates, startDate, endDate, dealerFilter]);
  
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
          
          // Initialize counters for different statuses
          let pending = 0, active = 0, cancelled = 0, other = 0;
          
          // Count agreements by status - including ALL agreements in the total
          dayAgreements.forEach(agreement => {
            // Normalize status for consistent counting
            const normalizedStatus = normalizeStatus(agreement.AgreementStatus);
            
            if (normalizedStatus === 'PENDING') pending++;
            else if (normalizedStatus === 'ACTIVE') active++;
            else if (normalizedStatus === 'CANCELLED') cancelled++;
          });
          
          return {
            label: format(day, 'EEE').toLowerCase(),
            value: dayAgreements.length, // This includes ALL agreements regardless of status
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
          
          // Initialize counters for different statuses
          let pending = 0, active = 0, cancelled = 0, other = 0;
          
          // Count agreements by status - including ALL agreements in the total
          dayAgreements.forEach(agreement => {
            // Normalize status for consistent counting
            const normalizedStatus = normalizeStatus(agreement.AgreementStatus);
            
            if (normalizedStatus === 'PENDING') pending++;
            else if (normalizedStatus === 'ACTIVE') active++;
            else if (normalizedStatus === 'CANCELLED') cancelled++;
          });
          
          return {
            label: format(day, 'd'),
            value: dayAgreements.length, // This includes ALL agreements regardless of status
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