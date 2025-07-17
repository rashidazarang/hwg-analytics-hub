import { useQuery } from '@tanstack/react-query';
import { supabase, shouldUseMockData } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { LeaderboardSummary } from '@/lib/types';
import { getFormattedDateRange } from './dateRangeUtils';
import { executeWithCSTTimezone } from '@/integrations/supabase/timezone-utils';
import MockDataService from '@/lib/mockDataService';

/**
 * Hook to fetch leaderboard summary data
 */
export function useLeaderboardSummary({ dateRange }: { dateRange: DateRange }) {
  return useQuery({
    queryKey: ['leaderboardSummary', dateRange.from, dateRange.to],
    queryFn: async (): Promise<LeaderboardSummary> => {
      // Use mock data in development mode
      if (shouldUseMockData()) {
        console.log('[LEADERBOARD_SUMMARY] 🔧 Using mock data in development mode');
        return MockDataService.getLeaderboardSummary();
      }

      // Format date range with proper time boundaries
      const { startDate, endDate } = getFormattedDateRange(dateRange);

      console.log('[LEADERBOARD] Fetching summary with date range:', {
        from: startDate.toISOString(),
        to: endDate.toISOString()
      });

      try {
        // Try the primary method with optimized RPC function
        const { data: summaryData, error: summaryError } = await supabase
          .rpc('get_leaderboard_summary', {
            start_date: startDate.toISOString().split('T')[0], // Convert to date format
            end_date: endDate.toISOString().split('T')[0]
          });
        
        if (summaryError) {
          console.error('[LEADERBOARD] Primary RPC failed:', summaryError);
          throw summaryError;
        }

        if (!summaryData || !summaryData[0]) {
          throw new Error('No data returned from leaderboard summary query');
        }

        console.log('[LEADERBOARD] Primary RPC succeeded');
        return summaryData[0];
      } catch (primaryError) {
        console.error('[LEADERBOARD] Primary summary method failed, trying fallback:', primaryError);
        
        try {
          // Fallback to a simpler query approach
          const fallbackResult = await executeWithCSTTimezone(
            supabase,
            async (client) => {
              return await client
                .from('agreements')
                .select('AgreementStatus, DealerCost, HolderFirstName, HolderLastName, DealerUUID')
                .gte('EffectiveDate', startDate.toISOString())
                .lte('EffectiveDate', endDate.toISOString())
                .limit(5000); // Reasonable limit for fallback
            }
          );
          
          if (fallbackResult.error) {
            console.error('[LEADERBOARD] Fallback query failed:', fallbackResult.error);
            throw fallbackResult.error;
          }

          const agreements = fallbackResult.data;
          console.log('[LEADERBOARD] Fallback query succeeded, processing:', agreements?.length || 0);

          // Process the data to create a summary
          const summary: LeaderboardSummary = {
            active_contracts: 0,
            total_revenue: 0,
            cancellation_rate: 0,
            dealer_name: 'Unknown',
            agent_name: 'Unknown'
          };

          // Calculate basic counts from the results
          let totalContracts = 0;
          let cancelledContracts = 0;
          const dealerRevenue = new Map<string, number>();
          const agentContracts = new Map<string, number>();
          
          agreements?.forEach((item: any) => {
            totalContracts++;
            
            // Sum up revenue
            const revenue = parseFloat(item.DealerCost || '0');
            if (!isNaN(revenue)) {
              summary.total_revenue += revenue;
            }
            
            // Count active contracts
            const status = (item.AgreementStatus || '').toUpperCase();
            if (status === 'ACTIVE' || status === 'CLAIMABLE') {
              summary.active_contracts++;
            } else if (status === 'CANCELLED' || status === 'VOID') {
              cancelledContracts++;
            }
            
            // Track dealer revenue for top dealer
            if (item.DealerUUID && !isNaN(revenue)) {
              const currentRevenue = dealerRevenue.get(item.DealerUUID) || 0;
              dealerRevenue.set(item.DealerUUID, currentRevenue + revenue);
            }
            
            // Track agent contracts for top agent
            const agentName = `${item.HolderFirstName || ''} ${item.HolderLastName || ''}`.trim();
            if (agentName) {
              const currentCount = agentContracts.get(agentName) || 0;
              agentContracts.set(agentName, currentCount + 1);
            }
          });
          
          // Calculate cancellation rate
          if (totalContracts > 0) {
            summary.cancellation_rate = (cancelledContracts / totalContracts) * 100;
          }
          
          // Find top dealer (by revenue)
          let topDealerUUID = '';
          let maxRevenue = 0;
          for (const [dealerUUID, revenue] of dealerRevenue) {
            if (revenue > maxRevenue) {
              maxRevenue = revenue;
              topDealerUUID = dealerUUID;
            }
          }
          
          // Find top agent (by contract count)
          let topAgent = '';
          let maxContracts = 0;
          for (const [agentName, contractCount] of agentContracts) {
            if (contractCount > maxContracts) {
              maxContracts = contractCount;
              topAgent = agentName;
            }
          }
          
          // Get dealer name if we have a top dealer
          if (topDealerUUID) {
            try {
              const dealerResult = await executeWithCSTTimezone(
                supabase,
                async (client) => {
                  return await client
                    .from('dealers')
                    .select('Payee')
                    .eq('DealerUUID', topDealerUUID)
                    .single();
                }
              );
              
              if (dealerResult.data?.Payee) {
                summary.dealer_name = dealerResult.data.Payee;
              }
            } catch (dealerError) {
              console.warn('[LEADERBOARD] Could not fetch dealer name:', dealerError);
            }
          }
          
          if (topAgent) {
            summary.agent_name = topAgent;
          }

          console.log('[LEADERBOARD] Successfully created summary from fallback data');
          return summary;
        } catch (fallbackError) {
          console.error('[LEADERBOARD] Both primary and fallback summary methods failed:', fallbackError);
          
          // Return default summary instead of throwing
          console.warn('[LEADERBOARD] Returning default summary due to errors');
          return {
            active_contracts: 0,
            total_revenue: 0,
            cancellation_rate: 0,
            dealer_name: 'No data available',
            agent_name: 'No data available'
          };
        }
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1, // Only retry once to avoid multiple timeouts
  });
}
