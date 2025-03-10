
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
    // Debug log - print current time for reference
    const now = new Date();
    console.log(`[SHARED_CLAIMS] Starting claims fetch at ${now.toISOString()}`);
    console.log(`[SHARED_CLAIMS] Using date range: ${dateRange.from.toISOString()} to ${dateRange.to.toISOString()}`);
    
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
        agreements!inner(DealerUUID, dealers(Payee)),
        subclaims!left(
          ClaimID,
          Status,
          Closed,
          subclaim_parts!left(SubClaimID, PaidPrice)
        )
      `, { count: includeCount ? 'exact' : undefined });

    // Apply date range filter using ReportedDate (primary) or LastModified (fallback)
    // This gives us a broader range of claims that might be relevant
    query = query.or(`ReportedDate.gte.${dateRange.from.toISOString()},ReportedDate.lte.${dateRange.to.toISOString()},LastModified.gte.${dateRange.from.toISOString()},LastModified.lte.${dateRange.to.toISOString()}`);
    
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
      const countQuery = supabase
        .from("claims")
        .select(`
          id,
          agreements!inner(DealerUUID)
        `, { count: 'exact', head: true })
        .or(`ReportedDate.gte.${dateRange.from.toISOString()},ReportedDate.lte.${dateRange.to.toISOString()},LastModified.gte.${dateRange.from.toISOString()},LastModified.lte.${dateRange.to.toISOString()}`);
      
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
              agreements!inner(DealerUUID, dealers(Payee)),
              subclaims!left(
                ClaimID,
                Status,
                Closed,
                subclaim_parts!left(SubClaimID, PaidPrice)
              )
            `)
            .or(`ReportedDate.gte.${dateRange.from.toISOString()},ReportedDate.lte.${dateRange.to.toISOString()},LastModified.gte.${dateRange.from.toISOString()},LastModified.lte.${dateRange.to.toISOString()}`)
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
        
        console.log(`[SHARED_CLAIMS] Fetched all ${allData.length} claims in ${totalBatches} batches`);
        console.log('[SHARED_CLAIMS] Status breakdown:', statusBreakdown);
        
        return {
          data: allData,
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
