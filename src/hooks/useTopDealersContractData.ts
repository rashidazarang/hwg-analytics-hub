
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { executeWithCSTTimezone } from '@/integrations/supabase/timezone-utils';
import { DateRange } from '@/lib/dateUtils';
import { TopDealer } from '@/lib/types';

// Hook to fetch top dealers with contract status breakdown
export function useTopDealersContractData({ dateRange }: { dateRange: DateRange }) {
  return useQuery({
    queryKey: ['topDealersContracts', dateRange.from, dateRange.to],
    queryFn: async (): Promise<TopDealer[]> => {
      // Import the getFormattedDateRange function to ensure consistent date handling
      const { getFormattedDateRange } = await import('@/hooks/leaderboard/dateRangeUtils');
      const { startDate, endDate } = getFormattedDateRange(dateRange);

      console.log('[TOPDEALERS_CONTRACTS] Fetching top dealers with contract data (CST):', {
        from: startDate.toISOString(),
        to: endDate.toISOString()
      });

      // Use the get_top_dealers_with_kpis function for comprehensive data
      const { data, error } = await executeWithCSTTimezone(
        supabase,
        async (client) => {
          return await client.rpc('get_top_dealers_with_kpis', {
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            limit_count: 50
          });
        }
      );

      if (error) {
        console.error('[TOPDEALERS_CONTRACTS] Error fetching top dealers:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
