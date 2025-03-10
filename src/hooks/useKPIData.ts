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

        // Try to use RPC for accurate counts
        let pendingContractsCount = 0;
        let activeContractsCount = 0;
        let cancelledContractsCount = 0;
        let totalContractsCount = 0;
        let statusDistribution: Record<string, number> = {};

        try {
          // Try the RPC call with the correct parameters
          // The master-document suggests count_agreements_by_status can take dealer_uuid,
          // but TypeScript is complaining, so let's use type assertion
          const { data: countsByStatus, error: countError } = await supabase.rpc(
            'count_agreements_by_status',
            {
              from_date: fromDate,
              to_date: toDate,
              ...(dealerFilter ? { dealer_uuid: dealerFilter } : {})
            } as any // Type assertion to avoid TypeScript error
          );
          
          if (!countError && countsByStatus) {
            console.log('[KPI_DATA] Status distribution from RPC:', countsByStatus);
            
            // Process each status individually - no normalization
            countsByStatus.forEach((item: {status: string, count: number}) => {
              const status = (item.status || '').toUpperCase();
              statusDistribution[status] = item.count;
              totalContractsCount += item.count;
              
              // Only add to the main counts for statuses the UI expects
              if (status === 'PENDING') {
                pendingContractsCount += item.count;
              } else if (status === 'ACTIVE') {
                activeContractsCount += item.count;
              } else if (status === 'CANCELLED') {
                cancelledContractsCount += item.count;
              }
            });
          } else {
            throw new Error('RPC call failed or returned no data');
          }
        } catch (rpcError) {
          console.error('[KPI_DATA] Error using RPC:', rpcError);
          console.log('[KPI_DATA] Falling back to direct queries');
          
          // Run these queries in parallel for better performance
          const [
            pendingContractsResult,
            activeContractsResult,
            cancelledContractsResult,
            totalContractsResult
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
              .eq(dealerFilter ? 'DealerUUID' : 'IsActive', dealerFilter || true),
            
            // Total agreements count
            supabase
              .from('agreements')
              .select('*', { count: 'exact', head: true })
              .gte('EffectiveDate', fromDate)
              .lte('EffectiveDate', toDate)
              .eq(dealerFilter ? 'DealerUUID' : 'IsActive', dealerFilter || true)
          ]);
          
          pendingContractsCount = pendingContractsResult.count || 0;
          activeContractsCount = activeContractsResult.count || 0;
          cancelledContractsCount = cancelledContractsResult.count || 0;
          totalContractsCount = totalContractsResult.count || 0;
          
          // Add to status distribution for consistency
          statusDistribution = {
            'PENDING': pendingContractsCount,
            'ACTIVE': activeContractsCount,
            'CANCELLED': cancelledContractsCount
          };
        }
        
        console.log('[KPI_DATA] Contract counts:', {
          total: totalContractsCount,
          pending: pendingContractsCount,
          active: activeContractsCount,
          cancelled: cancelledContractsCount,
          statusDistribution
        });

        // Use the shared claims data fetching function for consistent filtering
        const claimsResult = await fetchClaimsData({
          dateRange,
          dealerFilter,
          includeCount: true,
        });
        
        console.log('[KPI_DATA] Claims total count:', claimsResult.count);
        console.log('[KPI_DATA] Claims fetched count:', claimsResult.data.length);
        console.log('[KPI_DATA] Claims breakdown:', claimsResult.statusBreakdown);

        // Log detailed info about claims data for debugging
        console.log('[KPI_DATA] Claims data:', {
          totalCount: claimsResult.count,
          fetchedCount: claimsResult.data.length,
          statusBreakdown: claimsResult.statusBreakdown,
          sample: claimsResult.data.length > 0 ? {
            first: claimsResult.data[0],
            hasStatus: claimsResult.data[0].hasOwnProperty('status'),
            keys: Object.keys(claimsResult.data[0])
          } : 'No claims data'
        });
        
        // Ensure we have valid status breakdown values
        const validatedStatusBreakdown = {
          OPEN: claimsResult.statusBreakdown.OPEN || 0,
          PENDING: claimsResult.statusBreakdown.PENDING || 0,
          CLOSED: claimsResult.statusBreakdown.CLOSED || 0
        };

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
          openClaims: validatedStatusBreakdown.OPEN,
          activeAgreements: activeContractsCount,
          totalAgreements: totalContractsCount,
          totalClaims: claimsResult.count || claimsResult.data.length || 0,
          activeDealers: (await supabase.from('dealers').select('*', { count: 'exact' })).count || 0,
          totalDealers: (await supabase.from('dealers').select('*', { count: 'exact' })).count || 0,
          averageClaimAmount,
          totalClaimsAmount,
          statusBreakdown: validatedStatusBreakdown,
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