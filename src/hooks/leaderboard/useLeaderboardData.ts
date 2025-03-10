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

      // Use the new optimized function
      const { data, error } = await executeWithCSTTimezone(
        supabase,
        (client) => client.rpc('get_top_dealers_with_kpis', {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        })
      );

      if (error) {
        console.error('[LEADERBOARD] Error fetching optimized top dealers data:', error);
        throw error;
      }

      console.log('[LEADERBOARD] Successfully fetched top dealers:', data.length);

      // Calculate summary KPIs from top dealers
      const summary: TopDealersSummary = {
        total_expected_revenue: 0,
        total_funded_revenue: 0,
        avg_cancellation_rate: 0,
      };

      if (data && data.length > 0) {
        // Calculate total expected revenue (all pending revenue from top dealers)
        summary.total_expected_revenue = data.reduce(
          (sum, dealer) => sum + parseFloat(dealer.expected_revenue || '0'), 
          0
        );
        
        // Calculate total funded revenue (all active revenue from top dealers)
        summary.total_funded_revenue = data.reduce(
          (sum, dealer) => sum + parseFloat(dealer.funded_revenue || '0'), 
          0
        );
        
        // Calculate weighted average cancellation rate
        const totalDealerContracts = data.reduce(
          (sum, dealer) => sum + parseInt(dealer.total_contracts || '0'), 
          0
        );
        
        if (totalDealerContracts > 0) {
          const weightedSum = data.reduce(
            (sum, dealer) => {
              const contracts = parseInt(dealer.total_contracts || '0');
              const rate = parseFloat(dealer.cancellation_rate || '0');
              return sum + (contracts * rate);
            }, 
            0
          );
          
          summary.avg_cancellation_rate = weightedSum / totalDealerContracts;
        }
      }

      return { 
        topDealers: data || [], 
        summary 
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}