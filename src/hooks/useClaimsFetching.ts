import { useSharedClaimsData } from './useSharedClaimsData';
import { DateRange } from '@/lib/dateUtils';

// No default page size here - we'll use the value passed from the component

// Disable date range limiting to show all claims 
const USE_LIMITED_DATE_RANGE = false; // Keep this false to ensure we respect user-selected date ranges

export function useClaimsFetching(
  page: number, 
  pageSize: number, 
  dealerFilter?: string, 
  dateRange?: DateRange,
  sortByPaymentDate: boolean = false
) {
  // Remove the artificial limitation on page size
  // This is critical to ensure pagination works properly and we see more than 100 records
  const safePageSize = pageSize; // Remove page size restriction entirely
  console.log(`[CLAIMS_FETCHING] Using safe page size: ${safePageSize} for page ${page}`);
  console.log(`[CLAIMS_FETCHING] Sort by payment date: ${sortByPaymentDate}`);
  
  // Use the provided date range without artificial limitations
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
  }
  // REMOVED: The artificial fallback to 1-month range that was hiding historical claims

  // Use our shared claims data hook with pagination
  const result = useSharedClaimsData({
    dateRange: effectiveDateRange || { from: new Date(0), to: new Date() }, // Show all data if no range provided
    dealerFilter,
    pagination: {
      page,
      pageSize: safePageSize // Use the safety-limited page size
    },
    includeCount: true,
    sortByPaymentDate // Pass the sort parameter to the shared hook
  });

  // Add debugging to check data before transformation
  if (result.data?.data && result.data.data.length > 0) {
    const sampleClaim = result.data.data[0] as any; // Use type assertion to avoid TypeScript errors
    console.log('[CLAIMS_FETCHING] Raw data sample:', {
      sampleClaim,
      hasTotalPaid: sampleClaim.hasOwnProperty('totalPaid') || sampleClaim.hasOwnProperty('TotalPaid'),
      totalPaid: sampleClaim.totalPaid || sampleClaim.TotalPaid,
      hasLastPaymentDate: sampleClaim.hasOwnProperty('lastPaymentDate') || sampleClaim.hasOwnProperty('LastPaymentDate'),
      lastPaymentDate: sampleClaim.lastPaymentDate || sampleClaim.LastPaymentDate,
      dataKeys: Object.keys(sampleClaim)
    });
  }

  // Transform the result to maintain the shape expected by ClaimsTable
  const transformedResult = {
    ...result,
    data: {
      data: result.data?.data || [],
      count: result.data?.count || 0
    },
    // Expose the total count directly for easier access
    totalCount: result.data?.count || 0
  };

  // Debug the transformed result
  if (transformedResult.data.data.length > 0) {
    const sampleClaim = transformedResult.data.data[0] as any; // Use type assertion to avoid TypeScript errors
    console.log('[CLAIMS_FETCHING] Transformed data sample:', {
      sampleClaim,
      hasTotalPaid: sampleClaim.hasOwnProperty('totalPaid') || sampleClaim.hasOwnProperty('TotalPaid'),
      totalPaid: sampleClaim.totalPaid || sampleClaim.TotalPaid,
      hasLastPaymentDate: sampleClaim.hasOwnProperty('lastPaymentDate') || sampleClaim.hasOwnProperty('LastPaymentDate'),
      lastPaymentDate: sampleClaim.lastPaymentDate || sampleClaim.LastPaymentDate,
      dataKeys: Object.keys(sampleClaim),
      totalCount: transformedResult.totalCount
    });
  }

  return transformedResult;
}

// Export the raw fetch function for direct use if needed
export { fetchClaimsData } from './useSharedClaimsData';
