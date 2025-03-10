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
  claimable: number;
  cancelled: number;
  void: number;
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

/**
 * Fetches monthly data for longer timeframe views
 * Uses fixed SQL functions with proper DATE_TRUNC grouping
 */
async function fetchMonthlyData(startDate: Date, endDate: Date, dealerFilter: string = '') {
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();
  
  console.log(`[PERFORMANCE] Fetching monthly agreements from ${startIso} to ${endIso}${dealerFilter ? ` with dealer filter ${dealerFilter}` : ''}`);
  
  // Try first using our optimized count_agreements_by_date function with month grouping
  try {
    const { data: monthlyGroupedData, error: groupedError } = await supabase.rpc('count_agreements_by_date', {
      from_date: startIso,
      to_date: endIso,
      dealer_uuid: dealerFilter || null,
      group_by: 'month'
    });
    
    if (!groupedError && monthlyGroupedData && monthlyGroupedData.length > 0) {
      console.log('[PERFORMANCE] Successfully used count_agreements_by_date with month grouping:', monthlyGroupedData.length, 'months');
      console.log('[PERFORMANCE] First few months:', monthlyGroupedData.slice(0, 3));
      
      // Map the data to our expected format
      return monthlyGroupedData.map(item => {
        const monthDate = new Date(item.date_group + '-01'); // Convert YYYY-MM to YYYY-MM-DD
        return {
          label: format(monthDate, 'MMM').toLowerCase(),
          value: parseInt(item.total_count),
          pending: parseInt(item.pending_count),
          active: parseInt(item.active_count),
          claimable: parseInt(item.claimable_count),
          cancelled: parseInt(item.cancelled_count),
          void: parseInt(item.void_count),
          rawDate: monthDate
        };
      });
    }
    
    // Fallback to the original function if the new approach failed
    console.log('[PERFORMANCE] count_agreements_by_date with month grouping failed, trying fetch_monthly_agreement_counts_with_status');
  } catch (groupedErr) {
    console.error('[PERFORMANCE] Error using count_agreements_by_date with month grouping:', groupedErr);
  }
  
  try {
    // Try the detailed status breakdown function
    const { data: monthlyData, error: functionError } = await supabase.rpc('fetch_monthly_agreement_counts_with_status', {
      start_date: startIso,
      end_date: endIso,
      dealer_uuid: dealerFilter || null
    });
    
    if (functionError) {
      console.warn('[PERFORMANCE] fetch_monthly_agreement_counts_with_status error:', functionError.message);
      console.log('[PERFORMANCE] Trying fetch_monthly_agreement_counts as fallback');
      
      // Try using the simpler monthly function without status breakdown
      try {
        const { data: simpleMonthlyData, error: simpleError } = await supabase.rpc('fetch_monthly_agreement_counts', {
          start_date: startIso,
          end_date: endIso
        });
        
        if (simpleError || !simpleMonthlyData) {
          console.warn('[PERFORMANCE] fetch_monthly_agreement_counts error:', simpleError?.message);
          return await fetchMonthlyAgreementCounts(startDate, endDate, dealerFilter);
        }
        
        console.log('[PERFORMANCE] Successfully used fetch_monthly_agreement_counts:', simpleMonthlyData.length, 'months');
        
        // Get the total counts by status for this period for ratio estimates
        const { data: statusTotals } = await supabase.rpc('count_agreements_by_status', {
          from_date: startIso,
          to_date: endIso,
          dealer_uuid: dealerFilter || null
        });
        
        // Calculate ratios to estimate breakdowns
        let pendingRatio = 0.9;  // Default if we can't get real data
        let activeRatio = 0.09;
        let cancelledRatio = 0.01;
        
        if (statusTotals && statusTotals.length > 0) {
          const total = statusTotals.reduce((sum, item) => sum + parseInt(item.count), 0);
          if (total > 0) {
            const pendingCount = statusTotals.find(s => s.status === 'PENDING')?.count || 0;
            const activeCount = statusTotals.find(s => s.status === 'ACTIVE')?.count || 0;
            const claimableCount = statusTotals.find(s => s.status === 'CLAIMABLE')?.count || 0;
            const cancelledCount = statusTotals.find(s => s.status === 'CANCELLED')?.count || 0;
            const voidCount = statusTotals.find(s => s.status === 'VOID')?.count || 0;
            
            pendingRatio = pendingCount / total;
            activeRatio = (activeCount + claimableCount) / total;
            cancelledRatio = (cancelledCount + voidCount) / total;
          }
        }
        
        // Convert the simple monthly data to our expected format
        return simpleMonthlyData.map(item => {
          const monthDate = new Date(item.month + '-01'); // Convert YYYY-MM to YYYY-MM-DD
          const total = parseInt(item.total);
          
          // Since we don't have status breakdowns with the simple function,
          // we'll estimate them based on the overall status distribution
          const pendingCount = Math.round(total * pendingRatio);
          const activeCount = Math.round(total * (activeRatio * 0.9)); // Mostly active
          const claimableCount = Math.round(total * (activeRatio * 0.1)); // Small portion claimable
          const cancelledCount = Math.round(total * (cancelledRatio * 0.8)); // Mostly cancelled
          const voidCount = Math.round(total * (cancelledRatio * 0.2)); // Small portion void
          
          return {
            label: format(monthDate, 'MMM').toLowerCase(),
            value: total,
            pending: pendingCount,
            active: activeCount,
            claimable: claimableCount,
            cancelled: cancelledCount,
            void: voidCount,
            rawDate: monthDate
          };
        });
      } catch (simpleErr) {
        console.error('[PERFORMANCE] Error with simple monthly function:', simpleErr);
        return await fetchMonthlyAgreementCounts(startDate, endDate, dealerFilter);
      }
    }
    
    if (monthlyData && monthlyData.length > 0) {
      console.log('[PERFORMANCE] Successfully used fetch_monthly_agreement_counts_with_status:', monthlyData.length, 'months');
      console.log('[PERFORMANCE] First few months:', monthlyData.slice(0, 3));
      
      // Convert the detailed monthly data to our expected format
      return monthlyData.map(item => {
        const monthDate = new Date(item.month + '-01'); // Convert YYYY-MM to YYYY-MM-DD
        return {
          label: format(monthDate, 'MMM').toLowerCase(),
          value: parseInt(item.total),
          pending: parseInt(item.pending),
          active: parseInt(item.active),
          claimable: parseInt(item.claimable),
          cancelled: parseInt(item.cancelled),
          void: parseInt(item.void),
          rawDate: monthDate
        };
      });
    } else {
      console.log('[PERFORMANCE] No data from monthly functions, falling back');
      return await fetchMonthlyAgreementCounts(startDate, endDate, dealerFilter);
    }
  } catch (err) {
    console.error('[PERFORMANCE] Error using monthly functions:', err);
    return await fetchMonthlyAgreementCounts(startDate, endDate, dealerFilter);
  }
}

