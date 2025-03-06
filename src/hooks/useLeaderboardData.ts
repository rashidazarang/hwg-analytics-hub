
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { TopAgent, TopDealer, RevenueGrowth, LeaderboardSummary } from '@/lib/types';

// Hook to fetch top agents data
export function useTopAgentsData({ dateRange }: { dateRange: DateRange }) {
  return useQuery({
    queryKey: ['topAgents', dateRange.from, dateRange.to],
    queryFn: async (): Promise<TopAgent[]> => {
      // Set time to start of day for from date and end of day for to date
      const startDate = new Date(dateRange.from);
      startDate.setUTCHours(0, 0, 0, 0);  // Start at 00:00:00 UTC

      const endDate = new Date(dateRange.to);
      endDate.setUTCHours(23, 59, 59, 999);  // End at 23:59:59 UTC

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

// Hook to fetch top dealers data
export function useTopDealersData({ dateRange }: { dateRange: DateRange }) {
  return useQuery({
    queryKey: ['topDealers', dateRange.from, dateRange.to],
    queryFn: async (): Promise<TopDealer[]> => {
      // Set time to start of day for from date and end of day for to date
      const startDate = new Date(dateRange.from);
      startDate.setUTCHours(0, 0, 0, 0);  // Start at 00:00:00 UTC

      const endDate = new Date(dateRange.to);
      endDate.setUTCHours(23, 59, 59, 999);  // End at 23:59:59 UTC

      console.log('[LEADERBOARD] Fetching top dealers with date range:', {
        from: startDate.toISOString(),
        to: endDate.toISOString()
      });

      // Fetch all agreements with dealer information for the date range
      // Remove any pagination limitations to get all agreements
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
        .gte('EffectiveDate', startDate.toISOString())
        .lte('EffectiveDate', endDate.toISOString());

      if (error) {
        console.error('[LEADERBOARD] Error fetching agreements:', error);
        throw error;
      }

      console.log('[LEADERBOARD] Raw agreements fetched:', agreements.length);
      
      // Check distinct statuses to verify what we're dealing with
      const statuses = new Set();
      agreements.forEach(agreement => {
        if (agreement.AgreementStatus) {
          statuses.add(agreement.AgreementStatus);
        }
      });
      console.log('[LEADERBOARD] Distinct agreement statuses:', Array.from(statuses));

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
        
        if (!dealerUUID) {
          console.log('[LEADERBOARD] Skipping agreement without DealerUUID:', agreement.AgreementID);
          return;
        }
        
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
        
        // Fix: Ensure Total is treated as a number with COALESCE-like behavior
        const agreementTotal = typeof agreement.Total === 'string' 
          ? parseFloat(agreement.Total) || 0 
          : (agreement.Total || 0);
        
        // Count ALL agreements for total_contracts regardless of status
        dealer.total_contracts++;
        dealer.total_revenue += agreementTotal;
        
        // Make status check case-insensitive and more robust
        const status = (agreement.AgreementStatus || '').toUpperCase();
        
        if (status === 'PENDING') {
          dealer.pending_contracts++;
          dealer.expected_revenue += agreementTotal;
        } else if (status === 'ACTIVE') {
          dealer.active_contracts++;
          dealer.funded_revenue += agreementTotal;
        } else if (status === 'CANCELLED') {
          dealer.cancelled_contracts++;
        } else {
          // For any other status, log it for debugging
          console.log(`[LEADERBOARD] Unhandled agreement status: ${status} for agreement ${agreement.AgreementID}`);
        }
      });

      console.log('[LEADERBOARD] Dealers processed:', dealerMap.size);

      // Convert the map to an array and sort by total contracts
      const topDealers = Array.from(dealerMap.values())
        .sort((a, b) => b.total_contracts - a.total_contracts)
        .slice(0, 10);  // Limit to top 10 dealers

      console.log('[LEADERBOARD] Top dealers calculated revenue breakdown:');
      topDealers.forEach(dealer => {
        console.log(`[LEADERBOARD] ${dealer.dealer_name}: total=${dealer.total_contracts}, pending=${dealer.pending_contracts}, active=${dealer.active_contracts}, expected=${dealer.expected_revenue}, funded=${dealer.funded_revenue}`);
      });
      
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
      // Set time to start of day for from date and end of day for to date
      const startDate = new Date(dateRange.from);
      startDate.setUTCHours(0, 0, 0, 0);  // Start at 00:00:00 UTC

      const endDate = new Date(dateRange.to);
      endDate.setUTCHours(23, 59, 59, 999);  // End at 23:59:59 UTC

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

// Hook to fetch leaderboard summary data
export function useLeaderboardSummary({ dateRange }: { dateRange: DateRange }) {
  return useQuery({
    queryKey: ['leaderboardSummary', dateRange.from, dateRange.to],
    queryFn: async (): Promise<LeaderboardSummary> => {
      // Set time to start of day for from date and end of day for to date
      const startDate = new Date(dateRange.from);
      startDate.setUTCHours(0, 0, 0, 0);  // Start at 00:00:00 UTC

      const endDate = new Date(dateRange.to);
      endDate.setUTCHours(23, 59, 59, 999);  // End at 23:59:59 UTC

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
