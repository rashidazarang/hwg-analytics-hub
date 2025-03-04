
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { KPIData } from '@/lib/types';
import { getClaimStatus } from '@/utils/claimUtils';

interface UseKPIDataProps {
  dateRange: DateRange;
  dealerFilter: string;
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
        // Get date range for filtering - ensure consistent format with other components
        const fromDate = dateRange.from?.toISOString() || "2020-01-01T00:00:00.000Z";
        const toDate = dateRange.to?.toISOString() || "2025-12-31T23:59:59.999Z";

        // Run these queries in parallel for better performance
        const [
          pendingContractsResult,
          activeContractsResult,
          cancelledContractsResult,
          claimsQuery
        ] = await Promise.all([
          // Pending contracts - using EffectiveDate for consistency
          supabase
            .from('agreements')
            .select('*', { count: 'exact' })
            .eq('AgreementStatus', 'PENDING')
            .gte('EffectiveDate', fromDate)
            .lte('EffectiveDate', toDate)
            .eq(dealerFilter ? 'DealerUUID' : 'IsActive', dealerFilter || true),
          
          // Active contracts - using EffectiveDate for consistency
          supabase
            .from('agreements')
            .select('*', { count: 'exact' })
            .eq('AgreementStatus', 'ACTIVE')
            .gte('EffectiveDate', fromDate)
            .lte('EffectiveDate', toDate)
            .eq(dealerFilter ? 'DealerUUID' : 'IsActive', dealerFilter || true),
          
          // Cancelled contracts - using EffectiveDate for consistency (not StatusChangeDate)
          supabase
            .from('agreements')
            .select('*', { count: 'exact' })
            .eq('AgreementStatus', 'CANCELLED')
            .gte('EffectiveDate', fromDate)
            .lte('EffectiveDate', toDate)
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
            .gte('ReportedDate', fromDate)
            .lte('ReportedDate', toDate)
        ]);

        const pendingContractsCount = pendingContractsResult.count || 0;
        const activeContractsCount = activeContractsResult.count || 0;
        const cancelledContractsCount = cancelledContractsResult.count || 0;

        console.log('[KPI_DATA] Contract counts:', {
          pending: pendingContractsCount,
          active: activeContractsCount,
          cancelled: cancelledContractsCount
        });

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

        // Get total agreements count for this date range
        const { count: totalAgreementsCount } = await supabase
          .from('agreements')
          .select('*', { count: 'exact', head: true })
          .gte('EffectiveDate', fromDate)
          .lte('EffectiveDate', toDate)
          .eq(dealerFilter ? 'DealerUUID' : 'IsActive', dealerFilter || true);

        return {
          pendingContracts: pendingContractsCount,
          newlyActiveContracts: activeContractsCount,
          cancelledContracts: cancelledContractsCount,
          openClaims: openClaimsCount,
          activeAgreements: activeContractsCount,
          totalAgreements: totalAgreementsCount || 0,
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
