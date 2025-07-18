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

// Types for the claims data
export interface Claim {
  id: string;
  ClaimID: string;
  AgreementID: string;
  ReportedDate: string | null;
  Closed: string | null;
  Cause: string | null;
  Correction: string | null;
  Deductible: number | null;
  LastModified: string | null;
  TotalPaid?: number;
  totalPaid?: number;
  lastPaymentDate?: string | null;
  LastPaymentDate?: string | null;
  agreements?: {
    DealerUUID: string;
    dealers?: {
      Payee: string;
    };
  };
}

export interface ClaimsQueryOptions {
  dateRange: DateRange;
  dealerFilter?: string;
  pagination?: {
    page: number;
    pageSize: number;
  };
  includeCount?: boolean;
  sortByPaymentDate?: boolean;
}

export interface ClaimsQueryResult {
  data: Claim[];
  count: number;
  statusBreakdown: {
    OPEN: number;
    PENDING: number;
    CLOSED: number;
  };
}

/**
 * Fetches claims data with proper date filtering, batching, and error handling
 */
export async function fetchClaimsData({
  dateRange,
  dealerFilter,
  pagination,
  includeCount = true,
  sortByPaymentDate = false
}: ClaimsQueryOptions): Promise<ClaimsQueryResult> {
  try {
    console.log('[SHARED_CLAIMS] Fetching claims from Supabase with filters:', {
      dateRange: { from: dateRange.from, to: dateRange.to },
      dealerFilter,
      pagination,
      sortByPaymentDate
    });

    // Build the base query
    let query = supabase
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
        agreements!inner(
          DealerUUID, 
          HolderFirstName,
          HolderLastName,
          AgreementID,
          dealers(Payee)
        )
      `, { count: includeCount ? 'exact' : undefined });

    // Apply date range filter - use both ReportedDate and LastModified to catch all relevant claims
    // Some claims have null ReportedDate but valid LastModified dates
    if (dateRange) {
      query = query.or(
        `and(ReportedDate.gte.${dateRange.from.toISOString()},ReportedDate.lte.${dateRange.to.toISOString()}),` +
        `and(ReportedDate.is.null,LastModified.gte.${dateRange.from.toISOString()},LastModified.lte.${dateRange.to.toISOString()})`
      );
    }

    // Apply dealer filter
    if (dealerFilter) {
      query = query.eq('agreements.DealerUUID', dealerFilter);
    }

    // Apply pagination with safety limits to prevent query timeouts
    if (pagination) {
      const startIndex = (pagination.page - 1) * pagination.pageSize;
      const endIndex = startIndex + pagination.pageSize - 1;
      
      // Add safety check for large page sizes that might cause timeout
      const maxAllowedPageSize = 250; // Reasonable limit for Supabase performance
      const safePageSize = Math.min(pagination.pageSize, maxAllowedPageSize);
      const safeEndIndex = startIndex + safePageSize - 1;
      
      if (pagination.pageSize > maxAllowedPageSize) {
        console.warn(`[SHARED_CLAIMS] Page size ${pagination.pageSize} exceeds safe limit of ${maxAllowedPageSize}, using ${safePageSize} instead`);
      }
      
      query = query.range(startIndex, safeEndIndex);
    }

    // Order by the appropriate date field, with proper null handling
    const orderField = sortByPaymentDate ? 'LastModified' : 'ReportedDate';
    query = query.order(orderField, { ascending: false, nullsLast: true });

    const result = await query;

    if (result.error) {
      console.error('[SHARED_CLAIMS] Error fetching claims:', result.error);
      throw new Error(`Claims query failed: ${result.error.message}`);
    }

    const claims = result.data || [];
    console.log(`[SHARED_CLAIMS] Successfully fetched ${claims.length} claims from Supabase`);

    // Calculate status breakdown from the fetched data
    const statusBreakdown = {
      OPEN: claims.filter(claim => !claim.Closed && claim.ReportedDate).length,
      PENDING: claims.filter(claim => !claim.ReportedDate && !claim.Closed).length,
      CLOSED: claims.filter(claim => !!claim.Closed).length
    };

    console.log('[SHARED_CLAIMS] Status breakdown:', statusBreakdown);

    return {
      data: claims as Claim[],
      count: result.count || claims.length,
      statusBreakdown
    };

  } catch (error) {
    console.error('[SHARED_CLAIMS] Error fetching claims:', error);
    
    // Fallback to basic query
    try {
      console.log('[SHARED_CLAIMS] Attempting fallback query without date range filtering');
      
      // Basic query without advanced filtering
      const fallbackQuery = supabase
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
        `)
        .order('LastModified', { ascending: false })
        .limit(100); // Reasonable limit for fallback

      if (dealerFilter && dealerFilter.trim() !== '') {
        fallbackQuery.eq('agreements.DealerUUID', dealerFilter.trim());
      }
      
      const { data: fallbackData } = await fallbackQuery;
      
      if (fallbackData && fallbackData.length > 0) {
        console.log('[SHARED_CLAIMS] Fallback query succeeded with', fallbackData.length, 'records');
        
        // Return simple data without payment info
        return {
          data: fallbackData.map(claim => ({
            ...claim,
            totalPaid: 0,
            TotalPaid: 0,
            lastPaymentDate: null,
            LastPaymentDate: null
          })) as unknown as Claim[],
          count: fallbackData.length,
          statusBreakdown: { 
            OPEN: fallbackData.filter(c => !c.Closed && c.ReportedDate).length,
            PENDING: fallbackData.filter(c => !c.ReportedDate && !c.Closed).length,
            CLOSED: fallbackData.filter(c => !!c.Closed).length
          }
        };
      }
    } catch (fallbackError) {
      console.error('[SHARED_CLAIMS] Fallback query also failed:', fallbackError);
    }
    
    // Return empty data if all attempts failed
    return {
      data: [],
      count: 0,
      statusBreakdown: { OPEN: 0, PENDING: 0, CLOSED: 0 }
    };
  }
}

