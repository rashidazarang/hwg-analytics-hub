
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
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
        
        // If no dealer filter, use client-side counting with a paginated approach to avoid timeouts
        // First, get total count
        const { count, error: countError } = await supabase
          .from('agreements')
          .select('*', { count: 'exact', head: true })
          .gte('EffectiveDate', fromDate)
          .lte('EffectiveDate', toDate);
          
        if (countError) {
          console.error('❌ Error getting agreement count:', countError);
          toast.error('Failed to count agreements');
          return [];
        }
        
        console.log(`📊 Total agreements in date range: ${count || 0}`);
        
        if (!count || count === 0) {
          return [];
        }
        
        // Fetch in chunks of 1000 to avoid timeouts
        const chunkSize = 1000;
        const chunks = Math.ceil((count || 0) / chunkSize);
        const statusCounts: Record<string, number> = {};
        
        console.log(`📊 Fetching agreements in ${chunks} chunks of ${chunkSize}`);
        
        for (let i = 0; i < chunks; i++) {
          const from = i * chunkSize;
          const to = from + chunkSize - 1;
          
          console.log(`📊 Fetching chunk ${i+1}/${chunks} (rows ${from}-${to})`);
          
          const { data: agreements, error: fetchError } = await supabase
            .from('agreements')
            .select('AgreementStatus')
            .gte('EffectiveDate', fromDate)
            .lte('EffectiveDate', toDate)
            .range(from, to);
            
          if (fetchError) {
            console.error(`❌ Error fetching agreements chunk ${i+1}:`, fetchError);
            continue; // Continue with other chunks
          }
          
          // Count by status
          agreements?.forEach(agreement => {
            const status = agreement.AgreementStatus || 'Unknown';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
          });
        }
        
        console.log('📊 Final status counts:', statusCounts);
        
        // Process the data with grouping
        return processStatusData(statusCounts);
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