/**
 * Fetches agreement data for a month-by-month view
 * Each month will show the actual count of agreements for that month
 * Used as a fallback if the SQL functions fail
 */
async function fetchMonthlyAgreementCounts(startDate: Date, endDate: Date, dealerFilter: string = '') {
  // Format dates
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();
  
  console.log(`[PERFORMANCE] Using client-side monthly aggregation from ${startIso} to ${endIso}${dealerFilter ? ` with dealer filter ${dealerFilter}` : ''}`);

  // Initialize monthly stats object
  const monthlyStats: Record<string, { 
    total: number, 
    pending: number, 
    active: number, 
    claimable: number,
    cancelled: number,
    void: number,
    statusCounts: Record<string, number>
  }> = {};
  
  // Get array of months in the interval
  const months = eachMonthOfInterval({ start: startDate, end: endDate });

  // Initialize with zeros
  months.forEach(month => {
    const monthKey = format(month, 'yyyy-MM');
    monthlyStats[monthKey] = { 
      total: 0, 
      pending: 0, 
      active: 0, 
      claimable: 0,
      cancelled: 0,
      void: 0,
      statusCounts: {}
    };
  });
  
  // Build the query
  let query = supabase
    .from('agreements')
    .select('EffectiveDate, AgreementStatus');
  
  // Apply date range filter
  query = query
    .gte('EffectiveDate', startIso)
    .lte('EffectiveDate', endIso);
  
  // Apply dealer filter if provided
  if (dealerFilter) {
    query = query.eq('DealerUUID', dealerFilter);
  }
  
  // Fetch the data
  const { data, error } = await query;

  if (error) {
    console.error("[PERFORMANCE] Error fetching monthly agreement data:", error);
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

  // Process each agreement and group by month
  if (data) {
    data.forEach(agreement => {
      const effectiveDate = new Date(agreement.EffectiveDate);
      const monthKey = format(effectiveDate, 'yyyy-MM');
      
      if (monthlyStats[monthKey]) {
        // Increment total count
        monthlyStats[monthKey].total++;
        
        // Track status counts
        const status = (agreement.AgreementStatus || '').toUpperCase();
        
        // Count in the specific status categories
        if (status === 'PENDING') {
          monthlyStats[monthKey].pending++;
        } else if (status === 'ACTIVE') {
          monthlyStats[monthKey].active++;
        } else if (status === 'CLAIMABLE') {
          monthlyStats[monthKey].claimable++;
        } else if (status === 'CANCELLED') {
          monthlyStats[monthKey].cancelled++;
        } else if (status === 'VOID') {
          monthlyStats[monthKey].void++;
        }
        
        // Also track in detailed status counts for debugging
        monthlyStats[monthKey].statusCounts[status] = 
          (monthlyStats[monthKey].statusCounts[status] || 0) + 1;
      }
    });
  }

  // Verify the total count for debugging
  const totalProcessed = Object.values(monthlyStats).reduce((sum, month) => sum + month.total, 0);
  console.log(`[PERFORMANCE] Total agreements processed for monthly view: ${totalProcessed}`);
  
  // Return the formatted data for chart display
  return months.map(month => {
    const monthKey = format(month, 'yyyy-MM');
    const stats = monthlyStats[monthKey];
    return {
      label: format(month, 'MMM').toLowerCase(),
      value: stats.total,
      pending: stats.pending,
      active: stats.active,
      claimable: stats.claimable,
      cancelled: stats.cancelled,
      void: stats.void,
      rawDate: month
    };
  });
}

/**
 * Fetches agreement data for daily view, showing actual counts per day
 * Uses the fixed SQL function to aggregate data efficiently with proper date grouping
 */
async function fetchDailyAgreementsByStatus(startDate: Date, endDate: Date, dealerFilter: string = '') {
  // Format dates
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();
  
  console.log(`[PERFORMANCE] Fetching daily agreements from ${startIso} to ${endIso}${dealerFilter ? ` with dealer filter ${dealerFilter}` : ''}`);
  
  try {
    // Use the fixed SQL function for daily data with proper DATE_TRUNC grouping
    const { data: dailyData, error } = await supabase.rpc('count_agreements_by_date', {
      from_date: startIso,
      to_date: endIso,
      dealer_uuid: dealerFilter || null,
      group_by: 'day'
    });
    
    if (error) {
      console.warn('[PERFORMANCE] count_agreements_by_date error:', error.message);
      console.log('[PERFORMANCE] Trying count_agreements_by_status as fallback');
      
      // Try using count_agreements_by_status as a fallback
      try {
        const { data: statusData, error: statusError } = await supabase.rpc('count_agreements_by_status', {
          from_date: startIso,
          to_date: endIso,
          dealer_uuid: dealerFilter || null
        });
        
        if (statusError || !statusData) {
          console.warn('[PERFORMANCE] count_agreements_by_status error:', statusError?.message);
          return await fetchDailyDataWithClientGrouping(startDate, endDate, dealerFilter);
        }
        
        // This only gives total counts by status, we still need to do daily grouping client-side
        console.log('[PERFORMANCE] Got status totals, doing client-side daily grouping');
        console.log('[PERFORMANCE] Status distribution:', statusData);
        
        // Since we don't have day-by-day breakdowns, fallback to client-side grouping
        return await fetchDailyDataWithClientGrouping(startDate, endDate, dealerFilter);
      } catch (statusErr) {
        console.error('[PERFORMANCE] Error with fallback function:', statusErr);
        return await fetchDailyDataWithClientGrouping(startDate, endDate, dealerFilter);
      }
    }
    
    if (dailyData && dailyData.length > 0) {
      console.log('[PERFORMANCE] Successfully used count_agreements_by_date:', dailyData.length, 'days');
      console.log('[PERFORMANCE] First 5 days of data:', dailyData.slice(0, 5));
      
      // Get all days in the interval to ensure complete data
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      
      // Create a map of the SQL data for fast lookups
      const dateMap = new Map();
      dailyData.forEach(row => {
        // Convert date_group string back to Date for proper comparison
        const dateKey = row.date_group;
        dateMap.set(dateKey, {
          total: parseInt(row.total_count),
          pending: parseInt(row.pending_count),
          active: parseInt(row.active_count),
          claimable: parseInt(row.claimable_count),
          cancelled: parseInt(row.cancelled_count),
          void: parseInt(row.void_count)
        });
      });
      
      // Map to the expected format, using zeroes for days with no data
      return days.map(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const stats = dateMap.get(dayKey) || { 
          total: 0, 
          pending: 0, 
          active: 0, 
          claimable: 0, 
          cancelled: 0, 
          void: 0 
        };
        
        return {
          label: format(day, 'd'), // Use day of month as label
          value: stats.total,
          pending: stats.pending,
          active: stats.active,
          claimable: stats.claimable,
          cancelled: stats.cancelled,
          void: stats.void,
          rawDate: day
        };
      });
    } else {
      console.log('[PERFORMANCE] No data from count_agreements_by_date, falling back');
      return await fetchDailyDataWithClientGrouping(startDate, endDate, dealerFilter);
    }
  } catch (err) {
    console.error('[PERFORMANCE] Error using count_agreements_by_date:', err);
    return await fetchDailyDataWithClientGrouping(startDate, endDate, dealerFilter);
  }
}

