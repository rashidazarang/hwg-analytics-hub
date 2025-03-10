export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      claims: {
        Row: {
          id: string
          ClaimID: string
          AgreementID: string
          ReportedDate: string | null
          IncurredDate: string | null
          Closed: string | null
          Complaint: string | null
          Cause: string | null
          Correction: string | null
          Deductible: number | null
          CauseID: string | null
          CorrectionID: string | null
          ComplaintID: string | null
          LastModified: string | null
        }
      }
      subclaims: {
        Row: {
          SubClaimID: string
          ClaimID: string
          Status: string | null
          LastModified: string | null
          Closed: string | null
        }
      }
      subclaim_parts: {
        Row: {
          PartID: string
          SubClaimID: string
          PaidPrice: string | null
        }
      }
      agreements: {
        Row: {
          id: string
          AgreementID: string
          DealerUUID: string | null
        }
      }
      dealers: {
        Row: {
          id: string
          Payee: string | null
          PayeeID: string | null
        }
      }
    }
    Functions: {
      get_claims_with_payment_in_date_range: {
        Args: {
          start_date: string;
          end_date: string;
        }
        Returns: {
          ClaimID: string;
        }[]
      }
      get_claims_payment_info: {
        Args: {
          claim_ids: string[];
        }
        Returns: {
          ClaimID: string;
          AgreementID: string;
          totalpaid: number;
          lastpaymentdate: string | null;
        }[]
      }
    }
  }
} 