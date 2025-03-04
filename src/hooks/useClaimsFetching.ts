
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

// Apply status filters correctly using OR conditions
if (statusFilters && statusFilters.length > 0) {
  console.log('🔍 ClaimsTable: Applying status filters on server-side:', statusFilters);

  if (statusFilters.length === 1) {
    // For a single status, apply filters directly.
    const status = statusFilters[0];
    if (status === 'OPEN') {
      query = query.not('ReportedDate', 'is', null).is('Closed', null);
    } else if (status === 'CLOSED') {
      query = query.not('Closed', 'is', null);
    } else if (status === 'PENDING') {
      query = query.is('ReportedDate', null);
    }
  } else {
    // For multiple statuses, build an OR filter string.
    const conditions = statusFilters.map(status => {
      if (status === 'OPEN') {
        // Use the and() function for OPEN so that both conditions are met.
        return `and(ReportedDate.is.not.null,Closed.is.null)`;
      } else if (status === 'CLOSED') {
        return `Closed.is.not.null`;
      } else if (status === 'PENDING') {
        return `ReportedDate.is.null`;
      }
      return null;
    }).filter(Boolean) as string[];

    const orFilter = conditions.join(',');
    query = query.or(orFilter);
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
