
import { useQuery } from '@tanstack/react-query';
import { DateRange } from '@/lib/dateUtils';
import { useSharedClaimsData } from './useSharedClaimsData';

export function useClaimsChartData(dateRange: DateRange, dealershipFilter?: string) {
  // Use the shared claims data hook without pagination
  return useSharedClaimsData({
    dateRange,
    dealerFilter: dealershipFilter,
    includeCount: true
  });
}
