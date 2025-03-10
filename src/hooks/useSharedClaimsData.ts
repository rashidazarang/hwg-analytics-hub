
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { getClaimStatus } from '@/utils/claimUtils';
import { Claim } from '@/lib/types';

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
    // Debug log - print current time for reference
    const now = new Date();
    console.log(`[SHARED_CLAIMS] Starting claims fetch at ${now.toISOString()}`);
    console.log(`[SHARED_CLAIMS] Using date range: ${dateRange.from.toISOString()} to ${dateRange.to.toISOString()}`);
    
    // Start building the query with all needed fields
    // Note: We avoid the nested subclaims fetch to prevent relationship ambiguity
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
      `, { count: includeCount ? 'exact' : undefined });

    // First, we need to determine if we can use the optimized payment date filtering
    // Let's check if the function exists in Supabase
    let usePaymentDateFiltering = false;
    
    try {
      // Try to check if the function exists by calling it with a simple test
      await supabase.rpc('get_claims_with_payment_in_date_range', {
        start_date: new Date("2000-01-01").toISOString(),
        end_date: new Date("2000-01-02").toISOString()
      });
      
      usePaymentDateFiltering = true;
      console.log("[SHARED_CLAIMS] Found payment date filtering function, will use it for date filtering");
    } catch (e) {
      console.log("[SHARED_CLAIMS] Payment date filtering function not found, using traditional date filtering instead");
      
      // Apply traditional date range filter on claim dates
      query = query.or(
        `ReportedDate.gte.${dateRange.from.toISOString()},` +
        `ReportedDate.lte.${dateRange.to.toISOString()},` +
        `LastModified.gte.${dateRange.from.toISOString()},` +
        `LastModified.lte.${dateRange.to.toISOString()}`
      );
    }
    
    // If we can use payment date filtering, we need a more complex approach
    if (usePaymentDateFiltering) {
      try {
        // Get IDs of claims with payments in the date range
        const { data: paymentRangeClaimIds, error: paymentRangeError } = await supabase.rpc(
          'get_claims_with_payment_in_date_range', 
          { 
            start_date: dateRange.from.toISOString(), 
            end_date: dateRange.to.toISOString() 
          }
        );
        
        if (paymentRangeError) {
          throw paymentRangeError;
        }
        
        if (paymentRangeClaimIds && paymentRangeClaimIds.length > 0) {
          // Extract the claim IDs from the result
          const claimIdsWithPayments = paymentRangeClaimIds.map(r => r.ClaimID);
          
          // Include claims with reported/lastmodified dates in range OR payments in range
          query = query.or(
            `ClaimID.in.(${claimIdsWithPayments.map(id => `"${id}"`).join(',')})` + 
            `,ReportedDate.gte.${dateRange.from.toISOString()},` +
            `ReportedDate.lte.${dateRange.to.toISOString()},` + 
            `LastModified.gte.${dateRange.from.toISOString()},` +
            `LastModified.lte.${dateRange.to.toISOString()}`
          );
        } else {
          // If no claims have payments in the range, fall back to traditional filtering
          query = query.or(
            `ReportedDate.gte.${dateRange.from.toISOString()},` +
            `ReportedDate.lte.${dateRange.to.toISOString()},` +
            `LastModified.gte.${dateRange.from.toISOString()},` +
            `LastModified.lte.${dateRange.to.toISOString()}`
          );
        }
      } catch (e) {
        console.error("[SHARED_CLAIMS] Error using payment date filtering:", e);
        
        // Fall back to traditional date filtering
        query = query.or(
          `ReportedDate.gte.${dateRange.from.toISOString()},` +
          `ReportedDate.lte.${dateRange.to.toISOString()},` +
          `LastModified.gte.${dateRange.from.toISOString()},` +
          `LastModified.lte.${dateRange.to.toISOString()}`
        );
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
      // Use the same filtering conditions as the main query for consistency
      const countQuery = supabase
        .from("claims")
        .select(`
          id,
          agreements!inner(DealerUUID)
        `, { count: 'exact', head: true });
      
      // Apply the same date range logic as the main query
      if (usePaymentDateFiltering) {
        try {
          // Get IDs of claims with payments in the date range
          const { data: countPaymentRangeClaimIds, error: countPaymentRangeError } = await supabase.rpc(
            'get_claims_with_payment_in_date_range', 
            { 
              start_date: dateRange.from.toISOString(), 
              end_date: dateRange.to.toISOString() 
            }
          );
          
          if (countPaymentRangeError) {
            throw countPaymentRangeError;
          }
          
          if (countPaymentRangeClaimIds && countPaymentRangeClaimIds.length > 0) {
            // Extract the claim IDs from the result
            const countClaimIdsWithPayments = countPaymentRangeClaimIds.map(r => r.ClaimID);
            
            // Include claims with reported/lastmodified dates in range OR payments in range
            countQuery.or(
              `ClaimID.in.(${countClaimIdsWithPayments.map(id => `"${id}"`).join(',')})` + 
              `,ReportedDate.gte.${dateRange.from.toISOString()},` +
              `ReportedDate.lte.${dateRange.to.toISOString()},` + 
              `LastModified.gte.${dateRange.from.toISOString()},` +
              `LastModified.lte.${dateRange.to.toISOString()}`
            );
          } else {
            // If no claims have payments in the range, fall back to traditional filtering
            countQuery.or(
              `ReportedDate.gte.${dateRange.from.toISOString()},` +
              `ReportedDate.lte.${dateRange.to.toISOString()},` +
              `LastModified.gte.${dateRange.from.toISOString()},` +
              `LastModified.lte.${dateRange.to.toISOString()}`
            );
          }
        } catch (e) {
          console.error("[SHARED_CLAIMS] Error using payment date filtering for count query:", e);
          
          // Fall back to traditional date filtering
          countQuery.or(
            `ReportedDate.gte.${dateRange.from.toISOString()},` +
            `ReportedDate.lte.${dateRange.to.toISOString()},` +
            `LastModified.gte.${dateRange.from.toISOString()},` +
            `LastModified.lte.${dateRange.to.toISOString()}`
          );
        }
      } else {
        // Traditional date range filter for count
        countQuery.or(
          `ReportedDate.gte.${dateRange.from.toISOString()},` +
          `ReportedDate.lte.${dateRange.to.toISOString()},` +
          `LastModified.gte.${dateRange.from.toISOString()},` +
          `LastModified.lte.${dateRange.to.toISOString()}`
        );
      }
      
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
        let allData: any[] = [];
        
        // Fetch data in parallel batches to improve performance
        const batchPromises = Array.from({ length: totalBatches }, (_, i) => {
          const start = i * batchSize;
          const end = start + batchSize - 1;
          
          let batchQuery = supabase
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
            // Use the optimized SQL query to get payment information for all claims at once
            const { data: paymentData, error: paymentError } = await supabase.rpc(
              'get_claims_payment_info',
              { claim_ids: claimIds }
            );
            
            // If the RPC function doesn't exist yet, fall back to a direct query
            if (paymentError && paymentError.message.includes('function does not exist')) {
              console.log('[SHARED_CLAIMS] Payment info RPC not found, using direct query for batched claims');
              
              // Process claims in smaller batches to avoid query size limits
              const batchSize = 100; // Process 100 claims at a time
              const totalBatches = Math.ceil(claimIds.length / batchSize);
              const paymentMap = new Map();
              
              for (let i = 0; i < totalBatches; i++) {
                const batchClaimIds = claimIds.slice(i * batchSize, (i + 1) * batchSize);
                
                // Build a query to get payment information for this batch
                const { data: batchPaymentData, error: batchError } = await supabase.from('claims')
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
                  .in('ClaimID', batchClaimIds);
                  
                if (batchError) {
                  console.error(`[SHARED_CLAIMS] Error fetching payment data for batch ${i+1}:`, batchError);
                  continue;
                }
                
                if (batchPaymentData) {
                  // Process the payment data for this batch
                  batchPaymentData.forEach(claim => {
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
                    
                    paymentMap.set(claim.ClaimID, {
                      totalPaid,
                      lastPaymentDate
                    });
                  });
                }
              }
              
              // Merge payment data with all claims
              processedClaims = allData.map(claim => {
                const paymentInfo = paymentMap.get(claim.ClaimID);
                return {
                  ...claim,
                  totalPaid: paymentInfo ? paymentInfo.totalPaid : 0,
                  lastPaymentDate: paymentInfo ? paymentInfo.lastPaymentDate : null
                };
              });
            } else if (paymentData) {
              // Process the payment data from the RPC function
              const paymentMap = new Map();
              
              // Map the payment data by ClaimID for easy lookup
              paymentData.forEach(item => {
                paymentMap.set(item.ClaimID, {
                  totalPaid: parseFloat(item.totalpaid) || 0,
                  lastPaymentDate: item.lastpaymentdate ? new Date(item.lastpaymentdate) : null
                });
              });
              
              // Merge payment data with claims
              processedClaims = allData.map(claim => {
                const paymentInfo = paymentMap.get(claim.ClaimID);
                return {
                  ...claim,
                  totalPaid: paymentInfo ? paymentInfo.totalPaid : 0,
                  lastPaymentDate: paymentInfo ? paymentInfo.lastPaymentDate : null
                };
              });
            }
          } catch (paymentError) {
            console.error('[SHARED_CLAIMS] Error processing batch payment data:', paymentError);
          }
        }
        
        // If we couldn't get payment data, use default values
        const claimsWithPaymentInfo = processedClaims.map(claim => {
          if (claim.totalPaid === undefined) {
            return {
              ...claim,
              totalPaid: 0,
              lastPaymentDate: null
            };
          }
          return claim;
        });
        
        console.log(`[SHARED_CLAIMS] Fetched all ${allData.length} claims in ${totalBatches} batches`);
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

    const { data, error, count } = await query;

    if (error) {
      console.error('[SHARED_CLAIMS] Error fetching claims:', error);
      throw error;
    }

    // Process the claims data to get status breakdown
    let claims = data || [];
    
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
        // Use the optimized SQL query to get payment information for all claims at once
        const { data: paymentData, error: paymentError } = await supabase.rpc(
          'get_claims_payment_info',
          { claim_ids: claimIds }
        );
        
        // If the RPC function doesn't exist yet, fall back to a direct query
        if (paymentError && paymentError.message.includes('function does not exist')) {
          console.log('[SHARED_CLAIMS] Payment info RPC not found, using direct query');
          
          // Build a query to get payment information for all claims in one batch
          const { data: directPaymentData, error: directError } = await supabase.from('claims')
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
            const paymentMap = new Map();
            
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
            // Using let variable for the transformed claims instead of reassigning claims
            const processedClaims = claims.map(claim => {
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
            claims = processedClaims;
            
            return {
              data: claims,
              count,
              statusBreakdown
            };
          }
        } else if (paymentData) {
          // Process the payment data from the RPC function
          const paymentMap = new Map();
          
          console.log('[SHARED_CLAIMS] Payment data from RPC:', paymentData);
          
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
              } else if (typeof item.totalpaid === 'object' && item.totalpaid.hasOwnProperty('value')) {
                // Handle Postgres numeric type which may come as object with value property
                totalPaidValue = parseFloat(item.totalpaid.value) || 0;
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
          // Using let variable for the transformed claims instead of reassigning claims
          const processedClaims = claims.map(claim => {
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
          claims = processedClaims;
          
          return {
            data: claims,
            count,
            statusBreakdown
          };
        }
      } catch (paymentError) {
        console.error('[SHARED_CLAIMS] Error processing payment data:', paymentError);
      }
    }
    
    // If we couldn't get payment data, use default values
    // Always set totalPaid to a valid number (0)
    // and set lastPaymentDate to null
    const claimsWithPaymentInfo = claims.map(claim => ({
      ...claim,
      totalPaid: 0,  // Default value - always a number, never undefined or null
      lastPaymentDate: null  // Default value - always null for unpaid claims
    }));

    console.log(`[SHARED_CLAIMS] Fetched ${claims.length} claims. Total count: ${count || 'N/A'}`);
    console.log('[SHARED_CLAIMS] Status breakdown:', statusBreakdown);

    return {
      data: claimsWithPaymentInfo,
      count,
      statusBreakdown
    };
  } catch (error) {
    console.error('[SHARED_CLAIMS] Error in fetchClaimsData:', error);
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
