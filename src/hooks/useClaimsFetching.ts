
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';

const PAGE_SIZE = 100; // Set consistent page size for claims

/**
 * Fetches claims with pagination, filtering, and sorting
 */
export async function fetchClaims(
  page: number = 1, 
  pageSize: number = PAGE_SIZE,
  dealerFilter?: string,
  dateRange?: DateRange
) {
  console.log('🔍 ClaimsTable: Fetching claims with parameters:');
  console.log(`🔍 Page: ${page}, Page size: ${pageSize}`);
  console.log('🔍 Dealer filter:', dealerFilter);
  console.log('🔍 Date range:', dateRange ? `${dateRange.from.toISOString()} to ${dateRange.to.toISOString()}` : 'Not provided');
  
  const startRow = (page - 1) * pageSize;
  const endRow = startRow + pageSize - 1;
  
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
      LastModified,
      agreements(DealerUUID, dealers(Payee))
    `, { count: 'exact' })
    .order("LastModified", { ascending: false });

  if (dateRange) {
    console.log(`🔍 ClaimsTable: Filtering by date range: ${dateRange.from.toISOString()} to ${dateRange.to.toISOString()}`);
    query = query
      .gte("LastModified", dateRange.from.toISOString())
      .lte("LastModified", dateRange.to.toISOString());
  }

  if (dealerFilter && dealerFilter.trim() !== '') {
    console.log(`🔍 ClaimsTable: Filtering by dealership UUID: "${dealerFilter}"`);
    query = query.eq("agreements.DealerUUID", dealerFilter);
  }

  query = query.range(startRow, endRow);

  const { data, error, count } = await query;

  if (error) {
    console.error("❌ Error fetching claims:", error);
    return { data: [], count: 0 };
  }

  console.log(`✅ ClaimsTable: Fetched ${data?.length || 0} claims (Page ${page})`);
  console.log(`✅ ClaimsTable: Total count: ${count || 0}`);
  
  return { data: data || [], count: count || 0 };
}

/**
 * Custom hook for fetching and managing claims data
 */
export function useClaimsFetching(page: number, pageSize: number, dealerFilter?: string, dateRange?: DateRange) {
  return useQuery({
    queryKey: ['claims', page, pageSize, dealerFilter, dateRange?.from, dateRange?.to],
    queryFn: () => fetchClaims(page, pageSize, dealerFilter, dateRange),
    staleTime: 1000 * 60 * 10,
  });
}
