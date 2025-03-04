
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { KPIData } from '@/lib/types';

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
        // Run these queries in parallel for better performance
        const [
          pendingContractsCount,
          newlyActiveContractsCount,
          cancelledContractsCount,
          openClaimsQuery
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

          // Updated open claims query with proper dealer filtering
          supabase
            .from('claims')
            .select(`
              id,
              Closed,
              Correction,
              agreements:AgreementID(
                DealerUUID
              )
            `, { count: 'exact' })
            .is('Closed', null)
            .not('Correction', 'ilike', '%denied%')
            .not('Correction', 'ilike', '%not covered%')
            .not('Correction', 'ilike', '%rejected%')
            .gte('ReportedDate', dateRange.from.toISOString())
            .lte('ReportedDate', dateRange.to.toISOString())
        ]);

        // Additional filtering for claims by dealer if needed
        let openClaimsCount = openClaimsQuery.count || 0;
        
        // If dealer filter is active, filter the open claims client-side
        if (dealerFilter && openClaimsQuery.data) {
          const filteredClaims = openClaimsQuery.data.filter(
            claim => claim.agreements?.DealerUUID === dealerFilter
          );
          openClaimsCount = filteredClaims.length;
        }

        console.log('[KPI_DATA] Open claims query result:', {
          count: openClaimsCount,
          dealerFilter,
          error: openClaimsQuery.error
        });

        // Claims data - separate query to get actual data
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
