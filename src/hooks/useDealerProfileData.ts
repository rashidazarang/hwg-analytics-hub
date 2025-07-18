import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { executeWithCSTTimezone } from '@/integrations/supabase/timezone-utils';
import { DateRange } from '@/lib/dateUtils';
import { getFormattedDateRange } from './leaderboard/dateRangeUtils';
import { formatDealerUUID } from '@/utils/uuidUtils';
import { PostgrestError } from '@supabase/supabase-js';
import { CST_TIMEZONE } from '@/lib/constants';

// Define a type for the Supabase RPC response
type SupabaseRpcResponse<T = any> = {
  data: T;
  error: PostgrestError | null;
};

// Types for the dealer profile data
export interface DealerProfileData {
  dealer: {
    dealer_uuid: string;
    dealer_name: string;
    total_contracts: number;
    active_contracts: number;
    pending_contracts: number;
    cancelled_contracts: number;
    total_revenue: number;
    expected_revenue: number;
    funded_revenue: number;
    cancellation_rate: number;
  };
  agreementDistribution: Array<{
    status: string;
    count: number;
    revenue: number;
  }>;
  claimsDistribution: Array<{
    status: string;
    count: number;
    total_cost: number;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    contracts: number;
  }>;
}

/**
 * Hook to fetch dealer profile data with performance metrics and distribution data
 */
export function useDealerProfileData(dealerUuid: string, dateRange: DateRange) {
  // Format the dealer UUID properly for consistent querying
  const formattedDealerUuid = formatDealerUUID(dealerUuid);
  
  // Create a stable query key for React Query
  const dealerProfileQueryKey = ['dealerProfile', dealerUuid, dateRange.from, dateRange.to];
  
  return useQuery<DealerProfileData, Error>({
    queryKey: dealerProfileQueryKey,
    queryFn: async (): Promise<DealerProfileData> => {
      try {
        // Format date range with proper time boundaries in CST
        const { startDate, endDate } = getFormattedDateRange(dateRange);
        
        console.log('[DEALER_PROFILE] Fetching dealer profile data:', {
          dealerUuid: formattedDealerUuid,
          dateRange: { startDate, endDate }
        });

        // Use the dealer profile RPC function
        const { data, error } = await executeWithCSTTimezone<SupabaseRpcResponse>(
          supabase,
          async (client) => {
            const result = await client.rpc('get_dealer_profile', {
              dealer_uuid: formattedDealerUuid,
              start_date: startDate.toISOString().split('T')[0],
              end_date: endDate.toISOString().split('T')[0]
            });
            return result;
          }
        );

        if (error) {
          console.error('[DEALER_PROFILE] Error fetching dealer profile:', error);
          throw new Error(`Failed to fetch dealer profile: ${error.message}`);
        }

        if (!data) {
          throw new Error('No dealer profile data returned');
        }

        console.log('[DEALER_PROFILE] Successfully fetched dealer profile data');
        return data;

      } catch (error) {
        console.error('[DEALER_PROFILE] Exception in dealer profile fetch:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * Hook to fetch agreements for a specific dealer
 */
export function useDealerAgreements(dealerUuid: string, dateRange: DateRange) {
  // Format the dealer UUID properly
  const formattedDealerUuid = formatDealerUUID(dealerUuid);
  
  // Create a stable query key for React Query
  const agreementsQueryKey = ['dealerAgreements', dealerUuid, dateRange.from, dateRange.to];
  
  return useQuery({
    queryKey: agreementsQueryKey, 
    queryFn: async () => {
      try {
        // Format date range with proper time boundaries in CST
        const { startDate, endDate } = getFormattedDateRange(dateRange);
        
        console.log('[DEALER_AGREEMENTS] Fetching dealer agreements:', { 
          dealerUuid: formattedDealerUuid,
          dateRange: { startDate, endDate }
        });
        
        // Directly query the agreements table for this dealer
        const { data, error } = await executeWithCSTTimezone<SupabaseRpcResponse<any[]>>(
          supabase,
          async (client) => {
            const result = await client
              .from('agreements')
              .select('*')
              .eq('DealerUUID', formattedDealerUuid)
              .gte('EffectiveDate', startDate.toISOString())
              .lte('EffectiveDate', endDate.toISOString())
              .order('EffectiveDate', { ascending: false })
              .limit(50);
            return result;
          }
        );
        
        if (error) {
          console.error('[DEALER_AGREEMENTS] Error fetching agreements:', error);
          throw new Error(`Failed to fetch dealer agreements: ${error.message}`);
        }
        
        return data || [];
        
      } catch (error) {
        console.error('[DEALER_AGREEMENTS] Exception in dealer agreements fetch:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * Hook to fetch claims for a specific dealer
 */
export function useDealerClaims(dealerUuid: string, dateRange: DateRange) {
  // Format the dealer UUID properly
  const formattedDealerUuid = formatDealerUUID(dealerUuid);
  
  // Create a stable query key for React Query
  const claimsQueryKey = ['dealerClaims', dealerUuid, dateRange.from, dateRange.to];
  
  return useQuery({
    queryKey: claimsQueryKey,
    queryFn: async () => {
      try {
        // Format date range with proper time boundaries in CST
        const { startDate, endDate } = getFormattedDateRange(dateRange);
        
        console.log('[DEALER_CLAIMS] Fetching dealer claims:', { 
          dealerUuid: formattedDealerUuid,
          dateRange: { startDate, endDate }
        });
        
        // Use the claims filter RPC function
        const { data, error } = await executeWithCSTTimezone<SupabaseRpcResponse>(
          supabase,
          async (client) => {
            const result = await client.rpc('get_claims_by_filter_type', {
              dealer_uuid: formattedDealerUuid,
              end_date: endDate.toISOString().split('T')[0],
              filter_type: 'dealer',
              page_number: 1,
              page_size: 50,
              start_date: startDate.toISOString().split('T')[0]
            });
            return result;
          }
        );
        
        if (error) {
          console.error('[DEALER_CLAIMS] Error fetching claims:', error);
          throw new Error(`Failed to fetch dealer claims: ${error.message}`);
        }
        
        return data || [];
        
      } catch (error) {
        console.error('[DEALER_CLAIMS] Exception in dealer claims fetch:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });
}