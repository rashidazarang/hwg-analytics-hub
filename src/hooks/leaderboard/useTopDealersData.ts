
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { executeWithCSTTimezone } from '@/integrations/supabase/timezone-utils';
import { DateRange } from '@/lib/dateUtils';
import { TopDealer } from '@/lib/types';
import { getFormattedDateRange } from './dateRangeUtils';

/**
 * Hook to fetch top dealers data with optimized SQL queries to prevent timeouts
 */
export function useTopDealersData({ dateRange }: { dateRange: DateRange }) {
  return useQuery({
    queryKey: ['topDealers', dateRange.from, dateRange.to],
    queryFn: async (): Promise<TopDealer[]> => {
      // Format date range with proper time boundaries in CST
      const { startDate, endDate } = getFormattedDateRange(dateRange);

      console.log('[LEADERBOARD] Fetching top dealers with date range (CST):', {
        from: startDate.toISOString(),
        to: endDate.toISOString()
      });

      try {
        // First attempt: Use the optimized SQL function with pagination
        // This avoids loading all data into memory and performs aggregation in SQL
        const { data, error } = await executeWithCSTTimezone(
          supabase,
          (client) => client.rpc('get_top_dealers_aggregated', {
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            max_results: 50 // Limit to top 50 dealers
          })
        );

        if (error) {
          console.error('[LEADERBOARD] Error fetching top dealers with optimized query:', error);
          throw error;
        }

        console.log('[LEADERBOARD] Successfully fetched top dealers:', data?.length || 0);
        
        // Map the SQL results to our expected format
        const topDealers: TopDealer[] = (data || []).map((dealer: any) => ({
          dealer_name: dealer.dealer_name || 'Unknown Dealer',
          total_contracts: Number(dealer.total_contracts || 0),
          total_revenue: Number(dealer.total_revenue || 0),
          cancelled_contracts: Number(dealer.cancelled_contracts || 0),
          pending_contracts: Number(dealer.pending_contracts || 0),
          active_contracts: Number(dealer.active_contracts || 0),
          expected_revenue: Number(dealer.expected_revenue || 0),
          funded_revenue: Number(dealer.funded_revenue || 0)
        }));
        
        return topDealers;
      } catch (primaryError) {
        console.error('[LEADERBOARD] Primary method failed, trying fallback approach:', primaryError);
        
        try {
          // Fallback approach: Use a simpler query with specific fields and pagination
          // This query is less likely to timeout as it's simpler and returns fewer rows
          const { data: dealersData, error: dealersError } = await executeWithCSTTimezone(
            supabase,
            (client) => client
              .from('agreements')
              .select(`
                DealerUUID,
                dealers (
                  DealerUUID,
                  Payee
                ),
                AgreementStatus,
                DealerCost
              `)
              .gte('EffectiveDate', startDate.toISOString())
              .lte('EffectiveDate', endDate.toISOString())
              .limit(1000) // Limit to a reasonable number of rows
          );

          if (dealersError) {
            console.error('[LEADERBOARD] Error fetching dealers data in fallback mode:', dealersError);
            throw dealersError;
          }

          console.log('[LEADERBOARD] Fetched agreements for fallback processing:', dealersData?.length || 0);
          
          // Process data on the client-side
          const dealerMap = new Map<string, {
            dealer_name: string;
            total_contracts: number;
            total_revenue: number;
            cancelled_contracts: number;
            pending_contracts: number;
            active_contracts: number;
            expected_revenue: number;
            funded_revenue: number;
          }>();

          // Process each agreement
          dealersData?.forEach(agreement => {
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
            
            // Use the DealerCost as revenue estimate
            const revenue = typeof agreement.DealerCost === 'number'
              ? agreement.DealerCost
              : typeof agreement.DealerCost === 'string'
                ? parseFloat(agreement.DealerCost) || 0
                : 0;
            
            // Count contract and add revenue
            dealer.total_contracts++;
            dealer.total_revenue += revenue;
            
            // Process by status
            const status = (agreement.AgreementStatus || '').toUpperCase();
            
            if (status === 'PENDING') {
              dealer.pending_contracts++;
              dealer.expected_revenue += revenue;
            } else if (status === 'ACTIVE' || status === 'CLAIMABLE') {
              dealer.active_contracts++;
              dealer.funded_revenue += revenue;
            } else if (status === 'CANCELLED' || status === 'VOID') {
              dealer.cancelled_contracts++;
            } else {
              // For any other status, consider as active
              dealer.active_contracts++;
              dealer.funded_revenue += revenue;
            }
          });

          // Sort dealers by total contracts and get top 50
          const topDealers = Array.from(dealerMap.entries())
            .map(([_, dealer]) => dealer)
            .sort((a, b) => b.total_contracts - a.total_contracts)
            .slice(0, 50);

          console.log('[LEADERBOARD] Successfully processed top dealers in fallback mode:', topDealers.length);
          
          return topDealers;
        } catch (fallbackError) {
          console.error('[LEADERBOARD] Both primary and fallback approaches failed:', fallbackError);
          
          // Last resort fallback: Return empty data instead of failing
          console.warn('[LEADERBOARD] Returning empty data as all approaches failed');
          return [];
        }
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1, // Only retry once to prevent multiple timeouts
  });
}
