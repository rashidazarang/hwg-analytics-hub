
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
        // Fetch pending contracts
        const pendingContractsResult = await supabase
          .from('agreements')
          .select('*', { count: 'exact', head: true })
          .eq('AgreementStatus', 'PENDING')
          .gte('EffectiveDate', fromDate)
          .lte('EffectiveDate', toDate)
          .eq(dealerFilter ? 'DealerUUID' : 'IsActive', dealerFilter || true);

        // Fetch newly active contracts
        const newlyActiveContractsResult = await supabase
          .from('agreements')
          .select('*', { count: 'exact', head: true })
          .eq('AgreementStatus', 'ACTIVE')
          .gte('EffectiveDate', fromDate)
          .lte('EffectiveDate', toDate)
          .eq(dealerFilter ? 'DealerUUID' : 'IsActive', dealerFilter || true);

        // Fetch cancelled contracts
        const cancelledContractsResult = await supabase
          .from('agreements')
          .select('*', { count: 'exact', head: true })
          .eq('AgreementStatus', 'CANCELLED')
          .gte('StatusChangeDate', fromDate)
          .lte('StatusChangeDate', toDate)
          .eq(dealerFilter ? 'DealerUUID' : 'IsActive', dealerFilter || true);

        // Fetch open claims
        const openClaimsResult = await supabase
          .from('claims')
          .select('*', { count: 'exact', head: true })
          .eq('ClaimStatus', 'OPEN')
          .gte('ReportedDate', fromDate)
          .lte('ReportedDate', toDate)
          .eq(dealerFilter ? 'DealerUUID' : 'IsActive', dealerFilter || true);

        // Fetch total agreements
        const totalAgreementsResult = await supabase
          .from('agreements')
          .select('*', { count: 'exact', head: true });

        // Fetch active dealers
        const activeDealersResult = await supabase
          .from('dealers')
          .select('*', { count: 'exact', head: true })
          .eq('IsActive', true);

        // Fetch total dealers
        const totalDealersResult = await supabase
          .from('dealers')
          .select('*', { count: 'exact', head: true });

        // Fetch claims data
        const claimsDataResult = await supabase
          .from('claims')
          .select('Deductible');

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
