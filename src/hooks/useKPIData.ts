
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { KPIData } from '@/lib/types';
import { fetchClaimsData } from './useSharedClaimsData';

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

        // Use the shared claims data fetching function for consistent filtering
        // Get ALL claims without pagination limitation
        const claimsResult = await fetchClaimsData({
          dateRange,
          dealerFilter,
          includeCount: true
        });
        
        console.log('[KPI_DATA] Claims total count:', claimsResult.count);
        console.log('[KPI_DATA] Claims fetched count:', claimsResult.data.length);
        console.log('[KPI_DATA] Claims breakdown:', claimsResult.statusBreakdown);
        
        // Get total agreements count for this date range
        const { count: totalAgreementsCount } = await supabase
          .from('agreements')
          .select('*', { count: 'exact', head: true })
          .gte('EffectiveDate', fromDate)
          .lte('EffectiveDate', toDate)
          .eq(dealerFilter ? 'DealerUUID' : 'IsActive', dealerFilter || true);

        // Calculate claim amounts from Deductible (if available)
        const totalClaimsAmount = claimsResult.data.reduce((sum, claim) => 
          sum + (Number(claim.Deductible) || 0), 0);
        
        const averageClaimAmount = claimsResult.data.length > 0 
          ? totalClaimsAmount / claimsResult.data.length 
          : 0;

        return {
          pendingContracts: pendingContractsCount,
          newlyActiveContracts: activeContractsCount,
          cancelledContracts: cancelledContractsCount,
          openClaims: claimsResult.statusBreakdown.OPEN,
          activeAgreements: activeContractsCount,
          totalAgreements: totalAgreementsCount || 0,
          totalClaims: claimsResult.count || 0,
          activeDealers: (await supabase.from('dealers').select('*', { count: 'exact' })).count || 0,
          totalDealers: (await supabase.from('dealers').select('*', { count: 'exact' })).count || 0,
          averageClaimAmount,
          totalClaimsAmount,
          statusBreakdown: claimsResult.statusBreakdown,
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
          statusBreakdown: { OPEN: 0, PENDING: 0, CLOSED: 0 },
        };
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
