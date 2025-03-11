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

// Define constants for query limits and batch sizes
const MAX_PAGE_SIZE = 500; // Maximum page size for paginated queries
const DEFAULT_LIMIT = 5000; // Default limit for non-paginated queries
const PAYMENT_BATCH_SIZE = 200; // Batch size for payment data processing

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

/**
 * Determine the status of a claim based on its properties
 */
function getClaimStatus(claim: Claim): 'OPEN' | 'PENDING' | 'CLOSED' {
  if (claim.Closed) return 'CLOSED';
  if (!claim.ReportedDate && !claim.Closed) return 'PENDING';
  return 'OPEN';
}

/**
 * Fetches claims data with consistent filtering across all components
 * Uses LastModified for all date filtering
 */
export async function fetchClaimsData({
  dateRange,
  dealerFilter,
  pagination,
  includeCount = true
}: ClaimsQueryOptions): Promise<ClaimsQueryResult> {
  try {
    // Log start time and date range for debugging
    const now = new Date();
    console.log(`[SHARED_CLAIMS] Starting claims fetch at ${now.toISOString()}`);
    console.log(`[SHARED_CLAIMS] Using date range: ${dateRange.from.toISOString()} to ${dateRange.to.toISOString()}`);
    
    // Initialize result variables
    let claims: Claim[] = [];
    let totalCount: number | null = null;
    const statusBreakdown = {
      OPEN: 0,
      PENDING: 0,
      CLOSED: 0
    };
    
    console.log('[SHARED_CLAIMS] Using LastModified date filtering for all queries');
    
    // Create the base query with all needed fields
    let query = extendedClient
      .from("claims")
      .select(`
        id,
        ClaimID, 
        AgreementID,
        ReportedDate, 
        Closed,
        Cause,
        Correction,
        Deductible,
        LastModified,
        agreements!inner(DealerUUID, dealers(Payee))
      `, { count: includeCount ? 'exact' : undefined });
    
    // Apply date filtering ONLY on LastModified field for consistent behavior and index usage
    query = query
      .gte('LastModified', dateRange.from.toISOString())
      .lte('LastModified', dateRange.to.toISOString());
    
    console.log(`[SHARED_CLAIMS] Date filter applied on LastModified: ${dateRange.from.toISOString()} to ${dateRange.to.toISOString()}`);
    
    // Apply dealer filter if provided
    if (dealerFilter && dealerFilter.trim() !== '') {
      console.log(`[SHARED_CLAIMS] Adding dealer filter: ${dealerFilter.trim()}`);
      query = query.eq('agreements.DealerUUID', dealerFilter.trim());
    }
    
    // Always sort by LastModified for consistency
    query = query.order('LastModified', { ascending: false });
    
    // Apply pagination if specified, otherwise use a reasonable limit
    if (pagination && pagination.pageSize) {
      const { page, pageSize } = pagination;
      
      // Apply a safety limit to the page size
      const effectivePageSize = Math.min(pageSize, MAX_PAGE_SIZE);
      
      // Calculate start and end rows
      const startRow = (page - 1) * effectivePageSize;
      const endRow = startRow + effectivePageSize - 1;
      
      console.log(`[SHARED_CLAIMS] Using pagination: page ${page}, rows ${startRow}-${endRow} (page size ${effectivePageSize})`);
      query = query.range(startRow, endRow);
    } else {
      // Use a sensible limit for non-paginated queries
      console.log(`[SHARED_CLAIMS] No pagination provided, using limit ${DEFAULT_LIMIT}`);
      query = query.limit(DEFAULT_LIMIT);
    }
    
    // Execute the query
    const { data, error, count } = await query;
    
    if (error) {
      console.error('[SHARED_CLAIMS] Error fetching claims:', error);
      throw error;
    }
    
    // Store total count for return value
    totalCount = count;
    
    if (!data || data.length === 0) {
      console.log('[SHARED_CLAIMS] No claims found for the selected filters');
      return {
        data: [],
        count: 0,
        statusBreakdown
      };
    }
    
    // Store the result
    claims = data;
    console.log(`[SHARED_CLAIMS] Retrieved ${claims.length} claims`);
    
    // Calculate status breakdown for KPIs and charts
    claims.forEach(claim => {
      const status = getClaimStatus(claim);
      if (status in statusBreakdown) {
        statusBreakdown[status as keyof typeof statusBreakdown]++;
      }
    });
    
    console.log('[SHARED_CLAIMS] Status breakdown:', statusBreakdown);
    
    // Get payment information for each claim
    const claimIds = claims.map(claim => claim.ClaimID);
    
    if (claimIds.length > 0) {
      try {
        console.log(`[SHARED_CLAIMS] Fetching payment info for ${claimIds.length} claims using get_claims_payment_info RPC`);
        
        // Process payment data in parallel batches for better performance
        const processPaymentBatches = async () => {
          // Set up parallel batch processing
          console.log(`[SHARED_CLAIMS] Processing ${claimIds.length} claims in batches of ${PAYMENT_BATCH_SIZE}`);
          
          // Create batches of claims for parallel processing
          const batchPromises = Array.from(
            { length: Math.ceil(claimIds.length / PAYMENT_BATCH_SIZE) }, 
            (_, i) => {
              const batchIds = claimIds.slice(i * PAYMENT_BATCH_SIZE, (i + 1) * PAYMENT_BATCH_SIZE);
              console.log(`[SHARED_CLAIMS] Setting up batch ${i+1}/${Math.ceil(claimIds.length/PAYMENT_BATCH_SIZE)}`);
              
              // Properly format ClaimIDs (handle string/number conversion)
              const areClaimIdsNumeric = batchIds.length > 0 && !isNaN(Number(batchIds[0]));
              const formattedClaimIds = areClaimIdsNumeric 
                ? batchIds.map(id => Number(id)) 
                : batchIds;
              
              // Call the RPC function for this batch
              return extendedClient.rpc(
                'get_claims_payment_info',
                { 
                  claim_ids: formattedClaimIds,
                  max_results: batchIds.length
                }
              ).then(result => {
                if (result.error) {
                  console.error(`[SHARED_CLAIMS] Batch error:`, result.error);
                  return [];
                }
                
                if (result.data && Array.isArray(result.data)) {
                  console.log(`[SHARED_CLAIMS] Retrieved ${result.data.length} payment records for batch`);
                  
                  // Log a sample for debugging
                  if (result.data.length > 0) {
                    console.log(`[SHARED_CLAIMS] Payment data sample:`, {
                      sampleItem: result.data[0],
                      totalpaidType: typeof result.data[0].totalpaid
                    });
                  }
                  
                  return result.data;
                }
                
                return [];
              }).catch(error => {
                console.error(`[SHARED_CLAIMS] Batch processing error:`, error);
                return [];
              });
            }
          );
          
          // Execute all batches concurrently
          const batchResults = await Promise.all(batchPromises);
          
          // Combine results from all batches
          return batchResults.flat();
        };
        
        // Process all payment data batches
        const paymentData = await processPaymentBatches();
        
        if (paymentData && paymentData.length > 0) {
          console.log(`[SHARED_CLAIMS] Successfully retrieved payment data for ${paymentData.length} claims`);
          
          // Create a map for efficient lookup
          const paymentMap = new Map<string, { totalPaid: number, lastPaymentDate: Date | null }>();
          
          // Process payment data with simplified handling of different formats
          paymentData.forEach(item => {
            try {
              // Simple function to parse totalpaid value consistently
              const extractPaymentAmount = (value: any): number => {
                if (value === null || value === undefined) return 0;
                
                if (typeof value === 'number') return value;
                if (typeof value === 'string') return parseFloat(value) || 0;
                
                // Handle object types (PostgreSQL numeric)
                if (typeof value === 'object') {
                  // Try to access value property if it exists
                  if (value && 'value' in value) {
                    return parseFloat(value.value) || 0;
                  }
                  
                  // Try to convert object to string as fallback
                  return parseFloat(String(value)) || 0;
                }
                
                return 0;
              };
              
              // Extract payment information
              const totalPaid = extractPaymentAmount(item.totalpaid);
              const lastPaymentDate = item.lastpaymentdate ? new Date(item.lastpaymentdate) : null;
              
              // Store in the map
              paymentMap.set(item.ClaimID, {
                totalPaid,
                lastPaymentDate
              });
            } catch (parseError) {
              console.error(`[SHARED_CLAIMS] Error parsing payment data for claim ${item.ClaimID}:`, parseError);
              // Set default values for this claim
              paymentMap.set(item.ClaimID, {
                totalPaid: 0,
                lastPaymentDate: null
              });
            }
          });
          
          // Merge payment data with claims
          claims = claims.map(claim => {
            const paymentInfo = paymentMap.get(claim.ClaimID);
            
            return {
              ...claim,
              // Ensure values are always present with proper defaults
              totalPaid: paymentInfo ? paymentInfo.totalPaid : 0,
              lastPaymentDate: paymentInfo ? paymentInfo.lastPaymentDate : null
            };
          });
          
          console.log(`[SHARED_CLAIMS] Successfully merged payment data with claims`);
        } else {
          console.warn(`[SHARED_CLAIMS] No payment data retrieved, using default values`);
          
          // Ensure all claims have the payment fields with default values
          claims = claims.map(claim => ({
            ...claim,
            totalPaid: 0,
            lastPaymentDate: null
          }));
        }
      } catch (paymentError) {
        console.error('[SHARED_CLAIMS] Error processing payment data:', paymentError);
        
        // Ensure claims have consistent structure even if payment processing fails
        claims = claims.map(claim => ({
          ...claim,
          totalPaid: 0,
          lastPaymentDate: null
        }));
      }
    } else {
      console.log('[SHARED_CLAIMS] No claim IDs to process for payment data');
      
      // Ensure claims have consistent structure when no claim IDs exist
      claims = claims.map(claim => ({
        ...claim,
        totalPaid: 0,
        lastPaymentDate: null
      }));
    }
    
    // Return the complete result
    return {
      data: claims,
      count: totalCount,
      statusBreakdown
    };
  } catch (error) {
    // Handle errors with improved logging
    console.error('[SHARED_CLAIMS] Fatal error in fetchClaimsData:', error);
    
    if (error instanceof Error) {
      console.error('[SHARED_CLAIMS] Error message:', error.message);
      console.error('[SHARED_CLAIMS] Error stack:', error.stack);
    }
    
    if (error && (error as PostgrestError).code) {
      console.error('[SHARED_CLAIMS] Postgrest error code:', (error as PostgrestError).code);
      console.error('[SHARED_CLAIMS] Postgrest error message:', (error as PostgrestError).message);
      console.error('[SHARED_CLAIMS] Postgrest error details:', (error as PostgrestError).details);
    }
    
    // Return empty data with consistent structure on error
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
      'shared-claims',
      options.dateRange.from.toISOString(),
      options.dateRange.to.toISOString(),
      options.dealerFilter,
      options.pagination?.page,
      options.pagination?.pageSize
    ],
    queryFn: () => fetchClaimsData(options),
    staleTime: 1000 * 60 * 5, // 5 minutes stale time
    retry: 1, // Limit retries to avoid hammering the server on errors
    retryDelay: 1000, // Wait 1 second between retries
    refetchOnWindowFocus: false, // Avoid excessive refetching
  });
}