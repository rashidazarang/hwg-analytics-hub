
import { useQuery } from '@tanstack/react-query';
import { supabase, shouldUseMockData } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { TopDealerClaims } from '@/lib/types';
import { getClaimStatus } from '@/utils/claimUtils';


// Hook to fetch top dealers by claims
export function useTopDealerClaimsData({ dateRange }: { dateRange: DateRange }) {
  return useQuery({
    queryKey: ['topDealerClaims', dateRange.from, dateRange.to],
    queryFn: async (): Promise<TopDealerClaims[]> => {
      console.log('[DEALERCLAIMS] Fetching top dealers by claims with date range:', {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
      });

      // Use mock data in development mode
      if (shouldUseMockData()) {
        console.log('[DEALERCLAIMS] Using mock data in development mode');
        return [];
      }

      // Fetch claims with dealer information
      const { data: claims, error } = await supabase
        .from('claims')
        .select(`
          id,
          ClaimID,
          ReportedDate,
          Closed,
          LastModified,
          agreements!inner(
            DealerUUID,
            dealers(
              Payee
            )
          )
        `)
        .gte('LastModified', dateRange.from.toISOString())
        .lte('LastModified', dateRange.to.toISOString());

      if (error) {
        console.error('[DEALERCLAIMS] Error fetching claims:', error);
        throw error;
      }

      // Group claims by dealer and count by status
      const dealerClaimsMap = new Map<string, {
        dealer_name: string;
        open_claims: number;
        pending_claims: number;
        closed_claims: number;
        total_claims: number;
      }>();

      // Process claims and group by dealer
      claims.forEach(claim => {
        const dealerName = claim.agreements?.dealers?.Payee || 'Unknown Dealer';
        const dealerUUID = claim.agreements?.DealerUUID;
        
        if (!dealerUUID) return;
        
        const status = getClaimStatus(claim);
        
        const dealerData = dealerClaimsMap.get(dealerUUID) || {
          dealer_name: dealerName,
          open_claims: 0,
          pending_claims: 0,
          closed_claims: 0,
          total_claims: 0
        };
        
        // Update counts based on status
        if (status === 'OPEN') dealerData.open_claims++;
        else if (status === 'PENDING') dealerData.pending_claims++;
        else if (status === 'CLOSED') dealerData.closed_claims++;
        
        dealerData.total_claims++;
        dealerClaimsMap.set(dealerUUID, dealerData);
      });

      // Convert map to array and sort by total claims
      const dealerClaimsArray = Array.from(dealerClaimsMap.values())
        .sort((a, b) => b.total_claims - a.total_claims);

      console.log('[DEALERCLAIMS] Processed dealer claims:', dealerClaimsArray.length);
      return dealerClaimsArray;
    },
    staleTime: 5 * 60 * 1000,
  });
}
