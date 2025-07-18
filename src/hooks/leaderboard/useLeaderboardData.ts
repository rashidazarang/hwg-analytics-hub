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
  percentage_total_revenue?: number;
}

// Interface for summary data
export interface TopDealersSummary {
  total_expected_revenue: number;
  total_funded_revenue: number;
  avg_cancellation_rate: number;
}

/**
 * Hook to fetch optimized top dealers data with KPI summary
 * Using a paginated and optimized approach to prevent timeouts
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

      try {
        // Use the optimized get_top_dealers_optimized function
        const { data, error } = await executeWithCSTTimezone(
          supabase,
          async (client) => {
            return await client.rpc('get_top_dealers_optimized', {
              start_date: startDate.toISOString().split('T')[0],
              end_date: endDate.toISOString().split('T')[0],
              dealer_limit: 10
            });
          }
        );

        if (error) {
          console.error('[LEADERBOARD] Error fetching optimized top dealers:', error);
          throw error;
        }

        if (!data || !Array.isArray(data)) {
          console.warn('[LEADERBOARD] No data returned from optimized query');
          return {
            topDealers: [],
            summary: {
              total_expected_revenue: 0,
              total_funded_revenue: 0,
              avg_cancellation_rate: 0
            }
          };
        }

        console.log(`[LEADERBOARD] Successfully fetched ${data.length} top dealers`);

        // Calculate summary statistics
        const totalExpectedRevenue = data.reduce((sum, dealer) => sum + (dealer.expected_revenue || 0), 0);
        const totalFundedRevenue = data.reduce((sum, dealer) => sum + (dealer.funded_revenue || 0), 0);
        const avgCancellationRate = data.length > 0 
          ? data.reduce((sum, dealer) => sum + (dealer.cancellation_rate || 0), 0) / data.length
          : 0;

        // Add percentage calculation for each dealer
        const topDealersWithPercentage = data.map(dealer => ({
          ...dealer,
          percentage_total_revenue: totalFundedRevenue > 0 
            ? (dealer.funded_revenue / totalFundedRevenue) * 100 
            : 0
        }));

        return {
          topDealers: topDealersWithPercentage,
          summary: {
            total_expected_revenue: totalExpectedRevenue,
            total_funded_revenue: totalFundedRevenue,
            avg_cancellation_rate: avgCancellationRate
          }
        };

      } catch (error) {
        console.error('[LEADERBOARD] Exception in leaderboard data fetch:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
  });
}