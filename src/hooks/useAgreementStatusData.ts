
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

        // If we have a dealer filter, directly query by dealer UUID
        if (dealerFilter) {
          console.log(`📊 Filtering agreements by dealer UUID: ${dealerFilter}`);
          
          // Direct query for agreements matching this dealer
          const { data: filteredAgreements, error } = await supabase
            .from('agreements')
            .select('AgreementStatus')
            .eq('DealerUUID', dealerFilter)
            .gte('EffectiveDate', fromDate)
            .lte('EffectiveDate', toDate);
            
          if (error) {
            console.error('❌ Error fetching filtered agreements:', error);
            return [];
          }
          
          if (!filteredAgreements || filteredAgreements.length === 0) {
            console.log('📊 No agreements found for this dealer in the selected date range');
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
        
        // If no dealer filter, use the RPC function to get all agreements status distribution
        const { data, error } = await supabase.rpc('count_agreements_by_status', {
          from_date: fromDate,
          to_date: toDate
        });

        if (error) {
          console.error('❌ Error fetching agreement status distribution:', error);
          return [];
        }

        console.log('📊 Agreement status counts from database:', data);
        
        // If no data returned from RPC, fall back to client-side counting
        if (!data || (Array.isArray(data) && data.length === 0)) {
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
        
        // Safely type-check and convert the data from RPC
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