/**
 * Fallback function that fetches all agreements and groups them client-side
 * This is used if the SQL approach fails
 */
async function fetchDailyDataWithClientGrouping(startDate: Date, endDate: Date, dealerFilter: string = '') {
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();
  
  console.log('[PERFORMANCE] Using client-side grouping approach');
  
  // Build the query
  let query = supabase
    .from('agreements')
    .select('EffectiveDate, AgreementStatus');
  
  // Apply date range filter
  query = query
    .gte('EffectiveDate', startIso)
    .lte('EffectiveDate', endIso);
  
  // Apply dealer filter if provided
  if (dealerFilter) {
    query = query.eq('DealerUUID', dealerFilter);
  }
  
  // Fetch the data
  const { data, error } = await query;
  
  if (error) {
    console.error("[PERFORMANCE] Error fetching daily agreement data:", error);
    throw new Error(error.message);
  }
  
  console.log(`[PERFORMANCE] Daily data fetch returned ${data?.length || 0} agreements`);
  
  // Log status distribution for debugging
  if (data && data.length > 0) {
    const statusCounts: Record<string, number> = {};
    data.forEach(agreement => {
      const status = (agreement.AgreementStatus || '').toUpperCase();
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    console.log('[PERFORMANCE] Status distribution in daily data:', statusCounts);
  }
  
  // Process data into day-by-day counts
  // Get array of days in the interval
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  // Initialize daily stats with zeros
  const dailyStats: Record<string, {
    total: number,
    pending: number,
    active: number,
    claimable: number,
    cancelled: number,
    void: number
  }> = {};
  
  days.forEach(day => {
    const dayKey = format(day, 'yyyy-MM-dd');
    dailyStats[dayKey] = { 
      total: 0, 
      pending: 0, 
      active: 0, 
      claimable: 0,
      cancelled: 0, 
      void: 0
    };
  });
  
  // Process each agreement and group by day
  if (data) {
    data.forEach(agreement => {
      const effectiveDate = new Date(agreement.EffectiveDate);
      const dayKey = format(effectiveDate, 'yyyy-MM-dd');
      
      if (dailyStats[dayKey]) {
        // Increment total count
        dailyStats[dayKey].total++;
        
        // Track status counts
        const status = (agreement.AgreementStatus || '').toUpperCase();
        
        // Count in specific status categories
        if (status === 'PENDING') {
          dailyStats[dayKey].pending++;
        } else if (status === 'ACTIVE') {
          dailyStats[dayKey].active++;
        } else if (status === 'CLAIMABLE') {
          dailyStats[dayKey].claimable++;
        } else if (status === 'CANCELLED') {
          dailyStats[dayKey].cancelled++;
        } else if (status === 'VOID') {
          dailyStats[dayKey].void++;
        }
      }
    });
  }
  
  // Format the data for chart display based on timeframe
  return days.map(day => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const stats = dailyStats[dayKey];
    
    return {
      label: format(day, 'd'), // Use day of month as label
      value: stats.total,
      pending: stats.pending,
      active: stats.active,
      claimable: stats.claimable,
      cancelled: stats.cancelled,
      void: stats.void,
      rawDate: day
    };
  });
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
      // For longer timeframes, use our optimized monthly data function 
      // with SQL function support and multiple fallbacks
      return await fetchMonthlyData(startDate, endDate, dealerFilter);
    } else if (timeframe === 'week' || timeframe === 'month') {
      // For week and month views, use our optimized daily data function
      // with SQL function support and fallbacks
      return await fetchDailyAgreementsByStatus(startDate, endDate, dealerFilter);
    }
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
    
    // If the data is already in the right format, just return it with potential formatting adjustments
    if (Array.isArray(data) && data.length > 0 && 'label' in data[0]) {
      // For week view, update the label format to use abbreviated day names
      if (timeframe === 'week') {
        return (data as PerformanceDataPoint[]).map(point => ({
          ...point,
          label: format(point.rawDate, 'EEE').toLowerCase() // Change from day number to abbreviated day name
        }));
      }
      
      // Ensure data is sorted chronologically
      const sortedData = [...(data as PerformanceDataPoint[])];
      sortedData.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
      
      // For month view, we want to ensure all days are represented and in order
      if (timeframe === 'month') {
        // Add any missing dates (should be rare but ensures data consistency)
        const allDays = eachDayOfInterval({ start: startDate, end: endDate });
        const existingDateMap = new Map(sortedData.map(point => [format(point.rawDate, 'yyyy-MM-dd'), point]));
        
        return allDays.map(day => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const existingPoint = existingDateMap.get(dayKey);
          
          if (existingPoint) {
            return existingPoint;
          }
          
          // If we're missing a day, create a zero-valued point
          return {
            label: format(day, 'd'),
            value: 0,
            pending: 0,
            active: 0,
            cancelled: 0,
            rawDate: day
          };
        });
      }
      
      // For longer timeframes, return as is but ensure chronological order
      return sortedData;
    }
    
    // This code path should no longer be reached since both weekly and monthly data
    // are now pre-processed by fetchDailyAgreementsByStatus or fetchMonthlyAgreementCounts
    console.warn('[PERFORMANCE] Unexpected data format - using fallback processing');
    
    // Log some info about what we got to help debug
    if (data) {
      console.warn('[PERFORMANCE] Unexpected data structure:', Array.isArray(data) ? 'Array' : typeof data);
      if (Array.isArray(data) && data.length > 0) {
        console.warn('[PERFORMANCE] First item keys:', Object.keys(data[0]));
      }
    }
    
    return [];
  }, [data, isLoading, timeframe, startDate, endDate]);
  
  return {
    data: processedData,
    startDate,
    endDate,
    loading: isLoading,
    error: error as Error | null
  };
}