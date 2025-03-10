
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { executeWithCSTTimezone } from '@/integrations/supabase/timezone-utils';
import { DateRange } from '@/lib/dateUtils';
import { TopDealer } from '@/lib/types';
import { getFormattedDateRange } from './dateRangeUtils';

/**
 * Hook to fetch top dealers data
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

      // Fetch all agreements with dealer information and option surcharges for the date range
      // This query now joins with option_surcharge_price table to calculate revenue
      // Using executeWithCSTTimezone to ensure consistent timezone handling
      const { data: agreements, error } = await executeWithCSTTimezone(
        supabase,
        (client) => client.rpc('get_agreements_with_revenue', {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        })
      );

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
        
        // Use the new revenue field calculated from DealerCost + option surcharges
        const revenue = typeof agreement.revenue === 'number'
          ? agreement.revenue
          : typeof agreement.revenue === 'string'
            ? parseFloat(agreement.revenue) || 0
            : 0;
        
        // Count ALL agreements for total_contracts regardless of status
        dealer.total_contracts++;
        dealer.total_revenue += revenue;
        
        // Make status check case-insensitive and more robust
        const status = (agreement.AgreementStatus || '').toUpperCase();
        
        // Count all agreements for respective statuses
        if (status === 'PENDING') {
          dealer.pending_contracts++;
          dealer.expected_revenue += revenue;
        } else if (status === 'ACTIVE') {
          dealer.active_contracts++;
          dealer.funded_revenue += revenue;
        } else if (status === 'CANCELLED') {
          dealer.cancelled_contracts++;
        } else if (status === 'VOID') {
          // Count VOID as CANCELLED for consistency
          dealer.cancelled_contracts++;
        } else if (status === 'CLAIMABLE') {
          // Count CLAIMABLE as ACTIVE for consistency
          dealer.active_contracts++;
          dealer.funded_revenue += revenue;
        } else {
          // For any other status, add to active count for now (most likely closer to active than cancelled/pending)
          console.log(`[LEADERBOARD] Unhandled agreement status: ${status} for agreement ${agreement.AgreementID}`);
          dealer.active_contracts++;
          dealer.funded_revenue += revenue;
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
