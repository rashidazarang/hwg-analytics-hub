
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

// Hook to fetch top dealers data
export function useTopDealersData({ dateRange }: { dateRange: DateRange }) {
  return useQuery({
    queryKey: ['topDealers', dateRange.from, dateRange.to],
    queryFn: async (): Promise<TopDealer[]> => {
      console.log('[LEADERBOARD] Fetching top dealers with date range:', {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
      });

      // Fetch all agreements with dealer information for the date range
      const { data: agreements, error } = await supabase
        .from('agreements')
        .select(`
          AgreementID,
          AgreementStatus,
          Total,
          DealerUUID,
          dealers(
            Payee
          )
        `)
        .gte('EffectiveDate', dateRange.from.toISOString())
        .lte('EffectiveDate', dateRange.to.toISOString());

      if (error) {
        console.error('[LEADERBOARD] Error fetching agreements:', error);
        throw error;
      }

      // Process agreements by dealer
      const dealerMap = new Map<string, {
        dealer_name: string;
        total_contracts: number;
        total_revenue: number;
        cancelled_contracts: number;
        pending_contracts: number;
        active_contracts: number;
        expected_revenue: number; // Revenue from pending agreements
        funded_revenue: number;   // Revenue from active agreements
      }>();

      agreements.forEach(agreement => {
        const dealerName = agreement.dealers?.Payee || 'Unknown Dealer';
        const dealerUUID = agreement.DealerUUID;
        
        if (!dealerUUID) return;
        
        // Initialize dealer in map if not exists
        if (!dealerMap.has(dealerUUID)) {
          dealerMap.set(dealerUUID, {
            dealer_name: dealerName,
            total_contracts: 0,
            total_revenue: 0,
            cancelled_contracts: 0,
            pending_contracts: 0,
            active_contracts: 0,
            expected_revenue: 0,
            funded_revenue: 0
          });
        }
        
        const dealer = dealerMap.get(dealerUUID)!;
        const agreementTotal = agreement.Total || 0;
        
        // Increment counters based on agreement status
        dealer.total_contracts++;
        dealer.total_revenue += agreementTotal;
        
        if (agreement.AgreementStatus === 'PENDING') {
          dealer.pending_contracts++;
          dealer.expected_revenue += agreementTotal;
        } else if (agreement.AgreementStatus === 'ACTIVE') {
          dealer.active_contracts++;
          dealer.funded_revenue += agreementTotal;
        } else if (agreement.AgreementStatus === 'CANCELLED') {
          dealer.cancelled_contracts++;
        }
      });

      // Convert the map to an array and sort by total contracts
      const topDealers = Array.from(dealerMap.values())
        .sort((a, b) => b.total_contracts - a.total_contracts)
        .slice(0, 10);  // Limit to top 10 dealers

      console.log('[LEADERBOARD] Processed dealers:', topDealers.length);
      return topDealers;
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
