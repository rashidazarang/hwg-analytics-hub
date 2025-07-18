import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Function to get the last payment date for a claim
export function getLastPaymentDate(claimId: string, subclaims: any[]) {
  // Filter subclaims for the specific claim
  const relevantSubclaims = subclaims.filter(subclaim => 
    subclaim.ClaimID === claimId && 
    subclaim.Status === 'PAID' // Only consider paid subclaims
  );
  
  // If no paid subclaims, return null
  if (relevantSubclaims.length === 0) return null;
  
  // Get all payment dates - use the Closed date as the payment date
  const paymentDates = relevantSubclaims
    .map(subclaim => subclaim.Closed)
    .filter(date => date !== null); 

  // Return the most recent date
  return paymentDates.length > 0 
    ? new Date(Math.max(...paymentDates.map(date => new Date(date).getTime())))
    : null;
}

// Function to calculate the total paid value for a claim
export function getTotalPaidValue(claimId: string, subclaims: any[], subclaimParts: any[]) {
  // Step 1: Get all subclaims for this claim
  const relevantSubclaims = subclaims.filter(subclaim => 
    subclaim.ClaimID === claimId
  );
  
  // Step 2: Get all subclaim IDs
  const subclaimIds = relevantSubclaims.map(subclaim => subclaim.SubClaimID);
  
  // Step 3: Get all parts for these subclaims
  const relevantParts = subclaimParts.filter(part => 
    subclaimIds.includes(part.SubClaimID)
  ); 

  // Step 4: Sum up the PaidPrice for all parts
  const totalPaid = relevantParts.reduce((sum, part) => {
    // Handle different data types for PaidPrice
    let paidAmount = 0;
    
    if (part.PaidPrice !== null && part.PaidPrice !== undefined) {
      if (typeof part.PaidPrice === 'number') {
        paidAmount = part.PaidPrice;
      } else if (typeof part.PaidPrice === 'string') {
        paidAmount = parseFloat(part.PaidPrice) || 0;
      } else if (typeof part.PaidPrice === 'object' && part.PaidPrice.hasOwnProperty('value')) {
        paidAmount = parseFloat(part.PaidPrice.value) || 0;
      }
    }
    
    return sum + paidAmount;
  }, 0);
  
  return totalPaid;
}

