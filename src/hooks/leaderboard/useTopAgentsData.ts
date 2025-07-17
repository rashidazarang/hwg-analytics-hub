
import { useQuery } from '@tanstack/react-query';
import { supabase, shouldUseMockData } from '@/integrations/supabase/client';
import MockDataService from '@/lib/mockDataService';
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
      // Use mock data in development mode
      if (shouldUseMockData()) {
        console.log('[LEADERBOARD] 🔧 Using mock data for top agents in development mode');
        return [
          { agent_name: 'John Smith', contracts_closed: 45, total_revenue: 125000, cancelled_contracts: 3 },
          { agent_name: 'Sarah Johnson', contracts_closed: 38, total_revenue: 98000, cancelled_contracts: 2 },
          { agent_name: 'Mike Davis', contracts_closed: 32, total_revenue: 87000, cancelled_contracts: 1 },
          { agent_name: 'Lisa Wilson', contracts_closed: 28, total_revenue: 76000, cancelled_contracts: 4 },
          { agent_name: 'Tom Brown', contracts_closed: 25, total_revenue: 68000, cancelled_contracts: 2 }
        ];
      }

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
