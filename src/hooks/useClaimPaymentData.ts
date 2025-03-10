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
    
    const testResult = await supabase.rpc(
      'get_claims_payment_info',
      { 
        claim_ids: [claimIds[0]],
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
          totalpaid: testResult.data[0].totalpaid,
          totalpaidType: typeof testResult.data[0].totalpaid,
          lastpaymentdate: testResult.data[0].lastpaymentdate
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
          const { data: batchResults, error: batchError } = await supabase.rpc(
            'get_claims_payment_info',
            { 
              claim_ids: batchClaimIds,
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
                totalpaid: batchResults[0].totalpaid,
                totalpaidType: typeof batchResults[0].totalpaid,
                lastpaymentdate: batchResults[0].lastpaymentdate
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
            // Handle different formats of totalpaid to ensure we extract a number
            let totalPaidValue = 0;
            
            if (item.totalpaid !== null && item.totalpaid !== undefined) {
              // Handle numeric type directly
              if (typeof item.totalpaid === 'number') {
                totalPaidValue = item.totalpaid;
              } 
              // Handle string representation of number
              else if (typeof item.totalpaid === 'string') {
                totalPaidValue = parseFloat(item.totalpaid) || 0;
              } 
              // Handle Postgres numeric type returned as object with a value property
              else if (typeof item.totalpaid === 'object' && item.totalpaid !== null) {
                if ('value' in item.totalpaid) {
                  totalPaidValue = parseFloat(item.totalpaid.value) || 0;
                } else {
                  // Try to convert the object to a string and parse it
                  const strValue = String(item.totalpaid);
                  totalPaidValue = parseFloat(strValue) || 0;
                }
              }
            }
            
            // Log processing for debugging
            console.log(`[CLAIM_PAYMENT] Processed ${item.ClaimID}: `, {
              originalValue: item.totalpaid,
              originalType: typeof item.totalpaid, 
              processedValue: totalPaidValue
            });
            
            return {
              ClaimID: item.ClaimID,
              totalPaid: totalPaidValue,
              lastPaymentDate: item.lastpaymentdate ? new Date(item.lastpaymentdate) : null
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
  });
}

// Custom hook to get payment information for a claim
export function useClaimPaymentData(claimId: string) {
  const queryClient = useQueryClient();
  
  // Look for pre-fetched batch data first
  const batchQueryKey = ['claims-payment-batch'];
  const batchData = queryClient.getQueryData(batchQueryKey) as any[];
  
  // If we already have the data for this claim in the batch cache, use it
  const cachedClaimData = batchData?.find(item => item.ClaimID === claimId);
  
  if (cachedClaimData) {
    console.log(`[CLAIM_PAYMENT] Using cached payment data for ${claimId}:`, {
      totalPaid: cachedClaimData.totalPaid,
      hasLastPaymentDate: !!cachedClaimData.lastPaymentDate
    });
    
    return {
      lastPaymentDate: cachedClaimData.lastPaymentDate,
      totalPaidValue: cachedClaimData.totalPaid,
      isLoading: false
    };
  }
  
  // Otherwise fall back to individual claim query with enhanced error handling
  const { data, isLoading, error } = useQuery({
    queryKey: ['claim-payment', claimId],
    queryFn: async () => {
      console.log(`[CLAIM_PAYMENT] Fetching payment data for individual claim: ${claimId}`);
      
      // First check if we can get the data from SQL function
      try {
        console.log(`[CLAIM_PAYMENT] Trying SQL function for claim ${claimId}`);
        
        const { data, error } = await supabase.rpc(
          'get_claims_payment_info',
          { 
            claim_ids: [claimId],
            max_results: null // No limit - get all results
          }
        );
        
        if (error) {
          console.error(`[CLAIM_PAYMENT] SQL function error for claim ${claimId}:`, error);
        } else if (data && data.length > 0) {
          console.log(`[CLAIM_PAYMENT] SQL function succeeded for claim ${claimId}`);
          
          const item = data[0];
          let totalPaidValue = 0;
          
          // Handle different formats of totalpaid to ensure we extract a number
          if (item.totalpaid !== null && item.totalpaid !== undefined) {
            // Handle numeric type directly
            if (typeof item.totalpaid === 'number') {
              totalPaidValue = item.totalpaid;
            } 
            // Handle string representation of number
            else if (typeof item.totalpaid === 'string') {
              totalPaidValue = parseFloat(item.totalpaid) || 0;
            } 
            // Handle Postgres numeric type returned as object with a value property
            else if (typeof item.totalpaid === 'object' && item.totalpaid !== null) {
              if ('value' in item.totalpaid) {
                totalPaidValue = parseFloat(item.totalpaid.value) || 0;
              } else {
                // Try to convert the object to a string and parse it
                const strValue = String(item.totalpaid);
                totalPaidValue = parseFloat(strValue) || 0;
              }
            }
          }
          
          console.log(`[CLAIM_PAYMENT] Total paid for claim ${claimId} from SQL: $${totalPaidValue.toFixed(2)}`);
          
          return {
            totalPaid: totalPaidValue,
            lastPaymentDate: item.lastpaymentdate ? new Date(item.lastpaymentdate) : null
          };
        } else {
          console.log(`[CLAIM_PAYMENT] SQL function returned no data for claim ${claimId}`);
        }
      } catch (sqlErr) {
        console.error(`[CLAIM_PAYMENT] Error using SQL function for claim ${claimId}:`, sqlErr);
      }
      
      // Fall back to direct data fetching
      console.log(`[CLAIM_PAYMENT] Falling back to direct query for claim ${claimId}`);
      
      try {
        // Only get PAID subclaims for efficiency
        const { data: subclaims, error: subclaimsError } = await supabase
          .from('subclaims')
          .select('*')
          .eq('ClaimID', claimId)
          .eq('Status', 'PAID'); // Only get PAID subclaims
          
        if (subclaimsError) {
          console.error(`[CLAIM_PAYMENT] Error fetching subclaims for claim ${claimId}:`, subclaimsError);
          return { totalPaid: 0, lastPaymentDate: null };
        }
        
        console.log(`[CLAIM_PAYMENT] Found ${subclaims?.length || 0} PAID subclaims for claim ${claimId}`);
        
        const subclaimIds = subclaims?.map(s => s.SubClaimID) || [];
        
        if (subclaimIds.length === 0) {
          console.log(`[CLAIM_PAYMENT] No subclaims found for claim ${claimId}, returning zero`);
          return { totalPaid: 0, lastPaymentDate: null };
        }
        
        // Get the last payment date
        let lastPaymentDate = null;
        
        if (subclaims && subclaims.length > 0) {
          const modifiedDates = subclaims
            .filter(sc => sc.LastModified)
            .map(sc => new Date(sc.LastModified));
          
          if (modifiedDates.length > 0) {
            lastPaymentDate = new Date(Math.max(...modifiedDates.map(d => d.getTime())));
          }
        }
        
        // Fetch subclaim parts to calculate payment amounts
        const { data: subclaimParts, error: partsError } = await supabase
          .from('subclaim_parts')
          .select('*')
          .in('SubClaimID', subclaimIds);
          
        if (partsError) {
          console.error(`[CLAIM_PAYMENT] Error fetching parts for claim ${claimId}:`, partsError);
          return { 
            totalPaid: 0, 
            lastPaymentDate: lastPaymentDate // Still return the date if we have it
          };
        }
        
        console.log(`[CLAIM_PAYMENT] Found ${subclaimParts?.length || 0} parts for claim ${claimId}`);
        
        // Calculate total paid amount
        let totalPaid = 0;
        
        if (subclaimParts && subclaimParts.length > 0) {
          for (const part of subclaimParts) {
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
        
        console.log(`[CLAIM_PAYMENT] Calculated total paid for claim ${claimId} from direct query: $${totalPaid.toFixed(2)}`);
        
        return {
          totalPaid,
          lastPaymentDate
        };
      } catch (directQueryError) {
        console.error(`[CLAIM_PAYMENT] Fatal error fetching payment data for claim ${claimId}:`, directQueryError);
        return { totalPaid: 0, lastPaymentDate: null };
      }
    },
    // Don't retry too many times to avoid rate limits
    retry: 1,
    // Cache the result longer to improve performance
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
  
  // Log any errors
  if (error) {
    console.error(`[CLAIM_PAYMENT] Error in useClaimPaymentData for ${claimId}:`, error);
  }
  
  // Enrich the loading state with helpful debug info
  if (isLoading) {
    console.log(`[CLAIM_PAYMENT] Loading payment data for claim ${claimId}...`);
  }
  
  return {
    lastPaymentDate: data?.lastPaymentDate || null,
    totalPaidValue: data?.totalPaid || 0,
    isLoading
  };
}

// Hook to prefetch payment data for a batch of claims
export function usePrefetchClaimsPaymentData(claimIds: string[] = []) {
  const queryClient = useQueryClient();
  const batchQueryKey = ['claims-payment-batch'];
  
  // Fetch all payment data in one batch
  const { data, isLoading } = useQuery({
    queryKey: batchQueryKey,
    queryFn: () => fetchSubclaimsForClaims(claimIds),
    enabled: claimIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  return { data, isLoading };
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