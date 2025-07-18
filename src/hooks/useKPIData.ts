import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { KPIData } from '@/lib/types';

interface UseKPIDataProps {
  dateRange: DateRange;
  dealerFilter?: string;
}

export function useKPIData({ dateRange, dealerFilter }: UseKPIDataProps) {
  return useQuery({
    queryKey: ['kpis', dateRange.from, dateRange.to, dealerFilter],
    queryFn: async (): Promise<KPIData> => {
      console.log('[KPI_DATA] Fetching KPIs from Supabase with date range:', {
        from: dateRange.from,
        to: dateRange.to,
        dealerFilter
      });

      // Build queries for agreements and claims with date filtering
      let agreementsQuery = supabase
        .from('agreements')
        .select('*')
        .gte('EffectiveDate', dateRange.from.toISOString())
        .lte('EffectiveDate', dateRange.to.toISOString());

      let claimsQuery = supabase
        .from('claims')
        .select('*')
        .gte('ReportedDate', dateRange.from.toISOString())
        .lte('ReportedDate', dateRange.to.toISOString());

      // Add dealer filter if specified
      if (dealerFilter) {
        agreementsQuery = agreementsQuery.eq('DealerUUID', dealerFilter);
        claimsQuery = claimsQuery.eq('DealerUUID', dealerFilter);
      }

      // Execute queries in parallel
      const [agreementsResult, claimsResult, dealersResult] = await Promise.all([
        agreementsQuery,
        claimsQuery,
        supabase.from('dealers').select('*')
      ]);

      if (agreementsResult.error) {
        console.error('[KPI_DATA] Error fetching agreements:', agreementsResult.error);
        throw agreementsResult.error;
      }

      if (claimsResult.error) {
        console.error('[KPI_DATA] Error fetching claims:', claimsResult.error);
        throw claimsResult.error;
      }

      if (dealersResult.error) {
        console.error('[KPI_DATA] Error fetching dealers:', dealersResult.error);
        throw dealersResult.error;
      }

      const agreements = agreementsResult.data || [];
      const claims = claimsResult.data || [];
      const dealers = dealersResult.data || [];

      // Calculate KPIs from real data
      const totalAgreements = agreements.length;
      const activeAgreements = agreements.filter(a => a.AgreementStatus === 'ACTIVE').length;
      const pendingAgreements = agreements.filter(a => a.AgreementStatus === 'PENDING').length;
      const cancelledAgreements = agreements.filter(a => a.AgreementStatus === 'CANCELLED').length;

      const totalClaims = claims.length;
      const openClaims = claims.filter(c => !c.Closed && c.ReportedDate).length;
      const pendingClaims = claims.filter(c => !c.ReportedDate && !c.Closed).length;
      const closedClaims = claims.filter(c => c.Closed).length;

      const totalDealers = dealers.length;
      const activeDealers = [...new Set(agreements.map(a => a.DealerUUID))].length;

      // Calculate financial metrics
      const totalClaimsAmount = claims.reduce((sum, claim) => {
        const amount = claim.TotalPaid || claim.ClaimAmount || 0;
        return sum + (typeof amount === 'number' ? amount : 0);
      }, 0);

      const averageClaimAmount = totalClaims > 0 ? totalClaimsAmount / totalClaims : 0;
      const newlyActiveAgreements = agreements.filter(a => {
        if (!a.StatusChangeDate) return false;
        const statusChangeDate = new Date(a.StatusChangeDate);
        return statusChangeDate >= dateRange.from && statusChangeDate <= dateRange.to && a.AgreementStatus === 'ACTIVE';
      }).length;

      console.log('[KPI_DATA] Calculated KPIs:', {
        totalAgreements,
        activeAgreements,
        totalClaims,
        openClaims,
        activeDealers,
        totalDealers
      });

      return {
        activeAgreements,
        totalAgreements,
        openClaims,
        totalClaims,
        activeDealers,
        totalDealers,
        averageClaimAmount,
        totalClaimsAmount,
        pendingContracts: pendingAgreements,
        newlyActiveContracts: newlyActiveAgreements,
        cancelledContracts: cancelledAgreements,
        statusBreakdown: {
          OPEN: openClaims,
          PENDING: pendingClaims,
          CLOSED: closedClaims
        }
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });
}