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
  
  // Use the SQL function if available, otherwise use direct query
  try {
    // Process in reasonable batches to avoid hitting limits
    const BATCH_SIZE = 500; // Process 500 claims at a time
    let allResults = [];
    
    // Process claims in batches to prevent timeouts or memory issues
    for (let i = 0; i < claimIds.length; i += BATCH_SIZE) {
      const batchClaimIds = claimIds.slice(i, i + BATCH_SIZE);
      console.log(`[CLAIM_PAYMENT] Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(claimIds.length/BATCH_SIZE)}, size: ${batchClaimIds.length}`);
      
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
      
      if (batchResults) {
        allResults.push(...batchResults);
      }
    }
    
    const functionData = allResults;
    const functionError = allResults.length === 0 ? new Error("No data returned from batches") : null;
    
    if (!functionError && functionData) {
      console.log('[CLAIM_PAYMENT] Successfully used SQL function for batch payment info');
      return functionData.map((item: any) => ({
        ClaimID: item.ClaimID,
        totalPaid: typeof item.totalpaid === 'number' ? item.totalpaid :
                  typeof item.totalpaid === 'string' ? parseFloat(item.totalpaid) || 0 : 0,
        lastPaymentDate: item.lastpaymentdate ? new Date(item.lastpaymentdate) : null
      }));
    }
  } catch (err) {
    console.error('[CLAIM_PAYMENT] Error using SQL function:', err);
  }
  
  // Fallback to direct fetch
  console.log('[CLAIM_PAYMENT] Using direct fetch for subclaims');
  
  // Get all subclaims for these claims in batches
  let allSubclaims: any[] = [];
  const BATCH_SIZE = 500; // Process in larger batches using the index
  
  console.log(`[CLAIM_PAYMENT] Fetching subclaims for ${claimIds.length} claims in batches of ${BATCH_SIZE}`);
  
  for (let i = 0; i < claimIds.length; i += BATCH_SIZE) {
    const batchClaimIds = claimIds.slice(i, i + BATCH_SIZE);
    console.log(`[CLAIM_PAYMENT] Fetching subclaims batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(claimIds.length/BATCH_SIZE)}`);
    
    const { data, error } = await supabase
      .from('subclaims')
      .select('*')
      .in('ClaimID', batchClaimIds);
      
    if (error) {
      console.error(`[CLAIM_PAYMENT] Error fetching subclaims batch:`, error);
      throw error;
    }
    
    if (data) {
      console.log(`[CLAIM_PAYMENT] Fetched ${data.length} subclaims for batch`);
      allSubclaims.push(...data);
    }
  }
  
  // Get all subclaim parts for all subclaims in batches
  const allSubclaimIds = allSubclaims.map(s => s.SubClaimID);
  let allSubclaimParts: any[] = [];
  
  console.log(`[CLAIM_PAYMENT] Fetching parts for ${allSubclaimIds.length} subclaims in batches of ${BATCH_SIZE}`);
  
  if (allSubclaimIds.length > 0) {
    for (let i = 0; i < allSubclaimIds.length; i += BATCH_SIZE) {
      const batchIds = allSubclaimIds.slice(i, i + BATCH_SIZE);
      console.log(`[CLAIM_PAYMENT] Fetching parts batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(allSubclaimIds.length/BATCH_SIZE)}`);
      
      const { data, error } = await supabase
        .from('subclaim_parts')
        .select('*')
        .in('SubClaimID', batchIds);
        
      if (error) {
        console.error(`[CLAIM_PAYMENT] Error fetching parts batch:`, error);
        throw error;
      }
      
      if (data) {
        console.log(`[CLAIM_PAYMENT] Fetched ${data.length} parts for batch`);
        allSubclaimParts.push(...data);
      }
    }
  }
  
  // Process the data for each claim
  return claimIds.map(claimId => {
    const claimSubclaims = allSubclaims.filter(s => s.ClaimID === claimId);
    const lastPaymentDate = getLastPaymentDate(claimId, claimSubclaims);
    const totalPaid = getTotalPaidValue(claimId, claimSubclaims, allSubclaimParts);
    
    return {
      ClaimID: claimId,
      totalPaid,
      lastPaymentDate
    };
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
    return {
      lastPaymentDate: cachedClaimData.lastPaymentDate,
      totalPaidValue: cachedClaimData.totalPaid,
      isLoading: false
    };
  }
  
  // Otherwise fall back to individual claim query
  const { data, isLoading } = useQuery({
    queryKey: ['claim-payment', claimId],
    queryFn: async () => {
      // First check if we can get the data from SQL function
      try {
        const { data, error } = await supabase.rpc(
          'get_claims_payment_info',
          { 
            claim_ids: [claimId],
            max_results: null // No limit - get all results
          }
        );
        
        if (!error && data && data.length > 0) {
          const item = data[0];
          return {
            totalPaid: typeof item.totalpaid === 'number' ? item.totalpaid :
                      typeof item.totalpaid === 'string' ? parseFloat(item.totalpaid) || 0 : 0,
            lastPaymentDate: item.lastpaymentdate ? new Date(item.lastpaymentdate) : null
          };
        }
      } catch (err) {
        console.error(`[CLAIM_PAYMENT] Error using SQL function for claim ${claimId}:`, err);
      }
      
      // Fall back to direct data fetching
      const { data: subclaims, error: subclaimsError } = await supabase
        .from('subclaims')
        .select('*')
        .eq('ClaimID', claimId);
        
      if (subclaimsError) throw subclaimsError;
      
      const subclaimIds = subclaims?.map(s => s.SubClaimID) || [];
      
      if (subclaimIds.length === 0) {
        return { totalPaid: 0, lastPaymentDate: null };
      }
      
      const { data: subclaimParts, error: partsError } = await supabase
        .from('subclaim_parts')
        .select('*')
        .in('SubClaimID', subclaimIds);
        
      if (partsError) throw partsError;
      
      const lastPaymentDate = getLastPaymentDate(claimId, subclaims || []);
      const totalPaid = getTotalPaidValue(claimId, subclaims || [], subclaimParts || []);
      
      return {
        totalPaid,
        lastPaymentDate
      };
    }
  });
  
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