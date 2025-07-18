import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PostgrestError } from '@supabase/supabase-js';

// Types for the claim details page
export interface Claim {
  ClaimID: string;
  AgreementID: string;
  Complaint: string;
  Cause: string;
  Correction: string;
  Reported: string | null;
  Incurred: string | null;
  Closed: string | null;
  Deductible: number | null;
  agreement?: Agreement;
  subclaims?: Subclaim[];
  payment_info?: ClaimPaymentInfo;
}

export interface Agreement {
  AgreementID: string;
  DealerUUID: string;
  AgreementStatus: string;
  EffectiveDate: string;
  ExpirationDate: string;
  DealerCost: number;
  HolderFirstName: string;
  HolderLastName: string;
  dealer?: Dealer;
}

export interface Dealer {
  DealerUUID: string;
  Payee: string;
  Address: string;
  City: string;
  Region: string;
  Country: string;
  PostalCode: string;
}

export interface Subclaim {
  SubclaimID: string;
  ClaimID: string;
  PartNumber: string;
  PartDescription: string;
  LaborDescription: string;
  PartCost: number;
  LaborCost: number;
  TotalCost: number;
  Status: string;
  Closed: string | null;
}

export interface ClaimPaymentInfo {
  total_paid: number;
  last_payment_date: string | null;
}

/**
 * Custom hook to fetch detailed information about a specific claim
 */
export const useClaimDetail = (claimId: string) => {
  return useQuery({
    queryKey: ['claim-detail', claimId],
    queryFn: async () => {
      console.log(`[CLAIM_DETAIL] Fetching claim detail for ID: ${claimId}`);
      
      // Fetch basic claim information with related agreement and dealer
      const { data: claimData, error: claimError } = await supabase
        .from('claims')
        .select(`
          *,
          agreements:AgreementID (
            *,
            dealers:DealerUUID (*)
          )
        `)
        .eq('ClaimID', claimId)
        .single();
      
      if (claimError) {
        console.error('[CLAIM_DETAIL] Error fetching claim:', claimError);
        throw claimError;
      }
      
      if (!claimData) {
        throw new Error(`Claim with ID ${claimId} not found`);
      }
      
      // Transform the data to match our interface
      const claim: Claim = {
        ...claimData,
        agreement: claimData.agreements as unknown as Agreement,
      };
      
      // Remove the nested agreements property to avoid duplication
      delete (claim as any).agreements;
      
      // Add dealer info directly to the agreement object
      if (claim.agreement) {
        claim.agreement.dealer = (claim.agreement as any).dealers as unknown as Dealer;
        delete (claim.agreement as any).dealers;
      }
      
      // Fetch subclaims separately
      const { data: subclaimsData, error: subclaimsError } = await supabase
        .from('subclaims')
        .select('*')
        .eq('ClaimID', claimId)
        .order('SubclaimID');
      
      if (subclaimsError) {
        console.warn('[CLAIM_DETAIL] Error fetching subclaims:', subclaimsError);
        // Don't throw, just proceed without subclaims
      } else {
        claim.subclaims = subclaimsData || [];
      }
      
      console.log('[CLAIM_DETAIL] Successfully fetched claim detail');
      return claim;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    enabled: !!claimId, // Only run if claimId is provided
  });
};

/**
 * Calculate the duration of a claim in days
 */
export const getClaimDuration = (claim: Claim): number | null => {
  if (!claim.Reported || !claim.Closed) return null;
  
  const reportedDate = new Date(claim.Reported);
  const closedDate = new Date(claim.Closed);
  
  // Calculate the difference in milliseconds and convert to days
  const diffInMs = closedDate.getTime() - reportedDate.getTime();
  const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));
  
  return diffInDays;
};

/**
 * Get the status of a claim
 */
export const getClaimStatus = (claim: Claim): 'OPEN' | 'CLOSED' => {
  return claim.Closed ? 'CLOSED' : 'OPEN';
};

/**
 * Calculate the total paid amount from subclaim parts
 */
export const getTotalPaidAmount = (claim: Claim): number => {
  if (claim.payment_info) {
    return claim.payment_info.total_paid || 0;
  }
  
  // Fallback calculation from subclaim parts if payment_info is not available
  let total = 0;
  
  if (claim.subclaims) {
    claim.subclaims.forEach(subclaim => {
      total += subclaim.TotalCost || 0;
    });
  }
  
  return total;
};

/**
 * Get the financial summary for a claim
 */
export const getClaimFinancialSummary = (claim: Claim) => {
  let totalRequested = 0;
  let totalApproved = 0;
  let totalPaid = 0;
  
  if (claim.payment_info) {
    totalPaid = claim.payment_info.total_paid || 0;
  } else if (claim.subclaims) {
    // Calculate from subclaim parts if payment_info is not available
    claim.subclaims.forEach(subclaim => {
      totalPaid += subclaim.TotalCost || 0;
    });
  }
  
  return {
    totalRequested,
    totalApproved,
    totalPaid,
  };
}; 