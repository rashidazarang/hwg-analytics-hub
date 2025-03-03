
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

// Define the status labels mapping
export const STATUS_LABELS: Record<string, string> = {
  'ACTIVE': 'Active',
  'EXPIRED': 'Expired',
  'CANCELLED': 'Cancelled',
  'PENDING': 'Pending',
  'TERMINATED': 'Terminated',
  'VOID': 'Void',
  'CLAIMABLE': 'Claimable',
  'Unknown': 'Unknown'
};

export function useAgreementStatusData(dateRange: DateRange) {
  return useQuery({
    queryKey: ['agreement-status-distribution', dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      console.log('📊 Fetching agreement status distribution data...');
      
      try {
        // Get date range for filtering
        const fromDate = dateRange.from?.toISOString() || "2020-01-01T00:00:00.000Z";
        const toDate = dateRange.to?.toISOString() || "2025-12-31T23:59:59.999Z";

        // First, we'll get the distribution of agreements by status
        // Using the RPC function we created for grouping
        const { data, error } = await supabase
          .rpc('count_agreements_by_status', {
            from_date: fromDate,
            to_date: toDate
          });

        if (error) {
          console.error('❌ Error fetching agreement status distribution:', error);
          return [];
        }

        console.log('📊 Agreement status counts from database:', data);
        
        // Check if data exists and has elements
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
