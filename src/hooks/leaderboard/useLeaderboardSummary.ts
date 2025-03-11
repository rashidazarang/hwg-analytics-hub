import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { LeaderboardSummary } from '@/lib/types';
import { getFormattedDateRange } from './dateRangeUtils';
import { executeWithCSTTimezone } from '@/integrations/supabase/timezone-utils';

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

      try {
        // Try the primary method with a timeout setting
        const result = await executeWithCSTTimezone(
          supabase,
          async (client) => {
            const { data, error } = await client.rpc('get_leaderboard_summary', {
              start_date: startDate.toISOString(),
              end_date: endDate.toISOString()
            });
            
            if (error) throw error;
            return data;
          }
        );

        if (!result || !result[0]) {
          throw new Error('No data returned from leaderboard summary query');
        }

        return result[0];
      } catch (primaryError) {
        console.error('[LEADERBOARD] Primary summary method failed, trying fallback:', primaryError);
        
        // Fallback to a simpler query approach
        try {
          // Use a direct query with simpler aggregations
          const result = await executeWithCSTTimezone(
            supabase,
            async (client) => {
              const { data, error } = await client
                .from('agreements')
                .select('AgreementStatus, Total')
                .gte('EffectiveDate', startDate.toISOString())
                .lte('EffectiveDate', endDate.toISOString());
                
              if (error) throw error;
              return data;
            }
          );

          // Process the data to create a summary
          const summary: LeaderboardSummary = {
            active_contracts: 0,
            total_revenue: 0,
            cancellation_rate: 0,
            top_dealer: 'Unknown',
            top_agent: 'Unknown'
          };

          // Calculate basic counts from the results
          let totalContracts = 0;
          let cancelledContracts = 0;
          
          result?.forEach((item: any) => {
            totalContracts++;
            
            // Sum up revenue
            const total = parseFloat(item.Total || '0');
            if (!isNaN(total)) {
              summary.total_revenue += total;
            }
            
            // Count active contracts
            const status = (item.AgreementStatus || '').toUpperCase();
            if (status === 'ACTIVE' || status === 'CLAIMABLE') {
              summary.active_contracts++;
            } else if (status === 'CANCELLED' || status === 'VOID') {
              cancelledContracts++;
            }
          });
          
          // Calculate cancellation rate
          if (totalContracts > 0) {
            summary.cancellation_rate = (cancelledContracts / totalContracts) * 100;
          }

          console.log('[LEADERBOARD] Successfully created summary from fallback data');
          return summary;
        } catch (fallbackError) {
          console.error('[LEADERBOARD] Both primary and fallback summary methods failed:', fallbackError);
          throw fallbackError;
        }
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1, // Only retry once to avoid multiple timeouts
  });
}
