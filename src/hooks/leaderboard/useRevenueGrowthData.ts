
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { RevenueGrowth } from '@/lib/types';
import { getFormattedDateRange } from './dateRangeUtils';

/**
 * Hook to calculate revenue growth
 */
export function useRevenueGrowthData({ dateRange }: { dateRange: DateRange }) {
  return useQuery({
    queryKey: ['revenueGrowth', dateRange.from, dateRange.to],
    queryFn: async (): Promise<RevenueGrowth> => {
      // Format date range with proper time boundaries
      const { startDate, endDate } = getFormattedDateRange(dateRange);

      console.log('[LEADERBOARD] Calculating revenue growth with date range:', {
        from: startDate.toISOString(),
        to: endDate.toISOString()
      });

      // Calculate previous date range (same duration but earlier)
      const currentDuration = endDate.getTime() - startDate.getTime();
      const previousFrom = new Date(startDate.getTime() - currentDuration);
      const previousTo = new Date(endDate.getTime() - currentDuration);

      console.log('[LEADERBOARD] Previous date range:', {
        from: previousFrom.toISOString(),
        to: previousTo.toISOString()
      });

      const { data, error } = await supabase.rpc(
        'calculate_revenue_growth',
        {
          current_start_date: startDate.toISOString(),
          current_end_date: endDate.toISOString(),
          previous_start_date: previousFrom.toISOString(),
          previous_end_date: previousTo.toISOString()
        }
      );

      if (error) {
        console.error('[LEADERBOARD] Error calculating revenue growth:', error);
        throw error;
      }

      return data[0];
    },
    staleTime: 5 * 60 * 1000,
  });
}
