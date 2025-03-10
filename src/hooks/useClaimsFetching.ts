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

  // Add debugging to check data before transformation
  if (result.data?.data && result.data.data.length > 0) {
    console.log('[CLAIMS_FETCHING] Raw data from useSharedClaimsData:', {
      sampleClaim: result.data.data[0],
      hasTotalPaid: result.data.data[0].hasOwnProperty('totalPaid'),
      totalPaid: result.data.data[0].totalPaid,
      dataKeys: Object.keys(result.data.data[0])
    });
  }

  // Transform the result to maintain the shape expected by ClaimsTable
  const transformedResult = {
    ...result,
    data: {
      data: result.data?.data || [],
      count: result.data?.count || 0
    }
  };

  // Debug the transformed result
  if (transformedResult.data.data.length > 0) {
    console.log('[CLAIMS_FETCHING] Transformed data:', {
      sampleClaim: transformedResult.data.data[0],
      hasTotalPaid: transformedResult.data.data[0].hasOwnProperty('totalPaid'),
      totalPaid: transformedResult.data.data[0].totalPaid,
      dataKeys: Object.keys(transformedResult.data.data[0])
    });
  }

  return transformedResult;
}

// Export the raw fetch function for direct use if needed
export { fetchClaimsData } from './useSharedClaimsData';
