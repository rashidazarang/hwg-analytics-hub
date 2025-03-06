import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { TopAgent, TopDealer, RevenueGrowth, LeaderboardSummary } from '@/lib/types';

// Hook to fetch top agents data
export function useTopAgentsData({ dateRange }: { dateRange: DateRange }) {
  return useQuery({
    queryKey: ['topAgents', dateRange.from, dateRange.to],
    queryFn: async (): Promise<TopAgent[]> => {
      console.log('[LEADERBOARD] Fetching top agents with date range:', {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
      });

      const { data, error } = await supabase.rpc(
        'get_top_agents_by_contracts',
        {
          start_date: dateRange.from.toISOString(),
          end_date: dateRange.to.toISOString(),
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

// Hook to fetch all dealers data (removed limit)
export function useTopDealersData({ dateRange }: { dateRange: DateRange }) {
  return useQuery({
    queryKey: ['topDealers', dateRange.from, dateRange.to],
    queryFn: async (): Promise<TopDealer[]> => {
      console.log('[LEADERBOARD] Fetching all dealers with date range:', {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
      });

      const { data, error } = await supabase.rpc(
        'get_top_dealers_by_revenue',
        {
          start_date: dateRange.from.toISOString(),
          end_date: dateRange.to.toISOString(),
          // Removed limit_count parameter to fetch all dealers
        }
      );

      if (error) {
        console.error('[LEADERBOARD] Error fetching dealers:', error);
        throw error;
      }

      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Hook to calculate revenue growth
export function useRevenueGrowthData({ dateRange }: { dateRange: DateRange }) {
  return useQuery({
    queryKey: ['revenueGrowth', dateRange.from, dateRange.to],
    queryFn: async (): Promise<RevenueGrowth> => {
      console.log('[LEADERBOARD] Calculating revenue growth with date range:', {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
      });

      // Calculate previous date range (same duration but earlier)
      const currentDuration = dateRange.to.getTime() - dateRange.from.getTime();
      const previousFrom = new Date(dateRange.from.getTime() - currentDuration);
      const previousTo = new Date(dateRange.to.getTime() - currentDuration);

      console.log('[LEADERBOARD] Previous date range:', {
        from: previousFrom.toISOString(),
        to: previousTo.toISOString()
      });

      const { data, error } = await supabase.rpc(
        'calculate_revenue_growth',
        {
          current_start_date: dateRange.from.toISOString(),
          current_end_date: dateRange.to.toISOString(),
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

// Hook to fetch leaderboard summary data
export function useLeaderboardSummary({ dateRange }: { dateRange: DateRange }) {
  return useQuery({
    queryKey: ['leaderboardSummary', dateRange.from, dateRange.to],
    queryFn: async (): Promise<LeaderboardSummary> => {
      console.log('[LEADERBOARD] Fetching summary with date range:', {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
      });

      const { data, error } = await supabase.rpc(
        'get_leaderboard_summary',
        {
          start_date: dateRange.from.toISOString(),
          end_date: dateRange.to.toISOString()
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
