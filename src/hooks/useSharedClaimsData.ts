import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PostgrestResponse } from '@supabase/supabase-js';
import { DateRange } from '@/lib/dateUtils';
import { getClaimStatus } from '@/utils/claimUtils';
import { Claim } from '@/lib/types';
import { Database } from '../../supabase/schema';
import { ClaimWithPaymentInDateRangeResult, ClaimPaymentInfoResult } from '../../supabase/types';

// Extend the Supabase types to include our custom RPC functions
declare module '@supabase/supabase-js' {
  interface SupabaseClient<
    Database = any,
    SchemaName extends string & keyof Database = 'public' extends keyof Database
      ? 'public'
      : string & keyof Database,
  > {
    rpc<
      Name extends string,
      Args extends Record<string, unknown> = Record<string, unknown>,
    >(
      fn: Name,
      args?: Args,
      options?: {
        head?: boolean;
        count?: 'exact' | 'planned' | 'estimated';
      },
    ): Promise<
      PostgrestResponse<
        Name extends 'get_claims_with_payment_in_date_range'
          ? ClaimWithPaymentInDateRangeResult[]
          : Name extends 'get_claims_payment_info'
          ? ClaimPaymentInfoResult[]
          : any
      >
    >;
  }
}

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
        const testFunctionResult = await supabase.rpc(
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
          const { data: claimsWithPayments, error: paymentRangeError } = await supabase.rpc(
            'get_claims_with_payment_in_date_range', 
            { 
              start_date: dateRange.from.toISOString(), 
              end_date: dateRange.to.toISOString() 
            }
          );
          
          if (paymentRangeError) {
            console.error("[SHARED_CLAIMS] Error getting claims with payments:", paymentRangeError);
          } else if (claimsWithPayments && Array.isArray(claimsWithPayments) && claimsWithPayments.length > 0) {
            // Extract claim IDs with payments in range
            const typedClaimsWithPayments = claimsWithPayments as unknown as ClaimWithPaymentInDateRangeResult[];
            const claimIds = typedClaimsWithPayments.map(item => item.ClaimID);
            console.log(`[SHARED_CLAIMS] Found ${claimIds.length} claims with payments in date range`);
            
            // Clear previous date filter and use claim IDs instead
            // Create a new query, since we can't easily remove the previous OR conditions
            query = supabase
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
      const countQuery = supabase
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
              const typedPaymentData = paymentData as unknown as ClaimPaymentInfoResult[];
              typedPaymentData.forEach(item => {
                paymentMap.set(item.ClaimID, {
                  totalPaid: parseFloat(String(item.totalpaid)) || 0,
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
        // Try to get payment information using SQL function
        console.log("[SHARED_CLAIMS] Fetching payment info for", claimIds.length, "claims");
        
        // Test if the function exists
        let paymentFunctionExists = false;
        try {
          const testResult = await supabase.rpc(
            'get_claims_payment_info',
            { claim_ids: [claimIds[0] || 'test'] }
          );
          
          if (!testResult.error || !testResult.error.message.includes('function does not exist')) {
            paymentFunctionExists = true;
          }
        } catch (testError) {
          console.error("[SHARED_CLAIMS] Error testing payment info function:", testError);
        }
        
        let paymentData = null;
        let paymentError = null;
        
        if (paymentFunctionExists) {
          console.log("[SHARED_CLAIMS] Using get_claims_payment_info function");
          const result = await supabase.rpc(
            'get_claims_payment_info',
            { claim_ids: claimIds }
          );
          paymentData = result.data;
          paymentError = result.error;
        } else {
          console.log("[SHARED_CLAIMS] get_claims_payment_info function doesn't exist");
          paymentError = { message: 'function does not exist' };
        }
        
        // If the RPC function doesn't exist or had an error, fall back to direct query
        if (paymentError) {
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
          const typedPaymentData = paymentData as unknown as ClaimPaymentInfoResult[];
          typedPaymentData.forEach(item => {
            // Parse the totalpaid value from the SQL function, ensuring it's a number
            let totalPaidValue = 0;
            
            // Handle different formats of totalpaid
            if (item.totalpaid !== null && item.totalpaid !== undefined) {
              if (typeof item.totalpaid === 'string') {
                totalPaidValue = parseFloat(item.totalpaid) || 0;
              } else if (typeof item.totalpaid === 'number') {
                totalPaidValue = item.totalpaid;
              } else if (typeof item.totalpaid === 'object' && 
                         item.totalpaid !== null && 
                         'value' in item.totalpaid) {
                // Handle Postgres numeric type which may come as object with value property
                const numericValue = (item.totalpaid as any).value;
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
    
    // Check if payment data was already processed by looking for totalPaid property
    const hasExistingPaymentData = claims.some(claim => 
      'totalPaid' in claim && 'lastPaymentDate' in claim
    );
    
    // Only apply default values if payment data wasn't already processed
    const claimsWithPaymentInfo = hasExistingPaymentData 
      ? claims 
      : claims.map(claim => ({
          ...claim,
          totalPaid: 0,  // Default value - always a number, never undefined or null
          lastPaymentDate: null  // Default value - always null for unpaid claims
        }));

    console.log(`[SHARED_CLAIMS] Fetched ${claims.length} claims. Total count: ${count || 'N/A'}`);
    console.log('[SHARED_CLAIMS] Status breakdown:', statusBreakdown);
    console.log('[SHARED_CLAIMS] Payment data status:', hasExistingPaymentData 
      ? 'Using existing payment data' 
      : 'Applied default payment values');
      
    // Debug output for payment data - show sample of first few claims
    if (process.env.NODE_ENV === 'development' && claims.length > 0) {
      const sampleClaims = claims.slice(0, Math.min(3, claims.length));
      console.log('[SHARED_CLAIMS] Payment data sample:', 
        sampleClaims.map(claim => ({
          ClaimID: claim.ClaimID,
          paymentInfo: {
            totalPaid: 'totalPaid' in claim ? claim.totalPaid : 'not set',
            lastPaymentDate: 'lastPaymentDate' in claim && claim.lastPaymentDate 
              ? new Date(claim.lastPaymentDate as string | number | Date).toISOString() 
              : 'not set'
          }
        }))
      );
    }

    return {
      data: claimsWithPaymentInfo,
      count,
      statusBreakdown
    };
  } catch (error) {
    // Improved error logging with more details
    console.error('[SHARED_CLAIMS] Error in fetchClaimsData:', error);
    console.error('[SHARED_CLAIMS] Error details:', JSON.stringify(error, null, 2));
    
    if (error && (error as any).message) {
      console.error('[SHARED_CLAIMS] Error message:', (error as any).message);
    }
    
    if (error && (error as any).code) {
      console.error('[SHARED_CLAIMS] Error code:', (error as any).code);
    }
    
    if (error && (error as any).details) {
      console.error('[SHARED_CLAIMS] Error details:', (error as any).details);
    }
    
    // Let's use a fallback approach without the SQL functions
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