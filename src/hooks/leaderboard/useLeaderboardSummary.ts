import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { LeaderboardSummary } from '@/lib/types';
import { getFormattedDateRange } from './dateRangeUtils';
import { executeWithCSTTimezone } from '@/integrations/supabase/timezone-utils';

/**
 * Hook to fetch leaderboard summary data
 */
export function useLeaderboardSummary({ dateRange }: { dateRange: DateRange }) {
  return useQuery({
    queryKey: ['leaderboardSummary', dateRange.from, dateRange.to],
    queryFn: async (): Promise<LeaderboardSummary> => {
      // Format date range with proper time boundaries
      const { startDate, endDate } = getFormattedDateRange(dateRange);

      console.log('[LEADERBOARD] Fetching summary with date range:', {
        from: startDate.toISOString(),
        to: endDate.toISOString()
      });

      const { data, error } = await executeWithCSTTimezone(
        supabase,
        async (client) => {
          return await client.rpc('get_leaderboard_summary', {
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0]
          });
        }
      );

      if (error) {
        console.error('[LEADERBOARD] Error fetching summary:', error);
        throw error;
      }

      return data || {
        total_revenue: 0,
        total_dealers: 0,
        avg_contracts_per_dealer: 0,
        top_dealer_name: '',
        cancellation_rate: 0
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
