
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
    // Start building the query with all needed fields
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

    // Always apply date range filter using LastModified for consistency
    query = query
      .gte('LastModified', dateRange.from.toISOString())
      .lte('LastModified', dateRange.to.toISOString());
    
    // Apply dealer filter if provided
    if (dealerFilter && dealerFilter.trim() !== '') {
      query = query.eq('agreements.DealerUUID', dealerFilter.trim());
    }

    // Apply sorting - consistent across all components
    query = query.order('LastModified', { ascending: false });

    // Apply pagination if needed
    if (pagination) {
      const { page, pageSize } = pagination;
      const startRow = (page - 1) * pageSize;
      const endRow = startRow + pageSize - 1;
      query = query.range(startRow, endRow);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[SHARED_CLAIMS] Error fetching claims:', error);
      throw error;
    }

    // Process the claims data to get status breakdown
    const claims = data || [];
    
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

    console.log(`[SHARED_CLAIMS] Fetched ${claims.length} claims. Total count: ${count || 'N/A'}`);
    console.log('[SHARED_CLAIMS] Status breakdown:', statusBreakdown);

    return {
      data: claims,
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
