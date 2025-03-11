import { Database } from './types';

// Define custom parameter types for RPC functions
export interface CountAgreementsByDateParams {
  from_date: string;
  to_date: string;
  dealer_uuid?: string | null;
  group_by?: 'day' | 'month' | 'year';
}

export interface CountAgreementsByStatusParams {
  from_date: string;
  to_date: string;
  dealer_uuid?: string | null;
}

export interface FetchMonthlyAgreementCountsParams {
  start_date: string;
  end_date: string;
  dealer_uuid?: string | null;
}

export interface FetchMonthlyAgreementCountsWithStatusParams {
  start_date: string;
  end_date: string;
  dealer_uuid?: string | null;
}

// Define return types
export interface CountAgreementsByDateResult {
  date_group: string;
  total_count: string;
  pending_count: string;
  active_count: string;
  claimable_count: string;
  cancelled_count: string;
  void_count: string;
}

export interface CountAgreementsByStatusResult {
  status: string;
  count: string;
}

export interface FetchMonthlyAgreementCountsResult {
  month: string;
  total: string;
}

export interface FetchMonthlyAgreementCountsWithStatusResult {
  month: string;
  pending_count: string;
  active_count: string;
  claimable_count: string;
  cancelled_count: string;
  void_count: string;
  total: string;
}

// Define our extended Database type for custom RPC functions
export interface ExtendedDatabase extends Database {
  public: {
    Functions: {
      count_agreements_by_date: {
        Args: CountAgreementsByDateParams;
        Returns: CountAgreementsByDateResult[];
      };
      count_agreements_by_status: {
        Args: CountAgreementsByStatusParams;
        Returns: CountAgreementsByStatusResult[];
      };
      fetch_monthly_agreement_counts: {
        Args: FetchMonthlyAgreementCountsParams;
        Returns: FetchMonthlyAgreementCountsResult[];
      };
      fetch_monthly_agreement_counts_with_status: {
        Args: FetchMonthlyAgreementCountsWithStatusParams;
        Returns: FetchMonthlyAgreementCountsWithStatusResult[];
      };
    } & Database['public']['Functions'];
  } & Database['public'];
}

// Type assertion helpers for Supabase RPC response data
export function assertArray<T>(data: unknown): T[] {
  if (!data || typeof data === 'string' || !Array.isArray(data)) {
    return [] as T[];
  }
  return data as T[];
}

export function assertCountAgreementsByDateResult(data: unknown): CountAgreementsByDateResult[] {
  return assertArray<CountAgreementsByDateResult>(data);
}

export function assertCountAgreementsByStatusResult(data: unknown): CountAgreementsByStatusResult[] {
  return assertArray<CountAgreementsByStatusResult>(data);
}

export function assertFetchMonthlyAgreementCountsResult(data: unknown): FetchMonthlyAgreementCountsResult[] {
  return assertArray<FetchMonthlyAgreementCountsResult>(data);
}

export function assertFetchMonthlyAgreementCountsWithStatusResult(data: unknown): FetchMonthlyAgreementCountsWithStatusResult[] {
  return assertArray<FetchMonthlyAgreementCountsWithStatusResult>(data);
} 