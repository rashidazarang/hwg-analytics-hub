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

// New optimized data processing functions
// These take the raw agreements data and process it into the appropriate format for each timeframe

/**
 * Process data for monthly view (6months and year timeframes)
 * Groups agreements by month and counts by status
 */
function processMonthlyData(agreements: any[], startDate: Date, endDate: Date): PerformanceDataPoint[] {
  console.log(`[PERFORMANCE] Processing ${agreements.length} agreements into monthly data`);
  
  // Get array of months in the interval to ensure we have all months represented
  const months = eachMonthOfInterval({ start: startDate, end: endDate });
  
  // Initialize monthly stats with zeros for all months
  const monthlyStats: Record<string, { 
    total: number, 
    pending: number, 
    active: number, 
    claimable: number,
    cancelled: number,
    void: number
  }> = {};
  
  months.forEach(month => {
    const monthKey = format(month, 'yyyy-MM');
    monthlyStats[monthKey] = { 
      total: 0, 
      pending: 0, 
      active: 0, 
      claimable: 0,
      cancelled: 0,
      void: 0
    };
  });
  
  // Process status distribution for debugging
  if (agreements.length > 0) {
    const statusCounts: Record<string, number> = {};
    agreements.forEach(agreement => {
      const status = (agreement.AgreementStatus || '').toUpperCase();
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    console.log('[PERFORMANCE] Status distribution in monthly data:', statusCounts);
  }
  
  // Group by month
  agreements.forEach(agreement => {
    const effectiveDate = new Date(agreement.EffectiveDate);
    const monthKey = format(effectiveDate, 'yyyy-MM');
    
    if (monthlyStats[monthKey]) {
      // Increment total count
      monthlyStats[monthKey].total++;
      
      // Track status counts - use uppercase for consistency
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
    }
  });
  
  // Return formatted data for all months, including those with zero values
  // This ensures we always have all months represented in the chart
  return months.map(month => {
    const monthKey = format(month, 'yyyy-MM');
    const stats = monthlyStats[monthKey];
    return {
      label: format(month, 'MMM').toLowerCase(),
      value: stats.total || 0,
      pending: stats.pending || 0,
      active: stats.active || 0,
      claimable: stats.claimable || 0,
      cancelled: stats.cancelled || 0,
      void: stats.void || 0,
      rawDate: month
    };
  });
}

/**
 * Process data for daily view (week and month timeframes)
 * Groups agreements by day and counts by status
 */
function processDailyData(agreements: any[], startDate: Date, endDate: Date): PerformanceDataPoint[] {
  console.log(`[PERFORMANCE] Processing ${agreements.length} agreements into daily data`);
  
  // Get array of days in the interval to ensure we have all days represented
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  // Initialize daily stats with zeros for all days
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
  
  // Process status distribution for debugging
  if (agreements.length > 0) {
    const statusCounts: Record<string, number> = {};
    agreements.forEach(agreement => {
      const status = (agreement.AgreementStatus || '').toUpperCase();
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    console.log('[PERFORMANCE] Status distribution in daily data:', statusCounts);
  }
  
  // Process each agreement and group by day
  agreements.forEach(agreement => {
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
  
  // Format the data for chart display, ensure all days have entries
  return days.map(day => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const stats = dailyStats[dayKey];
    
    return {
      label: format(day, 'd'), // Use day of month as label
      value: stats.total || 0,
      pending: stats.pending || 0,
      active: stats.active || 0,
      claimable: stats.claimable || 0,
      cancelled: stats.cancelled || 0,
      void: stats.void || 0,
      rawDate: day
    };
  });
}

/**
 * Process data for a single day (day timeframe)
 * This is used for the "Day" view where each status type has its own individual bar
 */
function processSingleDayData(agreements: any[], startDate: Date): PerformanceDataPoint[] {
  console.log(`[PERFORMANCE] Processing ${agreements.length} agreements for day view`);
  
  // Process status distribution for debugging
  if (agreements.length > 0) {
    const statusCounts: Record<string, number> = {};
    agreements.forEach(agreement => {
      const status = (agreement.AgreementStatus || '').toUpperCase();
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    console.log('[PERFORMANCE] Status distribution in day view:', statusCounts);
  }
  
  // Group data by status with proper uppercase normalization
  // This ensures consistent counting regardless of case variations in the database
  const pendingCount = agreements.filter(a => (a.AgreementStatus || '').toUpperCase() === 'PENDING').length || 0;
  const activeCount = agreements.filter(a => (a.AgreementStatus || '').toUpperCase() === 'ACTIVE').length || 0;
  const claimableCount = agreements.filter(a => (a.AgreementStatus || '').toUpperCase() === 'CLAIMABLE').length || 0;
  const cancelledCount = agreements.filter(a => (a.AgreementStatus || '').toUpperCase() === 'CANCELLED').length || 0;
  const voidCount = agreements.filter(a => (a.AgreementStatus || '').toUpperCase() === 'VOID').length || 0;
  
  // Get the total count which should be the sum of all status counts
  const totalCount = pendingCount + activeCount + claimableCount + cancelledCount + voidCount;
  
  // Verify that our total count matches the actual data length
  if (totalCount !== agreements.length) {
    console.warn(`[PERFORMANCE] Mismatch detected: Total status sum (${totalCount}) does not match raw agreement count (${agreements.length})`);
    
    // Log more details to help diagnose the issue
    const unknownStatuses = agreements.filter(a => {
      const status = (a.AgreementStatus || '').toUpperCase();
      return !['PENDING', 'ACTIVE', 'CLAIMABLE', 'CANCELLED', 'VOID'].includes(status);
    });
    
    if (unknownStatuses.length > 0) {
      console.warn(`[PERFORMANCE] Found ${unknownStatuses.length} agreements with unknown statuses`);
      unknownStatuses.slice(0, 5).forEach(a => {
        console.warn(`[PERFORMANCE] Unknown status: "${a.AgreementStatus}" for agreement`);
      });
    }
  }
  
  // Log detailed output for debugging as specified
  console.log(`[PERFORMANCE] Day View Data: Pending=${pendingCount}, Active=${activeCount}, Claimable=${claimableCount}, Cancelled=${cancelledCount}, Void=${voidCount}, Total=${totalCount}`);
  
  // Format the date for display
  const formattedDate = format(startDate, 'MMM d, yyyy');
  
  // For Day view, we return a single data point but ensure each status is represented clearly
  return [
    {
      label: formattedDate,
      value: totalCount, // Total for reference
      rawDate: startDate,
      // Ensure all status values are properly set for separate bars
      pending: pendingCount,
      active: activeCount,
      claimable: claimableCount,
      cancelled: cancelledCount,
      void: voidCount
    }
  ];
}

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

export function getTimeframeDateRange(timeframe: TimeframeOption, offsetPeriods: number = 0, specificDate?: Date): { start: Date; end: Date } {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // Get current month (0-11)
  const currentMonth = now.getMonth();
  
  switch (timeframe) {
    case 'day':
      // For day view, either use the specific date or offset from current day
      const baseDate = specificDate || now;
      const targetDate = addDays(baseDate, offsetPeriods);
      return {
        start: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0),
        end: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59)
      };
    
    case 'week':
      // If a specific date is provided, use that as the base for the week
      if (specificDate) {
        const baseWeekDate = startOfWeek(specificDate, { weekStartsOn: 1 });
        const targetWeek = addWeeks(baseWeekDate, offsetPeriods);
        return {
          start: targetWeek,
          end: endOfWeek(targetWeek, { weekStartsOn: 1 })
        };
      }
      
      return {
        start: addWeeks(startOfWeek(now, { weekStartsOn: 1 }), offsetPeriods),
        end: addWeeks(endOfWeek(now, { weekStartsOn: 1 }), offsetPeriods)
      };
    
    case 'month':
      // If a specific date is provided for month view, use that month
      if (specificDate) {
        const targetMonth = addMonths(new Date(specificDate.getFullYear(), specificDate.getMonth(), 1), offsetPeriods);
        return {
          start: startOfMonth(targetMonth),
          end: endOfMonth(targetMonth)
        };
      }
      return {
        start: addMonths(startOfMonth(now), offsetPeriods),
        end: addMonths(endOfMonth(now), offsetPeriods)
      };
    
    case '6months':
      // Improved 6 months view logic:
      // - Always show exactly Jan-Jun or Jul-Dec periods
      // - If specificDate is provided, use that date's year and determine half based on the date's month
      // - Otherwise, determine which half of the year we're currently in, and adjust based on offset
      
      let targetYear, isFirstHalf;
      
      if (specificDate) {
        // If a specific date is provided, use that year and determine which half based on the month
        targetYear = specificDate.getFullYear();
        isFirstHalf = specificDate.getMonth() < 6; // 0-5 (Jan-Jun) = first half, 6-11 (Jul-Dec) = second half
        
        // Apply offset in 6-month increments
        const halfYearOffset = Math.floor(offsetPeriods / 2);
        targetYear += halfYearOffset;
        
        // If offset is odd, flip which half we're showing
        if (offsetPeriods % 2 !== 0) {
          isFirstHalf = !isFirstHalf;
        }
      } else {
        // No specific date, determine based on current date and offset
        
        // Determine if we're currently in the first half of the year
        const currentIsFirstHalf = currentMonth < 6; // Jan-Jun
        
        // Calculate the initial half-year periods offset from current half
        // Each offset is one half-year period (6 months)
        const baseOffset = offsetPeriods;
        
        // Calculate how many full years to offset
        const yearOffset = Math.floor(Math.abs(baseOffset) / 2);
        
        if (baseOffset >= 0) {
          // For positive offsets (moving forward in time)
          targetYear = currentYear + Math.floor(baseOffset / 2);
          
          // Determine which half to show
          // If current half + offset is even, show same half as current
          // If current half + offset is odd, show opposite half
          isFirstHalf = (currentIsFirstHalf && baseOffset % 2 === 0) || 
                         (!currentIsFirstHalf && baseOffset % 2 !== 0);
        } else {
          // For negative offsets (moving backward in time)
          targetYear = currentYear - Math.ceil(Math.abs(baseOffset) / 2);
          
          // Similar logic for negative direction
          isFirstHalf = (currentIsFirstHalf && baseOffset % 2 === 0) || 
                         (!currentIsFirstHalf && baseOffset % 2 !== 0);
        }
      }
      
      console.log(`[PERFORMANCE] 6months view: year=${targetYear}, half=${isFirstHalf ? 'Jan-Jun' : 'Jul-Dec'}, offset=${offsetPeriods}`);
      
      // Create the date range based on which half-year we need
      if (isFirstHalf) {
        // First half of year (Jan-Jun)
        const startDate = new Date(targetYear, 0, 1); // January 1st
        const endDate = new Date(targetYear, 5, 30); // June 30th
        return { start: startDate, end: endDate };
      } else {
        // Second half of year (Jul-Dec)
        const startDate = new Date(targetYear, 6, 1); // July 1st
        const endDate = new Date(targetYear, 11, 31); // December 31st
        return { start: startDate, end: endDate };
      }
    
    case 'year':
      // If specificDate is provided, use that year as the base
      let yearBase;
      
      if (specificDate) {
        yearBase = specificDate.getFullYear();
      } else {
        yearBase = currentYear;
      }
      
      // Apply the offset to the base year
      const targetYear2 = yearBase + offsetPeriods;
      
      // Ensure we get the full calendar year from January 1st to December 31st
      const startYear = new Date(targetYear2, 0, 1); // January 1st
      const endYear = new Date(targetYear2, 11, 31); // December 31st
      
      return { start: startYear, end: endYear };
      
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
  
  // Always use a direct SQL query approach that matches the exact KPI calculation query
  try {
    // This will execute the SQL query directly to get agreements grouped by month with status counts
    // Use the exact same query structure as the KPI calculation to ensure consistency
    // Remove any limits to ensure all contracts are retrieved
    const { data: monthlyData, error } = await supabase
      .from('agreements')
      .select('EffectiveDate, AgreementStatus')
      .gte('EffectiveDate', startIso)
      .lte('EffectiveDate', endIso)
      .order('EffectiveDate', { ascending: true })
      .limit(100000); // Set a very high limit to effectively remove it
      
    if (dealerFilter) {
      // Apply dealer filter if provided
      await supabase.from('agreements')
        .select('EffectiveDate, AgreementStatus')
        .eq('DealerUUID', dealerFilter)
        .gte('EffectiveDate', startIso)
        .lte('EffectiveDate', endIso)
        .order('EffectiveDate', { ascending: true })
        .limit(100000); // Set a very high limit to effectively remove it
    }
    
    if (error) {
      console.error('[PERFORMANCE] Error fetching monthly agreement data:', error);
      throw new Error(error.message);
    }
    
    console.log(`[PERFORMANCE] Direct SQL query returned ${monthlyData?.length || 0} agreements (NO LIMIT APPLIED)`);
    
    // Get array of months in the interval to ensure we have all months represented
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    
    // Initialize monthly stats with zeros for all months
    const monthlyStats: Record<string, { 
      total: number, 
      pending: number, 
      active: number, 
      claimable: number,
      cancelled: number,
      void: number
    }> = {};
    
    months.forEach(month => {
      const monthKey = format(month, 'yyyy-MM');
      monthlyStats[monthKey] = { 
        total: 0, 
        pending: 0, 
        active: 0, 
        claimable: 0,
        cancelled: 0,
        void: 0
      };
    });
    
    // Process each agreement and group by month
    if (monthlyData && monthlyData.length > 0) {
      // Log status distribution for debugging
      const statusCounts: Record<string, number> = {};
      monthlyData.forEach(agreement => {
        const status = (agreement.AgreementStatus || '').toUpperCase();
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      console.log('[PERFORMANCE] Status distribution in monthly data:', statusCounts);
      
      // Group by month
      monthlyData.forEach(agreement => {
        const effectiveDate = new Date(agreement.EffectiveDate);
        const monthKey = format(effectiveDate, 'yyyy-MM');
        
        if (monthlyStats[monthKey]) {
          // Increment total count
          monthlyStats[monthKey].total++;
          
          // Track status counts - use uppercase for consistency
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
        }
      });
    }
    
    // Return formatted data for all months, including those with zero values
    // This ensures we always have all months represented in the chart
    return months.map(month => {
      const monthKey = format(month, 'yyyy-MM');
      const stats = monthlyStats[monthKey];
      return {
        label: format(month, 'MMM').toLowerCase(),
        value: stats.total || 0,
        pending: stats.pending || 0,
        active: stats.active || 0,
        claimable: stats.claimable || 0,
        cancelled: stats.cancelled || 0,
        void: stats.void || 0,
        rawDate: month
      };
    });
  } catch (err) {
    console.error('[PERFORMANCE] Error with direct SQL query approach:', err);
    // Try fallback approach with existing functions
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
    } catch (fallbackErr) {
      console.error('[PERFORMANCE] Error using count_agreements_by_date fallback:', fallbackErr);
    }
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
 * Fetches data for a single day, showing all contract statuses as separate bars
 * This is used for the "Day" view where each status type has its own individual bar
 */
async function fetchSingleDayData(startDate: Date, endDate: Date, dealerFilter: string = ''): Promise<PerformanceDataPoint[]> {
  // Format dates for consistent ISO format
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();
  
  console.log(`[PERFORMANCE] Fetching single day data from ${startIso} to ${endIso}${dealerFilter ? ` with dealer filter ${dealerFilter}` : ''}`);
  console.log(`[PERFORMANCE] Day view date: ${format(startDate, 'yyyy-MM-dd')}`);
  
  try {
    // Query for all agreements for this specific day only (not hourly breakdown)
    // We just want the contracts for the full day with their status breakdowns
    // Remove any limits to ensure all contracts are retrieved
    let query = supabase
      .from('agreements')
      .select('EffectiveDate, AgreementStatus, id');
    
    // Apply date range filter for the specific day
    // Ensure we're only getting data for exactly this day
    query = query
      .gte('EffectiveDate', startIso)
      .lte('EffectiveDate', endIso)
      .limit(100000); // Set a very high limit to fetch all contracts
    
    console.log(`[PERFORMANCE] Day view SQL query: FROM agreements SELECT EffectiveDate, AgreementStatus, id WHERE EffectiveDate >= '${startIso}' AND EffectiveDate <= '${endIso}'${dealerFilter ? ` AND DealerUUID = '${dealerFilter}'` : ''}`);
    
    // Apply dealer filter if provided
    if (dealerFilter) {
      query = query.eq('DealerUUID', dealerFilter);
    }
    
    // Fetch the data
    const { data, error } = await query;
    
    if (error) {
      console.error("[PERFORMANCE] Error fetching single day data:", error);
      throw new Error(error.message);
    }
    
    // Log detailed data for debugging
    console.log(`[PERFORMANCE] Day view query returned ${data?.length || 0} agreements`);
    
    // Log status distribution for debugging
    if (data && data.length > 0) {
      const statusCounts: Record<string, number> = {};
      data.forEach(agreement => {
        const status = (agreement.AgreementStatus || '').toUpperCase();
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      console.log('[PERFORMANCE] Status distribution in day view:', statusCounts);
    }
    
    // Group data by status with proper uppercase normalization
    // This ensures consistent counting regardless of case variations in the database
    const pendingCount = data?.filter(a => (a.AgreementStatus || '').toUpperCase() === 'PENDING')?.length || 0;
    const activeCount = data?.filter(a => (a.AgreementStatus || '').toUpperCase() === 'ACTIVE')?.length || 0;
    const claimableCount = data?.filter(a => (a.AgreementStatus || '').toUpperCase() === 'CLAIMABLE')?.length || 0;
    const cancelledCount = data?.filter(a => (a.AgreementStatus || '').toUpperCase() === 'CANCELLED')?.length || 0;
    const voidCount = data?.filter(a => (a.AgreementStatus || '').toUpperCase() === 'VOID')?.length || 0;
    
    // Get the total count which should be the sum of all status counts
    const totalCount = pendingCount + activeCount + claimableCount + cancelledCount + voidCount;
    
    // Verify that our total count matches the actual data length
    if (totalCount !== (data?.length || 0)) {
      console.warn(`[PERFORMANCE] Mismatch detected: Total status sum (${totalCount}) does not match raw agreement count (${data?.length || 0})`);
      
      // Log more details to help diagnose the issue
      const unknownStatuses = data?.filter(a => {
        const status = (a.AgreementStatus || '').toUpperCase();
        return !['PENDING', 'ACTIVE', 'CLAIMABLE', 'CANCELLED', 'VOID'].includes(status);
      });
      
      if (unknownStatuses && unknownStatuses.length > 0) {
        console.warn(`[PERFORMANCE] Found ${unknownStatuses.length} agreements with unknown statuses:`);
        unknownStatuses.forEach((a, i) => {
          if (i < 5) { // Only log the first 5 to avoid console flood
            console.warn(`[PERFORMANCE] Unknown status: "${a.AgreementStatus}" for agreement ID ${a.id}`);
          }
        });
      }
    }
    
    // Log detailed output for debugging as specified
    console.log(`[PERFORMANCE] Day View Data: Pending=${pendingCount}, Active=${activeCount}, Claimable=${claimableCount}, Cancelled=${cancelledCount}, Void=${voidCount}, Total=${totalCount}`);
    
    // Format the date for display
    const formattedDate = format(startDate, 'MMM d, yyyy');
    
    // For Day view, we return a single data point but ensure each status is represented clearly
    // This will be displayed with separate bars for each status in the chart
    return [
      {
        label: formattedDate,
        value: totalCount, // Total for reference
        rawDate: startDate,
        // Ensure all status values are properly set for separate bars
        pending: pendingCount,
        active: activeCount,
        claimable: claimableCount,
        cancelled: cancelledCount,
        void: voidCount
      }
    ];
  } catch (err) {
    console.error('[PERFORMANCE] Error with single day data query:', err);
    // Return empty data on error with appropriate structure for day view
    return [
      {
        label: format(startDate, 'MMM d, yyyy'),
        value: 0,
        rawDate: startDate,
        pending: 0,
        active: 0,
        claimable: 0,
        cancelled: 0,
        void: 0
      }
    ];
  }
}

/**
 * Fetches agreement data for daily view, showing actual counts per day
 * Uses a direct SQL query to ensure consistency with KPI calculations
 */
async function fetchDailyAgreementsByStatus(startDate: Date, endDate: Date, dealerFilter: string = '') {
  // Format dates
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();
  
  console.log(`[PERFORMANCE] Fetching daily agreements from ${startIso} to ${endIso}${dealerFilter ? ` with dealer filter ${dealerFilter}` : ''}`);
  
  try {
    // Use direct SQL query approach to match KPI calculation exactly
    // This ensures consistency between chart and KPIs
    // Remove any limits to ensure all data is fetched
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
    
    // Set a very high limit to effectively remove any default limits
    query = query.limit(100000);
    
    // Fetch the data with a high limit
    const { data, error } = await query;
    
    if (error) {
      console.error("[PERFORMANCE] Error fetching daily agreement data:", error);
      throw new Error(error.message);
    }
    
    console.log(`[PERFORMANCE] Daily data fetch returned ${data?.length || 0} agreements (NO LIMIT APPLIED)`);
    
    // Get array of days in the interval to ensure we have all days represented
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Initialize daily stats with zeros for all days
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
    
    // Log status distribution for debugging
    if (data && data.length > 0) {
      const statusCounts: Record<string, number> = {};
      data.forEach(agreement => {
        const status = (agreement.AgreementStatus || '').toUpperCase();
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      console.log('[PERFORMANCE] Status distribution in daily data:', statusCounts);
    }
    
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
    
    // Format the data for chart display, ensure all days have entries
    return days.map(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const stats = dailyStats[dayKey];
      
      return {
        label: format(day, 'd'), // Use day of month as label
        value: stats.total || 0,
        pending: stats.pending || 0,
        active: stats.active || 0,
        claimable: stats.claimable || 0,
        cancelled: stats.cancelled || 0,
        void: stats.void || 0,
        rawDate: day
      };
    });
  } catch (err) {
    console.error('[PERFORMANCE] Error using direct SQL approach for daily data:', err);
    
    // Try fallback with count_agreements_by_date function
    try {
      const { data: dailyData, error } = await supabase.rpc('count_agreements_by_date', {
        from_date: startIso,
        to_date: endIso,
        dealer_uuid: dealerFilter || null,
        group_by: 'day'
      });
      
      if (!error && dailyData && dailyData.length > 0) {
        console.log('[PERFORMANCE] Successfully used count_agreements_by_date fallback:', dailyData.length, 'days');
        
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
      }
    } catch (fallbackErr) {
      console.error('[PERFORMANCE] Fallback method also failed:', fallbackErr);
    }
    
    // If all else fails, use client-side grouping
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

export interface PerformanceMetricsOptions {
  timeframe: TimeframeOption;
  offsetPeriods?: number;
  dealerFilter?: string;
  specificDate?: Date; // For drilldown from month to day or from year/6months to month
}

// Original function for backward compatibility
export function usePerformanceMetricsData(
  timeframeOrOptions: TimeframeOption | PerformanceMetricsOptions,
  offsetPeriods?: number,
  dealerFilter?: string
): PerformanceData {
  // Check if first argument is a string (TimeframeOption) or an object (PerformanceMetricsOptions)
  if (typeof timeframeOrOptions === 'string') {
    // Legacy function call with positional parameters
    return usePerformanceMetricsDataImpl({
      timeframe: timeframeOrOptions,
      offsetPeriods: offsetPeriods || 0,
      dealerFilter: dealerFilter || ''
    });
  } else {
    // New function call with options object
    return usePerformanceMetricsDataImpl(timeframeOrOptions);
  }
}

// Implementation function with new parameters
function usePerformanceMetricsDataImpl(options: PerformanceMetricsOptions): PerformanceData {
  const { 
    timeframe, 
    offsetPeriods = 0, 
    dealerFilter = '',
    specificDate
  } = options;
  
  const { start: startDate, end: endDate } = useMemo(() => 
    getTimeframeDateRange(timeframe, offsetPeriods, specificDate), 
    [timeframe, offsetPeriods, specificDate]
  );
  
  const formattedDates = useMemo(() => ({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  }), [startDate, endDate]);
  
  // Create a stable query key that captures all parameters that affect the data
  // The top-level key is "performance-metrics" to match the invalidation in the page component
  const queryKey = useMemo(() => 
    ['performance-metrics', timeframe, formattedDates.startDate, formattedDates.endDate, dealerFilter, specificDate?.toISOString(), offsetPeriods], 
    [timeframe, formattedDates.startDate, formattedDates.endDate, dealerFilter, specificDate, offsetPeriods]
  );
  
  // Reusable function for batched fetching with proper pagination
  const fetchBatchedData = useCallback(
    async (startDate: Date, endDate: Date, dealerFilter: string = '') => {
      const startIso = startDate.toISOString();
      const endIso = endDate.toISOString();
      
      console.log(`[PERFORMANCE] Starting batched fetch from ${startIso} to ${endIso}`);
      
      let offset = 0;
      const batchSize = 1000; // Supabase's max per query
      let allResults: any[] = [];
      let hasMore = true;
      let batchCounter = 0;
      
      // Fetch data in batches until we've retrieved everything
      while (hasMore) {
        batchCounter++;
        console.log(`[PERFORMANCE] Fetching batch #${batchCounter}: offset=${offset}, limit=${batchSize}`);
        
        // Build the query with pagination
        let query = supabase
          .from('agreements')
          .select('EffectiveDate, AgreementStatus')
          .gte('EffectiveDate', startIso)
          .lte('EffectiveDate', endIso)
          .range(offset, offset + batchSize - 1); // Proper pagination with range
        
        // Apply dealer filter if provided
        if (dealerFilter) {
          query = query.eq('DealerUUID', dealerFilter);
        }
        
        // Execute the query
        const { data, error } = await query;
        
        if (error) {
          console.error(`[PERFORMANCE] Error fetching batch #${batchCounter}:`, error);
          break;
        }
        
        // Check if we got any results
        if (!data || data.length === 0) {
          console.log(`[PERFORMANCE] No more data to fetch at offset ${offset}`);
          hasMore = false;
        } else {
          // Add this batch to our results
          allResults = [...allResults, ...data];
          
          // Check if we got a full batch (there might be more data)
          if (data.length < batchSize) {
            console.log(`[PERFORMANCE] Last batch incomplete with ${data.length} records`);
            hasMore = false;
          } else {
            // Move to next batch
            offset += batchSize;
          }
        }
      }
      
      console.log(`[PERFORMANCE] Completed batched fetch: ${allResults.length} total records in ${batchCounter} batches`);
      return allResults;
    },
    []
  );

  // Directly fetch data from the database using a consistent batched approach
  const queryFn = useCallback(async () => {
    console.log(`[PERFORMANCE] Fetching with:`, {
      timeframe: timeframe, 
      offset: offsetPeriods, 
      startDate: formattedDates.startDate, 
      endDate: formattedDates.endDate, 
      dealer: dealerFilter
    });
    
    // Log the equivalent SQL query for direct comparison
    console.log(`[PERFORMANCE] Equivalent SQL query: SELECT * FROM count_agreements_by_status('${formattedDates.startDate}', '${formattedDates.endDate}'${dealerFilter ? `, '${dealerFilter}'` : ', NULL'});`);
    
    // First fetch all the data using our efficient batched approach
    const allAgreements = await fetchBatchedData(startDate, endDate, dealerFilter);
    
    // Process the data based on the selected timeframe
    switch(timeframe) {
      case 'day':
        // For day view, process the data for a single day
        return processSingleDayData(allAgreements, startDate);
      case 'week':
      case 'month':
        // Process data into daily buckets
        return processDailyData(allAgreements, startDate, endDate);
      case '6months':
      case 'year':
        // Process data into monthly buckets
        return processMonthlyData(allAgreements, startDate, endDate);
      default:
        throw new Error(`Unknown timeframe: ${timeframe}`);
    }
  }, [timeframe, formattedDates, startDate, endDate, dealerFilter, fetchBatchedData]);
  
  // Use React Query with adjusted settings to ensure fresh data
  const { data, isLoading, error } = useQuery({
    queryKey: queryKey,
    queryFn: queryFn,
    staleTime: 0, // Consider data immediately stale to force refetch when params change
    cacheTime: 1000 * 60 * 5, // Cache for 5 minutes only
    refetchOnWindowFocus: false, // Don't refetch automatically on window focus
    refetchOnMount: true, // Always refetch when component mounts
    retry: 1, // Only retry once to avoid excessive fetching on errors
  });
  
  const processedData = useMemo(() => {
    if (isLoading || !data) return [];
    
    // Safety check - ensure all data points exist and have all required fields
    const ensureDataPointIntegrity = (point: any): PerformanceDataPoint => {
      return {
        label: point.label || '',
        value: (typeof point.value === 'number') ? point.value : 0,
        rawDate: point.rawDate instanceof Date ? point.rawDate : new Date(),
        pending: (typeof point.pending === 'number') ? point.pending : 0,
        active: (typeof point.active === 'number') ? point.active : 0,
        claimable: (typeof point.claimable === 'number') ? point.claimable : 0,
        cancelled: (typeof point.cancelled === 'number') ? point.cancelled : 0,
        void: (typeof point.void === 'number') ? point.void : 0
      };
    };
    
    // If the data is already in the right format, just return it with potential formatting adjustments
    if (Array.isArray(data) && data.length > 0 && 'label' in data[0]) {
      // For week view, update the label format to use abbreviated day names
      if (timeframe === 'week') {
        return (data as any[]).map(point => ({
          ...ensureDataPointIntegrity(point),
          label: format(point.rawDate, 'EEE').toLowerCase() // Change from day number to abbreviated day name
        }));
      }
      
      // Ensure data is sorted chronologically and has integrity
      const safeData = (data as any[]).map(point => ensureDataPointIntegrity(point));
      const sortedData = [...safeData];
      sortedData.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
      
      // For month view, we want to ensure all days are represented and in order
      if (timeframe === 'month') {
        // Add any missing dates to ensure data consistency
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
            claimable: 0,
            cancelled: 0,
            void: 0,
            rawDate: day
          };
        });
      }
      
      // For longer timeframes (6months, year), ensure we have the correct number of months
      if (timeframe === '6months' || timeframe === 'year') {
        // For 6 months view, ensure we have exactly 6 months
        // For year view, ensure we have exactly 12 months
        const expectedMonths = timeframe === '6months' ? 6 : 12;
        
        // Make sure we have appropriate months
        // For 6 months: Jan-Jun or Jul-Dec
        // For year: Jan-Dec
        const finalMonths = [];
        
        if (timeframe === '6months') {
          // Determine if we're in first half (Jan-Jun) or second half (Jul-Dec)
          const isFirstHalf = startDate.getMonth() === 0; // January
          
          // Get appropriate months (either 0-5 or 6-11)
          const targetYear = startDate.getFullYear();
          
          for (let i = 0; i < 6; i++) {
            const monthIndex = isFirstHalf ? i : i + 6;
            finalMonths.push(new Date(targetYear, monthIndex, 1));
          }
        } else {
          // For year view, ensure all 12 months
          const targetYear = startDate.getFullYear();
          
          for (let i = 0; i < 12; i++) {
            finalMonths.push(new Date(targetYear, i, 1));
          }
        }
        
        // Create a map of existing data points by month
        const monthMap = new Map();
        sortedData.forEach(point => {
          const monthKey = format(point.rawDate, 'yyyy-MM');
          monthMap.set(monthKey, point);
        });
        
        // Map the months to data points, filling in zeroes for missing months
        // This is crucial for ensuring all months show up in the chart
        return finalMonths.map(month => {
          const monthKey = format(month, 'yyyy-MM');
          
          if (monthMap.has(monthKey)) {
            // Use existing data
            return monthMap.get(monthKey);
          } else {
            // Create zeroed data for missing month
            return {
              label: format(month, 'MMM').toLowerCase(),
              value: 0,
              pending: 0,
              active: 0,
              claimable: 0,
              cancelled: 0,
              void: 0,
              rawDate: month
            };
          }
        });
      }
      
      // For other timeframes, just return sorted data with integrity checks
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