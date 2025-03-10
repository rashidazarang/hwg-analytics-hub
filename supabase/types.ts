import { Database } from './schema';

export type Tables = Database['public']['Tables'];
export type Functions = Database['public']['Functions'];

// Add explicit RPC function result types
export interface ClaimWithPaymentInDateRangeResult {
  ClaimID: string;
}

export interface ClaimPaymentInfoResult {
  ClaimID: string;
  AgreementID: string;
  totalpaid: number;
  lastpaymentdate: string | null;
}

// Define Supabase functions
export interface CustomSupabaseFunctions {
  get_claims_with_payment_in_date_range: {
    Args: {
      start_date: string;
      end_date: string;
    };
    Returns: ClaimWithPaymentInDateRangeResult[];
  };
  get_claims_payment_info: {
    Args: {
      claim_ids: string[];
    };
    Returns: ClaimPaymentInfoResult[];
  };
} 