/**
 * Hook to fetch claims data with React Query
 */
export function useSharedClaimsData(options: ClaimsQueryOptions) {
  return useQuery({
    queryKey: [
      'shared-claims',
      options.dateRange.from,
      options.dateRange.to,
      options.dealerFilter,
      options.pagination?.page,
      options.pagination?.pageSize,
      options.sortByPaymentDate
    ],
    queryFn: () => fetchClaimsData(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });
}

/**
 * Function to directly search for claims by ID (ClaimID or AgreementID), bypassing all other filters
 */
export async function searchClaimsById(searchTerm: string): Promise<ClaimsQueryResult> {
  try {
    console.log(`[SHARED_CLAIMS] Searching for claims with ID containing: ${searchTerm}`);
    
    // Define basic variables
    let claims: Claim[] = [];
    let totalCount: number | null = 0;
    const statusBreakdown = {
      OPEN: 0,
      PENDING: 0,
      CLOSED: 0
    };
    
    // Create the base query with all needed fields
    let query = supabase
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
      `, { count: 'exact' });
    
    // Apply the search filter - search in both ClaimID and AgreementID
    query = query.or(`ClaimID.ilike.%${searchTerm}%,AgreementID.ilike.%${searchTerm}%`);
    
    // Always sort by LastModified for consistency
    query = query.order('LastModified', { ascending: false });
    
    // Limit to a reasonable number of results
    query = query.limit(100);
    
    // Execute the query
    let data, error, count;
    try {
      const result = await query;
      data = result.data;
      error = result.error;
      count = result.count;

      // If we got a count from the query, use it
      if (count !== null && count !== undefined) {
        totalCount = count;
        console.log(`[SHARED_CLAIMS] Total count from ID search: ${totalCount}`);
      }

      if (error) {
        console.error('[SHARED_CLAIMS] Error searching claims by ID:', error);
        throw error;
      }
    } catch (queryError) {
      console.error('[SHARED_CLAIMS] Exception executing ID search query:', queryError);
      throw queryError;
    }

    // Process the claims data if we have results
    if (data) {
      claims = data;
      
      // Calculate status breakdown for KPIs and charts
      const statusBreakdown = {
        OPEN: 0,
        PENDING: 0,
        CLOSED: 0
      };
      
      // Count claims by status
      claims.forEach(claim => {
        const status = getClaimStatus(claim);
        if (status in statusBreakdown) {
          statusBreakdown[status as keyof typeof statusBreakdown]++;
        }
      });
      
      console.log('[SHARED_CLAIMS] ID search status breakdown:', statusBreakdown);

      // Get payment information for each claim
      // We'll use a separate query to fetch payment data efficiently
      const claimIds = claims.map(claim => claim.ClaimID);
      
      if (claimIds.length > 0) {
        try {
          console.log("[SHARED_CLAIMS] Fetching payment info for", claimIds.length, "claims from ID search");
          
          // Process in batches
          const PAYMENT_BATCH_SIZE = 50; // Use smaller batches for better performance
          let allPaymentData: any[] = [];
          
          // Process in batches
          for (let i = 0; i < claimIds.length; i += PAYMENT_BATCH_SIZE) {
            const batchClaimIds = claimIds.slice(i, i + PAYMENT_BATCH_SIZE);
            console.log(`[SHARED_CLAIMS] Processing payment batch ${Math.floor(i/PAYMENT_BATCH_SIZE)+1}/${Math.ceil(claimIds.length/PAYMENT_BATCH_SIZE)}`);
            
            try {
              // Fix for ClaimID type mismatch in batch processing
              const areClaimIdsNumeric = batchClaimIds.length > 0 && !isNaN(Number(batchClaimIds[0]));
              const formattedClaimIds = areClaimIdsNumeric 
                ? batchClaimIds.map(id => Number(id)) // Convert to numbers if they appear numeric
                : batchClaimIds; // Keep as strings if they're not numeric
              
              console.log(`[SHARED_CLAIMS] Processing batch with ${areClaimIdsNumeric ? 'numeric' : 'string'} claim IDs`);
              
              const { data: batchData, error: batchError } = await supabase.rpc(
                'get_claims_payment_info',
                { 
                  claim_ids: formattedClaimIds,
                  max_results: batchClaimIds.length
                }
              );
              
              if (batchError) {
                console.error(`[SHARED_CLAIMS] Batch error:`, batchError);
                continue;
              }
              
              if (batchData && Array.isArray(batchData)) {
                console.log(`[SHARED_CLAIMS] Retrieved payment data batch with ${batchData.length} results`);
                
                // Log a sample of the payment data for debugging
                if (batchData.length > 0) {
                  console.log(`[SHARED_CLAIMS] Payment data sample:`, {
                    sampleItem: batchData[0],
                    keys: Object.keys(batchData[0]),
                    totalpaidType: typeof batchData[0].totalpaid || typeof batchData[0].TotalPaid,
                    totalpaidValue: batchData[0].totalpaid || batchData[0].TotalPaid,
                    lastpaymentdate: batchData[0].lastpaymentdate || batchData[0].LastPaymentDate
                  });
                }
                
                allPaymentData = [...allPaymentData, ...batchData];
              } else {
                console.warn(`[SHARED_CLAIMS] Batch returned no data`);
              }
              
              // Add a small delay between batches
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
              console.error(`[SHARED_CLAIMS] Batch processing error:`, error);
            }
          }
          
          // If the RPC function worked, process the data
          if (allPaymentData && Array.isArray(allPaymentData) && allPaymentData.length > 0) {
            // Process the payment data from the RPC function
            const paymentMap = new Map<string, { totalPaid: number, lastPaymentDate: Date | null }>();
            
            // Map the payment data by ClaimID for easy lookup
            allPaymentData.forEach(item => {
              try {
                // Parse the totalpaid value from the SQL function, ensuring it's a number
                let totalPaidValue = 0;
                
                // Handle different formats of totalpaid
                // Check for both lowercase (totalpaid) and uppercase (TotalPaid) property names
                const rawTotalPaid = item.totalpaid !== undefined ? item.totalpaid : item.TotalPaid;
                
                if (rawTotalPaid !== null && rawTotalPaid !== undefined) {
                  if (typeof rawTotalPaid === 'string') {
                    totalPaidValue = parseFloat(rawTotalPaid) || 0;
                  } else if (typeof rawTotalPaid === 'number') {
                    totalPaidValue = rawTotalPaid;
                  } else if (typeof rawTotalPaid === 'object') {
                    if (rawTotalPaid && 'value' in (rawTotalPaid as any)) {
                      // Handle Postgres numeric type which may come as object with value property
                      const numericValue = (rawTotalPaid as any).value;
                      totalPaidValue = parseFloat(numericValue) || 0;
                    } else {
                      // Try to convert the object to a number
                      totalPaidValue = Number(rawTotalPaid) || 0;
                    }
                  }
                }
                
                // Always set lastPaymentDate if it exists, even if the payment amount is zero
                // This is because a claim might have PAID status but with zero amount
                // Check for both lowercase (lastpaymentdate) and uppercase (LastPaymentDate) property names
                const rawPaymentDate = item.lastpaymentdate !== undefined ? item.lastpaymentdate : item.LastPaymentDate;
                const paymentDate = rawPaymentDate ? new Date(rawPaymentDate) : null;
                
                console.log(`[SHARED_CLAIMS] Payment processing for ${item.ClaimID}:`, {
                  rawTotalPaid: rawTotalPaid,
                  rawType: typeof rawTotalPaid,
                  processedValue: totalPaidValue,
                  lastPaymentDate: paymentDate ? paymentDate.toISOString() : null
                });
                
                paymentMap.set(item.ClaimID, {
                  totalPaid: totalPaidValue,
                  lastPaymentDate: paymentDate
                });
              } catch (parseError) {
                console.error(`[SHARED_CLAIMS] Error parsing payment data for claim ${item.ClaimID}:`, parseError);
                // Set default values in case of parsing error
                paymentMap.set(item.ClaimID, {
                  totalPaid: 0,
                  lastPaymentDate: null
                });
              }
            });
            
            // Merge payment data with claims
            const updatedClaims = claims.map(claim => {
              const paymentInfo = paymentMap.get(claim.ClaimID);
              return {
                ...claim,
                // Ensure totalPaid is always a valid number
                totalPaid: paymentInfo && typeof paymentInfo.totalPaid === 'number' ? paymentInfo.totalPaid : 0,
                // Also add TotalPaid for consistency with SQL function naming
                TotalPaid: paymentInfo && typeof paymentInfo.totalPaid === 'number' ? paymentInfo.totalPaid : 0,
                // Always set lastPaymentDate if it exists, even if payment amount is zero
                lastPaymentDate: paymentInfo ? paymentInfo.lastPaymentDate : null,
                // Also add LastPaymentDate for consistency with SQL function naming
                LastPaymentDate: paymentInfo ? paymentInfo.lastPaymentDate : null
              };
            });
            
            // Update claims with payment info
            claims = updatedClaims;
          } else {
            console.log('[SHARED_CLAIMS] No payment data retrieved, setting default values');
            
            // Fall back to direct query or default values
            const claimsWithoutPayments = claims.map(claim => ({
              ...claim,
              totalPaid: 0,
              TotalPaid: 0,
              lastPaymentDate: null,
              LastPaymentDate: null
            }));
            
            claims = claimsWithoutPayments;
          }
        } catch (paymentFetchError) {
          console.error('[SHARED_CLAIMS] Error processing payment data:', paymentFetchError);
          
          // Ensure claims always have totalPaid and lastPaymentDate properties
          const claimsWithDefaults = claims.map(claim => ({
            ...claim,
            totalPaid: 0,
            TotalPaid: 0,
            lastPaymentDate: null,
            LastPaymentDate: null
          }));
          
          claims = claimsWithDefaults;
        }
      } else {
        // If no claims IDs, add default payment values
        const claimsWithDefaults = claims.map(claim => ({
          ...claim,
          totalPaid: 0,
          TotalPaid: 0,
          lastPaymentDate: null,
          LastPaymentDate: null
        }));
        
        claims = claimsWithDefaults;
      }

      console.log(`[SHARED_CLAIMS] Found ${claims.length} claims matching ID search. Total count: ${totalCount || 'N/A'}`);

      return {
        data: claims,
        count: totalCount,
        statusBreakdown
      };
    }

    // Return empty data if query succeeded but returned no data
    return {
      data: [],
      count: 0,
      statusBreakdown: { OPEN: 0, PENDING: 0, CLOSED: 0 }
    };
  } catch (error) {
    console.error('[SHARED_CLAIMS] Error in searchClaimsById:', error);
    
    // Return empty data if all attempts failed
    return {
      data: [],
      count: 0,
      statusBreakdown: { OPEN: 0, PENDING: 0, CLOSED: 0 }
    };
  }
}

/**
 * React Query hook for searching claims by ID
 */
export function useSearchClaimsById(searchTerm: string) {
  return useQuery({
    queryKey: ['claims-search-by-id', searchTerm],
    queryFn: () => searchClaimsById(searchTerm),
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: false, // Don't retry if the query fails
    enabled: !!searchTerm && searchTerm.length >= 3, // Only enable if search term is at least 3 characters
  });
}
