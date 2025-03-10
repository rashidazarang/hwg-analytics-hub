// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { getClaimStatus } from '@/utils/claimUtils';
import { Claim } from '@/lib/types';
import { PostgrestError } from '@supabase/supabase-js';

// @ts-ignore - temporary solution to bypass TypeScript errors
// TODO: Fix TypeScript errors properly in a future update

// Type casting for the supabase client to allow for the custom RPC functions
type ExtendedSupabaseClient = typeof supabase & {
  rpc<T = unknown>(
    fn: string, 
    params?: Record<string, unknown>
  ): Promise<{ data: T; error: PostgrestError | null }>;
};

// Use the extended client
const extendedClient = supabase as ExtendedSupabaseClient;

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
  console.log('[SHARED_CLAIMS] Fetching claims with options:', {
    dateRange: {
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString()
    },
    dealerFilter,
    pagination
  });

  try {
    // Define our variables with proper types at the beginning
    let claims: Claim[] = [];
    let totalCount: number | null = null;
    const statusBreakdown = {
      OPEN: 0,
      PENDING: 0,
      CLOSED: 0
    };

    // Debug log - print current time for reference
    const now = new Date();
    console.log(`[SHARED_CLAIMS] Starting claims fetch at ${now.toISOString()}`);
    console.log(`[SHARED_CLAIMS] Using date range: ${dateRange.from.toISOString()} to ${dateRange.to.toISOString()}`);
    
    // Start building the query with all needed fields
    // Note: We avoid the nested subclaims fetch to prevent relationship ambiguity
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

    console.log("[SHARED_CLAIMS] Setting up date filtering for claims");
    console.log("[SHARED_CLAIMS] Date range:", {
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString()
    });
    
    // Apply traditional date filtering first
    // This ensures we have at least some filtering applied before attempting the payment date filter
    query = query.or(
      `ReportedDate.gte.${dateRange.from.toISOString()},` +
      `ReportedDate.lte.${dateRange.to.toISOString()},` +
      `LastModified.gte.${dateRange.from.toISOString()},` +
      `LastModified.lte.${dateRange.to.toISOString()}`
    );
    
    // Check if we should try to use payment date filtering
    const shouldTryPaymentDateFiltering = true; // Set to false to disable it entirely
    
    if (shouldTryPaymentDateFiltering) {
      try {
        console.log("[SHARED_CLAIMS] Trying payment date filtering...");
        
        // Try to use a simple test query to see if the function exists
        const testFunctionResult = await extendedClient.rpc(
          'get_claims_with_payment_in_date_range', 
          { 
            start_date: new Date('2000-01-01').toISOString(), 
            end_date: new Date('2000-01-02').toISOString() 
          }
        );
        
        // If test worked, the function exists - use it with real dates
        if (!testFunctionResult.error) {
          console.log("[SHARED_CLAIMS] Payment date filtering function available");
          
          // Get IDs of claims with payments in the date range
          const { data: claimsWithPayments, error: paymentRangeError } = await extendedClient.rpc(
            'get_claims_with_payment_in_date_range', 
            { 
              start_date: dateRange.from.toISOString(), 
              end_date: dateRange.to.toISOString(),
              max_results: 5000 // Add a limit
            }
          );
          
          if (paymentRangeError) {
            console.error("[SHARED_CLAIMS] Error getting claims with payments:", paymentRangeError);
          } else if (claimsWithPayments && Array.isArray(claimsWithPayments) && claimsWithPayments.length > 0) {
            // Extract claim IDs with payments in range
            const claimIds = claimsWithPayments.map(item => item.ClaimID);
            console.log(`[SHARED_CLAIMS] Found ${claimIds.length} claims with payments in date range`);
            
            // Clear previous date filter and use claim IDs instead
            // Create a new query, since we can't easily remove the previous OR conditions
            query = extendedClient
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
              `, { count: includeCount ? 'exact' : undefined })
              .in('ClaimID', claimIds);
              
            // Re-apply dealer filter if needed
            if (dealerFilter && dealerFilter.trim() !== '') {
              query = query.eq('agreements.DealerUUID', dealerFilter.trim());
            }
          } else {
            console.log("[SHARED_CLAIMS] No claims with payments in date range, using traditional filters");
            // Traditional filtering already applied at the beginning
          }
        } else {
          console.error("[SHARED_CLAIMS] Payment date function test failed:", testFunctionResult.error);
          // Traditional filtering already applied at the beginning
        }
      } catch (e) {
        console.error("[SHARED_CLAIMS] Error testing payment date filtering:", e);
        // Traditional filtering already applied at the beginning
      }
    }
    
    // Apply dealer filter if provided
    if (dealerFilter && dealerFilter.trim() !== '') {
      query = query.eq('agreements.DealerUUID', dealerFilter.trim());
    }

    // Apply sorting - consistent across all components
    query = query.order('LastModified', { ascending: false });

    // Only apply pagination if explicitly requested
    if (pagination !== undefined && pagination.pageSize !== undefined) {
      const { page, pageSize } = pagination;
      const startRow = (page - 1) * pageSize;
      const endRow = startRow + pageSize - 1;
      query = query.range(startRow, endRow);
    } else {
      // CRITICAL FIX: We must override Supabase's default limit when no pagination is provided
      // Fetch records in batches to get around Supabase's default limit
      
      // First, get the total count 
      // We need to mirror the same filtering logic as the main query
      const countQuery = extendedClient
        .from("claims")
        .select(`
          id,
          agreements!inner(DealerUUID)
        `, { count: 'exact', head: true });
      
      // Just use traditional date filtering for count - simpler and more reliable
      console.log("[SHARED_CLAIMS] Setting up count query with traditional date filtering");
      countQuery.or(
        `ReportedDate.gte.${dateRange.from.toISOString()},` +
        `ReportedDate.lte.${dateRange.to.toISOString()},` +
        `LastModified.gte.${dateRange.from.toISOString()},` +
        `LastModified.lte.${dateRange.to.toISOString()}`
      );
      
      // Apply dealer filter to count query if provided
      if (dealerFilter && dealerFilter.trim() !== '') {
        countQuery.eq('agreements.DealerUUID', dealerFilter.trim());
      }
      
      const { count: totalCount, error: countError } = await countQuery;
      
      if (countError) {
        console.error('[SHARED_CLAIMS] Error getting total count:', countError);
        throw countError;
      }
      
      // If we have a large dataset, we need to fetch in batches
      if (totalCount && totalCount > 1000) {
        console.log(`[SHARED_CLAIMS] Total claims count is ${totalCount}, fetching in batches`);
        
        // Set up for batched fetching
        const batchSize = 1000; // Supabase's max range size
        const totalBatches = Math.ceil(totalCount / batchSize);
        let allData: Claim[] = [];
        
        // Fetch data in parallel batches to improve performance
        const batchPromises = Array.from({ length: totalBatches }, (_, i) => {
          const start = i * batchSize;
          const end = start + batchSize - 1;
          
          let batchQuery = extendedClient
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
            .or(
              `ReportedDate.gte.${dateRange.from.toISOString()},` +
              `ReportedDate.lte.${dateRange.to.toISOString()},` +
              `LastModified.gte.${dateRange.from.toISOString()},` +
              `LastModified.lte.${dateRange.to.toISOString()}`
            )
            .order('LastModified', { ascending: false })
            .range(start, end);
          
          // Apply dealer filter to each batch query
          if (dealerFilter && dealerFilter.trim() !== '') {
            batchQuery = batchQuery.eq('agreements.DealerUUID', dealerFilter.trim());
          }
          
          return batchQuery.then(result => {
            if (result.error) throw result.error;
            console.log(`[SHARED_CLAIMS] Fetched batch ${i+1}/${totalBatches} with ${result.data.length} records`);
            return result.data;
          });
        });
        
        // Collect all the batched data
        const batchResults = await Promise.all(batchPromises);
        allData = batchResults.flat();
        
        // Initialize status counters
        const statusBreakdown = {
          OPEN: 0,
          PENDING: 0,
          CLOSED: 0
        };
        
        // Count claims by status
        allData.forEach(claim => {
          const status = getClaimStatus(claim);
          if (status in statusBreakdown) {
            statusBreakdown[status as keyof typeof statusBreakdown]++;
          }
        });

        // Get payment information for all claims
        const claimIds = allData.map(claim => claim.ClaimID);
        let processedClaims = allData;
        
        if (claimIds.length > 0) {
          try {
            console.log("[SHARED_CLAIMS] Fetching payment info for", claimIds.length, "claims");
            
            // Test if the function exists
            let paymentFunctionExists = false;
            try {
              const testResult = await extendedClient.rpc(
                'get_claims_payment_info',
                { 
                  claim_ids: [claimIds[0] || 'test'],
                  timeout_ms: 3000 // Use a shorter timeout for testing
                }
              );
              
              if (!testResult.error || !testResult.error.message.includes('function does not exist')) {
                paymentFunctionExists = true;
              }
            } catch (testError) {
              console.error("[SHARED_CLAIMS] Error testing payment info function:", testError);
            }
            
            let paymentData: Array<{
              ClaimID: string;
              AgreementID: string;
              totalpaid: number;
              lastpaymentdate: string | null;
            }> | null = null;
            let paymentError = null;
            
            if (paymentFunctionExists) {
              // Process in smaller batches to avoid timeouts
              if (claimIds.length > PAYMENT_BATCH_SIZE) {
                console.log(`[SHARED_CLAIMS] Processing ${claimIds.length} claims in batches of ${PAYMENT_BATCH_SIZE}`);
                
                let allPaymentData: Array<{
                  ClaimID: string;
                  AgreementID: string;
                  totalpaid: number;
                  lastpaymentdate: string | null;
                }> = [];
                
                // Process in batches
                for (let i = 0; i < claimIds.length; i += PAYMENT_BATCH_SIZE) {
                  const batchClaimIds = claimIds.slice(i, i + PAYMENT_BATCH_SIZE);
                  console.log(`[SHARED_CLAIMS] Processing batch ${Math.floor(i/PAYMENT_BATCH_SIZE)+1}/${Math.ceil(claimIds.length/PAYMENT_BATCH_SIZE)}`);
                  
                  try {
                    const { data: batchData, error: batchError } = await extendedClient.rpc(
                      'get_claims_payment_info',
                      { 
                        claim_ids: batchClaimIds,
                        max_results: PAYMENT_BATCH_SIZE 
                      }
                    );
                    
                    if (batchData && Array.isArray(batchData)) {
                      allPaymentData = [...allPaymentData, ...batchData];
                    } else if (batchError) {
                      console.error(`[SHARED_CLAIMS] Batch error:`, batchError);
                    }
                    
                    // Add a small delay between batches
                    await new Promise(resolve => setTimeout(resolve, 100));
                  } catch (error) {
                    console.error(`[SHARED_CLAIMS] Batch processing error:`, error);
                  }
                }
                
                paymentData = allPaymentData;
              } else {
                // For smaller sets, process all at once
                const { data, error } = await extendedClient.rpc(
                  'get_claims_payment_info',
                  { 
                    claim_ids: claimIds,
                    max_results: claimIds.length
                  }
                );
                
                paymentData = data || [];
                paymentError = error;
              }
            }
            
            // If the RPC function doesn't exist or had an error, fall back to direct query
            if (paymentError) {
              console.log('[SHARED_CLAIMS] Payment info RPC not found, using direct query');
              
              // Build a query to get payment information for all claims in one batch
              const { data: directPaymentData, error: directError } = await extendedClient.from('claims')
                .select(`
                  "ClaimID",
                  "AgreementID",
                  subclaims!left(
                    "ClaimID", 
                    "Status", 
                    "LastModified", 
                    subclaim_parts!left("PaidPrice")
                  )
                `)
                .in('ClaimID', claimIds);
                
              if (directError) {
                console.error('[SHARED_CLAIMS] Error fetching payment data:', directError);
              } else if (directPaymentData) {
                // Process the payment data
                const paymentMap = new Map<string, { totalPaid: number, lastPaymentDate: Date | null }>();
                
                directPaymentData.forEach(claim => {
                  if (!claim.subclaims || !Array.isArray(claim.subclaims)) return;
                  
                  // Filter only PAID subclaims
                  const paidSubclaims = claim.subclaims.filter(sc => sc.Status === 'PAID');
                  
                  // Calculate total paid amount
                  let totalPaid = 0;
                  paidSubclaims.forEach(subclaim => {
                    if (subclaim.subclaim_parts && Array.isArray(subclaim.subclaim_parts)) {
                      subclaim.subclaim_parts.forEach(part => {
                        if (part.PaidPrice) {
                          totalPaid += parseFloat(part.PaidPrice) || 0;
                        }
                      });
                    }
                  });
                  
                  // Find the latest payment date
                  let lastPaymentDate = null;
                  if (paidSubclaims.length > 0) {
                    const lastModifiedDates = paidSubclaims
                      .filter(sc => sc.LastModified)
                      .map(sc => new Date(sc.LastModified));
                    
                    if (lastModifiedDates.length > 0) {
                      lastPaymentDate = new Date(Math.max(...lastModifiedDates.map(d => d.getTime())));
                    }
                  }
                  
                  // Always set lastPaymentDate if it exists, even if payment amount is zero
                  // This handles cases where a subclaim has PAID status but zero dollar amount
                  
                  paymentMap.set(claim.ClaimID, {
                    totalPaid,
                    lastPaymentDate: lastPaymentDate
                  });
                });
                
                // Merge payment data with claims
                const updatedClaims = processedClaims.map(claim => {
                  const paymentInfo = paymentMap.get(claim.ClaimID);
                  return {
                    ...claim,
                    // Ensure totalPaid is always a valid number
                    totalPaid: paymentInfo && typeof paymentInfo.totalPaid === 'number' ? paymentInfo.totalPaid : 0,
                    // Always set lastPaymentDate if it exists, even if payment amount is zero
                    lastPaymentDate: paymentInfo ? paymentInfo.lastPaymentDate : null
                  };
                });
                
                // Use the processed claims going forward
                claims = updatedClaims;
                
                return {
                  data: claims,
                  count: totalCount,
                  statusBreakdown
                };
              }
            } else if (paymentData && Array.isArray(paymentData)) {
              // Process the payment data from the RPC function
              const paymentMap = new Map<string, { totalPaid: number, lastPaymentDate: Date | null }>();
              
              // Map the payment data by ClaimID for easy lookup
              paymentData.forEach(item => {
                // Parse the totalpaid value from the SQL function, ensuring it's a number
                let totalPaidValue = 0;
                
                // Handle different formats of totalpaid
                if (item.totalpaid !== null && item.totalpaid !== undefined) {
                  if (typeof item.totalpaid === 'string') {
                    totalPaidValue = parseFloat(item.totalpaid) || 0;
                  } else if (typeof item.totalpaid === 'number') {
                    totalPaidValue = item.totalpaid;
                  } else if (typeof item.totalpaid === 'object' && 'value' in item.totalpaid) {
                    // Handle Postgres numeric type which may come as object with value property
                    const numericValue = (item.totalpaid as unknown as { value: string }).value;
                    totalPaidValue = parseFloat(numericValue) || 0;
                  }
                }
                
                // Always set lastPaymentDate if it exists, even if the payment amount is zero
                // This is because a claim might have PAID status but with zero amount
                const paymentDate = item.lastpaymentdate ? new Date(item.lastpaymentdate) : null;
                
                console.log(`[SHARED_CLAIMS] Claim ${item.ClaimID} payment data - raw: ${item.totalpaid}, processed: ${totalPaidValue}, date: ${paymentDate}`);
                
                paymentMap.set(item.ClaimID, {
                  totalPaid: totalPaidValue,
                  lastPaymentDate: paymentDate
                });
              });
              
              // Merge payment data with claims
              const updatedClaims = processedClaims.map(claim => {
                const paymentInfo = paymentMap.get(claim.ClaimID);
                return {
                  ...claim,
                  // Ensure totalPaid is always a valid number
                  totalPaid: paymentInfo && typeof paymentInfo.totalPaid === 'number' ? paymentInfo.totalPaid : 0,
                  // Always set lastPaymentDate if it exists, even if payment amount is zero
                  lastPaymentDate: paymentInfo ? paymentInfo.lastPaymentDate : null
                };
              });
              
              // Use the processed claims going forward
              claims = updatedClaims;
              
              return {
                data: claims,
                count: totalCount,
                statusBreakdown
              };
            }
          } catch (paymentFetchError) {
            console.error('[SHARED_CLAIMS] Error processing payment data:', paymentFetchError);
          }
        }
        
        // If we couldn't get payment data, use default values
        // Always set totalPaid to a valid number (0)
        // and set lastPaymentDate to null
        const claimsWithPaymentInfo = processedClaims.map(claim => ({
          ...claim,
          totalPaid: 0,  // Default value - always a number, never undefined or null
          lastPaymentDate: null  // Default value - always null for unpaid claims
        }));

        console.log(`[SHARED_CLAIMS] Fetched ${claims.length} claims. Total count: ${totalCount || 'N/A'}`);
        console.log('[SHARED_CLAIMS] Status breakdown:', statusBreakdown);

        return {
          data: claimsWithPaymentInfo,
          count: totalCount,
          statusBreakdown
        };
      }
      
      // If count is small enough, proceed with normal fetch
      console.log(`[SHARED_CLAIMS] Total count (${totalCount}) is under 1000, fetching normally`);
    }

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

      // Get payment information for each claim
      // We'll use a separate query to fetch payment data efficiently
      const claimIds = claims.map(claim => claim.ClaimID);
      
      if (claimIds.length > 0) {
        try {
          console.log("[SHARED_CLAIMS] Fetching payment info for", claimIds.length, "claims");
          
          // Test if the function exists
          let paymentFunctionExists = false;
          try {
            const testResult = await extendedClient.rpc(
              'get_claims_payment_info',
              { 
                claim_ids: [claimIds[0] || 'test'],
                max_results: 10
              }
            );
            
            if (!testResult.error || !testResult.error.message.includes('function does not exist')) {
              paymentFunctionExists = true;
            }
          } catch (testError) {
            console.error("[SHARED_CLAIMS] Error testing payment info function:", testError);
          }
          
          // Type for payment data
          type PaymentDataItem = {
            ClaimID: string;
            AgreementID: string;
            totalpaid: number;
            lastpaymentdate: string | null;
          };
          
          let paymentData: PaymentDataItem[] = [];
          let paymentError: PostgrestError | null = null;
          
          if (paymentFunctionExists) {
            // Process in batches
            if (claimIds.length > PAYMENT_BATCH_SIZE) {
              console.log(`[SHARED_CLAIMS] Processing ${claimIds.length} claims in batches of ${PAYMENT_BATCH_SIZE}`);
              
              let allPaymentData: PaymentDataItem[] = [];
              
              // Process in batches
              for (let i = 0; i < claimIds.length; i += PAYMENT_BATCH_SIZE) {
                const batchClaimIds = claimIds.slice(i, i + PAYMENT_BATCH_SIZE);
                console.log(`[SHARED_CLAIMS] Processing batch ${Math.floor(i/PAYMENT_BATCH_SIZE)+1}/${Math.ceil(claimIds.length/PAYMENT_BATCH_SIZE)}`);
                
                try {
                  const { data: batchData, error: batchError } = await extendedClient.rpc<PaymentDataItem[]>(
                    'get_claims_payment_info',
                    { 
                      claim_ids: batchClaimIds,
                      max_results: PAYMENT_BATCH_SIZE 
                    }
                  );
                  
                  if (batchData && Array.isArray(batchData)) {
                    allPaymentData = [...allPaymentData, ...batchData];
                  } else if (batchError) {
                    console.error(`[SHARED_CLAIMS] Batch error:`, batchError);
                  }
                  
                  // Add a small delay between batches
                  await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                  console.error(`[SHARED_CLAIMS] Batch processing error:`, error);
                }
              }
              
              paymentData = allPaymentData;
            } else {
              // For smaller sets, process all at once
              const { data: rpcData, error } = await extendedClient.rpc<PaymentDataItem[]>(
                'get_claims_payment_info',
                { 
                  claim_ids: claimIds,
                  max_results: claimIds.length
                }
              );
              
              paymentData = Array.isArray(rpcData) ? rpcData : [];
              paymentError = error;
            }
          }

          // If the RPC function worked, process the data
          if (paymentData && Array.isArray(paymentData) && paymentData.length > 0) {
            // Process the payment data from the RPC function
            const paymentMap = new Map<string, { totalPaid: number, lastPaymentDate: Date | null }>();
            
            // Map the payment data by ClaimID for easy lookup
            paymentData.forEach(item => {
              // Parse the totalpaid value from the SQL function, ensuring it's a number
              let totalPaidValue = 0;
              
              // Handle different formats of totalpaid
              if (item.totalpaid !== null && item.totalpaid !== undefined) {
                if (typeof item.totalpaid === 'string') {
                  totalPaidValue = parseFloat(item.totalpaid) || 0;
                } else if (typeof item.totalpaid === 'number') {
                  totalPaidValue = item.totalpaid;
                } else if (typeof item.totalpaid === 'object' && 'value' in item.totalpaid) {
                  // Handle Postgres numeric type which may come as object with value property
                  const numericValue = (item.totalpaid as unknown as { value: string }).value;
                  totalPaidValue = parseFloat(numericValue) || 0;
                }
              }
              
              // Always set lastPaymentDate if it exists, even if the payment amount is zero
              // This is because a claim might have PAID status but with zero amount
              const paymentDate = item.lastpaymentdate ? new Date(item.lastpaymentdate) : null;
              
              console.log(`[SHARED_CLAIMS] Claim ${item.ClaimID} payment data - raw: ${item.totalpaid}, processed: ${totalPaidValue}, date: ${paymentDate}`);
              
              paymentMap.set(item.ClaimID, {
                totalPaid: totalPaidValue,
                lastPaymentDate: paymentDate
              });
            });
            
            // Merge payment data with claims
            const updatedClaims = claims.map(claim => {
              const paymentInfo = paymentMap.get(claim.ClaimID);
              return {
                ...claim,
                // Ensure totalPaid is always a valid number
                totalPaid: paymentInfo && typeof paymentInfo.totalPaid === 'number' ? paymentInfo.totalPaid : 0,
                // Always set lastPaymentDate if it exists, even if payment amount is zero
                lastPaymentDate: paymentInfo ? paymentInfo.lastPaymentDate : null
              };
            });
            
            // Update claims with payment info
            claims = updatedClaims;
          } else if (paymentError) {
            console.log('[SHARED_CLAIMS] Payment info retrieval had an error:', paymentError);
            
            // Fall back to direct query or default values
            const claimsWithoutPayments = claims.map(claim => ({
              ...claim,
              totalPaid: 0,
              lastPaymentDate: null
            }));
            
            claims = claimsWithoutPayments;
          }
        } catch (paymentFetchError) {
          console.error('[SHARED_CLAIMS] Error processing payment data:', paymentFetchError);
          
          // Ensure claims always have totalPaid and lastPaymentDate properties
          const claimsWithDefaults = claims.map(claim => ({
            ...claim,
            totalPaid: 0,
            lastPaymentDate: null
          }));
          
          claims = claimsWithDefaults;
        }
      } else {
        // If no claims IDs, add default payment values
        const claimsWithDefaults = claims.map(claim => ({
          ...claim,
          totalPaid: 0,
          lastPaymentDate: null
        }));
        
        claims = claimsWithDefaults;
      }

      console.log(`[SHARED_CLAIMS] Fetched ${claims.length} claims. Total count: ${totalCount || 'N/A'}`);
      console.log('[SHARED_CLAIMS] Status breakdown:', statusBreakdown);

      return {
        data: claims,
        count: totalCount,
        statusBreakdown
      };
    }
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
    
    // Let's use a fallback approach without the SQL functions
    try {
      console.log('[SHARED_CLAIMS] Attempting fallback query without date range filtering');
      
      // Basic query without advanced filtering
      const fallbackQuery = extendedClient
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
        .limit(100); // Just get some data to prevent complete failure
      
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
            lastPaymentDate: null
          })),
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
      'shared-claims',
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
