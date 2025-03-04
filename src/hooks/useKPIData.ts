
import { useQuery } from '@tanstack/react-query';
import { DateRange } from '@/lib/dateUtils';
import { supabase } from '@/integrations/supabase/client';
import { KPIData } from '@/lib/types';

interface UseKPIDataProps {
  dateRange: DateRange;
  dealerFilter: string;
}

export function useKPIData({ dateRange, dealerFilter }: UseKPIDataProps) {
  return useQuery({
    queryKey: ['kpis', dateRange, dealerFilter],
    queryFn: async (): Promise<KPIData> => {
      const fromDate = dateRange.from?.toISOString() || "2020-01-01T00:00:00.000Z";
      const toDate = dateRange.to?.toISOString() || new Date().toISOString();
      
      try {
        // Prepare base query options
        const baseQueryOpts = {
          count: 'exact',
          head: true
        } as const;

        // Execute all queries in parallel with proper type handling
        const [
          pendingContractsResult,
          newlyActiveContractsResult,
          cancelledContractsResult,
          openClaimsResult,
          totalAgreementsResult,
          activeDealersResult,
          totalDealersResult,
          claimsDataResult
        ] = await Promise.all([
          supabase
            .from('agreements')
            .select('*', baseQueryOpts)
            .eq('AgreementStatus', 'PENDING')
            .gte('EffectiveDate', fromDate)
            .lte('EffectiveDate', toDate)
            .eq(dealerFilter ? 'DealerUUID' : 'IsActive', dealerFilter || true),

          supabase
            .from('agreements')
            .select('*', baseQueryOpts)
            .eq('AgreementStatus', 'ACTIVE')
            .gte('EffectiveDate', fromDate)
            .lte('EffectiveDate', toDate)
            .eq(dealerFilter ? 'DealerUUID' : 'IsActive', dealerFilter || true),

          supabase
            .from('agreements')
            .select('*', baseQueryOpts)
            .eq('AgreementStatus', 'CANCELLED')
            .gte('StatusChangeDate', fromDate)
            .lte('StatusChangeDate', toDate)
            .eq(dealerFilter ? 'DealerUUID' : 'IsActive', dealerFilter || true),

          supabase
            .from('claims')
            .select('*', baseQueryOpts)
            .eq('ClaimStatus', 'OPEN')
            .gte('ReportedDate', fromDate)
            .lte('ReportedDate', toDate)
            .eq(dealerFilter ? 'DealerUUID' : 'IsActive', dealerFilter || true),

          supabase.from('agreements').select('*', baseQueryOpts),
          supabase.from('dealers').select('*', baseQueryOpts).eq('IsActive', true),
          supabase.from('dealers').select('*', baseQueryOpts),
          supabase.from('claims').select('Deductible')
        ]);

        // Extract counts and handle errors
        const pendingContracts = pendingContractsResult.count || 0;
        const newlyActiveContracts = newlyActiveContractsResult.count || 0;
        const cancelledContracts = cancelledContractsResult.count || 0;
        const openClaims = openClaimsResult.count || 0;
        const totalAgreements = totalAgreementsResult.count || 0;
        const activeDealers = activeDealersResult.count || 0;
        const totalDealers = totalDealersResult.count || 0;
        
        // Calculate claim amounts from Deductible
        const claimsData = claimsDataResult.data || [];
        const totalClaimsAmount = claimsData.reduce((sum, claim) => 
          sum + (claim.Deductible || 0), 0);
        const averageClaimAmount = claimsData.length > 0 
          ? totalClaimsAmount / claimsData.length 
          : 0;

        return {
          pendingContracts,
          newlyActiveContracts,
          cancelledContracts,
          openClaims,
          activeAgreements: newlyActiveContracts,
          totalAgreements,
          totalClaims: openClaims,
          activeDealers,
          totalDealers,
          averageClaimAmount,
          totalClaimsAmount,
        };
      } catch (error) {
        console.error("Error fetching KPI data:", error);
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
