
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

      try {
        // Primary method: Use optimized RPC function with timeout protection
        const { data: agreementsData, error: rpcError } = await supabase
          .rpc('get_agreements_with_revenue', {
            start_date: startDate.toISOString().split('T')[0], // Convert to date format
            end_date: endDate.toISOString().split('T')[0],
            limit_count: 1000 // Limit to prevent timeouts
          });

        if (rpcError) {
          console.error('[TOPDEALERS_CONTRACTS] Primary RPC failed:', rpcError);
          throw rpcError;
        }

        const agreements = agreementsData;
        console.log('[TOPDEALERS_CONTRACTS] Primary RPC succeeded, processing data:', agreements?.length || 0);
        
        // Process the agreements data to create top dealers summary
        const dealerMap = new Map<string, TopDealer>();
        
        agreements?.forEach((agreement: any) => {
          const dealerUUID = agreement.DealerUUID;
          const dealerName = agreement.dealers?.Payee || 'Unknown Dealer';
          const revenue = Number(agreement.revenue || 0);
          const status = (agreement.AgreementStatus || '').toUpperCase();
          
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
          dealer.total_contracts++;
          dealer.total_revenue += revenue;
          
          if (status === 'PENDING') {
            dealer.pending_contracts++;
            dealer.expected_revenue += revenue;
          } else if (status === 'ACTIVE' || status === 'CLAIMABLE') {
            dealer.active_contracts++;
            dealer.funded_revenue += revenue;
          } else if (status === 'CANCELLED' || status === 'VOID') {
            dealer.cancelled_contracts++;
          }
        });

        // Sort by total revenue and return top dealers
        const topDealers = Array.from(dealerMap.values())
          .sort((a, b) => b.total_revenue - a.total_revenue)
          .slice(0, 50);

        console.log('[TOPDEALERS_CONTRACTS] Successfully processed top dealers:', topDealers.length);
        return topDealers;

      } catch (primaryError) {
        console.error('[TOPDEALERS_CONTRACTS] Primary method failed, trying fallback:', primaryError);
        
        try {
          // Fallback method: Direct query with client-side processing
          const fallbackResult = await executeWithCSTTimezone(
            supabase,
            async (client) => {
              return await client
                .from('agreements')
                .select(`
                  DealerUUID,
                  AgreementStatus,
                  DealerCost,
                  dealers:DealerUUID (
                    Payee
                  )
                `)
                .gte('EffectiveDate', startDate.toISOString())
                .lte('EffectiveDate', endDate.toISOString())
                .limit(2000); // Reasonable limit for fallback
            }
          );

          if (fallbackResult.error) {
            console.error('[TOPDEALERS_CONTRACTS] Fallback query failed:', fallbackResult.error);
            throw fallbackResult.error;
          }

          const fallbackData = fallbackResult.data;
          console.log('[TOPDEALERS_CONTRACTS] Fallback query succeeded, processing:', fallbackData?.length || 0);

          // Process fallback data client-side
          const dealerMap = new Map<string, TopDealer>();
          
          fallbackData?.forEach((agreement: any) => {
            const dealerUUID = agreement.DealerUUID;
            const dealerName = agreement.dealers?.Payee || 'Unknown Dealer';
            const revenue = Number(agreement.DealerCost || 0);
            const status = (agreement.AgreementStatus || '').toUpperCase();
            
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
            dealer.total_contracts++;
            dealer.total_revenue += revenue;
            
            if (status === 'PENDING') {
              dealer.pending_contracts++;
              dealer.expected_revenue += revenue;
            } else if (status === 'ACTIVE' || status === 'CLAIMABLE') {
              dealer.active_contracts++;
              dealer.funded_revenue += revenue;
            } else if (status === 'CANCELLED' || status === 'VOID') {
              dealer.cancelled_contracts++;
            }
          });

          const topDealers = Array.from(dealerMap.values())
            .sort((a, b) => b.total_revenue - a.total_revenue)
            .slice(0, 50);

          console.log('[TOPDEALERS_CONTRACTS] Fallback processing completed:', topDealers.length);
          return topDealers;

        } catch (fallbackError) {
          console.error('[TOPDEALERS_CONTRACTS] Both primary and fallback methods failed:', fallbackError);
          
          // Return empty array with error logged instead of throwing
          console.warn('[TOPDEALERS_CONTRACTS] Returning empty data due to errors');
          return [];
        }
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1, // Only retry once to avoid multiple timeouts
    retryDelay: 1000, // Wait 1 second before retry
  });
}
