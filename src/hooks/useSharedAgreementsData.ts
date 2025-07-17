import { useQuery } from '@tanstack/react-query';
import { supabase, shouldUseMockData } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { Agreement } from '@/lib/types';
import { toast } from 'sonner';
import MockDataService from '@/lib/mockDataService';

export interface AgreementsQueryResult {
  data: Agreement[];
  count: number;
}

/**
 * Search for agreements by ID (AgreementID)
 * This function bypasses all other filters and directly searches for agreements by ID
 */
export async function searchAgreementById(searchTerm: string): Promise<AgreementsQueryResult> {
  try {
    // Use mock data in development mode
    if (shouldUseMockData()) {
      console.log('[SEARCH_AGREEMENT] 🔧 Using mock data in development mode');
      const agreements = MockDataService.getAgreementsData(0, 20, '', ['ACTIVE', 'PENDING', 'CANCELLED']);
      const filtered = agreements.data.filter(agreement => 
        agreement.AgreementID?.toLowerCase().includes(searchTerm.toLowerCase())
      ).map(agreement => ({
        ...agreement,
        id: agreement.id || agreement.AgreementID || `mock-${Math.random()}`,
        EffectiveDate: agreement.EffectiveDate || new Date().toISOString(),
        ExpireDate: agreement.ExpireDate || null
      }));
      return { data: filtered as unknown as Agreement[], count: filtered.length };
    }

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
      console.error("❌ Error searching for agreement by ID:", error);
      toast.error("Failed to search for agreement");
      return { data: [], count: 0 };
    }
    
    console.log(`✅ Found ${data.length} agreements matching ID "${term}"`);
    console.log(`✅ Total count: ${count || 0}`);
    
    return { 
      data: data as unknown as Agreement[] || [], 
      count: count || 0 
    };
  } catch (error) {
    console.error("❌ Exception in searchAgreementById:", error);
    toast.error("An unexpected error occurred while searching for agreement");
    return { data: [], count: 0 };
  }
}

/**
 * React Query hook for searching agreements by ID
 */
export function useSearchAgreementById(searchTerm: string) {
  return useQuery({
    queryKey: ['agreements-search-by-id', searchTerm],
    queryFn: () => searchAgreementById(searchTerm),
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: false, // Don't retry if the query fails
    enabled: !!searchTerm && searchTerm.length >= 3, // Only enable if search term is at least 3 characters
  });
} 

export interface AgreementsQueryOptions {
  dateRange: DateRange;
  dealerFilter?: string;
  pagination?: {
    page: number;
    pageSize: number;
  };
  includeCount?: boolean;
  statusFilters?: string[];
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
  // Use mock data in development mode
  if (shouldUseMockData()) {
    console.log('[SHARED_AGREEMENTS] 🔧 Using mock data in development mode');
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const mockData = MockDataService.getAgreementsData(page - 1, pageSize, dealerFilter, statusFilters);
    
    return {
      data: mockData.data.map(agreement => ({
        ...agreement,
        id: agreement.id || agreement.AgreementID || `mock-${Math.random()}`,
        EffectiveDate: agreement.EffectiveDate || new Date().toISOString(),
        ExpireDate: agreement.ExpireDate || null
      })) as unknown as Agreement[],
      count: mockData.count
    };
  }

  try {
    console.log('[SHARED_AGREEMENTS] Fetching agreements with parameters:', {
      dateRange,
      dealerFilter,
      pagination,
      statusFilters
    });

    const from = dateRange.from.toISOString();
    const to = dateRange.to.toISOString();
    
    // Build count query
    let countQuery = supabase
      .from("agreements")
      .select("id", { count: 'exact', head: true })
      .gte("EffectiveDate", from)
      .lte("EffectiveDate", to);
    
    if (dealerFilter && dealerFilter.trim()) {
      countQuery = countQuery.eq("DealerUUID", dealerFilter.trim());
    }
    
    if (statusFilters && statusFilters.length > 0) {
      countQuery = countQuery.in("AgreementStatus", statusFilters);
    }
    
    // Build data query
    let dataQuery = supabase
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
      .gte("EffectiveDate", from)
      .lte("EffectiveDate", to)
      .order("EffectiveDate", { ascending: false });
    
    if (dealerFilter && dealerFilter.trim()) {
      dataQuery = dataQuery.eq("DealerUUID", dealerFilter.trim());
    }
    
    if (statusFilters && statusFilters.length > 0) {
      dataQuery = dataQuery.in("AgreementStatus", statusFilters);
    }
    
    // Apply pagination
    if (pagination) {
      const startRow = (pagination.page - 1) * pagination.pageSize;
      const endRow = startRow + pagination.pageSize - 1;
      dataQuery = dataQuery.range(startRow, endRow);
    }
    
    // Execute queries
    const [countResult, dataResult] = await Promise.all([
      includeCount ? countQuery : Promise.resolve({ count: 0, error: null }),
      dataQuery
    ]);

    if (countResult.error) {
      console.error('[SHARED_AGREEMENTS] Count error:', countResult.error);
      throw new Error(`Count query failed: ${countResult.error.message}`);
    }

    if (dataResult.error) {
      console.error('[SHARED_AGREEMENTS] Data error:', dataResult.error);
      throw new Error(`Data query failed: ${dataResult.error.message}`);
    }

    console.log(`[SHARED_AGREEMENTS] Retrieved ${dataResult.data?.length || 0} agreements`);
    console.log(`[SHARED_AGREEMENTS] Total count: ${countResult.count || 0}`);

    return {
      data: (dataResult.data || []) as unknown as Agreement[],
      count: countResult.count || 0
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
 * React Query hook for agreements data
 */
export function useSharedAgreementsData(options: AgreementsQueryOptions) {
  return useQuery({
    queryKey: [
      'agreements', 
      options.dateRange.from, 
      options.dateRange.to, 
      options.dealerFilter, 
      options.pagination?.page, 
      options.pagination?.pageSize, 
      options.includeCount,
      options.statusFilters
    ],
    queryFn: () => fetchAgreementsData(options),
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: false, // Don't retry if the query fails
  });
} 