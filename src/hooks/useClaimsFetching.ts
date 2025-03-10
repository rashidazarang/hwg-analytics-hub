import { useSharedClaimsData } from './useSharedClaimsData';
import { DateRange } from '@/lib/dateUtils';

// No default page size here - we'll use the value passed from the component

// Add this constant to control the date range limiting for performance
const USE_LIMITED_DATE_RANGE = false; // Set to false to avoid limiting date range and show all claims

export function useClaimsFetching(
  page: number, 
  pageSize: number, 
  dealerFilter?: string, 
  dateRange?: DateRange
) {
  // If limiting date range is enabled, limit to the last 12 months for better performance
  let effectiveDateRange = dateRange;
  
  if (USE_LIMITED_DATE_RANGE && !dateRange) {
    // Create a 12-month date range instead of "all time"
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12); // Last 12 months
    
    console.log('[CLAIMS_FETCHING] Using limited date range for performance:', {
      from: startDate.toISOString(),
      to: endDate.toISOString()
    });
    
    effectiveDateRange = { from: startDate, to: endDate };
  } else if (!dateRange) {
    // If no date range specified and not limiting, use a very recent date range (1 month)
    // to avoid performance issues but still show some data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1); // Last month
    
    console.log('[CLAIMS_FETCHING] Using default 1-month date range:', {
      from: startDate.toISOString(),
      to: endDate.toISOString()
    });
    
    effectiveDateRange = { from: startDate, to: endDate };
  }

  // Use our shared claims data hook with pagination
  const result = useSharedClaimsData({
    dateRange: effectiveDateRange || { from: new Date(0), to: new Date() },
    dealerFilter,
    pagination: {
      page,
      pageSize
    },
    includeCount: true
  });

  // Add debugging to check data before transformation
  if (result.data?.data && result.data.data.length > 0) {
    console.log('[CLAIMS_FETCHING] Raw data sample:', {
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
    console.log('[CLAIMS_FETCHING] Transformed data sample:', {
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
