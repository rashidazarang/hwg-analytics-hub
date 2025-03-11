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
  EffectiveDate: string;
  ExpirationDate: string | null;
  AgreementStatus: string;
  dealer?: Dealer;
}

export interface Dealer {
  DealerUUID: string;
  Name: string;
  City: string;
  State: string;
  ZipCode: string;
}

export interface Subclaim {
  SubClaimID: string;
  ClaimID: string;
  Status: string;
  Payee: string;
  RepairOrder: string | null;
  Created: string | null;
  Closed: string | null;
  Complaint: string | null;
  Cause: string | null;
  Correction: string | null;
  ServiceWriter: string | null;
  parts?: SubclaimPart[];
}

export interface SubclaimPart {
  PartID: string;
  SubClaimID: string;
  PartNumber: string;
  Description: string;
  Quantity: number;
  RequestedPrice: number | null;
  ApprovedPrice: number | null;
  PaidPrice: number | null;
}

export interface ClaimPaymentInfo {
  claim_id: string;
  total_requested_amount: number;
  total_approved_amount: number;
  total_paid_amount: number;
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
      
      // Fetch subclaims
      const { data: subclaims, error: subclaimsError } = await supabase
        .from('subclaims')
        .select('*')
        .eq('ClaimID', claimId);
      
      if (subclaimsError) {
        console.error('[CLAIM_DETAIL] Error fetching subclaims:', subclaimsError);
        throw subclaimsError;
      }
      
      claim.subclaims = subclaims || [];
      
      // Fetch subclaim parts if there are subclaims
      if (claim.subclaims.length > 0) {
        const subclaim_ids = claim.subclaims.map(sc => sc.SubClaimID);
        
        const { data: parts, error: partsError } = await supabase
          .from('subclaim_parts')
          .select('*')
          .in('SubClaimID', subclaim_ids);
        
        if (partsError) {
          console.error('[CLAIM_DETAIL] Error fetching subclaim parts:', partsError);
          throw partsError;
        }
        
        // Organize parts by subclaim ID
        const partsBySubclaim: Record<string, SubclaimPart[]> = {};
        (parts || []).forEach(part => {
          if (!partsBySubclaim[part.SubClaimID]) {
            partsBySubclaim[part.SubClaimID] = [];
          }
          partsBySubclaim[part.SubClaimID].push(part);
        });
        
        // Add parts to each subclaim
        claim.subclaims.forEach(subclaim => {
          subclaim.parts = partsBySubclaim[subclaim.SubClaimID] || [];
        });
      }
      
      // Get payment information using the SQL function
      try {
        const { data: paymentInfo, error: paymentError } = await supabase
          .rpc('get_claims_payment_info', { claim_ids: [claimId] });
        
        if (paymentError) {
          console.error('[CLAIM_DETAIL] Error fetching payment info:', paymentError);
          // Don't throw here, just log and continue without payment info
        } else {
          claim.payment_info = paymentInfo && paymentInfo.length > 0 ? paymentInfo[0] : null;
        }
      } catch (error) {
        console.error('[CLAIM_DETAIL] Exception fetching payment info:', error);
        // Continue without payment info
      }
      
      return claim;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
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
    return claim.payment_info.total_paid_amount || 0;
  }
  
  // Fallback calculation from subclaim parts if payment_info is not available
  let total = 0;
  
  if (claim.subclaims) {
    claim.subclaims.forEach(subclaim => {
      if (subclaim.parts) {
        subclaim.parts.forEach(part => {
          if (part.PaidPrice != null && !isNaN(part.PaidPrice)) {
            total += part.PaidPrice * (part.Quantity || 1);
          }
        });
      }
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
    totalRequested = claim.payment_info.total_requested_amount || 0;
    totalApproved = claim.payment_info.total_approved_amount || 0;
    totalPaid = claim.payment_info.total_paid_amount || 0;
  } else if (claim.subclaims) {
    // Calculate from subclaim parts if payment_info is not available
    claim.subclaims.forEach(subclaim => {
      if (subclaim.parts) {
        subclaim.parts.forEach(part => {
          if (part.RequestedPrice != null && !isNaN(part.RequestedPrice)) {
            totalRequested += part.RequestedPrice * (part.Quantity || 1);
          }
          if (part.ApprovedPrice != null && !isNaN(part.ApprovedPrice)) {
            totalApproved += part.ApprovedPrice * (part.Quantity || 1);
          }
          if (part.PaidPrice != null && !isNaN(part.PaidPrice)) {
            totalPaid += part.PaidPrice * (part.Quantity || 1);
          }
        });
      }
    });
  }
  
  return {
    totalRequested,
    totalApproved,
    totalPaid,
  };
}; 