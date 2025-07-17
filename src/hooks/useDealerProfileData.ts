import { useQuery } from '@tanstack/react-query';
import { supabase, shouldUseMockData } from '@/integrations/supabase/client';
import MockDataService from '@/lib/mockDataService';
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

/**
 * Hook to fetch comprehensive dealer profile data
 * Including basic info, metrics, and distribution data
 */
export interface DealerProfile {
  // Basic dealer info
  dealer_uuid: string;
  dealer_name: string;
  dealer_address: string | null;
  dealer_city: string | null;
  dealer_region: string | null;
  dealer_country: string | null;
  dealer_postal_code: string | null;
  dealer_contact: string | null;
  dealer_phone: string | null;
  dealer_email: string | null;
  
  // Performance metrics
  total_contracts: number;
  active_contracts: number;
  pending_contracts: number;
  cancelled_contracts: number;
  expired_contracts: number;
  
  // Revenue metrics
  total_revenue: number;
  expected_revenue: number;
  funded_revenue: number;
  
  // Claims metrics
  total_claims: number;
  open_claims: number;
  closed_claims: number;
  claims_per_contract: number;
  avg_claim_resolution_days: number;
}

/**
 * Interface for agreement status distribution data
 */
export interface AgreementDistribution {
  status: string;
  count: number;
  percentage: number;
}

/**
 * Interface for claims status distribution data
 */
export interface ClaimsDistribution {
  status: string;
  count: number;
  percentage: number;
}

/**
 * Interface for monthly revenue data
 */
export interface MonthlyRevenue {
  month: string;
  total_revenue: number;
  funded_revenue: number;
  expected_revenue: number;
}

/**
 * Interface for the complete dealer profile data
 */
export interface DealerProfileData {
  profile: DealerProfile;
  agreementDistribution: AgreementDistribution[];
  claimsDistribution: ClaimsDistribution[];
  monthlyRevenue: MonthlyRevenue[];
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
        // Use mock data in development mode
        if (shouldUseMockData()) {
          console.log('[DEALER_PROFILE] 🔧 Using mock data in development mode');
          return MockDataService.getDealerProfile(dealerUuid);
        }

        // Format date range with proper time boundaries in CST
        const { startDate, endDate } = getFormattedDateRange(dateRange);
        
        console.log('[DEALER_PROFILE] Fetching dealer profile data:', {
          dealerUuid: formattedDealerUuid,
          dateRange: { startDate, endDate }
        });

        // Fetch all the data from Supabase functions in parallel
        const [
          profileResponse,
          agreementDistributionResponse,
          claimsDistributionResponse,
          monthlyRevenueResponse
        ] = await Promise.all([
          // Fetch basic dealer profile with performance metrics
          executeWithCSTTimezone<SupabaseRpcResponse>(
            supabase,
            async (client) => {
              // Call get_dealer_profile directly from the database
              const result = await client.rpc('get_dealer_profile', {
                dealer_id: dealerUuid,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString()
              });
              return result;
            }
          ),

          // Fetch agreement distribution by status
          executeWithCSTTimezone<SupabaseRpcResponse>(
            supabase,
            async (client) => {
              const result = await client.rpc('get_dealer_agreement_distribution', {
                dealer_id: dealerUuid,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString()
              });
              return result;
            }
          ),

          // Fetch claims distribution by status
          executeWithCSTTimezone<SupabaseRpcResponse>(
            supabase,
            async (client) => {
              const result = await client.rpc('get_dealer_claims_distribution', {
                dealer_id: dealerUuid,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString()
              });
              return result;
            }
          ),

          // Fetch monthly revenue trends
          executeWithCSTTimezone<SupabaseRpcResponse>(
            supabase,
            async (client) => {
              const result = await client.rpc('get_dealer_monthly_revenue', {
                dealer_id: dealerUuid,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString()
              });
              return result;
            }
          )
        ]);

        // Check for errors
        if (profileResponse.error) {
          console.error('[DEALER_PROFILE] Error fetching profile data:', profileResponse.error);
          throw new Error(`Failed to fetch dealer profile: ${profileResponse.error.message}`);
        }

        if (agreementDistributionResponse.error) {
          console.error('[DEALER_PROFILE] Error fetching agreement distribution:', agreementDistributionResponse.error);
          throw new Error(`Failed to fetch agreement distribution: ${agreementDistributionResponse.error.message}`);
        }

        if (claimsDistributionResponse.error) {
          console.error('[DEALER_PROFILE] Error fetching claims distribution:', claimsDistributionResponse.error);
          throw new Error(`Failed to fetch claims distribution: ${claimsDistributionResponse.error.message}`);
        }

        if (monthlyRevenueResponse.error) {
          console.error('[DEALER_PROFILE] Error fetching monthly revenue:', monthlyRevenueResponse.error);
          throw new Error(`Failed to fetch monthly revenue: ${monthlyRevenueResponse.error.message}`);
        }

