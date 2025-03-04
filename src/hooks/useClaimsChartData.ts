
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';

export const fetchClaimsData = async (dateRange: DateRange, dealershipFilter?: string) => {
  console.log('[CLAIMCHART_FETCH] Fetching claims with filters:', {
    dateRange,
    dealershipFilter,
    fromDate: dateRange.from.toISOString(),
    toDate: dateRange.to.toISOString()
  });
  
  try {
    let query = supabase
      .from("claims")
      .select(`
        id,
        ClaimID, 
        ReportedDate, 
        Closed,
        Cause,
        Correction,
        LastModified,
        agreements(DealerUUID, dealers(Payee))
      `)
      // Use LastModified for date filtering to be consistent with ClaimsTable
      .gte('LastModified', dateRange.from.toISOString())
      .lte('LastModified', dateRange.to.toISOString());
    
    if (dealershipFilter && dealershipFilter.trim() !== '') {
      console.log('[CLAIMCHART_FILTER] Filtering by dealership UUID:', dealershipFilter);
      query = query.eq('agreements.DealerUUID', dealershipFilter);
    }

    const { data: claims, error } = await query;

    if (error) {
      console.error('[CLAIMCHART_ERROR] Error fetching claims:', error);
      return [];
    }

    console.log(`[CLAIMCHART_RESULT] Fetched ${claims?.length || 0} claims`);
    
    return claims || [];
  } catch (error) {
    console.error('[CLAIMCHART_ERROR] Error in fetchClaimsData:', error);
    return [];
  }
};

export function useClaimsChartData(dateRange: DateRange, dealershipFilter?: string) {
  return useQuery({
    queryKey: ['claims-chart', dateRange.from, dateRange.to, dealershipFilter],
    queryFn: () => fetchClaimsData(dateRange, dealershipFilter),
    staleTime: 1000 * 60 * 10
  });
}
