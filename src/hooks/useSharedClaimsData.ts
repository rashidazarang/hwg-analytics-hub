// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { getClaimStatus } from '@/utils/claimUtils';
import { Claim } from '@/lib/types';
import { PostgrestError, PostgrestFilterBuilder } from '@supabase/supabase-js';
import { differenceInMonths, subMonths } from 'date-fns';

// Type casting for the supabase client to allow for the custom RPC functions
type ExtendedSupabaseClient = typeof supabase & {
  rpc<T = unknown>(
    fn: string, 
    params?: Record<string, unknown>
  ): Promise<{ data: T; error: PostgrestError | null }>;
};

// Use the extended client
const extendedClient = supabase as ExtendedSupabaseClient;

// Configuration for performance tuning
export const CLAIMS_CONFIG = {
  // Bypass payment date filtering to avoid timeouts
  BYPASS_PAYMENT_DATE_FILTERING: true,
  
  // Maximum claims to process before using pagination
  MAX_CLAIMS_WITHOUT_PAGINATION: 1000,
  
  // Default date range limit in months (for performance)
  DEFAULT_DATE_RANGE_MONTHS: 12,
  
  // Batch size for payment info fetching
  PAYMENT_BATCH_SIZE: 200
};

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

// Payment data interface
interface PaymentData {
  totalPaid: number;
  lastPaymentDate: string | null;
}

// Payment data item from RPC function
interface PaymentDataItem {
  ClaimID: string;
  AgreementID: string;
  totalpaid: number;
  lastpaymentdate: string | null;
}

/**
 * Helper function to build the base query for claims
 */
function buildBaseClaimsQuery(
  dateRange: DateRange,
  dealerFilter?: string,
  pagination?: { page: number; pageSize: number },
  includeCount = true
) {
  console.log("[SHARED_CLAIMS] Building query with params:", {
    dateRange: {
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString()
    },
    dealerFilter: dealerFilter || 'None',
    pagination: pagination ? `Page ${pagination.page}, Size ${pagination.pageSize}` : 'None'
  });

  // Start building the query with all needed fields
  // Note: We avoid the nested subclaims fetch to prevent relationship ambiguity
  let query = extendedClient
    .from("claims")
    .select(`
      id,
      ClaimID, 
      ReportedDate,
      ReportedTime,
      IncurredDate,
      AgreementID,
      VIN,
      Year,
      Make,
      Model,
      Mileage,
      Complaint,
      Cause,
      Correction,
      Closed,
      UpdatedDate,
      UpdatedTime,
      RepairOrderNbr,
      EngineNbr,
      SubModel,
      Callsign,
      Rejection_Voids,
      CustomerName,
      agreements!inner(
        AgreementID,
        AgreementStatus,
        DealerUUID,
        HolderFirstName,
        HolderLastName,
        EffectiveDate,
        Product,
        Term,
        Mileage,
        DealerCost
      )
    `, { count: includeCount ? 'exact' : undefined });

  // Apply filtering by date - use either ReportedDate or IncurredDate based on what's available
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

  return query;
}

/**
 * Helper function to execute a claims query and handle basic errors
 */
async function executeClaimsQuery(query: PostgrestFilterBuilder<any>) {
  try {
    const { data, error, count } = await query;
    
    if (error) {
      console.error('[SHARED_CLAIMS] Error executing claims query:', error);
      throw error;
    }
    
    return { data: data || [], count };
  } catch (error) {
    console.error('[SHARED_CLAIMS] Error in executeClaimsQuery:', error);
    throw error;
  }
}

/**
 * Helper to fetch claims with payment date filtering
 */
