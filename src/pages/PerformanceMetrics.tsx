
import React, { useState, useCallback, useEffect } from 'react';
import TimeframeFilter, { TimeframeOption } from '@/components/filters/TimeframeFilter';
import InteractiveBarChart from '@/components/charts/InteractiveBarChart';
import { usePerformanceMetricsData } from '@/hooks/usePerformanceMetricsData';
import Dashboard from '@/components/layout/Dashboard';
import KPISection from '@/components/metrics/KPISection';
import { DateRange } from '@/lib/dateUtils';
import { useSharedPerformanceData } from '@/hooks/useSharedPerformanceData';
import { supabase } from '@/integrations/supabase/client';

const PerformanceMetrics: React.FC = () => {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('month');
  const [periodOffset, setPeriodOffset] = useState<number>(0);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(),
    to: new Date(),
  });
  
  // Get shared performance data hook
  const { updatePerformanceData } = useSharedPerformanceData();

  // Handle timeframe change
  const handleTimeframeChange = useCallback((newTimeframe: TimeframeOption) => {
    setTimeframe(newTimeframe);
    setPeriodOffset(0); // Reset period offset when timeframe changes
  }, []);

  // Handle period change (prev/next)
  const handlePeriodChange = useCallback((newOffset: number) => {
    setPeriodOffset(newOffset);
  }, []);

  // Handle date range change from Dashboard component
  const handleDateRangeChange = useCallback((range: DateRange) => {
    setDateRange(range);
  }, []);

  // Fetch performance metrics data
  const { data, loading, error, startDate, endDate } = usePerformanceMetricsData(timeframe, periodOffset);

  // Fetch status averages whenever timeframe or periodOffset changes
  useEffect(() => {
    async function fetchStatusAverages() {
      try {
        // Calculate date range for supabase query
        const fromDate = startDate.toISOString();
        const toDate = endDate.toISOString();
        
        console.log(`Fetching agreement status counts from ${fromDate} to ${toDate}`);
        
        // IMPORTANT: Fetch all agreements in one query rather than separate queries for each status
        // This ensures we're using the same dataset for calculating all averages
        const { data: agreementData, error: countError } = await supabase
          .from('agreements')
          .select('AgreementStatus')
          .gte('EffectiveDate', fromDate)
          .lte('EffectiveDate', toDate);
        
        if (countError) {
          console.error("Error fetching agreement status counts:", countError);
          return;
        }
        
        // Count agreements by status
        const statusCounts = {
          'PENDING': 0,
          'ACTIVE': 0,
          'CANCELLED': 0
        };
        
        if (agreementData && agreementData.length > 0) {
          agreementData.forEach(agreement => {
            const status = agreement.AgreementStatus?.toUpperCase() || 'UNKNOWN';
            if (status === 'PENDING') statusCounts.PENDING++;
            else if (status === 'ACTIVE') statusCounts.ACTIVE++;
            else if (status === 'CANCELLED') statusCounts.CANCELLED++;
          });
        }
        
        console.log("[PERFORMANCE_METRICS] Total agreements fetched:", agreementData?.length || 0);
        console.log("[PERFORMANCE_METRICS] Status breakdown:", statusCounts);

        // Calculate division factor based on timeframe
        let divisionFactor = 1;
        switch (timeframe) {
          case 'week':
            divisionFactor = 7; // Days in a week
            break;
          case 'month':
            // Calculate exact days in the month for more accuracy
            const daysInMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
            divisionFactor = daysInMonth;
            break;
          case '6months':
            divisionFactor = 1; // For averages, we want totals for the period
            break;
          case 'year':
            divisionFactor = 1; // For averages, we want totals for the period
            break;
        }
        
        // For 6-months and year views, we want the average per month
        if (timeframe === '6months' || timeframe === 'year') {
          const startMonth = startDate.getMonth();
          const startYear = startDate.getFullYear();
          const endMonth = endDate.getMonth();
          const endYear = endDate.getFullYear();
          
          // Calculate number of months in the range
          const monthCount = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
          divisionFactor = monthCount;
        }
        
        // Calculate averages - round to nearest integer
        let pendingAvg = Math.round(statusCounts.PENDING / divisionFactor);
        let activeAvg = Math.round(statusCounts.ACTIVE / divisionFactor);
        let cancelledAvg = Math.round(statusCounts.CANCELLED / divisionFactor);
        
        // Instead of averaging for single month view, just display the total
        if (timeframe === 'month') {
          pendingAvg = statusCounts.PENDING;
          activeAvg = statusCounts.ACTIVE;
          cancelledAvg = statusCounts.CANCELLED;
        }
        
        console.log("[PERFORMANCE_METRICS] Division factor:", divisionFactor);
        console.log("[PERFORMANCE_METRICS] Calculated values:", { 
          pendingAvg, 
          activeAvg, 
          cancelledAvg,
          timeframe
        });
        
        // Update shared state
        updatePerformanceData(data, timeframe, {
          pending: pendingAvg,
          active: activeAvg,
          cancelled: cancelledAvg
        });
        
      } catch (e) {
        console.error("[PERFORMANCE_METRICS] Error fetching status averages:", e);
      }
    }
    
    if (!loading && data.length > 0) {
      fetchStatusAverages();
    }
  }, [data, loading, timeframe, startDate, endDate, updatePerformanceData, periodOffset]);

  // Custom navigation for the performance metrics page
  const metricsNavigation = (
    <div className="flex justify-between items-center w-full">
      <TimeframeFilter 
        selected={timeframe} 
        onChange={handleTimeframeChange} 
        className="mx-auto"
      />
    </div>
  );

  return (
    <Dashboard
      onDateRangeChange={handleDateRangeChange}
      kpiSection={null}
      subnavbar={metricsNavigation}
    >
      <div className="space-y-6 max-w-5xl mx-auto">
        <KPISection />
        
        <div className="grid grid-cols-1 gap-6">
          <InteractiveBarChart 
            data={data}
            timeframe={timeframe}
            isLoading={loading}
            onPeriodChange={handlePeriodChange}
            currentOffset={periodOffset}
            className="col-span-1"
          />
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
              <p>Error loading data: {error.message}</p>
            </div>
          )}
        </div>
      </div>
    </Dashboard>
  );
};

export default PerformanceMetrics;
