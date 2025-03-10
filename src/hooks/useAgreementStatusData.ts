
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange, setCSTHours, toCSTISOString } from '@/lib/dateUtils';
import { toast } from 'sonner';

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
  color?: string; // Added color property for explicit color control
  isGrouped?: boolean; // Flag to indicate if this is a grouped category
  groupedStatuses?: {status: string, count: number}[]; // For "Other" category to store individual statuses
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

// Define status colors
export const STATUS_COLORS: Record<string, string> = {
  'ACTIVE': '#00B179', // Green
  'PENDING': '#0079EE', // Blue
  'CANCELLED': '#FC912A', // Yellow
  'OTHER': '#F6383F', // Red
};

// Define status grouping
export const STATUS_GROUPS: Record<string, string> = {
  'ACTIVE': 'ACTIVE',
  'PENDING': 'PENDING',
  'CANCELLED': 'CANCELLED',
  'EXPIRED': 'OTHER',
  'TERMINATED': 'OTHER',
  'VOID': 'OTHER',
  'CLAIMABLE': 'OTHER',
  'Unknown': 'OTHER'
};

export function useAgreementStatusData(dateRange: DateRange, dealerFilter: string = '') {
  // Use dealerFilter in the query key to ensure React Query can detect changes to the filter
  return useQuery({
    queryKey: ['agreement-status-distribution', dateRange.from?.toISOString(), dateRange.to?.toISOString(), dealerFilter],
    queryFn: async () => {
      console.log('📊 Fetching agreement status distribution data...');
      console.log('📊 Date range:', dateRange.from?.toISOString(), 'to', dateRange.to?.toISOString());
      console.log('📊 Dealer filter:', dealerFilter);
      
      try {
        // Get date range for filtering with CST timezone
        const startDate = dateRange.from 
          ? setCSTHours(new Date(dateRange.from), 0, 0, 0, 0)
          : new Date("2020-01-01T00:00:00.000-06:00"); // CST
        
        const endDate = dateRange.to
          ? setCSTHours(new Date(dateRange.to), 23, 59, 59, 999)
          : new Date("2025-12-31T23:59:59.999-06:00"); // CST
        
        const fromDate = startDate.toISOString();
        const toDate = endDate.toISOString();

        // If we have a dealer filter, directly query by dealer UUID
        if (dealerFilter) {
          console.log(`📊 Filtering agreements by dealer UUID: ${dealerFilter}`);
          
          // Direct query for agreements matching this dealer - ensure we're using the same date field as other components
          const { data: filteredAgreements, error } = await supabase
            .from('agreements')
            .select('AgreementStatus')
            .eq('DealerUUID', dealerFilter)
            .gte('EffectiveDate', fromDate)
            .lte('EffectiveDate', toDate);
            
          if (error) {
            console.error('❌ Error fetching filtered agreements:', error);
            toast.error('Failed to load agreement data');
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
          
          console.log('📊 Status counts for filtered agreements:', statusCounts);
          
          // Process the data with grouping
          return processStatusData(statusCounts);
        }
        
        // If no dealer filter, use a more efficient approach to avoid timeouts
        // First, use our RPC function to efficiently count by status
        const { data: statusCounts, error: rpcError } = await supabase
          .rpc('count_agreements_by_status', {
            from_date: fromDate,
            to_date: toDate
          });
          
        if (rpcError) {
          console.error('❌ Error executing RPC count_agreements_by_status:', rpcError);
          
          // Fallback: manually count statuses if RPC fails
          console.log('📊 Falling back to manual status counting...');
          
          const { data: agreements, error: queryError } = await supabase
            .from('agreements')
            .select('AgreementStatus')
            .gte('EffectiveDate', fromDate)
            .lte('EffectiveDate', toDate);
            
          if (queryError) {
            console.error('❌ Error fetching agreements fallback:', queryError);
            toast.error('Failed to load agreement data');
            return [];
          }
          
          // Count agreements by status
          const manualStatusCounts: Record<string, number> = {};
          (agreements || []).forEach(agreement => {
            const status = agreement.AgreementStatus || 'Unknown';
            manualStatusCounts[status] = (manualStatusCounts[status] || 0) + 1;
          });
          
          console.log('📊 Manual status counts:', manualStatusCounts);
          
          // Process the data with grouping
          return processStatusData(manualStatusCounts);
        }
        
        console.log('📊 RPC returned status counts:', statusCounts);
        
        if (!statusCounts || statusCounts.length === 0) {
          return [];
        }
        
        // Convert the RPC result to the format needed for processing
        const statusCountsMap: Record<string, number> = {};
        statusCounts.forEach((item: AgreementStatusCount) => {
          statusCountsMap[item.status] = item.count;
        });
        
        console.log('📊 Processed status counts from RPC:', statusCountsMap);
        
        // Process the data with grouping
        return processStatusData(statusCountsMap);
      } catch (error) {
        console.error('❌ Error processing agreement status data:', error);
        toast.error('Error processing agreement data');
        return [];
      }
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attempt) => Math.min(attempt * 1000, 3000),
  });
}

// Helper function to process status data with grouping
function processStatusData(statusCounts: Record<string, number>): AgreementChartData[] {
  if (!statusCounts || Object.keys(statusCounts).length === 0) {
    console.log('📊 No status counts to process');
    return [];
  }
  
  // Group data by status group
  const groupedData: Record<string, {
    count: number,
    statuses: {status: string, count: number}[]
  }> = {};
  
  // First, group the data
  Object.entries(statusCounts).forEach(([status, count]) => {
    const group = STATUS_GROUPS[status] || 'OTHER';
    
    if (!groupedData[group]) {
      groupedData[group] = {
        count: 0,
        statuses: []
      };
    }
    
    groupedData[group].count += count;
    groupedData[group].statuses.push({
      status,
      count
    });
  });
  
  // Convert to chart data format
  const chartData: AgreementChartData[] = Object.entries(groupedData).map(([group, data]) => {
    const isOtherGroup = group === 'OTHER';
    
    return {
      name: isOtherGroup ? 'OTHER' : group,
      value: data.count,
      rawStatus: group,
      color: STATUS_COLORS[group],
      isGrouped: isOtherGroup,
      groupedStatuses: isOtherGroup ? data.statuses : undefined
    };
  });

  // Sort data by count (descending) but ensure ACTIVE, PENDING, CANCELLED are first
  const priorityOrder: Record<string, number> = {
    'ACTIVE': 1,
    'PENDING': 2,
    'CANCELLED': 3,
    'OTHER': 4
  };
  
  chartData.sort((a, b) => {
    const orderA = priorityOrder[a.name] || 99;
    const orderB = priorityOrder[b.name] || 99;
    
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    return b.value - a.value;
  });
  
  console.log('📊 Processed agreement status distribution:', chartData);
  console.log(`📊 Total agreements counted: ${chartData.reduce((sum, item) => sum + item.value, 0)}`);
  
  return chartData;
}
