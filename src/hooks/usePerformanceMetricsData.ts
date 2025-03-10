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

async function fetchMonthlyAgreementCounts(startDate: Date, endDate: Date, dealerFilter: string = '') {
  // Format dates simply without timezone conversion
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();
  
  console.log(`[PERFORMANCE] Fetching aggregated monthly data from ${startIso} to ${endIso}${dealerFilter ? ` with dealer filter ${dealerFilter}` : ''}`);

  const monthlyStats: Record<string, { 
    total: number, 
    pending: number, 
    active: number, 
    cancelled: number,
    statusCounts: Record<string, number>
  }> = {};
  
  const months = eachMonthOfInterval({ start: startDate, end: endDate });

  // Initialize monthly stats with zeros
  months.forEach(month => {
    const monthKey = format(month, 'yyyy-MM');
    monthlyStats[monthKey] = { 
      total: 0, 
      pending: 0, 
      active: 0, 
      cancelled: 0,
      statusCounts: {}
    };
  });
  
  // Try to use the RPC function first for accurate counts
  try {
    const { data: countsByStatus, error: countError } = await supabase.rpc(
      'count_agreements_by_status',
      {
        from_date: startIso,
        to_date: endIso,
        dealer_uuid: dealerFilter || null
      }
    );
    
    if (!countError && countsByStatus) {
      console.log('[PERFORMANCE] Successfully used RPC to fetch monthly counts by status');
      console.log('[PERFORMANCE] Status distribution from RPC:', countsByStatus);
      
      // Track total agreements
      let totalAgreements = 0;
      
      // Get total count and prepare distribution
      countsByStatus.forEach((item: {status: string, count: number}) => {
        totalAgreements += item.count;
        
        // Track the main categories for the UI
        const status = (item.status || '').toUpperCase();
        if (status === 'PENDING') {
          // Distribute pending across all months
          const countPerMonth = Math.floor(item.count / months.length);
          const remainder = item.count % months.length;
          
          months.forEach((month, index) => {
            const monthKey = format(month, 'yyyy-MM');
            let countForThisMonth = countPerMonth;
            
            // Add the remainder to the first few months
            if (index < remainder) {
              countForThisMonth++;
            }
            
            monthlyStats[monthKey].pending += countForThisMonth;
            monthlyStats[monthKey].total += countForThisMonth;
            
            // Also track in the detailed status counts
            monthlyStats[monthKey].statusCounts[status] = 
              (monthlyStats[monthKey].statusCounts[status] || 0) + countForThisMonth;
          });
        } 
        else if (status === 'ACTIVE') {
          // Distribute active across all months
          const countPerMonth = Math.floor(item.count / months.length);
          const remainder = item.count % months.length;
          
          months.forEach((month, index) => {
            const monthKey = format(month, 'yyyy-MM');
            let countForThisMonth = countPerMonth;
            
            // Add the remainder to the first few months
            if (index < remainder) {
              countForThisMonth++;
            }
            
            monthlyStats[monthKey].active += countForThisMonth;
            monthlyStats[monthKey].total += countForThisMonth;
            
            // Also track in the detailed status counts
            monthlyStats[monthKey].statusCounts[status] = 
              (monthlyStats[monthKey].statusCounts[status] || 0) + countForThisMonth;
          });
        }
        else if (status === 'CANCELLED') {
          // Distribute cancelled across all months
          const countPerMonth = Math.floor(item.count / months.length);
          const remainder = item.count % months.length;
          
          months.forEach((month, index) => {
            const monthKey = format(month, 'yyyy-MM');
            let countForThisMonth = countPerMonth;
            
            // Add the remainder to the first few months
            if (index < remainder) {
              countForThisMonth++;
            }
            
            monthlyStats[monthKey].cancelled += countForThisMonth;
            monthlyStats[monthKey].total += countForThisMonth;
            
            // Also track in the detailed status counts
            monthlyStats[monthKey].statusCounts[status] = 
              (monthlyStats[monthKey].statusCounts[status] || 0) + countForThisMonth;
          });
        }
        else {
          // For other statuses, just distribute evenly across months
          // but don't add to the main counts since the UI only shows
          // pending, active, and cancelled
          const countPerMonth = Math.floor(item.count / months.length);
          const remainder = item.count % months.length;
          
          months.forEach((month, index) => {
            const monthKey = format(month, 'yyyy-MM');
            let countForThisMonth = countPerMonth;
            
            // Add the remainder to the first few months
            if (index < remainder) {
              countForThisMonth++;
            }
            
            // Only add to total (not to standard counts)
            monthlyStats[monthKey].total += countForThisMonth;
            
            // Track in the detailed status counts
            monthlyStats[monthKey].statusCounts[status] = 
              (monthlyStats[monthKey].statusCounts[status] || 0) + countForThisMonth;
          });
        }
      });
      
      console.log('[PERFORMANCE] Distributed agreement counts across months:', 
        Object.values(monthlyStats).map(m => m.total).reduce((a, b) => a + b, 0));
      
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
  } catch (rpcError) {
    console.error('[PERFORMANCE] RPC error:', rpcError);
    console.log('[PERFORMANCE] Falling back to regular query for monthly data');
  }

  // Fallback to regular query without limiting results
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

  if (data) {
    data.forEach(agreement => {
      const effectiveDate = new Date(agreement.EffectiveDate);
      // Simplify - just use the date as is
      const monthKey = format(effectiveDate, 'yyyy-MM');
      
      if (monthlyStats[monthKey]) {
        // Track all agreements in the total count
        monthlyStats[monthKey].total++; 
        
        // Track counts by the standard statuses the UI expects
        const status = (agreement.AgreementStatus || '').toUpperCase();
        if (status === 'PENDING') {
          monthlyStats[monthKey].pending++;
        } else if (status === 'ACTIVE') {
          monthlyStats[monthKey].active++;
        } else if (status === 'CANCELLED') {
          monthlyStats[monthKey].cancelled++;
        }
        
        // Also track the detailed status counts
        monthlyStats[monthKey].statusCounts[status] = 
          (monthlyStats[monthKey].statusCounts[status] || 0) + 1;
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
  
  // Try using the RPC function first for more accurate counts
  try {
    const { data: countsByStatus, error: countError } = await supabase.rpc(
      'count_agreements_by_status',
      {
        from_date: startIso,
        to_date: endIso,
        dealer_uuid: dealerFilter || null
      }
    );
    
    if (!countError && countsByStatus) {
      console.log('[PERFORMANCE] Successfully used RPC to fetch counts by status');
      console.log('[PERFORMANCE] Status distribution from RPC:', countsByStatus);
      
      // Transform the data to match our expected format
      return countsByStatus.map((item: {status: string, count: number}) => ({
        EffectiveDate: startDate.toISOString(), // Doesn't matter for our counting purposes
        AgreementStatus: item.status,
        _count: item.count // Add count as a special field
      }));
    }
  } catch (rpcError) {
    console.error('[PERFORMANCE] RPC error:', rpcError);
    console.log('[PERFORMANCE] Falling back to regular query');
  }
  
  // Fallback to regular query without limiting results
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
    
    // If the data is already in the right format, just return it
    if (Array.isArray(data) && data.length > 0 && 'label' in data[0]) {
      return data as PerformanceDataPoint[];
    }
    
    const agreements = data as any[] || [];
    let formattedData: PerformanceDataPoint[] = [];
    
    // Check if we have _count data from RPC
    const hasCountData = agreements.length > 0 && '_count' in agreements[0];
    console.log(`[PERFORMANCE] Data format: ${hasCountData ? 'RPC count data' : 'Individual records'}`);
    
    switch (timeframe) {
      case 'week': {
        const weekDays = eachDayOfInterval({ start: startDate, end: endDate });
        
        if (hasCountData) {
          // Create a map to store count data for each day
          const dayStats: Record<string, {
            total: number,
            pending: number,
            active: number,
            cancelled: number,
            statusCounts: Record<string, number>
          }> = {};
          
          // Initialize with zeros
          weekDays.forEach(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            dayStats[dayKey] = { 
              total: 0, 
              pending: 0, 
              active: 0, 
              cancelled: 0,
              statusCounts: {}
            };
          });
          
          // Process each status count
          agreements.forEach(agreement => {
            const status = (agreement.AgreementStatus || '').toUpperCase();
            const count = agreement._count || 1;
            
            // Evenly distribute counts across the days in the week
            const countPerDay = Math.floor(count / weekDays.length);
            const remainder = count % weekDays.length;
            
            weekDays.forEach((day, index) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              let countForThisDay = countPerDay;
              
              // Add the remainder to the first few days
              if (index < remainder) {
                countForThisDay++;
              }
              
              // Always add to total
              dayStats[dayKey].total += countForThisDay;
              
              // Add to the appropriate status count
              if (status === 'PENDING') {
                dayStats[dayKey].pending += countForThisDay;
              } else if (status === 'ACTIVE') {
                dayStats[dayKey].active += countForThisDay;
              } else if (status === 'CANCELLED') {
                dayStats[dayKey].cancelled += countForThisDay;
              }
              
              // Store in the detailed status counts
              dayStats[dayKey].statusCounts[status] = 
                (dayStats[dayKey].statusCounts[status] || 0) + countForThisDay;
            });
          });
          
          // Create the formatted data from dayStats
          formattedData = weekDays.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const stats = dayStats[dayKey];
            
            return {
              label: format(day, 'EEE').toLowerCase(),
              value: stats.total,
              pending: stats.pending,
              active: stats.active,
              cancelled: stats.cancelled,
              rawDate: day
            };
          });
        } else {
          // Process day by day using individual agreement records
          formattedData = weekDays.map(day => {
            const dayAgreements = agreements.filter(agreement => {
              const effectiveDate = new Date(agreement.EffectiveDate);
              return format(effectiveDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
            });
            
            // Initialize counters for different statuses
            let pending = 0, active = 0, cancelled = 0;
            const statusCounts: Record<string, number> = {};
            
            // Count agreements by status
            dayAgreements.forEach(agreement => {
              const status = (agreement.AgreementStatus || '').toUpperCase();
              
              // Track in detailed status counts
              statusCounts[status] = (statusCounts[status] || 0) + 1;
              
              // Track in the main counts shown in UI
              if (status === 'PENDING') {
                pending++;
              } else if (status === 'ACTIVE') {
                active++;
              } else if (status === 'CANCELLED') {
                cancelled++;
              }
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
        }
        break;
      }
        
      case 'month': {
        const monthDays = eachDayOfInterval({ start: startDate, end: endDate });
        
        if (hasCountData) {
          // Create a map to store count data for each day
          const dayStats: Record<string, {
            total: number,
            pending: number,
            active: number,
            cancelled: number,
            statusCounts: Record<string, number>
          }> = {};
          
          // Initialize with zeros
          monthDays.forEach(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            dayStats[dayKey] = { 
              total: 0, 
              pending: 0, 
              active: 0, 
              cancelled: 0,
              statusCounts: {}
            };
          });
          
          // Process each status count
          agreements.forEach(agreement => {
            const status = (agreement.AgreementStatus || '').toUpperCase();
            const count = agreement._count || 1;
            
            // Evenly distribute counts across the days in the month
            const countPerDay = Math.floor(count / monthDays.length);
            const remainder = count % monthDays.length;
            
            monthDays.forEach((day, index) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              let countForThisDay = countPerDay;
              
              // Add the remainder to the first few days
              if (index < remainder) {
                countForThisDay++;
              }
              
              // Always add to total
              dayStats[dayKey].total += countForThisDay;
              
              // Add to the appropriate status count
              if (status === 'PENDING') {
                dayStats[dayKey].pending += countForThisDay;
              } else if (status === 'ACTIVE') {
                dayStats[dayKey].active += countForThisDay;
              } else if (status === 'CANCELLED') {
                dayStats[dayKey].cancelled += countForThisDay;
              }
              
              // Store in the detailed status counts
              dayStats[dayKey].statusCounts[status] = 
                (dayStats[dayKey].statusCounts[status] || 0) + countForThisDay;
            });
          });
          
          // Create the formatted data from dayStats
          formattedData = monthDays.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const stats = dayStats[dayKey];
            
            return {
              label: format(day, 'd'),
              value: stats.total,
              pending: stats.pending,
              active: stats.active,
              cancelled: stats.cancelled,
              rawDate: day
            };
          });
        } else {
          // Process day by day from individual records
          formattedData = monthDays.map(day => {
            const dayAgreements = agreements.filter(agreement => {
              const effectiveDate = new Date(agreement.EffectiveDate);
              return format(effectiveDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
            });
            
            // Initialize counters for different statuses
            let pending = 0, active = 0, cancelled = 0;
            const statusCounts: Record<string, number> = {};
            
            // Count agreements by status
            dayAgreements.forEach(agreement => {
              const status = (agreement.AgreementStatus || '').toUpperCase();
              
              // Track in detailed status counts
              statusCounts[status] = (statusCounts[status] || 0) + 1;
              
              // Track in the main counts shown in UI
              if (status === 'PENDING') {
                pending++;
              } else if (status === 'ACTIVE') {
                active++;
              } else if (status === 'CANCELLED') {
                cancelled++;
              }
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
        }
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