import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { Agreement } from '@/lib/types';

interface AgreementsQueryOptions {
  dateRange: DateRange;
  dealerFilter?: string;
  pagination?: {
    page: number;
    pageSize: number;
  };
  includeCount?: boolean;
  statusFilters?: string[];
}

interface AgreementsQueryResult {
  data: Agreement[];
  count: number;
}

/**
 * Search for agreements by ID (AgreementID)
 * This function bypasses all other filters and directly searches for agreements by ID
 */
export async function searchAgreementById(searchTerm: string): Promise<AgreementsQueryResult> {
  try {
    console.log(`🔍 Searching for agreement with ID: "${searchTerm}"`);
    
    if (!searchTerm || searchTerm.trim().length < 3) {
      console.warn("⚠️ Search term is too short, minimum 3 characters required");
      return { data: [], count: 0 };
    }
    
    const term = searchTerm.trim();
    
    // Query for agreements matching the ID
    const { data, error, count } = await supabase
      .from("agreements")
      .select(`
        id, 
        AgreementID, 
        HolderFirstName, 
        HolderLastName, 
        DealerUUID, 
        DealerID, 
        EffectiveDate, 
        ExpireDate, 
        AgreementStatus, 
        Total, 
        DealerCost, 
        ReserveAmount,
        StatusChangeDate,
        dealers(Payee)
      `, { count: 'exact' })
      .ilike('AgreementID', `%${term}%`)
      .order("EffectiveDate", { ascending: false })
      .limit(100);

    if (error) {
      console.error('❌ Error searching agreements:', error);
      throw error;
    }

    console.log(`✅ Found ${data?.length || 0} agreements matching "${term}"`);
    
    return {
      data: (data || []) as unknown as Agreement[],
      count: count || 0
    };

  } catch (error) {
    console.error('❌ Exception when searching agreements:', error);
    throw error;
  }
}

/**
 * Hook to search agreements by ID with React Query
 */
export function useAgreementSearch(searchTerm: string) {
  return useQuery({
    queryKey: ['agreement-search', searchTerm],
    queryFn: () => searchAgreementById(searchTerm),
    enabled: searchTerm.length >= 3,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetches agreements data with proper date filtering, pagination, and dealer filtering
 */
export async function fetchAgreementsData({
  dateRange,
  dealerFilter,
  pagination,
  includeCount = true,
  statusFilters
}: AgreementsQueryOptions): Promise<AgreementsQueryResult> {
  try {
    console.log('[SHARED_AGREEMENTS] Fetching agreements from Supabase with filters:', {
      dateRange: { from: dateRange.from, to: dateRange.to },
      dealerFilter,
      statusFilters,
      pagination
    });

    // Build the base query
    let query = supabase
      .from("agreements")
      .select(`
        id, 
        AgreementID, 
        HolderFirstName, 
        HolderLastName, 
        DealerUUID, 
        DealerID, 
        EffectiveDate, 
        ExpireDate, 
        AgreementStatus, 
        Total, 
        DealerCost, 
        ReserveAmount,
        StatusChangeDate,
        dealers(Payee)
      `, { count: includeCount ? 'exact' : undefined });

    // Apply date range filter
    if (dateRange) {
      query = query
        .gte('EffectiveDate', dateRange.from.toISOString())
        .lte('EffectiveDate', dateRange.to.toISOString());
    }

    // Apply dealer filter
    if (dealerFilter) {
      query = query.eq('DealerUUID', dealerFilter);
    }

    // Apply status filters
    if (statusFilters && statusFilters.length > 0) {
      query = query.in('AgreementStatus', statusFilters);
    }

    // Apply pagination
    if (pagination) {
      const startIndex = (pagination.page - 1) * pagination.pageSize;
      const endIndex = startIndex + pagination.pageSize - 1;
      query = query.range(startIndex, endIndex);
    }

    // Order by effective date
    query = query.order("EffectiveDate", { ascending: false });

    const result = await query;

    if (result.error) {
      console.error('[SHARED_AGREEMENTS] Error fetching agreements:', result.error);
      throw new Error(`Data query failed: ${result.error.message}`);
    }

    console.log(`[SHARED_AGREEMENTS] Retrieved ${result.data?.length || 0} agreements`);
    console.log(`[SHARED_AGREEMENTS] Total count: ${result.count || 0}`);

    return {
      data: (result.data || []) as unknown as Agreement[],
      count: result.count || 0
    };

  } catch (error) {
    console.error('[SHARED_AGREEMENTS] Error fetching agreements:', error);
    
    // Fallback to basic query
    try {
      console.log('[SHARED_AGREEMENTS] Attempting fallback query...');
      
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("agreements")
        .select(`
          id, 
          AgreementID, 
          HolderFirstName, 
          HolderLastName, 
          DealerUUID, 
          DealerID, 
          EffectiveDate, 
          ExpireDate, 
          AgreementStatus, 
          Total, 
          DealerCost, 
          ReserveAmount,
          StatusChangeDate,
          dealers(Payee)
        `)
        .order("EffectiveDate", { ascending: false })
        .limit(100);

      if (fallbackError) {
        console.error('[SHARED_AGREEMENTS] Fallback query failed:', fallbackError);
        return { data: [], count: 0 };
      }

      console.log(`[SHARED_AGREEMENTS] Fallback query succeeded with ${fallbackData?.length || 0} records`);
      return {
        data: (fallbackData || []) as unknown as Agreement[],
        count: fallbackData?.length || 0
      };

    } catch (fallbackError) {
      console.error('[SHARED_AGREEMENTS] Fallback query also failed:', fallbackError);
      return { data: [], count: 0 };
    }
  }
}

/**
 * Hook to fetch agreements data with React Query
 */
export function useSharedAgreementsData(options: AgreementsQueryOptions) {
  return useQuery({
    queryKey: [
      'shared-agreements', 
      options.dateRange.from, 
      options.dateRange.to, 
      options.dealerFilter,
      options.pagination?.page,
      options.pagination?.pageSize,
      options.statusFilters
    ],
    queryFn: () => fetchAgreementsData(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });
} 