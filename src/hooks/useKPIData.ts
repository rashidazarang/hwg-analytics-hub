
import { useQuery } from '@tanstack/react-query';
import { DateRange } from '@/lib/dateUtils';
import { supabase } from '@/integrations/supabase/client';
import { KPIData } from '@/lib/types';

interface UseKPIDataProps {
  dateRange: DateRange;
  dealerFilter: string;
}

// Helper function to execute a count query with proper error handling
async function executeCountQuery(query: any) {
  try {
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  } catch (err) {
    console.error("Error executing count query:", err);
    return 0;
  }
}

export function useKPIData({ dateRange, dealerFilter }: UseKPIDataProps) {
  return useQuery({
    queryKey: ['kpis', dateRange, dealerFilter],
    queryFn: async (): Promise<KPIData> => {
      const fromDate = dateRange.from?.toISOString() || "2020-01-01T00:00:00.000Z";
      const toDate = dateRange.to?.toISOString() || new Date().toISOString();
      
      try {
        // Run these queries in parallel for better performance
        const [
          pendingContractsCount,
          newlyActiveContractsCount,
          cancelledContractsCount,
          openClaimsCount,
          totalAgreementsCount,
          activeDealersCount,
          totalDealersCount,
          claimsData
        ] = await Promise.all([
          // Pending contracts
          executeCountQuery(
            supabase
              .from('agreements')
              .select('*', { count: 'exact', head: true })
              .eq('AgreementStatus', 'PENDING')
              .gte('EffectiveDate', fromDate)
              .lte('EffectiveDate', toDate)
              .eq(dealerFilter ? 'DealerUUID' : 'IsActive', dealerFilter || true)
          ),
          
          // Newly active contracts
          executeCountQuery(
            supabase
              .from('agreements')
              .select('*', { count: 'exact', head: true })
              .eq('AgreementStatus', 'ACTIVE')
              .gte('EffectiveDate', fromDate)
              .lte('EffectiveDate', toDate)
              .eq(dealerFilter ? 'DealerUUID' : 'IsActive', dealerFilter || true)
          ),
          
          // Cancelled contracts
          executeCountQuery(
            supabase
              .from('agreements')
              .select('*', { count: 'exact', head: true })
              .eq('AgreementStatus', 'CANCELLED')
              .gte('StatusChangeDate', fromDate)
              .lte('StatusChangeDate', toDate)
              .eq(dealerFilter ? 'DealerUUID' : 'IsActive', dealerFilter || true)
          ),
          
          // Open claims - using ReportedDate and not Closed
          executeCountQuery(
            supabase
              .from('claims')
              .select('*', { count: 'exact', head: true })
              .is('Closed', null)
              .gte('ReportedDate', fromDate)
              .lte('ReportedDate', toDate)
          ),
          
          // Total agreements
          executeCountQuery(
            supabase
              .from('agreements')
              .select('*', { count: 'exact', head: true })
          ),
          
          // Active dealers
          executeCountQuery(
            supabase
              .from('dealers')
              .select('*', { count: 'exact', head: true })
          ),
          
          // Total dealers
          executeCountQuery(
            supabase
              .from('dealers')
              .select('*', { count: 'exact', head: true })
          ),
          
          // Claims data - separate query to get actual data
          supabase
            .from('claims')
            .select('Deductible')
            .then(result => result.data || [])
        ]);
        
        // Calculate claim amounts from Deductible
        const totalClaimsAmount = claimsData.reduce((sum, claim) => 
          sum + (claim.Deductible || 0), 0);
        const averageClaimAmount = claimsData.length > 0 
          ? totalClaimsAmount / claimsData.length 
          : 0;

        return {
          pendingContracts: pendingContractsCount,
          newlyActiveContracts: newlyActiveContractsCount,
          cancelledContracts: cancelledContractsCount,
          openClaims: openClaimsCount,
          activeAgreements: newlyActiveContractsCount,
          totalAgreements: totalAgreementsCount,
          totalClaims: openClaimsCount,
          activeDealers: activeDealersCount,
          totalDealers: totalDealersCount,
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
