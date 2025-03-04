
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';

const PAGE_SIZE = 100;

export async function fetchClaims(
  page: number = 1, 
  pageSize: number = PAGE_SIZE,
  dealerFilter?: string,
  dateRange?: DateRange,
  statusFilters?: string[]
) {
  console.log('🔍 ClaimsTable: Fetching claims with parameters:');
  console.log(`🔍 Page: ${page}, Page size: ${pageSize}`);
  console.log('🔍 Dealer filter:', dealerFilter);
  console.log('🔍 Date range:', dateRange ? `${dateRange.from.toISOString()} to ${dateRange.to.toISOString()}` : 'Not provided');
  console.log('🔍 Status filters:', statusFilters);
  
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
  CASE
    WHEN ReportedDate IS NOT NULL AND Closed IS NULL THEN 'OPEN'
    WHEN Closed IS NOT NULL THEN 'CLOSED'
    WHEN ReportedDate IS NULL THEN 'PENDING'
    ELSE 'UNKNOWN'
  END as status,
  agreements!inner(DealerUUID, dealers(Payee))
`, { count: 'exact' })
  .order("LastModified", { ascending: false });

  // Apply date range filter first
  if (dateRange) {
    console.log(`🔍 ClaimsTable: Filtering by date range: ${dateRange.from.toISOString()} to ${dateRange.to.toISOString()}`);
    query = query
      .gte("LastModified", dateRange.from.toISOString())
      .lte("LastModified", dateRange.to.toISOString());
  }

// Apply status filters using the computed "status" column
if (statusFilters && statusFilters.length > 0) {
  if (statusFilters.length === 1) {
    query = query.eq('status', statusFilters[0]);
  } else {
    let filterExpression = '';
    for (let i = 0; i < statusFilters.length; i++) {
      if (i > 0) {
        filterExpression += ',';
      }
      filterExpression += `status.eq.${statusFilters[i]}`;
    }
    query = query.or(filterExpression);
  }
}

  // Apply pagination last
  query = query.range(startRow, endRow);

  const { data, error, count } = await query;

  if (error) {
    console.error("❌ Error fetching claims:", error);
    throw error; // Let the error handler deal with it
  }

  console.log(`✅ ClaimsTable: Fetched ${data?.length || 0} claims (Page ${page})`);
  console.log(`✅ ClaimsTable: Total count: ${count || 0}`);
  
  return { data: data || [], count: count || 0 };
}

export function useClaimsFetching(
  page: number, 
  pageSize: number, 
  dealerFilter?: string, 
  dateRange?: DateRange,
  statusFilters?: string[]
) {
  return useQuery({
    queryKey: ['claims', page, pageSize, dealerFilter, dateRange?.from, dateRange?.to, statusFilters],
    queryFn: () => fetchClaims(page, pageSize, dealerFilter, dateRange, statusFilters),
    staleTime: 1000 * 60 * 10,
  });
}
