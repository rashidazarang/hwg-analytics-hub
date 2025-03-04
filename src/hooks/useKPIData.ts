
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
    queryKey: ['kpis', dateRange.from, dateRange.to, dealerFilter],
    queryFn: async (): Promise<KPIData> => {
      console.log('[KPI_DATA] Fetching KPIs with filters:', {
        dateRange,
        dealerFilter,
        fromDate: dateRange.from.toISOString(),
        toDate: dateRange.to.toISOString()
      });

      try {
        // Get date range for filtering - ensure consistent format with other components
        const fromDate = dateRange.from?.toISOString();
        const toDate = dateRange.to?.toISOString();

        // Run these queries in parallel for better performance
        const [
          pendingContractsResult,
          activeContractsResult,
          cancelledContractsResult
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
          
          // Cancelled contracts - using EffectiveDate for consistency
          supabase
            .from('agreements')
            .select('*', { count: 'exact' })
            .eq('AgreementStatus', 'CANCELLED')
            .gte('EffectiveDate', fromDate)
            .lte('EffectiveDate', toDate)
            .eq(dealerFilter ? 'DealerUUID' : 'IsActive', dealerFilter || true)
        ]);

        const pendingContractsCount = pendingContractsResult.count || 0;
        const activeContractsCount = activeContractsResult.count || 0;
        const cancelledContractsCount = cancelledContractsResult.count || 0;

        console.log('[KPI_DATA] Contract counts:', {
          pending: pendingContractsCount,
          active: activeContractsCount,
          cancelled: cancelledContractsCount
        });

        // Fetch claims data using the SAME approach as in ClaimsTable and ClaimChart
        let claimsQuery = supabase
          .from('claims')
          .select(`
            id,
            ClaimID,
            ReportedDate,
            Closed,
            Correction,
            Deductible,
            LastModified,
            agreements(DealerUUID)
          `, { count: 'exact' });
        
        // Apply same date range filter as ClaimsTable and ClaimChart
        // Use LastModified to match ClaimsTable and ClaimChart
        claimsQuery = claimsQuery
          .gte('LastModified', fromDate)
          .lte('LastModified', toDate);
        
        // Apply dealer filter at the database level - same as ClaimsTable and ClaimChart
        if (dealerFilter && dealerFilter.trim() !== '') {
          console.log(`[KPI_DATA] Filtering claims by dealer: ${dealerFilter}`);
          claimsQuery = claimsQuery.eq('agreements.DealerUUID', dealerFilter);
        }
        
        const { data: claimsData, error: claimsError, count: claimsCount } = await claimsQuery;
        
        if (claimsError) {
          console.error('[KPI_DATA] Error fetching claims:', claimsError);
          throw claimsError;
        }
        
        // Process claims using the same getClaimStatus function
        const filteredClaims = claimsData || [];
        console.log(`[KPI_DATA] Retrieved ${filteredClaims.length} claims out of total ${claimsCount || 0}`);
        
        // Count claims by status using the consistent getClaimStatus logic
        const openClaimsCount = filteredClaims.filter(claim => 
          getClaimStatus(claim) === 'OPEN'
        ).length;
        
        const pendingClaimsCount = filteredClaims.filter(claim => 
          getClaimStatus(claim) === 'PENDING'
        ).length;
        
        const closedClaimsCount = filteredClaims.filter(claim => 
          getClaimStatus(claim) === 'CLOSED'
        ).length;
        
        console.log('[KPI_DATA] Claims breakdown:', {
          total: filteredClaims.length,
          open: openClaimsCount,
          pending: pendingClaimsCount,
          closed: closedClaimsCount
        });

        // Calculate claim amounts from Deductible (if available)
        const totalClaimsAmount = filteredClaims.reduce((sum, claim) => 
          sum + (Number(claim.Deductible) || 0), 0);
        
        const averageClaimAmount = filteredClaims.length > 0 
          ? totalClaimsAmount / filteredClaims.length 
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
          totalClaims: claimsCount || 0,
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