// Batch query function for better performance - prefetch subclaims for a batch of claims
export async function fetchSubclaimsForClaims(claimIds: string[]) {
  if (!claimIds.length) return [];
  
  console.log(`[CLAIM_PAYMENT] Fetching payment data for ${claimIds.length} claims`);
  
  // First, check if we can fetch payment data using the SQL function
  let useSqlFunction = true;
  
  // Try a test query with the first claim ID to check if the function exists
  try {
    console.log(`[CLAIM_PAYMENT] Testing SQL function with claim ID: ${claimIds[0]}`);
    
    // Fix for ClaimID type mismatch in test call
    const isNumeric = claimIds.length > 0 && !isNaN(Number(claimIds[0]));
    const formattedTestId = isNumeric ? Number(claimIds[0]) : claimIds[0];
    
    const testResult = await supabase.rpc(
      'get_claims_payment_info',
      { 
        claim_ids: [formattedTestId], // Using properly formatted ID
        max_results: 1
      }
    );
    
    if (testResult.error) {
      console.error('[CLAIM_PAYMENT] SQL function test failed:', testResult.error);
      useSqlFunction = false;
    } else {
      console.log('[CLAIM_PAYMENT] SQL function test succeeded:', testResult.data);
      
      // Log the structure of the returned data for debugging
      if (testResult.data && testResult.data.length > 0) {
        console.log('[CLAIM_PAYMENT] Sample data structure:', {
          keys: Object.keys(testResult.data[0]),
          totalpaid: testResult.data[0].totalpaid || testResult.data[0].TotalPaid,
          totalpaidType: typeof (testResult.data[0].totalpaid || testResult.data[0].TotalPaid),
          lastpaymentdate: testResult.data[0].lastpaymentdate || testResult.data[0].LastPaymentDate
        });
      }
    }
  } catch (testError) {
    console.error('[CLAIM_PAYMENT] Error testing SQL function:', testError);
    useSqlFunction = false;
  }
  
  // If the SQL function is available, use it
  if (useSqlFunction) {
    try {
      // Process in reasonable batches to avoid hitting limits
      const BATCH_SIZE = 100; // Use smaller batches for better error tracking
      let allResults = [];
      
      // Process claims in batches to prevent timeouts or memory issues
      for (let i = 0; i < claimIds.length; i += BATCH_SIZE) {
        const batchClaimIds = claimIds.slice(i, i + BATCH_SIZE);
        console.log(`[CLAIM_PAYMENT] Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(claimIds.length/BATCH_SIZE)}, size: ${batchClaimIds.length}`);
        
        try {
          // Fix for ClaimID type mismatch - ensure we're passing values in the correct type
          const areClaimIdsNumeric = batchClaimIds.length > 0 && !isNaN(Number(batchClaimIds[0]));
          
          // Convert claim IDs to the appropriate type
          const formattedClaimIds = areClaimIdsNumeric 
            ? batchClaimIds.map(id => Number(id)) // Convert to numbers if they appear numeric
            : batchClaimIds; // Keep as strings if they're not numeric
            
          console.log(`[CLAIM_PAYMENT] Using ${areClaimIdsNumeric ? 'numeric' : 'string'} claim IDs:`, 
            formattedClaimIds.slice(0, 2)); // Log first two for debugging
          
          const { data: batchResults, error: batchError } = await supabase.rpc(
            'get_claims_payment_info',
            { 
              claim_ids: formattedClaimIds,
              max_results: null // No arbitrary limit - get all results
            }
          );
          
          if (batchError) {
            console.error(`[CLAIM_PAYMENT] Error in batch ${Math.floor(i/BATCH_SIZE) + 1}:`, batchError);
            continue;
          }
          
          if (batchResults && Array.isArray(batchResults)) {
            console.log(`[CLAIM_PAYMENT] Batch ${Math.floor(i/BATCH_SIZE) + 1} returned ${batchResults.length} results`);
            
            // Log the first result of each batch for debugging
            if (batchResults.length > 0) {
              console.log(`[CLAIM_PAYMENT] Sample from batch ${Math.floor(i/BATCH_SIZE) + 1}:`, {
                ClaimID: batchResults[0].ClaimID,
                totalpaid: batchResults[0].totalpaid || batchResults[0].TotalPaid,
                totalpaidType: typeof (batchResults[0].totalpaid || batchResults[0].TotalPaid),
                lastpaymentdate: batchResults[0].lastpaymentdate || batchResults[0].LastPaymentDate
              });
            }
            
            allResults.push(...batchResults);
          } else {
            console.warn(`[CLAIM_PAYMENT] Batch ${Math.floor(i/BATCH_SIZE) + 1} returned no data`);
          }
        } catch (batchError) {
          console.error(`[CLAIM_PAYMENT] Exception in batch ${Math.floor(i/BATCH_SIZE) + 1}:`, batchError);
        }
      }
      
      if (allResults.length > 0) {
        console.log(`[CLAIM_PAYMENT] Successfully retrieved payment data for ${allResults.length} claims using SQL function`);
        
        // Process and return the payment data
        const processedResults = allResults.map((item: any) => {
          try {
            // Enhanced function to handle different totalpaid formats
            const extractTotalPaid = (value: any): number => {
              // If value is null or undefined, return 0
              if (value === null || value === undefined) return 0;
              
              // Handle numeric type directly
              if (typeof value === 'number') {
                return isNaN(value) ? 0 : value;
              }
              
              // Handle string representation
              if (typeof value === 'string') {
                const parsed = parseFloat(value);
                return isNaN(parsed) ? 0 : parsed;
              }
              
              // Handle Postgres numeric type (object with value property)
              if (typeof value === 'object') {
                // If the object has a value property
                if (value && 'value' in value) {
                  const parsed = parseFloat(value.value);
                  return isNaN(parsed) ? 0 : parsed;
                }
                
                // Try JSON value if present
                if (value && 'json' in value) {
                  try {
                    const jsonVal = JSON.parse(value.json);
                    return typeof jsonVal === 'number' ? jsonVal : 0;
                  } catch (e) {
                    console.error('[CLAIM_PAYMENT] Error parsing JSON value:', e);
                    return 0;
                  }
                }
                
                // Last resort - try to stringify and parse the object
                try {
                  const strValue = String(value);
                  const parsed = parseFloat(strValue);
                  return isNaN(parsed) ? 0 : parsed;
                } catch (e) {
                  console.error('[CLAIM_PAYMENT] Error parsing object as string:', e);
                  return 0;
                }
              }
              
              // Default fallback
              return 0;
            };
            
            // Use the enhanced extraction function
            const totalPaidValue = extractTotalPaid(item.totalpaid || item.TotalPaid);
            
            // Log processing for debugging
            console.log(`[CLAIM_PAYMENT] Processed ${item.ClaimID}: `, {
              originalValue: item.totalpaid || item.TotalPaid,
              originalType: typeof (item.totalpaid || item.TotalPaid), 
              processedValue: totalPaidValue
            });
            
            return {
              ClaimID: item.ClaimID,
              totalPaid: totalPaidValue,
              lastPaymentDate: item.lastpaymentdate || item.LastPaymentDate ? new Date(item.lastpaymentdate || item.LastPaymentDate) : null
            };
          } catch (processError) {
            console.error(`[CLAIM_PAYMENT] Error processing item ${item.ClaimID}:`, processError);
            // Return default values in case of error
            return {
              ClaimID: item.ClaimID,
              totalPaid: 0,
              lastPaymentDate: null
            };
          }
        });
        
        return processedResults;
      } else {
        console.error('[CLAIM_PAYMENT] SQL function returned no results, falling back to direct fetch');
      }
    } catch (sqlError) {
      console.error('[CLAIM_PAYMENT] Error using SQL function, falling back to direct fetch:', sqlError);
    }
  }
  
  // Fallback to direct fetch
  console.log('[CLAIM_PAYMENT] Using direct fetch for subclaims');
  
  try {
    // Get all subclaims for these claims in batches
    let allSubclaims: any[] = [];
    const BATCH_SIZE = 200; // Use smaller batches for better tracking
    
    console.log(`[CLAIM_PAYMENT] Fetching subclaims for ${claimIds.length} claims in batches of ${BATCH_SIZE}`);
    
    for (let i = 0; i < claimIds.length; i += BATCH_SIZE) {
      const batchClaimIds = claimIds.slice(i, i + BATCH_SIZE);
      console.log(`[CLAIM_PAYMENT] Fetching subclaims batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(claimIds.length/BATCH_SIZE)}`);
      
      try {
        // Only get subclaims with PAID status to improve performance
        const { data, error } = await supabase
          .from('subclaims')
          .select('*')
          .in('ClaimID', batchClaimIds)
          .eq('Status', 'PAID'); // Only get PAID subclaims
          
        if (error) {
          console.error(`[CLAIM_PAYMENT] Error fetching subclaims batch:`, error);
          continue; // Skip this batch on error but continue with others
        }
        
        if (data) {
          console.log(`[CLAIM_PAYMENT] Fetched ${data.length} PAID subclaims for batch`);
          
          // Log sample data for debugging
          if (data.length > 0) {
            console.log('[CLAIM_PAYMENT] Sample subclaim:', {
              ClaimID: data[0].ClaimID,
              SubClaimID: data[0].SubClaimID,
              Status: data[0].Status,
              LastModified: data[0].LastModified
            });
          }
          
          allSubclaims.push(...data);
        }
      } catch (batchError) {
        console.error(`[CLAIM_PAYMENT] Exception fetching subclaims batch:`, batchError);
      }
    }
    
    console.log(`[CLAIM_PAYMENT] Total PAID subclaims fetched: ${allSubclaims.length}`);
    
    // If no paid subclaims were found, return default values
    if (allSubclaims.length === 0) {
      console.log('[CLAIM_PAYMENT] No PAID subclaims found, returning zero amounts');
      return claimIds.map(claimId => ({
        ClaimID: claimId,
        totalPaid: 0,
        lastPaymentDate: null
      }));
    }
    
    // Get all subclaim parts for all subclaims in batches
    const allSubclaimIds = allSubclaims.map(s => s.SubClaimID);
    let allSubclaimParts: any[] = [];
    
    console.log(`[CLAIM_PAYMENT] Fetching parts for ${allSubclaimIds.length} subclaims in batches of ${BATCH_SIZE}`);
    
    for (let i = 0; i < allSubclaimIds.length; i += BATCH_SIZE) {
      const batchIds = allSubclaimIds.slice(i, i + BATCH_SIZE);
      console.log(`[CLAIM_PAYMENT] Fetching parts batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(allSubclaimIds.length/BATCH_SIZE)}`);
      
      try {
        const { data, error } = await supabase
          .from('subclaim_parts')
          .select('*')
          .in('SubClaimID', batchIds);
          
        if (error) {
          console.error(`[CLAIM_PAYMENT] Error fetching parts batch:`, error);
          continue; // Skip this batch on error but continue with others
        }
        
        if (data) {
          console.log(`[CLAIM_PAYMENT] Fetched ${data.length} parts for batch`);
          
          // Log sample data for debugging
          if (data.length > 0) {
            console.log('[CLAIM_PAYMENT] Sample subclaim part:', {
              SubClaimID: data[0].SubClaimID,
              PaidPrice: data[0].PaidPrice,
              PaidPriceType: typeof data[0].PaidPrice
            });
          }
          
          allSubclaimParts.push(...data);
        }
      } catch (partsError) {
        console.error(`[CLAIM_PAYMENT] Exception fetching parts batch:`, partsError);
      }
    }
    
    console.log(`[CLAIM_PAYMENT] Total subclaim parts fetched: ${allSubclaimParts.length}`);
    
    // Create a map of subclaim parts by SubClaimID for faster lookups
    const partsMap = new Map<string, any[]>();
    allSubclaimParts.forEach(part => {
      if (!partsMap.has(part.SubClaimID)) {
        partsMap.set(part.SubClaimID, []);
      }
      partsMap.get(part.SubClaimID)?.push(part);
    });
    
    // Create a map of subclaims by ClaimID for faster lookups
    const subclaimsMap = new Map<string, any[]>();
    allSubclaims.forEach(subclaim => {
      if (!subclaimsMap.has(subclaim.ClaimID)) {
        subclaimsMap.set(subclaim.ClaimID, []);
      }
      subclaimsMap.get(subclaim.ClaimID)?.push(subclaim);
    });
    
    // Process the data for each claim efficiently using the maps
    return claimIds.map(claimId => {
      const claimSubclaims = subclaimsMap.get(claimId) || [];
      
      // Calculate the last payment date
      let lastPaymentDate: Date | null = null;
      
      if (claimSubclaims.length > 0) {
        // Get all modified dates
        const modifiedDates = claimSubclaims
          .filter(sc => sc.LastModified)
          .map(sc => new Date(sc.LastModified));
        
        // Get the most recent date
        if (modifiedDates.length > 0) {
          lastPaymentDate = new Date(Math.max(...modifiedDates.map(d => d.getTime())));
        }
      }
      
      // Calculate the total paid amount
      let totalPaid = 0;
      
      for (const subclaim of claimSubclaims) {
        const parts = partsMap.get(subclaim.SubClaimID) || [];
        
        for (const part of parts) {
          if (part.PaidPrice !== null && part.PaidPrice !== undefined) {
            // Handle different formats of PaidPrice
            let partAmount = 0;
            
            if (typeof part.PaidPrice === 'number') {
              partAmount = part.PaidPrice;
            } else if (typeof part.PaidPrice === 'string') {
              partAmount = parseFloat(part.PaidPrice) || 0;
            } else if (typeof part.PaidPrice === 'object' && part.PaidPrice !== null) {
              if ('value' in part.PaidPrice) {
                partAmount = parseFloat(part.PaidPrice.value) || 0;
              } else {
                // Try to convert the object to a string and parse it
                const strValue = String(part.PaidPrice);
                partAmount = parseFloat(strValue) || 0;
              }
            }
            
            totalPaid += partAmount;
          }
        }
      }
      
      // Log for debugging
      if (claimSubclaims.length > 0) {
        console.log(`[CLAIM_PAYMENT] Claim ${claimId}: ${claimSubclaims.length} subclaims, total paid: $${totalPaid.toFixed(2)}`);
      }
      
      return {
        ClaimID: claimId,
        totalPaid,
        lastPaymentDate
      };
    });
  } catch (directFetchError) {
    console.error('[CLAIM_PAYMENT] Fatal error in direct fetch:', directFetchError);
    
    // Return default values as a last resort
    return claimIds.map(claimId => ({
      ClaimID: claimId,
      totalPaid: 0,
      lastPaymentDate: null
    }));
  }
}

