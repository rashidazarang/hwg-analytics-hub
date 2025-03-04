import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { KPIData } from '@/lib/types';

interface UseKPIDataProps {
  dateRange: DateRange;
  dealerFilter: string;
}

// Function to check if a claim is denied based on Correction field - matching ClaimsTable.tsx
function isClaimDenied(correction: string | null | undefined): boolean {
  if (!correction) return false;
  return /denied|not covered|rejected/i.test(correction);
}

// Updated function to determine claim status - matching ClaimsTable.tsx exactly
function getClaimStatus(claim: any): string {
  if (claim.Closed && claim.ReportedDate) return 'CLOSED';
  if (claim.Closed && !claim.ReportedDate) return 'PENDING';
  if (claim.ReportedDate && !claim.Closed) return 'OPEN';
  return 'PENDING'; // Default to PENDING for any other cases
}

export function useKPIData({ dateRange, dealerFilter }: UseKPIDataProps) {
  return useQuery({
    queryKey: ['kpis', dateRange, dealerFilter],
    queryFn: async (): Promise<KPIData> => {
      console.log('[KPI_DATA] Fetching KPIs with filters:', {
        dateRange,
        dealerFilter,
        fromDate: dateRange.from.toISOString(),
        toDate: dateRange.to.toISOString()
      });

      try {
        // Run these queries in parallel for better performance
        const [
          pendingContractsCount,
          newlyActiveContractsCount,
          cancelledContractsCount,
          claimsQuery
        ] = await Promise.all([
          // Pending contracts
          supabase
            .from('agreements')
            .select('*', { count: 'exact' })
            .eq('AgreementStatus', 'PENDING')
            .gte('EffectiveDate', dateRange.from.toISOString())
            .lte('EffectiveDate', dateRange.to.toISOString())
            .eq(dealerFilter ? 'DealerUUID' : 'IsActive', dealerFilter || true),
          
          // Newly active contracts
          supabase
            .from('agreements')
            .select('*', { count: 'exact' })
            .eq('AgreementStatus', 'ACTIVE')
            .gte('EffectiveDate', dateRange.from.toISOString())
            .lte('EffectiveDate', dateRange.to.toISOString())
            .eq(dealerFilter ? 'DealerUUID' : 'IsActive', dealerFilter || true),
          
          // Cancelled contracts
          supabase
            .from('agreements')
            .select('*', { count: 'exact' })
            .eq('AgreementStatus', 'CANCELLED')
            .gte('StatusChangeDate', dateRange.from.toISOString())
            .lte('StatusChangeDate', dateRange.to.toISOString())
            .eq(dealerFilter ? 'DealerUUID' : 'IsActive', dealerFilter || true),

          // Get all claims for status determination
          supabase
            .from('claims')
            .select(`
              id,
              ClaimID,
              Closed,
              Correction,
              ReportedDate,
              agreements:AgreementID(
                DealerUUID
              )
            `)
            .gte('ReportedDate', dateRange.from.toISOString())
            .lte('ReportedDate', dateRange.to.toISOString())
        ]);

        // Process claims based on dealer filter
        let filteredClaims = claimsQuery.data || [];
        
        // Apply dealer filter if provided
        if (dealerFilter) {
          console.log(`[KPI_DATA] Filtering claims by dealer: ${dealerFilter}`);
          filteredClaims = filteredClaims.filter(claim => 
            claim.agreements?.DealerUUID === dealerFilter
          );
        }
        
        // Count OPEN claims using the same logic as ClaimsTable.tsx
        const openClaimsCount = filteredClaims.filter(claim => 
          getClaimStatus(claim) === 'OPEN'
        ).length;
        
        console.log('[KPI_DATA] Claims breakdown:', {
          total: filteredClaims.length,
          open: openClaimsCount,
          denied: filteredClaims.filter(claim => getClaimStatus(claim) === 'DENIED').length,
          closed: filteredClaims.filter(claim => getClaimStatus(claim) === 'CLOSED').length,
          pending: filteredClaims.filter(claim => getClaimStatus(claim) === 'PENDING').length
        });

        // Claims data for amounts
        const claimsData = await supabase
          .from('claims')
          .select('Deductible');

        // Calculate claim amounts from Deductible
        const totalClaimsAmount = (claimsData.data || []).reduce((sum, claim) => 
          sum + (claim.Deductible || 0), 0);
        const averageClaimAmount = claimsData.data && claimsData.data.length > 0 
          ? totalClaimsAmount / claimsData.data.length 
          : 0;

        return {
          pendingContracts: pendingContractsCount.count || 0,
          newlyActiveContracts: newlyActiveContractsCount.count || 0,
          cancelledContracts: cancelledContractsCount.count || 0,
          openClaims: openClaimsCount,
          activeAgreements: newlyActiveContractsCount.count || 0,
          totalAgreements: (await supabase.from('agreements').select('*', { count: 'exact' })).count || 0,
          totalClaims: (await supabase.from('claims').select('*', { count: 'exact' })).count || 0,
          activeDealers: (await supabase.from('dealers').select('*', { count: 'exact' })).count || 0,
          totalDealers: (await supabase.from('dealers').select('*', { count: 'exact' })).count || 0,
          averageClaimAmount,
          totalClaimsAmount,
        };
      } catch (error) {
        console.error('[KPI_DATA] Error fetching KPIs:', error);
        return {
          pendingContracts: 0,
          newlyActiveContracts: 0,
          cancelledContracts: 0,
          openClaims: 0,
          activeAgreements: 0,
          totalAgreements: 0,
          totalClaims: 0,
          activeDealers: 0,
          totalDealers: 0,
          averageClaimAmount: 0,
          totalClaimsAmount: 0,
        };
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