        // Process the data
        const profileData = profileResponse.data[0] || {};
        const agreementDistribution = agreementDistributionResponse.data || [];
        const claimsDistribution = claimsDistributionResponse.data || [];
        const monthlyRevenue = monthlyRevenueResponse.data || [];

        // Construct the dealer profile without referencing cancellation_rate
        const profile: DealerProfile = {
          dealer_uuid: formattedDealerUuid,
          dealer_name: profileData.dealer_name || '',
          dealer_address: profileData.dealer_address,
          dealer_city: profileData.dealer_city,
          dealer_region: profileData.dealer_region,
          dealer_country: profileData.dealer_country,
          dealer_postal_code: profileData.dealer_postal_code,
          dealer_contact: profileData.dealer_contact,
          dealer_phone: profileData.dealer_phone,
          dealer_email: profileData.dealer_email,
          
          total_contracts: Number(profileData.total_contracts || 0),
          active_contracts: Number(profileData.active_contracts || 0),
          pending_contracts: Number(profileData.pending_contracts || 0),
          cancelled_contracts: Number(profileData.cancelled_contracts || 0),
          expired_contracts: Number(profileData.expired_contracts || 0),
          
          total_revenue: Number(profileData.total_revenue || 0),
          expected_revenue: Number(profileData.expected_revenue || 0),
          funded_revenue: Number(profileData.funded_revenue || 0),
          
          total_claims: Number(profileData.total_claims || 0),
          open_claims: Number(profileData.open_claims || 0),
          closed_claims: Number(profileData.closed_claims || 0),
          claims_per_contract: Number(profileData.claims_per_contract || 0),
          avg_claim_resolution_days: Number(profileData.avg_claim_resolution_days || 0)
        };

        return {
          profile,
          agreementDistribution,
          claimsDistribution,
          monthlyRevenue
        };
      } catch (error) {
        console.error('[DEALER_PROFILE] Error fetching dealer profile data:', error);
        
        // If there's an error, return a default empty structure
        return {
          profile: {
            dealer_uuid: formattedDealerUuid,
            dealer_name: '',
            dealer_address: null,
            dealer_city: null,
            dealer_region: null,
            dealer_country: null,
            dealer_postal_code: null,
            dealer_contact: null,
            dealer_phone: null,
            dealer_email: null,
            
            total_contracts: 0,
            active_contracts: 0,
            pending_contracts: 0,
            cancelled_contracts: 0,
            expired_contracts: 0,
            
            total_revenue: 0,
            expected_revenue: 0,
            funded_revenue: 0,
            
            total_claims: 0,
            open_claims: 0,
            closed_claims: 0,
            claims_per_contract: 0,
            avg_claim_resolution_days: 0
          },
          agreementDistribution: [],
          claimsDistribution: [],
          monthlyRevenue: []
        };
      }
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
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

        console.log(`[DEALER_AGREEMENTS] Found ${data?.length || 0} agreements for dealer`);
        return data || [];
      } catch (error) {
        console.error('[DEALER_AGREEMENTS] Error in query function:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
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
        
        // Match the parameter order exactly as suggested by the error hint
        const { data, error } = await executeWithCSTTimezone<SupabaseRpcResponse>(
          supabase,
          async (client) => {
            const result = await client.rpc('get_claims_by_filter_type', {
              dealer_uuid: formattedDealerUuid,
              end_date: endDate.toISOString().split('T')[0],
              filter_type: 'dealer', // Add missing filter_type parameter
              page_number: 1,
              page_size: 50,
              start_date: startDate.toISOString().split('T')[0]
            });
            return result;
          }
        );
        
        if (error) {
          console.error('[DEALER_CLAIMS] Error fetching claims:', error);
          
          // Attempt a fallback approach by directly querying the claims table
          console.log('[DEALER_CLAIMS] Attempting fallback query for claims...');
          
          const fallbackResult = await executeWithCSTTimezone<SupabaseRpcResponse>(
            supabase,
            async (client) => {
              // Join claims with agreements to filter by dealer
              const result = await client
                .from('claims')
                .select('*, agreements!inner(*)')
                .eq('agreements.DealerUUID', formattedDealerUuid)
                .gte('LastModified', startDate.toISOString())
                .lte('LastModified', endDate.toISOString())
                .limit(50);
              return result;
            }
          );
          
          if (fallbackResult.error) {
            console.error('[DEALER_CLAIMS] Fallback query also failed:', fallbackResult.error);
            throw new Error(`Failed to fetch dealer claims: ${error.message}`);
          }
          
          console.log(`[DEALER_CLAIMS] Found ${fallbackResult.data?.length || 0} claims via fallback query`);
          return fallbackResult.data || [];
        }
        
        console.log(`[DEALER_CLAIMS] Found ${data?.length || 0} claims for dealer`);
        return data || [];
      } catch (error) {
        console.error('[DEALER_CLAIMS] Error in query function:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}