// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { getClaimStatus } from '@/utils/claimUtils';
import { Claim } from '@/lib/types';
import { PostgrestError } from '@supabase/supabase-js';

// Type casting for the supabase client to allow for the custom RPC functions
type ExtendedSupabaseClient = typeof supabase & {
  rpc<T = unknown>(
    fn: string, 
    params?: Record<string, unknown>
  ): Promise<{ data: T; error: PostgrestError | null }>;
};

// Use the extended client
const extendedClient = supabase as ExtendedSupabaseClient;

// Add a config option to bypass payment date filtering if needed
const BYPASS_PAYMENT_DATE_FILTERING = true; // Set to true if you're getting timeout errors

export interface ClaimsQueryOptions {
  dateRange: DateRange;
  dealerFilter?: string;
  pagination?: {
    page: number;
    pageSize: number;
  };
  includeCount?: boolean;
}

export interface ClaimsQueryResult {
  data: Claim[];
  count?: number | null;
  statusBreakdown: {
    OPEN: number;
    PENDING: number;
    CLOSED: number;
  };
}

// Add a smaller batch size constant for payment info fetching
const PAYMENT_BATCH_SIZE = 200; // Use smaller batches for payment info to prevent timeouts

/**
 * Fetches claims data with consistent filtering across all components
 */
export async function fetchClaimsData({
  dateRange,
  dealerFilter,
  pagination,
  includeCount = true
}: ClaimsQueryOptions): Promise<ClaimsQueryResult> {
  try {
    // Debug log - print current time for reference
    const now = new Date();
    console.log(`[SHARED_CLAIMS] Starting claims fetch at ${now.toISOString()}`);
    console.log(`[SHARED_CLAIMS] Using date range: ${dateRange.from.toISOString()} to ${dateRange.to.toISOString()}`);
    
    // Define basic variables
    let claims: Claim[] = [];
    let totalCount: number | null = null;
    const statusBreakdown = {
      OPEN: 0,
      PENDING: 0,
      CLOSED: 0
    };
    
    // Build a simplified query without DealerName
    console.log("[SHARED_CLAIMS] Using simplified query without DealerName");
    
    // Start building the query with all needed fields
    // Note: We avoid the nested subclaims fetch to prevent relationship ambiguity
    let query = extendedClient
      .from("claims")
      .select(`
        id,
        ClaimID, 
        ReportedDate, 
        IncurredDate,
        AgreementID,
        Cause,
        Correction,
        Closed,
        agreements!inner(
          AgreementID,
          AgreementStatus,
          DealerUUID,
          HolderFirstName,
          HolderLastName
        )
      `, { count: includeCount ? 'exact' : undefined });

    // Apply filtering by date
    query = query.or(
      `ReportedDate.gte.${dateRange.from.toISOString()},ReportedDate.lte.${dateRange.to.toISOString()},IncurredDate.gte.${dateRange.from.toISOString()},IncurredDate.lte.${dateRange.to.toISOString()}`
    );
    
    // Filter by dealer if requested
    if (dealerFilter && dealerFilter.trim() !== '') {
      query = query.eq('agreements.DealerUUID', dealerFilter.trim());
    }

    // Apply pagination if requested
    if (pagination) {
      const { page, pageSize } = pagination;
      query = query
        .range((page - 1) * pageSize, page * pageSize - 1)
        .order('ReportedDate', { ascending: false });
    } else {
      // Default ordering if no pagination
      query = query.order('ReportedDate', { ascending: false });
    }

    // Execute the query
    console.log("[SHARED_CLAIMS] Executing simplified query");
    const { data, error } = await query;

    if (error) {
      console.error('[SHARED_CLAIMS] Error fetching claims:', error);
      throw error;
    }

    // Process the claims data to get status breakdown
    if (data) {
      claims = data;
      
      // Initialize status counters
      const statusBreakdown = {
        OPEN: 0,
        PENDING: 0,
        CLOSED: 0
      };

      // Count claims by status using the consistent getClaimStatus function
      claims.forEach(claim => {
        const status = getClaimStatus(claim);
        if (status in statusBreakdown) {
          statusBreakdown[status as keyof typeof statusBreakdown]++;
        }
      });

      // Add default payment values to all claims
      const claimsWithDefaults = claims.map(claim => ({
        ...claim,
        totalPaid: 0,
        lastPaymentDate: null
      }));
      
      claims = claimsWithDefaults;
    }

    console.log(`[SHARED_CLAIMS] Fetched ${claims.length} claims. Total count: ${totalCount || 'N/A'}`);
    console.log('[SHARED_CLAIMS] Status breakdown:', statusBreakdown);

    // Add debugging to trace the data structure
    console.log('[SHARED_CLAIMS] Final claims data sample:', {
      sampleClaim: claims.length > 0 ? {
        ...claims[0],
        totalPaid: claims[0].totalPaid,
        lastPaymentDate: claims[0].lastPaymentDate
      } : 'No claims',
      dataKeys: claims.length > 0 ? Object.keys(claims[0]) : []
    });

    return {
      data: claims,
      count: totalCount,
      statusBreakdown
    };
  } catch (error) {
    // Improved error logging with more details
    console.error('[SHARED_CLAIMS] Error in fetchClaimsData:', error);
    console.error('[SHARED_CLAIMS] Error details:', JSON.stringify(error, null, 2));
    
    if (error && (error as PostgrestError).message) {
      console.error('[SHARED_CLAIMS] Error message:', (error as PostgrestError).message);
    }
    
    if (error && (error as PostgrestError).code) {
      console.error('[SHARED_CLAIMS] Error code:', (error as PostgrestError).code);
    }
    
    if (error && (error as PostgrestError).details) {
      console.error('[SHARED_CLAIMS] Error details:', (error as PostgrestError).details);
    }
    
    if (error && (error as PostgrestError).hint) {
      console.error('[SHARED_CLAIMS] Error hint:', (error as PostgrestError).hint);
    }
    
    // If everything fails, return empty data
    return {
      data: [],
      count: 0,
      statusBreakdown: { OPEN: 0, PENDING: 0, CLOSED: 0 }
    };
  }
}

/**
 * React Query hook for fetching claims data with consistent caching
 */
export function useSharedClaimsData(options: ClaimsQueryOptions) {
  return useQuery({
    queryKey: [
      'shared-claims-fixed',  // Changed key to avoid conflicts
      options.dateRange.from.toISOString(),
      options.dateRange.to.toISOString(),
      options.dealerFilter,
      options.pagination?.page,
      options.pagination?.pageSize
    ],
    queryFn: () => fetchClaimsData(options),
    staleTime: 1000 * 60 * 5, // 5 minutes stale time - consistent across all usages
  });
} 