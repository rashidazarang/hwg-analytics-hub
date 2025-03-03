
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';

// Define the type for our RPC function return
export type AgreementStatusCount = {
  status: string;
  count: number;
};

// Define the type for chart data
export type AgreementChartData = {
  name: string;
  value: number;
  rawStatus: string;
};

// Define the status labels mapping - now in UPPERCASE
export const STATUS_LABELS: Record<string, string> = {
  'ACTIVE': 'ACTIVE',
  'EXPIRED': 'EXPIRED',
  'CANCELLED': 'CANCELLED',
  'PENDING': 'PENDING',
  'TERMINATED': 'TERMINATED',
  'VOID': 'VOID',
  'CLAIMABLE': 'CLAIMABLE',
  'Unknown': 'UNKNOWN'
};

export function useAgreementStatusData(dateRange: DateRange, dealerFilter: string = '') {
  // Use dealerFilter in the query key to ensure React Query can detect changes to the filter
  return useQuery({
    queryKey: ['agreement-status-distribution', dateRange.from?.toISOString(), dateRange.to?.toISOString(), dealerFilter],
    queryFn: async () => {
      console.log('📊 Fetching agreement status distribution data...');
      console.log('📊 Dealer filter:', dealerFilter);
      
      try {
        // Get date range for filtering
        const fromDate = dateRange.from?.toISOString() || "2020-01-01T00:00:00.000Z";
        const toDate = dateRange.to?.toISOString() || "2025-12-31T23:59:59.999Z";

        // First, we need to fetch dealers if we have a dealer filter
        let dealerUUIDs: string[] = [];
        
        if (dealerFilter) {
          const normalizedDealerFilter = dealerFilter.toLowerCase().trim();
          const { data: dealersData, error: dealersError } = await supabase
            .from('dealers')
            .select('DealerUUID, Payee')
            .ilike('Payee', `%${normalizedDealerFilter}%`);
          
          if (dealersError) {
            console.error('❌ Error fetching dealers:', dealersError);
          } else if (dealersData && dealersData.length > 0) {
            dealerUUIDs = dealersData.map(dealer => dealer.DealerUUID);
            console.log('📊 Found dealers matching filter:', dealerUUIDs.length);
          } else {
            // If no dealers match the filter but a filter was provided, return empty data
            console.log('📊 No dealers found matching filter:', normalizedDealerFilter);
            return [];
          }
        }

        // Now use the RPC function with dealer filter if applicable
        let query = supabase.rpc('count_agreements_by_status', {
          from_date: fromDate,
          to_date: toDate
        });
        
        // We can't directly filter in the RPC, so we'll do client-side filtering if dealerFilter is provided
        const { data, error } = await query;

        if (error) {
          console.error('❌ Error fetching agreement status distribution:', error);
          return [];
        }

        console.log('📊 Agreement status counts from database:', data);
        
        // If dealer filter is active and we found matching dealers, we need to get the filtered data
        if (dealerFilter && dealerUUIDs.length > 0) {
          console.log('📊 Applying dealer filter to agreements...');
          // Fetch all agreements within date range and filter by dealer
          const { data: filteredAgreements, error: agreementsError } = await supabase
            .from('agreements')
            .select('AgreementStatus, DealerUUID')
            .gte('EffectiveDate', fromDate)
            .lte('EffectiveDate', toDate)
            .in('DealerUUID', dealerUUIDs);
            
          if (agreementsError) {
            console.error('❌ Error fetching filtered agreements:', agreementsError);
            return [];
          }
          
          // Count agreements by status
          const statusCounts: Record<string, number> = {};
          filteredAgreements.forEach(agreement => {
            const status = agreement.AgreementStatus || 'Unknown';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
          });
          
          // Convert to chart data format
          const chartData = Object.entries(statusCounts).map(([status, count]) => ({
            name: STATUS_LABELS[status] || status,
            value: count,
            rawStatus: status
          }));
          
          // Sort data by count (descending)
          chartData.sort((a, b) => b.value - a.value);
          
          console.log('📊 Filtered agreement status distribution:', chartData);
          console.log(`📊 Total filtered agreements counted: ${chartData.reduce((sum, item) => sum + item.value, 0)}`);
          
          return chartData;
        }
        
        // If no dealer filter or no matching dealers, use the original data
        if (!data || (Array.isArray(data) && data.length === 0)) {
          // Fallback to client-side counting if the RPC function fails or doesn't exist
          console.log('📊 Falling back to client-side counting...');
          const { data: agreements, error: fetchError } = await supabase
            .from('agreements')
            .select('AgreementStatus')
            .gte('EffectiveDate', fromDate)
            .lte('EffectiveDate', toDate);

          if (fetchError) {
            console.error('❌ Error fetching agreements:', fetchError);
            return [];
          }

          // Count agreements by status
          const statusCounts: Record<string, number> = {};
          agreements.forEach(agreement => {
            const status = agreement.AgreementStatus || 'Unknown';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
          });

          // Convert to chart data format
          const chartData = Object.entries(statusCounts).map(([status, count]) => ({
            name: STATUS_LABELS[status] || status,
            value: count,
            rawStatus: status
          }));

          // Sort data by count (descending)
          chartData.sort((a, b) => b.value - a.value);
          
          console.log('📊 Client-side counted agreement status distribution:', chartData);
          console.log(`📊 Total agreements counted client-side: ${chartData.reduce((sum, item) => sum + item.value, 0)}`);
          
          return chartData;
        }
        
        // Safely type-check and convert the data
        const typedData = data as AgreementStatusCount[];
        
        // Convert RPC result to chart data format
        const chartData = typedData.map(item => ({
          name: STATUS_LABELS[item.status || 'Unknown'] || item.status || 'Unknown',
          value: Number(item.count),
          rawStatus: item.status || 'Unknown'
        }));

        // Sort data by count (descending)
        chartData.sort((a, b) => b.value - a.value);
        
        console.log(`📊 Total agreements counted: ${chartData.reduce((sum, item) => sum + item.value, 0)}`);
        return chartData;
      } catch (error) {
        console.error('❌ Error processing agreement status data:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });
}
