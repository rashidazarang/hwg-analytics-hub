
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
      agreements(DealerUUID, dealers(Payee))
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
    query = query.eq("agreements.DealerUUID", dealerFilter);
  }

  // Apply status filters correctly
  if (statusFilters && statusFilters.length > 0) {
    console.log('🔍 ClaimsTable: Applying status filters on server-side:', statusFilters);
    
    // Start with an empty array for our OR conditions
    const filterConditions = [];
    
    // Add the appropriate filter for each status
    for (const status of statusFilters) {
      if (status === 'OPEN') {
        // Open claims: ReportedDate is NOT NULL AND Closed is NULL
        filterConditions.push(`ReportedDate.is.not.null,Closed.is.null`);
      } else if (status === 'CLOSED') {
        // Closed claims: Closed is NOT NULL
        filterConditions.push(`Closed.is.not.null`);
      } else if (status === 'PENDING') {
        // Pending claims: ReportedDate is NULL
        filterConditions.push(`ReportedDate.is.null`);
      }
    }
    
    // If we have filter conditions, apply them
    if (filterConditions.length > 0) {
      if (filterConditions.length === 1) {
        // For a single condition, we can apply it directly
        const condition = filterConditions[0];
        const parts = condition.split(',');
        
        for (const part of parts) {
          const [field, operatorValue] = part.split('.is.');
          
          if (operatorValue === 'null') {
            query = query.is(field, null);
          } else if (operatorValue === 'not.null') {
            query = query.not(field, 'is', null);
          }
        }
      } else {
        // For multiple conditions, we need to use OR
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
