
import { useQuery } from '@tanstack/react-query';
import { DateRange } from '@/lib/dateUtils';
import { useSharedClaimsData } from './useSharedClaimsData';

export function useClaimsChartData(dateRange: DateRange, dealershipFilter?: string) {
  // Use the shared claims data hook without pagination
  // Since we're not specifying pagination, it will fetch ALL claims without limitation
  return useSharedClaimsData({
    dateRange,
    dealerFilter: dealershipFilter,
    includeCount: true
  });
}
