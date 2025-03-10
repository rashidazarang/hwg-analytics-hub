
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

      // Fetch all agreements with dealer info and calculated revenue
      // Use the executeWithCSTTimezone wrapper to ensure consistent timezone handling
      const { data: agreements, error } = await executeWithCSTTimezone(
        supabase,
        (client) => client.rpc('get_agreements_with_revenue', {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        })
      );

      if (error) {
        console.error('[TOPDEALERS_CONTRACTS] Error fetching agreements:', error);
        throw error;
      }

      console.log('[TOPDEALERS_CONTRACTS] Raw agreements fetched:', agreements.length);

      // Group agreements by dealer and count by status
      const dealerContractsMap = new Map<string, {
        dealer_name: string;
        pending_contracts: number;
        active_contracts: number;
        cancelled_contracts: number;
        total_contracts: number;
        total_revenue: number;
        expected_revenue: number; // Revenue from pending agreements
        funded_revenue: number;   // Revenue from active agreements
      }>();

      // Process agreements and group by dealer
      agreements.forEach(agreement => {
        const dealerName = agreement.dealers?.Payee || 'Unknown Dealer';
        const dealerUUID = agreement.DealerUUID;
        
        if (!dealerUUID) {
          console.log('[TOPDEALERS_CONTRACTS] Skipping agreement without DealerUUID:', agreement.AgreementID);
          return;
        }
        
        const dealerData = dealerContractsMap.get(dealerUUID) || {
          dealer_name: dealerName,
          pending_contracts: 0,
          active_contracts: 0,
          cancelled_contracts: 0,
          total_contracts: 0,
          total_revenue: 0,
          expected_revenue: 0,
          funded_revenue: 0
        };
        
        // Use the new revenue field calculated from DealerCost + option surcharges
        const revenue = typeof agreement.revenue === 'number'
          ? agreement.revenue
          : typeof agreement.revenue === 'string'
            ? parseFloat(agreement.revenue) || 0
            : 0;
        
        // Make status check case-insensitive and more robust
        const status = (agreement.AgreementStatus || '').toUpperCase();
        
        // Update counts based on status
        if (status === 'PENDING') {
          dealerData.pending_contracts++;
          dealerData.expected_revenue += revenue;
        } else if (status === 'ACTIVE') {
          dealerData.active_contracts++;
          dealerData.funded_revenue += revenue;
        } else if (status === 'CANCELLED') {
          dealerData.cancelled_contracts++;
        } else {
          // For any other status, log it for debugging
          console.log(`[TOPDEALERS_CONTRACTS] Unhandled agreement status: ${status} for agreement ${agreement.AgreementID}`);
        }
        
        dealerData.total_contracts++;
        dealerData.total_revenue += revenue;
        dealerContractsMap.set(dealerUUID, dealerData);
      });

      // Convert map to array and sort by total contracts
      const dealerContractsArray = Array.from(dealerContractsMap.values())
        .sort((a, b) => b.total_contracts - a.total_contracts);

      console.log('[TOPDEALERS_CONTRACTS] Processed dealer contracts:', dealerContractsArray.length);
      
      return dealerContractsArray.map(dealer => ({
        dealer_name: dealer.dealer_name,
        total_contracts: dealer.total_contracts,
        total_revenue: dealer.total_revenue,
        cancelled_contracts: dealer.cancelled_contracts,
        pending_contracts: dealer.pending_contracts,
        active_contracts: dealer.active_contracts,
        expected_revenue: dealer.expected_revenue,
        funded_revenue: dealer.funded_revenue
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}