async function fetchClaimsWithPaymentDateFiltering(
  dateRange: DateRange,
  dealerFilter?: string,
  pagination?: { page: number; pageSize: number },
  includeCount = true
) {
  try {
    console.log("[SHARED_CLAIMS] Attempting payment date filtering");
    
    // Test if the payment date function is available and working
    const testFunctionResult = await extendedClient.rpc('get_claims_with_payment_in_date_range', {
      start_date: dateRange.from.toISOString(),
      end_date: dateRange.to.toISOString(),
      max_results: 10 // Just test with a small number
    });
    
    if (testFunctionResult.error) {
      console.error("[SHARED_CLAIMS] Payment date function test failed:", testFunctionResult.error);
      return null; // Signal to fall back to traditional filtering
    }
    
    // If function works, get claim IDs with payments in the date range
    const { data: claimsWithPayments, error: claimsWithPaymentsError } = await extendedClient.rpc(
      'get_claims_with_payment_in_date_range',
      {
        start_date: dateRange.from.toISOString(),
        end_date: dateRange.to.toISOString(),
        max_results: CLAIMS_CONFIG.MAX_CLAIMS_WITHOUT_PAGINATION
      }
    );
    
    if (claimsWithPaymentsError) {
      console.error("[SHARED_CLAIMS] Error fetching claims with payments:", claimsWithPaymentsError);
      return null; // Signal to fall back to traditional filtering
    }
    
    if (!claimsWithPayments || claimsWithPayments.length === 0) {
      console.log("[SHARED_CLAIMS] No claims with payments in date range");
      return { data: [], count: 0 }; // No claims found
    }
    
    // Extract just the ClaimIDs
    const claimIds = claimsWithPayments.map((item: any) => item.ClaimID);
    console.log(`[SHARED_CLAIMS] Found ${claimIds.length} claims with payments in date range`);
    
    // Now fetch the full claim details for these IDs
    let query = extendedClient
      .from("claims")
      .select(`
        id,
        ClaimID, 
        ReportedDate,
        ReportedTime,
        IncurredDate,
        AgreementID,
        VIN,
        Year,
        Make,
        Model,
        Mileage,
        Complaint,
        Cause,
        Correction,
        Closed,
        UpdatedDate,
        UpdatedTime,
        RepairOrderNbr,
        EngineNbr,
        SubModel,
        Callsign,
        Rejection_Voids,
        CustomerName,
        agreements!inner(
          AgreementID,
          AgreementStatus,
          DealerUUID,
          HolderFirstName,
          HolderLastName,
          EffectiveDate,
          Product,
          Term,
          Mileage,
          DealerCost
        )
      `, { count: includeCount ? 'exact' : undefined })
      .in('ClaimID', claimIds);
    
    // Re-apply dealer filter if needed
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
    
    return executeClaimsQuery(query);
  } catch (error) {
    console.error("[SHARED_CLAIMS] Error in payment date filtering:", error);
    return null; // Signal to fall back to traditional filtering
  }
}

/**
 * Helper to fetch payment data for claims
 */
async function fetchPaymentDataForClaims(claimIds: string[]): Promise<Record<string, PaymentData>> {
  if (!claimIds || claimIds.length === 0) {
    return {};
  }
  
  try {
    console.log(`[SHARED_CLAIMS] Fetching payment data for ${claimIds.length} claims`);
    
    const { data, error } = await extendedClient.rpc<PaymentDataItem[]>('get_claims_payment_info', {
      claim_ids: claimIds,
      max_results: CLAIMS_CONFIG.MAX_CLAIMS_WITHOUT_PAGINATION
    });
    
    if (error) {
      console.error('[SHARED_CLAIMS] Error fetching payment data:', error);
      return {};
    }
    
    if (!data || data.length === 0) {
      console.log('[SHARED_CLAIMS] No payment data found');
      return {};
    }
    
    // Transform to map for easier lookup
    const paymentDataMap: Record<string, PaymentData> = {};
    
    data.forEach(item => {
      paymentDataMap[item.ClaimID] = {
        totalPaid: Number(item.totalpaid) || 0,
        lastPaymentDate: item.lastpaymentdate
      };
    });
    
    console.log(`[SHARED_CLAIMS] Payment data fetched for ${data.length} claims`);
    return paymentDataMap;
  } catch (error) {
    console.error('[SHARED_CLAIMS] Error in fetchPaymentDataForClaims:', error);
    return {};
  }
}

