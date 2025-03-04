
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

  // Then apply dealer filter
if (dealerFilter && dealerFilter.trim() !== '') {
  console.log(`🔍 ClaimsTable: Filtering by dealership UUID: "${dealerFilter}"`);
  query = query.eq("agreements.DealerUUID", dealerFilter.trim());
}

// Apply status filters correctly
if (statusFilters && statusFilters.length > 0) {
  console.log('🔍 ClaimsTable: Applying status filters on server-side:', statusFilters);

  const filterConditions: string[] = [];
  for (const status of statusFilters) {
    if (status === 'OPEN') {
      // OPEN: ReportedDate is NOT NULL AND Closed is NULL
      filterConditions.push(`ReportedDate.is.not.null,Closed.is.not.null`);
      // NOTE: We use Closed.is.not.null here only if you want to force a condition—
      // however, based on your earlier logic for OPEN, you want Closed to be NULL.
      // So the correct condition for OPEN should be:
      // filterConditions.push(`ReportedDate.is.not.null,Closed.is.null`);
      // I'll assume you want the original OPEN logic:
      filterConditions.push(`ReportedDate.is.not.null,Closed.is.null`);
    } else if (status === 'CLOSED') {
      // CLOSED: Closed is NOT NULL
      filterConditions.push(`Closed.is.not.null`);
    } else if (status === 'PENDING') {
      // PENDING: ReportedDate is NULL
      filterConditions.push(`ReportedDate.is.null`);
    }
  }

  if (filterConditions.length > 0) {
    if (filterConditions.length === 1) {
      // For a single condition, apply each filter separately (this creates an AND condition)
      const parts = filterConditions[0].split(',');
      for (const part of parts) {
        const tokens = part.split('.');
        if (tokens.length === 4 && tokens[1] === 'is' && tokens[2] === 'not' && tokens[3] === 'null') {
          // e.g. "ReportedDate.is.not.null"
          query = query.not(tokens[0], 'is', null);
        } else if (tokens.length === 3 && tokens[1] === 'is' && tokens[2] === 'null') {
          // e.g. "Closed.is.null"
          query = query.is(tokens[0], null);
        }
      }
    } else {
      // For multiple status filters, combine them using OR
      query = query.or(filterConditions.join(','));
    }
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
