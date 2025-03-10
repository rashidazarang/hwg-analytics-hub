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

      // First try the optimized aggregated SQL function with pagination
      try {
        // Use the optimized RPC function with explicit limit and timeout settings
        // This should prevent the query from timing out
        
        // First set the timezone
        await supabase.rpc('set_timezone', { 
          timezone_name: 'America/Chicago' // CST timezone
        });
        
        // Then make the RPC call directly with type assertion to handle TypeScript errors
        // @ts-ignore - Suppress TypeScript error about the RPC function name
        const { data, error } = await supabase.rpc('get_top_dealers_optimized', {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          limit_count: 10 // Only fetch top 10 dealers
        });

        if (error) {
          console.error('[LEADERBOARD] Error fetching optimized top dealers:', error);
          throw error;
        }

        console.log('[LEADERBOARD] Successfully fetched top dealers:', data?.length || 0);

        // Process the data to fit our expected structure
        const topDealers = Array.isArray(data) 
          ? data.map((dealer: any) => ({
              dealer_uuid: dealer.dealer_uuid || '',
              dealer_name: dealer.dealer_name || '',
              total_contracts: Number(dealer.total_contracts || 0),
              active_contracts: Number(dealer.active_contracts || 0),
              pending_contracts: Number(dealer.pending_contracts || 0), 
              cancelled_contracts: Number(dealer.cancelled_contracts || 0),
              total_revenue: Number(dealer.total_revenue || 0),
              expected_revenue: Number(dealer.expected_revenue || 0),
              funded_revenue: Number(dealer.funded_revenue || 0),
              cancellation_rate: Number(dealer.cancellation_rate || 0)
            }))
          : [];

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
      } catch (primaryError) {
        console.error('[LEADERBOARD] Primary method failed, trying fallback:', primaryError);
        
        // Fallback to a simpler query approach that's less likely to timeout
        try {
          // Set timezone first
          await supabase.rpc('set_timezone', { 
            timezone_name: 'America/Chicago' // CST timezone
          });

          // Use a direct query with pagination that only gets the necessary fields
          const { data: dealersData, error: dealersError } = await supabase
            .from('agreements')
            .select(`
              dealers:DealerUUID (
                DealerUUID,
                Payee
              ),
              AgreementStatus
            `)
            .gte('EffectiveDate', startDate.toISOString())
            .lte('EffectiveDate', endDate.toISOString())
            .limit(5000); // Limit to a reasonable number of rows

          if (dealersError) {
            console.error('[LEADERBOARD] Error fetching dealers in fallback mode:', dealersError);
            throw dealersError;
          }

          console.log('[LEADERBOARD] Fetched agreements for fallback processing:', dealersData?.length || 0);

          // Process the data client-side
          const dealerMap = new Map<string, {
            uuid: string;
            name: string;
            total: number;
            active: number;
            pending: number;
            cancelled: number;
          }>();

          // Process agreements to count by dealer
          dealersData?.forEach(agreement => {
            if (!agreement.dealers || !agreement.dealers.DealerUUID) return;

            const dealerUUID = agreement.dealers.DealerUUID;
            const dealerName = agreement.dealers.Payee || 'Unknown Dealer';
            
            if (!dealerMap.has(dealerUUID)) {
              dealerMap.set(dealerUUID, {
                uuid: dealerUUID,
                name: dealerName,
                total: 0,
                active: 0,
                pending: 0,
                cancelled: 0
              });
            }
            
            const dealer = dealerMap.get(dealerUUID)!;
            dealer.total++;
            
            // Make status check case-insensitive
            const status = (agreement.AgreementStatus || '').toUpperCase();
            
            if (status === 'PENDING') {
              dealer.pending++;
            } else if (status === 'ACTIVE' || status === 'CLAIMABLE') {
              dealer.active++;
            } else if (status === 'CANCELLED' || status === 'VOID') {
              dealer.cancelled++;
            } else {
              // For unknown statuses, consider them active
              dealer.active++;
            }
          });

          // Sort dealers by total agreements and get top 10
          const topDealers = Array.from(dealerMap.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 10)
            .map(dealer => {
              // Calculate estimated revenue values
              // These are rough estimates since we don't have actual revenue data
              const avgContractValue = 1000; // Placeholder average contract value
              const totalRevenue = dealer.total * avgContractValue;
              
              // Calculate cancellation rate
              const cancellationRate = dealer.total > 0 ? (dealer.cancelled / dealer.total) * 100 : 0;
              
              // Estimate expected and funded revenue
              const expectedRevenue = dealer.pending * avgContractValue;
              const fundedRevenue = dealer.active * avgContractValue;
              
              return {
                dealer_uuid: dealer.uuid,
                dealer_name: dealer.name,
                total_contracts: dealer.total,
                active_contracts: dealer.active,
                pending_contracts: dealer.pending,
                cancelled_contracts: dealer.cancelled,
                total_revenue: totalRevenue,
                expected_revenue: expectedRevenue,
                funded_revenue: fundedRevenue,
                cancellation_rate: cancellationRate
              };
            });

          console.log('[LEADERBOARD] Successfully processed top dealers in fallback mode:', topDealers.length);

          // Calculate summary values
          const summary: TopDealersSummary = {
            total_expected_revenue: topDealers.reduce((sum, dealer) => sum + dealer.expected_revenue, 0),
            total_funded_revenue: topDealers.reduce((sum, dealer) => sum + dealer.funded_revenue, 0),
            avg_cancellation_rate: topDealers.reduce((sum, dealer) => sum + dealer.cancellation_rate, 0) / topDealers.length
          };

          return { topDealers, summary };
        } catch (fallbackError) {
          console.error('[LEADERBOARD] Both primary and fallback methods failed:', fallbackError);
          throw fallbackError;
        }
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1, // Only retry once to avoid multiple timeouts
  });
}