/**
 * Helper to enrich claims with payment data
 */
async function enrichClaimsWithPaymentData(claims: Claim[]) {
  if (!claims || claims.length === 0) {
    return [];
  }
  
  try {
    // Get claim IDs
    const claimIds = claims.map(claim => claim.ClaimID);
    
    // Fetch payment data
    const paymentDataMap = await fetchPaymentDataForClaims(claimIds);
    
    // Enrich claims with payment data
    const enrichedClaims = claims.map(claim => ({
      ...claim,
      totalPaid: paymentDataMap[claim.ClaimID]?.totalPaid || 0,
      lastPaymentDate: paymentDataMap[claim.ClaimID]?.lastPaymentDate || null
    }));
    
    return enrichedClaims;
  } catch (error) {
    console.error('[SHARED_CLAIMS] Error enriching claims with payment data:', error);
    // Return original claims if enrichment fails
    return claims;
  }
}

/**
 * Helper to calculate status breakdown
 */
function calculateStatusBreakdown(claims: Claim[]) {
  const statusBreakdown = {
    OPEN: 0,
    PENDING: 0,
    CLOSED: 0
  };
  
  claims.forEach(claim => {
    const status = getClaimStatus(claim);
    if (status in statusBreakdown) {
      statusBreakdown[status as keyof typeof statusBreakdown]++;
    }
  });
  
  return statusBreakdown;
}

/**
 * Helper for comprehensive error logging
 */
function logFetchError(error: any) {
  console.error('[SHARED_CLAIMS] Error in fetchClaimsData:', error);
  
  if (typeof error === 'object' && error !== null) {
    console.error('[SHARED_CLAIMS] Error details:', JSON.stringify(error, null, 2));
    
    if ('message' in error) {
      console.error('[SHARED_CLAIMS] Error message:', (error as { message: string }).message);
    }
    
    if ('code' in error) {
      console.error('[SHARED_CLAIMS] Error code:', (error as { code: string }).code);
    }
    
    if ('details' in error) {
      console.error('[SHARED_CLAIMS] Error details:', (error as { details: string }).details);
    }
    
    if ('hint' in error) {
      console.error('[SHARED_CLAIMS] Error hint:', (error as { hint: string }).hint);
    }
  }
}

/**
 * Helper to get fallback claims data
 */
function getFallbackClaimsData(): ClaimsQueryResult {
  return {
    data: [],
    count: 0,
    statusBreakdown: { OPEN: 0, PENDING: 0, CLOSED: 0 }
  };
}

/**
 * Helper to apply performance limits to query options
 */
function applyPerformanceLimits(options: ClaimsQueryOptions): ClaimsQueryOptions {
  // Clone to avoid mutating the original
  const updatedOptions = { ...options };
  
  // Only apply limits if date range is specified
  if (options.dateRange) {
    const monthsDiff = differenceInMonths(
      options.dateRange.to,
      options.dateRange.from
    );
    
    if (monthsDiff > CLAIMS_CONFIG.DEFAULT_DATE_RANGE_MONTHS) {
      console.log(`[SHARED_CLAIMS] Limiting date range from ${monthsDiff} months to ${CLAIMS_CONFIG.DEFAULT_DATE_RANGE_MONTHS} months for performance`);
      
      const limitedEndDate = options.dateRange.to;
      const limitedStartDate = subMonths(limitedEndDate, CLAIMS_CONFIG.DEFAULT_DATE_RANGE_MONTHS);
      
      updatedOptions.dateRange = {
        from: limitedStartDate,
        to: limitedEndDate
      };
    }
  }
  
  return updatedOptions;
}

/**
 * Main function to fetch claims data
 */
