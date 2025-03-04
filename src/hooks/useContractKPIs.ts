
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';

interface ContractKPIs {
  pendingContracts: number;
  newlyActiveContracts: number;
  cancelledContracts: number;
  openClaimsCount: number;
}

export function useContractKPIs(dateRange: DateRange) {
  return useQuery({
    queryKey: ['contract-kpis', dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async (): Promise<ContractKPIs> => {
      console.log('🔄 Fetching contract KPIs...');
      
      // Parse date range
      const fromDate = dateRange.from?.toISOString() || new Date(2020, 0, 1).toISOString();
      const toDate = dateRange.to?.toISOString() || new Date().toISOString();
      
      try {
        // 1. Pending Contracts
        const { count: pendingContracts, error: pendingError } = await supabase
          .from('agreements')
          .select('*', { count: 'exact', head: true })
          .eq('AgreementStatus', 'PENDING')
          .gte('EffectiveDate', fromDate)
          .lte('EffectiveDate', toDate);
          
        if (pendingError) {
          console.error('Error fetching pending contracts:', pendingError);
          throw pendingError;
        }

        // 2. Newly Active Contracts
        const { count: newlyActiveContracts, error: activeError } = await supabase
          .from('agreements')
          .select('*', { count: 'exact', head: true })
          .eq('AgreementStatus', 'ACTIVE')
          .gte('EffectiveDate', fromDate)
          .lte('EffectiveDate', toDate);
          
        if (activeError) {
          console.error('Error fetching newly active contracts:', activeError);
          throw activeError;
        }

        // 3. Cancelled Contracts
        const { count: cancelledContracts, error: cancelledError } = await supabase
          .from('agreements')
          .select('*', { count: 'exact', head: true })
          .eq('AgreementStatus', 'CANCELLED')
          .gte('StatusChangeDate', fromDate)
          .lte('StatusChangeDate', toDate);
          
        if (cancelledError) {
          console.error('Error fetching cancelled contracts:', cancelledError);
          throw cancelledError;
        }

        // 4. Open Claims
        const { count: openClaimsCount, error: claimsError } = await supabase
          .from('claims')
          .select('*', { count: 'exact', head: true })
          .eq('ClaimStatus', 'OPEN')
          .gte('ReportedDate', fromDate)
          .lte('ReportedDate', toDate);
          
        if (claimsError) {
          console.error('Error fetching open claims:', claimsError);
          throw claimsError;
        }

        // Log results for debugging
        console.log('📊 Contract KPIs:', {
          pendingContracts: pendingContracts || 0,
          newlyActiveContracts: newlyActiveContracts || 0,
          cancelledContracts: cancelledContracts || 0,
          openClaimsCount: openClaimsCount || 0
        });

        return {
          pendingContracts: pendingContracts || 0,
          newlyActiveContracts: newlyActiveContracts || 0,
          cancelledContracts: cancelledContracts || 0,
          openClaimsCount: openClaimsCount || 0
        };
      } catch (error) {
        console.error('Failed to fetch KPI data:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false
  });
}
