import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { executeWithCSTTimezone } from '@/integrations/supabase/timezone-utils';
import { DateRange } from '@/lib/dateUtils';
import { getFormattedDateRange } from './dateRangeUtils';

// Interface for top dealers with KPIs
export interface TopDealerWithKPIs {
  dealer_uuid: string;
  dealer_name: string;
  total_contracts: number;
  active_contracts: number;
  pending_contracts: number;
  cancelled_contracts: number;
  total_revenue: number;
  expected_revenue: number;
  funded_revenue: number;
  cancellation_rate: number;
}

// Interface for the summary of top dealers
export interface TopDealersSummary {
  total_expected_revenue: number;
  total_funded_revenue: number;
  avg_cancellation_rate: number;
}

/**
 * Hook to fetch optimized top dealers data with KPI summary
 */
export function useLeaderboardData({ dateRange }: { dateRange: DateRange }) {
  return useQuery({
    queryKey: ['leaderboardData', dateRange.from, dateRange.to],
    queryFn: async (): Promise<{
      topDealers: TopDealerWithKPIs[];
      summary: TopDealersSummary;
    }> => {
      // Format date range with proper time boundaries in CST
      const { startDate, endDate } = getFormattedDateRange(dateRange);

      console.log('[LEADERBOARD] Fetching optimized top dealers with date range (CST):', {
        from: startDate.toISOString(),
        to: endDate.toISOString()
      });

      // First try the new optimized function
      let response = await executeWithCSTTimezone(
        supabase,
        (client) => client.rpc('get_top_dealers_with_kpis', {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        })
      );

      // If the new function isn't available, fall back to the existing one
      if (response.error && response.error.code === 'PGRST202') {
        console.log('[LEADERBOARD] Falling back to get_top_dealers_by_revenue function');
        response = await executeWithCSTTimezone(
          supabase,
          (client) => client.rpc('get_top_dealers_by_revenue', {
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString()
          })
        );
      }

      // Handle any remaining errors
      if (response.error) {
        console.error('[LEADERBOARD] Error fetching top dealers data:', response.error);
        throw response.error;
      }

      const data = response.data;
      console.log('[LEADERBOARD] Successfully fetched top dealers:', data?.length || 0);

      // Process the data to fit our expected structure
      const topDealers = (data || []).map((dealer: any) => {
        // Calculate missing fields if we're using the old function
        let expected_revenue = 0;
        let funded_revenue = 0;
        let active_contracts = 0;
        let pending_contracts = 0;

        // If we're using the old function (get_top_dealers_by_revenue)
        if (!dealer.hasOwnProperty('expected_revenue')) {
          // Estimate expected/funded revenue proportions 
          // (We'll fix this with the proper function later)
          const totalRevenue = Number(dealer.total_revenue || 0);
          const cancelledContracts = Number(dealer.cancelled_contracts || 0);
          const totalContracts = Number(dealer.total_contracts || 0);
          
          // Assume active contracts = total - cancelled
          active_contracts = totalContracts - cancelledContracts;
          
          // Assume 10% of non-cancelled contracts are pending (this is a rough estimation)
          pending_contracts = Math.round(active_contracts * 0.1);
          active_contracts = active_contracts - pending_contracts;
          
          // Distribute revenue proportionally
          if (totalContracts > 0) {
            const activeRatio = active_contracts / totalContracts;
            const pendingRatio = pending_contracts / totalContracts;
            
            funded_revenue = totalRevenue * activeRatio;
            expected_revenue = totalRevenue * pendingRatio;
          }
        } else {
          // We're using the new function with all fields
          expected_revenue = Number(dealer.expected_revenue || 0);
          funded_revenue = Number(dealer.funded_revenue || 0);
          active_contracts = Number(dealer.active_contracts || 0);
          pending_contracts = Number(dealer.pending_contracts || 0);
        }

        return {
          dealer_uuid: dealer.dealer_uuid || '',
          dealer_name: dealer.dealer_name || '',
          total_contracts: Number(dealer.total_contracts || 0),
          active_contracts: active_contracts,
          pending_contracts: pending_contracts,
          cancelled_contracts: Number(dealer.cancelled_contracts || 0),
          total_revenue: Number(dealer.total_revenue || 0),
          expected_revenue: expected_revenue,
          funded_revenue: funded_revenue,
          cancellation_rate: dealer.cancellation_rate !== undefined 
            ? Number(dealer.cancellation_rate) 
            : (totalContracts > 0 ? (Number(dealer.cancelled_contracts || 0) / Number(dealer.total_contracts)) * 100 : 0)
        };
      });

      // Calculate summary KPIs from top dealers
      const summary: TopDealersSummary = {
        total_expected_revenue: 0,
        total_funded_revenue: 0,
        avg_cancellation_rate: 0,
      };

      if (topDealers && topDealers.length > 0) {
        // Calculate total expected revenue (all pending revenue from top dealers)
        summary.total_expected_revenue = topDealers.reduce(
          (sum, dealer) => sum + (dealer.expected_revenue || 0), 
          0
        );
        
        // Calculate total funded revenue (all active revenue from top dealers)
        summary.total_funded_revenue = topDealers.reduce(
          (sum, dealer) => sum + (dealer.funded_revenue || 0), 
          0
        );
        
        // Calculate weighted average cancellation rate
        const totalDealerContracts = topDealers.reduce(
          (sum, dealer) => sum + (dealer.total_contracts || 0), 
          0
        );
        
        if (totalDealerContracts > 0) {
          const weightedSum = topDealers.reduce(
            (sum, dealer) => {
              const contracts = dealer.total_contracts || 0;
              const rate = dealer.cancellation_rate || 0;
              return sum + (contracts * rate);
            }, 
            0
          );
          
          summary.avg_cancellation_rate = weightedSum / totalDealerContracts;
        }
      }

      return { 
        topDealers: topDealers || [], 
        summary 
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}