// Hook to get payment data for all claims with optimized caching
export function useAllClaimsPaymentData() {
  return useQuery({
    queryKey: ['all-claims-payment'],
    queryFn: async () => {
      console.log('[CLAIM_PAYMENT] Fetching payment data for all claims');
      
      try {
        const { data, error } = await supabase.rpc(
          'get_claims_payment_info',
          { 
            claim_ids: [], // Empty array means get all claims
            max_results: 10000 // Large number to get all claims
          }
        );

        if (error) {
          console.error('[CLAIM_PAYMENT] Error fetching all claims payment data:', error);
          throw error;
        }

        if (!data || !Array.isArray(data)) {
          console.log('[CLAIM_PAYMENT] No payment data returned');
          return {};
        }

        // Convert array to object keyed by claim_id for fast lookup
        const paymentMap: Record<string, { totalPaid: number; lastPaymentDate: string | null }> = {};
        
        data.forEach((item: any) => {
          paymentMap[item.claim_id] = {
            totalPaid: item.total_paid_amount || 0,
            lastPaymentDate: item.last_payment_date
          };
        });

        console.log(`[CLAIM_PAYMENT] Successfully cached payment data for ${Object.keys(paymentMap).length} claims`);
        return paymentMap;

      } catch (error) {
        console.error('[CLAIM_PAYMENT] Exception fetching all claims payment data:', error);
        throw error;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
  });
}

export function useClaimPaymentData(claimId: string) {
  const queryClient = useQueryClient();
  
  // First try to get data from the all-claims cache
  const allClaimsData = queryClient.getQueryData(['all-claims-payment']) as Record<string, { totalPaid: number; lastPaymentDate: string | null }> | undefined;
  
  // If we have cached data for this specific claim, return it directly
  const cachedPaymentData = useMemo(() => {
    if (allClaimsData && allClaimsData[claimId]) {
      console.log(`[CLAIM_PAYMENT] Using cached data for claim ${claimId}`);
      return {
        data: allClaimsData[claimId],
        isLoading: false,
        error: null
      };
    }
    return null;
  }, [allClaimsData, claimId]);

  // Otherwise fall back to individual claim query with enhanced error handling
  const { data, isLoading, error } = useQuery({
    queryKey: ['claim-payment', claimId],
    queryFn: async () => {
      console.log(`[CLAIM_PAYMENT] Fetching payment data for individual claim: ${claimId}`);
      
      // ALWAYS use the SQL function - prioritize RPC
      try {
        console.log(`[CLAIM_PAYMENT] Using SQL function for claim ${claimId}`);
        
        // Fix for ClaimID type mismatch when fetching individual claim
        const isNumeric = !isNaN(Number(claimId));
        const formattedClaimId = isNumeric ? Number(claimId) : claimId;
        
        console.log(`[CLAIM_PAYMENT] Processing individual claim ID as ${isNumeric ? 'numeric' : 'string'}: ${formattedClaimId}`);
        
        const { data, error } = await supabase.rpc(
          'get_claims_payment_info',
          { 
            claim_ids: [formattedClaimId], // Using properly formatted ID
            max_results: 1 // Just get one result since we're only interested in this claim
          }
        );
        
        if (error) {
          console.error(`[CLAIM_PAYMENT] SQL function error for claim ${claimId}:`, error);
          throw error; // Throw the error to trigger the fallback
        }
        
        if (!data || !Array.isArray(data) || data.length === 0) {
          console.log(`[CLAIM_PAYMENT] SQL function returned no data for claim ${claimId}`);
          return { totalPaid: 0, lastPaymentDate: null };
        }
        
        console.log(`[CLAIM_PAYMENT] SQL function succeeded for claim ${claimId}`, data[0]);
        
        const item = data[0];
        return {
          totalPaid: item.total_paid_amount || 0,
          lastPaymentDate: item.last_payment_date
        };
        
      } catch (rpcError) {
        console.error(`[CLAIM_PAYMENT] RPC function failed for claim ${claimId}:`, rpcError);
        
        // Fallback to direct subclaims query
        try {
          console.log(`[CLAIM_PAYMENT] Trying fallback subclaims query for claim ${claimId}`);
          
          const { data: subclaims, error: subclaimsError } = await supabase
            .from('subclaims')
            .select('TotalCost, Status, Closed')
            .eq('ClaimID', claimId);
          
          if (subclaimsError) {
            console.error(`[CLAIM_PAYMENT] Subclaims fallback error for claim ${claimId}:`, subclaimsError);
            throw subclaimsError;
          }
          
          let totalPaid = 0;
          let lastPaymentDate: Date | null = null;
          
          if (subclaims && subclaims.length > 0) {
            subclaims.forEach((subclaim: any) => {
              // Only count paid subclaims
              if (subclaim.Status === 'PAID') {
                totalPaid += subclaim.TotalCost || 0;
                
                // Track the most recent payment date
                if (subclaim.Closed) {
                  const closedDate = new Date(subclaim.Closed);
                  if (!lastPaymentDate || closedDate > lastPaymentDate) {
                    lastPaymentDate = closedDate;
                  }
                }
              }
            });
          }
          
          console.log(`[CLAIM_PAYMENT] Fallback calculation for claim ${claimId}: totalPaid=${totalPaid}, lastPaymentDate=${lastPaymentDate?.toISOString()}`);
          
          return {
            totalPaid,
            lastPaymentDate: lastPaymentDate?.toISOString() || null
          };
          
        } catch (fallbackError) {
          console.error(`[CLAIM_PAYMENT] Both RPC and fallback failed for claim ${claimId}:`, fallbackError);
          
          // Return default values instead of throwing
          console.warn(`[CLAIM_PAYMENT] Returning default payment data for claim ${claimId}`);
          return {
            totalPaid: 0,
            lastPaymentDate: null
          };
        }
      }
    },
    enabled: !cachedPaymentData && !!claimId, // Only run if not cached and claimId exists
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
  });

  // Return cached data if available, otherwise return query result
  if (cachedPaymentData) {
    return cachedPaymentData;
  }

  return { data, isLoading, error };
}

// Hook to prefetch payment data for a batch of claims
export function usePrefetchClaimsPaymentData(claimIds: string[] = []) {
  const queryClient = useQueryClient();
  const batchQueryKey = ['claims-payment-batch'];
  
  // Fetch all payment data in one batch with improved error handling
  const { data, isLoading, error } = useQuery({
    queryKey: batchQueryKey,
    queryFn: async () => {
      console.log(`[CLAIM_PAYMENT] Prefetching payment data for ${claimIds.length} claims`);
      
      if (claimIds.length === 0) {
        console.log('[CLAIM_PAYMENT] No claim IDs provided for prefetching');
        return [];
      }
      
      try {
        // Always use the RPC function for batch fetching
        console.log(`[CLAIM_PAYMENT] Using RPC function to fetch payment data for ${claimIds.length} claims`);
        
        // Process in reasonable batches to avoid hitting limits
        const BATCH_SIZE = 50; // Use smaller batches for better error tracking
        let allResults = [];
        
        // Process claims in batches to prevent timeouts or memory issues
        for (let i = 0; i < claimIds.length; i += BATCH_SIZE) {
          const batchClaimIds = claimIds.slice(i, i + BATCH_SIZE);
          console.log(`[CLAIM_PAYMENT] Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(claimIds.length/BATCH_SIZE)}, size: ${batchClaimIds.length}`);
          
          try {
            // Fix for ClaimID type mismatch - ensure we're passing values in the correct type
            const areClaimIdsNumeric = batchClaimIds.length > 0 && !isNaN(Number(batchClaimIds[0]));
            
            // Convert claim IDs to the appropriate type
            const formattedClaimIds = areClaimIdsNumeric 
              ? batchClaimIds.map(id => Number(id)) // Convert to numbers if they appear numeric
              : batchClaimIds; // Keep as strings if they're not numeric
              
            console.log(`[CLAIM_PAYMENT] Using ${areClaimIdsNumeric ? 'numeric' : 'string'} claim IDs:`, 
              formattedClaimIds.slice(0, 2)); // Log first two for debugging
            
            const { data: batchResults, error: batchError } = await supabase.rpc(
              'get_claims_payment_info',
              { 
                claim_ids: formattedClaimIds,
                max_results: batchClaimIds.length
              }
            );
            
            if (batchError) {
              console.error(`[CLAIM_PAYMENT] Error in batch ${Math.floor(i/BATCH_SIZE) + 1}:`, batchError);
              continue;
            }
            
            if (batchResults && Array.isArray(batchResults)) {
              console.log(`[CLAIM_PAYMENT] Batch ${Math.floor(i/BATCH_SIZE) + 1} returned ${batchResults.length} results`);
              
              // Process the batch results
              const processedBatchResults = batchResults.map(item => {
                // Enhanced function to extract payment values consistently
                const extractTotalPaid = (value: any): number => {
                  // If value is null or undefined, return 0
                  if (value === null || value === undefined) return 0;
                  
                  // Handle numeric type directly
                  if (typeof value === 'number') {
                    return isNaN(value) ? 0 : value;
                  }
                  
                  // Handle string representation
                  if (typeof value === 'string') {
                    const parsed = parseFloat(value);
                    return isNaN(parsed) ? 0 : parsed;
                  }
                  
                  // Handle Postgres numeric type (object with value property)
                  if (typeof value === 'object') {
                    // If the object has a value property
                    if (value && 'value' in value) {
                      const parsed = parseFloat(value.value);
                      return isNaN(parsed) ? 0 : parsed;
                    }
                    
                    // Try JSON value if present
                    if (value && 'json' in value) {
                      try {
                        const jsonVal = JSON.parse(value.json);
                        return typeof jsonVal === 'number' ? jsonVal : 0;
                      } catch (e) {
                        console.error('[CLAIM_PAYMENT] Error parsing JSON value:', e);
                        return 0;
                      }
                    }
                    
                    // Last resort - try to stringify and parse the object
                    try {
                      const strValue = String(value);
                      const parsed = parseFloat(strValue);
                      return isNaN(parsed) ? 0 : parsed;
                    } catch (e) {
                      console.error('[CLAIM_PAYMENT] Error parsing object as string:', e);
                      return 0;
                    }
                  }
                  
                  // Default fallback
                  return 0;
                };
                
                // Check all possible property names for the total paid value
                const possibleTotalPaidProps = ['totalpaid', 'TotalPaid', 'totalPaid', 'total_paid'];
                let totalPaidValue = 0;
                
                for (const prop of possibleTotalPaidProps) {
                  if (item[prop] !== undefined) {
                    const extractedValue = extractTotalPaid(item[prop]);
                    if (extractedValue > 0) {
                      totalPaidValue = extractedValue;
                      break;
                    }
                  }
                }
                
                // If we still don't have a value, try one more time with the first property
                if (totalPaidValue === 0 && item.totalpaid !== undefined) {
                  totalPaidValue = extractTotalPaid(item.totalpaid);
                }
                
                // Check all possible property names for the last payment date
                const possibleDateProps = ['lastpaymentdate', 'LastPaymentDate', 'lastPaymentDate', 'last_payment_date'];
                let lastPaymentDate = null;
                
                for (const prop of possibleDateProps) {
                  if (item[prop]) {
                    try {
                      const date = new Date(item[prop]);
                      if (!isNaN(date.getTime())) {
                        lastPaymentDate = date;
                        break;
                      }
                    } catch (e) {
                      console.error(`[CLAIM_PAYMENT] Error parsing date from property '${prop}':`, e);
                    }
                  }
                }
                
                return {
                  ClaimID: item.ClaimID,
                  totalPaid: totalPaidValue,
                  lastPaymentDate: lastPaymentDate
                };
              });
              
              allResults.push(...processedBatchResults);
              
              // Log a sample of the processed data for debugging
              if (processedBatchResults.length > 0) {
                console.log(`[CLAIM_PAYMENT] Processed sample from batch ${Math.floor(i/BATCH_SIZE) + 1}:`, {
                  ClaimID: processedBatchResults[0].ClaimID,
                  totalPaid: processedBatchResults[0].totalPaid,
                  hasLastPaymentDate: !!processedBatchResults[0].lastPaymentDate
                });
              }
            } else {
              console.warn(`[CLAIM_PAYMENT] Batch ${Math.floor(i/BATCH_SIZE) + 1} returned no data`);
            }
          } catch (batchError) {
            console.error(`[CLAIM_PAYMENT] Exception in batch ${Math.floor(i/BATCH_SIZE) + 1}:`, batchError);
          }
          
          // Add a small delay between batches to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (allResults.length > 0) {
          console.log(`[CLAIM_PAYMENT] Successfully prefetched ${allResults.length} payment records`);
          
          // Cache individual results for faster access
          allResults.forEach(item => {
            queryClient.setQueryData(['claim-payment', item.ClaimID], {
              totalPaid: item.totalPaid,
              lastPaymentDate: item.lastPaymentDate
            });
          });
          
          return allResults;
        } else {
          console.warn(`[CLAIM_PAYMENT] No payment data found for batch of ${claimIds.length} claims`);
          return [];
        }
      } catch (batchError) {
        console.error(`[CLAIM_PAYMENT] Error prefetching payment data:`, batchError);
        
        // Return empty array on error
        return [];
      }
    },
    enabled: claimIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1, // Only retry once
  });
  
  // Log any errors
  if (error) {
    console.error(`[CLAIM_PAYMENT] Error in prefetch query:`, error);
  }
  
  return { data, isLoading, error };
}

// In a component, you would use this hook like:
/*
function ClaimPaymentInfo({ claimId }) {
  const { lastPaymentDate, totalPaidValue, isLoading } = useClaimPaymentData(claimId);
  
  if (isLoading) return <div>Loading payment data...</div>;
  
  return (
    <div>
      <div>
        <h3>Last Payment Date:</h3>
        <p>{lastPaymentDate ? format(lastPaymentDate, 'PPP') : 'No payments'}</p>
      </div>
      <div>
        <h3>Total Paid Value:</h3>
        <p>${totalPaidValue.toFixed(2)}</p>
      </div>
    </div>
  );
}
*/