export async function fetchClaimsData({
  dateRange,
  dealerFilter,
  pagination,
  includeCount = true
}: ClaimsQueryOptions): Promise<ClaimsQueryResult> {
  try {
    console.log("[SHARED_CLAIMS] Fetching claims data at", new Date().toISOString());
    
    let claims: Claim[] = [];
    let totalCount: number | null = null;
    
    // Determine if we should use payment date filtering or traditional filtering
    if (!CLAIMS_CONFIG.BYPASS_PAYMENT_DATE_FILTERING) {
      // Try to use payment date filtering for better performance
      const paymentFilteringResult = await fetchClaimsWithPaymentDateFiltering(
        dateRange,
        dealerFilter,
        pagination,
        includeCount
      );
      
      if (paymentFilteringResult !== null) {
        // Payment date filtering worked
        claims = paymentFilteringResult.data;
        totalCount = paymentFilteringResult.count;
      } else {
        // Fall back to traditional filtering
        console.log('[SHARED_CLAIMS] Falling back to traditional filtering');
        const query = buildBaseClaimsQuery(dateRange, dealerFilter, pagination, includeCount);
        const result = await executeClaimsQuery(query);
        claims = result.data;
        totalCount = result.count;
      }
    } else {
      // Use traditional filtering because payment date filtering is bypassed
      console.log('[SHARED_CLAIMS] Using traditional filtering (payment filtering bypassed)');
      const query = buildBaseClaimsQuery(dateRange, dealerFilter, pagination, includeCount);
      const result = await executeClaimsQuery(query);
      claims = result.data;
      totalCount = result.count;
    }
    
    console.log(`[SHARED_CLAIMS] Found ${claims.length} claims, total count: ${totalCount}`);
    
    // Calculate status breakdown
    const statusBreakdown = calculateStatusBreakdown(claims);
    
    // Enrich claims with payment data
    const enrichedClaims = await enrichClaimsWithPaymentData(claims);
    
    // Log sample data for debugging
    if (enrichedClaims.length > 0) {
      console.log('[SHARED_CLAIMS] Sample claim data:', {
        sampleClaim: {
          ...enrichedClaims[0],
          totalPaid: enrichedClaims[0].totalPaid,
          lastPaymentDate: enrichedClaims[0].lastPaymentDate
        },
        dataKeys: Object.keys(enrichedClaims[0])
      });
    }
    
    return {
      data: enrichedClaims,
      count: totalCount,
      statusBreakdown
    };
  } catch (error) {
    // Log error comprehensively
    logFetchError(error);
    
    // Try a simplified fallback query if main query fails
    try {
      console.log('[SHARED_CLAIMS] Attempting fallback query');
      const fallbackQuery = extendedClient
        .from('claims')
        .select('ClaimID', { count: includeCount ? 'exact' : undefined })
        .limit(10);
      
      const { data: fallbackData, count: fallbackCount } = await executeClaimsQuery(fallbackQuery);
      
      if (fallbackData && fallbackData.length > 0) {
        console.log('[SHARED_CLAIMS] Fallback query successful, but returning empty result for consistency');
      }
    } catch (fallbackError) {
      console.error('[SHARED_CLAIMS] Fallback query also failed:', fallbackError);
    }
    
    // Return empty result on error
    return getFallbackClaimsData();
  }
}

/**
 * React Query hook for fetching claims data with consistent caching
 */
export function useSharedClaimsData(options: ClaimsQueryOptions) {
  // Apply performance limits if needed
  const effectiveOptions = applyPerformanceLimits(options);
  
  return useQuery({
    queryKey: [
      'shared-claims',
      effectiveOptions.dateRange.from.toISOString(),
      effectiveOptions.dateRange.to.toISOString(),
      effectiveOptions.dealerFilter,
      effectiveOptions.pagination?.page,
      effectiveOptions.pagination?.pageSize
    ],
    queryFn: () => fetchClaimsData(effectiveOptions),
    staleTime: 1000 * 60 * 5, // 5 minutes stale time - consistent across all usages
  });
}
