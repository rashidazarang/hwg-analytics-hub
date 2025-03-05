
import { useQuery } from '@tanstack/react-query';
import { DateRange } from '@/lib/dateUtils';
import { useSharedClaimsData } from './useSharedClaimsData';

export function useClaimsChartData(dateRange: DateRange, dealershipFilter?: string) {
  // Use the shared claims data hook without pagination
  // This ensures we fetch ALL claims without any limitation
  const result = useSharedClaimsData({
    dateRange,
    dealerFilter: dealershipFilter,
    includeCount: true
  });

  // Log when data changes
  if (result.data) {
    console.log(`[CLAIMS_CHART_DATA] Received ${result.data.data.length} out of ${result.data.count} total claims`);
    console.log('[CLAIMS_CHART_DATA] Status breakdown:', result.data.statusBreakdown);
  }

  return result;
}
