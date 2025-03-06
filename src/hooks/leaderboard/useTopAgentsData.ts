
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { TopAgent } from '@/lib/types';
import { getFormattedDateRange } from './dateRangeUtils';

/**
 * Hook to fetch top agents data
 */
export function useTopAgentsData({ dateRange }: { dateRange: DateRange }) {
  return useQuery({
    queryKey: ['topAgents', dateRange.from, dateRange.to],
    queryFn: async (): Promise<TopAgent[]> => {
      // Format date range with proper time boundaries
      const { startDate, endDate } = getFormattedDateRange(dateRange);

      console.log('[LEADERBOARD] Fetching top agents with date range:', {
        from: startDate.toISOString(),
        to: endDate.toISOString()
      });

      const { data, error } = await supabase.rpc(
        'get_top_agents_by_contracts',
        {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          limit_count: 10
        }
      );

      if (error) {
        console.error('[LEADERBOARD] Error fetching top agents:', error);
        throw error;
      }

      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
