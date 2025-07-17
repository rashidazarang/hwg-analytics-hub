import { useSharedAgreementsData } from './useSharedAgreementsData';
import { DateRange } from '@/lib/dateUtils';

export function useAgreementsFetching(
  page: number, 
  pageSize: number, 
  dealerFilter?: string, 
  dateRange?: DateRange,
  statusFilters?: string[]
) {
  console.log(`[AGREEMENTS_FETCHING] Using page size: ${pageSize} for page ${page}`);
  console.log(`[AGREEMENTS_FETCHING] Status filters:`, statusFilters);
  
  // Set default date range if not provided
  let effectiveDateRange = dateRange;
  
  if (!dateRange) {
    // Use a reasonable default date range (last 12 months)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
    
    console.log('[AGREEMENTS_FETCHING] Using default 12-month date range:', {
      from: startDate.toISOString(),
      to: endDate.toISOString()
    });
    
    effectiveDateRange = { from: startDate, to: endDate };
  }

  // Use the shared agreements data hook with pagination
  const result = useSharedAgreementsData({
    dateRange: effectiveDateRange || { from: new Date(2020, 0, 1), to: new Date() },
    dealerFilter,
    pagination: {
      page,
      pageSize
    },
    includeCount: true,
    statusFilters
  });

  // Transform the result to maintain the shape expected by AgreementsTable
  const transformedResult = {
    ...result,
    data: {
      data: result.data?.data || [],
      count: result.data?.count || 0
    },
    // Expose the total count directly for easier access
    totalCount: result.data?.count || 0
  };

  console.log(`[AGREEMENTS_FETCHING] Transformed result:`, {
    dataCount: transformedResult.data.data.length,
    totalCount: transformedResult.totalCount,
    isLoading: result.isLoading,
    error: result.error
  });

  return transformedResult;
}

// Export the raw fetch function for direct use if needed
export { fetchAgreementsData } from './useSharedAgreementsData'; 