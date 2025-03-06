
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { LeaderboardSummary } from '@/lib/types';
import { getFormattedDateRange } from './dateRangeUtils';

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

      const { data, error } = await supabase.rpc(
        'get_leaderboard_summary',
        {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        }
      );

      if (error) {
        console.error('[LEADERBOARD] Error fetching leaderboard summary:', error);
        throw error;
      }

      return data[0];
    },
    staleTime: 5 * 60 * 1000,
  });
}
