
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange, setCSTHours } from '@/lib/dateUtils';
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
        // Get date range for filtering with CST timezone
        const startDate = setCSTHours(new Date(dateRange.from), 0, 0, 0, 0);
        const endDate = setCSTHours(new Date(dateRange.to), 23, 59, 59, 999);
        
        const fromDate = startDate.toISOString();
        const toDate = endDate.toISOString();

        // Get all agreements in the date range and count by status
        const allContractsResult = await supabase
          .from('agreements')
          .select('AgreementStatus')
          .gte('EffectiveDate', fromDate)
          .lte('EffectiveDate', toDate)
          .eq(dealerFilter ? 'DealerUUID' : 'IsActive', dealerFilter || true);
        
        if (allContractsResult.error) {
          console.error('[KPI_DATA] Error fetching all contracts:', allContractsResult.error);
          throw allContractsResult.error;
        }
        
        // Initialize counters
        let pendingContractsCount = 0;
        let activeContractsCount = 0;
        let cancelledContractsCount = 0;
        
        // Count by status
        allContractsResult.data.forEach(agreement => {
          const status = (agreement.AgreementStatus || '').toUpperCase();
          
          if (status === 'PENDING') {
            pendingContractsCount++;
          } else if (status === 'ACTIVE' || status === 'CLAIMABLE') {
            activeContractsCount++;
          } else if (status === 'CANCELLED' || status === 'VOID') {
            cancelledContractsCount++;
          } else {
            // For any other status, count as active by default
            console.log(`[KPI_DATA] Unhandled agreement status: ${status} - counting as ACTIVE`);
            activeContractsCount++;
          }
        });

        // Counts have already been calculated above from allContractsResult

        // Log status distribution for debugging
        const statusCounts: Record<string, number> = {};
        allContractsResult.data.forEach(agreement => {
          const status = (agreement.AgreementStatus || '').toUpperCase();
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        
        console.log('[KPI_DATA] Status distribution in raw data:', statusCounts);
        console.log('[KPI_DATA] Normalized contract counts:', {
          pending: pendingContractsCount,
          active: activeContractsCount,
          cancelled: cancelledContractsCount,
          total: pendingContractsCount + activeContractsCount + cancelledContractsCount
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
        
        // Calculate total agreements count from our already fetched data
        const totalAgreementsCount = pendingContractsCount + activeContractsCount + cancelledContractsCount;

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
