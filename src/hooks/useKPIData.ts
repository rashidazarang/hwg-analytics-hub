
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
        // Base query filters for all queries
        const dateFilter = {
          fromDate,
          toDate,
        };
        
        // Prepare all queries first to avoid deep nesting
        let pendingContractsQuery = supabase
          .from('agreements')
          .select('count', { count: 'exact' })
          .eq('AgreementStatus', 'PENDING')
          .gte('EffectiveDate', fromDate)
          .lte('EffectiveDate', toDate);
          
        let newlyActiveContractsQuery = supabase
          .from('agreements')
          .select('count', { count: 'exact' })
          .eq('AgreementStatus', 'ACTIVE')
          .gte('EffectiveDate', fromDate)
          .lte('EffectiveDate', toDate);
          
        let cancelledContractsQuery = supabase
          .from('agreements')
          .select('count', { count: 'exact' })
          .eq('AgreementStatus', 'CANCELLED')
          .gte('StatusChangeDate', fromDate)
          .lte('StatusChangeDate', toDate);
          
        let openClaimsQuery = supabase
          .from('claims')
          .select('count', { count: 'exact' })
          .eq('ClaimStatus', 'OPEN')
          .gte('ReportedDate', fromDate)
          .lte('ReportedDate', toDate);
        
        // Apply dealer filter if provided
        if (dealerFilter) {
          pendingContractsQuery = pendingContractsQuery.eq('DealerUUID', dealerFilter);
          newlyActiveContractsQuery = newlyActiveContractsQuery.eq('DealerUUID', dealerFilter);
          cancelledContractsQuery = cancelledContractsQuery.eq('DealerUUID', dealerFilter);
          openClaimsQuery = openClaimsQuery.eq('DealerUUID', dealerFilter);
        }
        
        // Execute baseline queries for compatibility
        const totalAgreementsQuery = supabase.from('agreements').select('count', { count: 'exact' });
        const activeDealersQuery = supabase.from('dealers').select('count', { count: 'exact' }).eq('IsActive', true);
        const totalDealersQuery = supabase.from('dealers').select('count', { count: 'exact' });
        
        // Execute all queries in parallel, but handle them individually to avoid type recursion
        const pendingContractsResult = await pendingContractsQuery;
        const newlyActiveContractsResult = await newlyActiveContractsQuery;
        const cancelledContractsResult = await cancelledContractsQuery;
        const openClaimsResult = await openClaimsQuery;
        const totalAgreementsResult = await totalAgreementsQuery;
        const activeDealersResult = await activeDealersQuery;
        const totalDealersResult = await totalDealersQuery;
        
        // For claim amounts, make a separate query since we need the data, not just a count
        const claimsDataResult = await supabase.from('claims').select('Deductible');
        
        // Extract counts and handle errors
        const pendingContracts = pendingContractsResult.count || 0;
        const newlyActiveContracts = newlyActiveContractsResult.count || 0;
        const cancelledContracts = cancelledContractsResult.count || 0;
        const openClaims = openClaimsResult.count || 0;
        const totalAgreements = totalAgreementsResult.count || 0;
        const activeDealers = activeDealersResult.count || 0;
        const totalDealers = totalDealersResult.count || 0;
        
        // Calculate claim amounts (using Deductible as a fallback for ClaimAmount)
        const claimsData = claimsDataResult.data || [];
        const totalClaimsAmount = claimsData.reduce((sum, claim) => 
          sum + (claim.Deductible || 0), 0);
        const averageClaimAmount = claimsData.length > 0 
          ? totalClaimsAmount / claimsData.length 
          : 0;
        
        // Return complete KPI data
        return {
          // New KPIs
          pendingContracts,
          newlyActiveContracts,
          cancelledContracts,
          openClaims,
          // Maintain backward compatibility
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
        // Return fallback data
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
