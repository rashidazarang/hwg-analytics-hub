
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { TopDealer } from '@/lib/types';

// Hook to fetch top dealers with contract status breakdown
export function useTopDealersContractData({ dateRange }: { dateRange: DateRange }) {
  return useQuery({
    queryKey: ['topDealersContracts', dateRange.from, dateRange.to],
    queryFn: async (): Promise<TopDealer[]> => {
      console.log('[TOPDEALERS_CONTRACTS] Fetching top dealers with contract data:', {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
      });

      // Fetch all agreements with dealer info
      const { data: agreements, error } = await supabase
        .from('agreements')
        .select(`
          AgreementID,
          AgreementStatus,
          DealerUUID,
          dealers(
            Payee
          )
        `)
        .gte('EffectiveDate', dateRange.from.toISOString())
        .lte('EffectiveDate', dateRange.to.toISOString());

      if (error) {
        console.error('[TOPDEALERS_CONTRACTS] Error fetching agreements:', error);
        throw error;
      }

      // Group agreements by dealer and count by status
      const dealerContractsMap = new Map<string, {
        dealer_name: string;
        pending_contracts: number;
        active_contracts: number;
        cancelled_contracts: number;
        total_contracts: number;
        total_revenue: number;
      }>();

      // Process agreements and group by dealer
      agreements.forEach(agreement => {
        const dealerName = agreement.dealers?.Payee || 'Unknown Dealer';
        const dealerUUID = agreement.DealerUUID;
        
        if (!dealerUUID) return;
        
        const dealerData = dealerContractsMap.get(dealerUUID) || {
          dealer_name: dealerName,
          pending_contracts: 0,
          active_contracts: 0,
          cancelled_contracts: 0,
          total_contracts: 0,
          total_revenue: 0
        };
        
        // Update counts based on status
        if (agreement.AgreementStatus === 'PENDING') dealerData.pending_contracts++;
        else if (agreement.AgreementStatus === 'ACTIVE') dealerData.active_contracts++;
        else if (agreement.AgreementStatus === 'CANCELLED') dealerData.cancelled_contracts++;
        
        dealerData.total_contracts++;
        dealerContractsMap.set(dealerUUID, dealerData);
      });

      // Convert map to array and sort by total contracts
      const dealerContractsArray = Array.from(dealerContractsMap.values())
        .sort((a, b) => b.total_contracts - a.total_contracts);

      console.log('[TOPDEALERS_CONTRACTS] Processed dealer contracts:', dealerContractsArray.length);
      
      return dealerContractsArray.map(dealer => ({
        dealer_name: dealer.dealer_name,
        total_contracts: dealer.total_contracts,
        total_revenue: 0, // Keeping this for compatibility
        cancelled_contracts: dealer.cancelled_contracts,
        pending_contracts: dealer.pending_contracts,
        active_contracts: dealer.active_contracts
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}
