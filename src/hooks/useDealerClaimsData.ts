
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

      // Fetch claims with dealer information using a broader date range approach
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
        // Use OR logic to capture claims with either ReportedDate or LastModified in range
        .or(`and(ReportedDate.gte.${dateRange.from.toISOString()},ReportedDate.lte.${dateRange.to.toISOString()}),and(ReportedDate.is.null,LastModified.gte.${dateRange.from.toISOString()},LastModified.lte.${dateRange.to.toISOString()})`)
        .limit(1000); // Add reasonable limit to prevent timeouts

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

      claims?.forEach((claim: any) => {
        const dealerUUID = claim.agreements?.DealerUUID;
        const dealerName = claim.agreements?.dealers?.Payee || 'Unknown Dealer';
        
        if (!dealerUUID) return;

        if (!dealerClaimsMap.has(dealerUUID)) {
          dealerClaimsMap.set(dealerUUID, {
            dealer_name: dealerName,
            open_claims: 0,
            pending_claims: 0,
            closed_claims: 0,
            total_claims: 0
          });
        }

        const dealerData = dealerClaimsMap.get(dealerUUID)!;
        dealerData.total_claims++;

        // Determine claim status based on dates
        const status = getClaimStatus(claim);
        
        switch (status.toLowerCase()) {
          case 'open':
            dealerData.open_claims++;
            break;
          case 'pending':
            dealerData.pending_claims++;
            break;
          case 'closed':
            dealerData.closed_claims++;
            break;
        }
      });

      // Convert to array and sort by total claims
      const result = Array.from(dealerClaimsMap.values())
        .sort((a, b) => b.total_claims - a.total_claims)
        .slice(0, 10); // Top 10 dealers

      console.log(`[DEALERCLAIMS] Processed ${result.length} dealers with claims data`);
      return result;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
