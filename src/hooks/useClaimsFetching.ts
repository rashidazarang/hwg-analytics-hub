
import { useSharedClaimsData } from './useSharedClaimsData';
import { DateRange } from '@/lib/dateUtils';

const PAGE_SIZE = 100;

export function useClaimsFetching(
  page: number, 
  pageSize: number, 
  dealerFilter?: string, 
  dateRange?: DateRange
) {
  // Use our shared claims data hook with pagination
  const result = useSharedClaimsData({
    dateRange: dateRange || { from: new Date(0), to: new Date() },
    dealerFilter,
    pagination: {
      page,
      pageSize
    },
    includeCount: true
  });

  // Transform the result to maintain the shape expected by ClaimsTable
  return {
    ...result,
    data: {
      data: result.data?.data || [],
      count: result.data?.count || 0
    }
  };
}

// Export the raw fetch function for direct use if needed
export { fetchClaimsData } from './useSharedClaimsData';
