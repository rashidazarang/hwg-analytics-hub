
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import TimeframeFilter, { TimeframeOption } from '@/components/filters/TimeframeFilter';
import InteractiveBarChart from '@/components/charts/InteractiveBarChart';
import { usePerformanceMetricsData } from '@/hooks/usePerformanceMetricsData';
import KPISection from '@/components/metrics/KPISection';
import { DateRange } from '@/lib/dateUtils';
import { useSharedPerformanceData } from '@/hooks/useSharedPerformanceData';
import { supabase } from '@/integrations/supabase/client';
import Sidebar from '@/components/navigation/Sidebar';
import DateRangeFilter from '@/components/filters/DateRangeFilter';
import Dashboard from '@/components/layout/Dashboard';

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

  // Handle date range change
  const handleDateRangeChange = useCallback((range: DateRange) => {
    setDateRange(range);
  }, []);

  // Fetch performance metrics data
  const { data, loading, error, startDate, endDate } = usePerformanceMetricsData(timeframe, periodOffset);

  // Create a memoized key for the status fetching effect to avoid unnecessary triggers
  const statusFetchKey = useMemo(() => 
    `${timeframe}-${periodOffset}-${data.length}`,
    [timeframe, periodOffset, data.length]
  );

  // Fetch status averages whenever data, timeframe, or periodOffset changes
  useEffect(() => {
    // Skip if loading or no data
    if (loading || data.length === 0) {
      return;
    }

    async function fetchStatusAverages() {
      // Calculate date range for supabase query
      const fromDate = startDate.toISOString();
      const toDate = endDate.toISOString();
      
      console.log(`[PERFORMANCE_METRICS] Fetching agreement status counts from ${fromDate} to ${toDate}`);
      
      // Fetch all agreements with pagination to handle large datasets
      let allAgreements: any[] = [];
      let hasMore = true;
      let offset = 0;
      const limit = 1000;
      
      while (hasMore) {
        const { data: pageData, error: pageError } = await supabase
          .from('agreements')
          .select('AgreementStatus')
          .gte('EffectiveDate', fromDate)
          .lte('EffectiveDate', toDate)
          .range(offset, offset + limit - 1);
        
        if (pageError) {
          console.error("[PERFORMANCE_METRICS] Error fetching agreement page data:", pageError);
          break;
        }
        
        if (!pageData || pageData.length === 0) {
          hasMore = false;
        } else {
          allAgreements = [...allAgreements, ...pageData];
          offset += pageData.length;
          
          // If we got back fewer than the limit, we've reached the end
          if (pageData.length < limit) {
            hasMore = false;
          }
        }
      }
      
      // Count agreements by status
      const statusCounts = {
        'PENDING': 0,
        'ACTIVE': 0,
        'CANCELLED': 0
      };
      
      if (allAgreements && allAgreements.length > 0) {
        allAgreements.forEach(agreement => {
          const status = agreement.AgreementStatus?.toUpperCase() || 'UNKNOWN';
          if (status === 'PENDING') statusCounts.PENDING++;
          else if (status === 'ACTIVE') statusCounts.ACTIVE++;
          else if (status === 'CANCELLED') statusCounts.CANCELLED++;
        });
      }
      
      console.log("[PERFORMANCE_METRICS] Total agreements fetched:", allAgreements?.length || 0);
      console.log("[PERFORMANCE_METRICS] Status breakdown:", statusCounts);

      // Calculate division factor based on actual displayed data points
      // For each timeframe, count the number of intervals that actually contain data
      let nonZeroDataPoints = data.filter(point => point.value > 0).length;
      
      // Ensure we have at least 1 data point to avoid division by zero
      const divisionFactor = Math.max(nonZeroDataPoints, 1);
      
      console.log("[PERFORMANCE_METRICS] Non-zero data points:", nonZeroDataPoints);
      console.log("[PERFORMANCE_METRICS] Division factor:", divisionFactor);
      
      // Calculate averages based on actual displayed intervals - round to nearest integer
      const pendingAvg = Math.round(statusCounts.PENDING / divisionFactor);
      const activeAvg = Math.round(statusCounts.ACTIVE / divisionFactor);
      const cancelledAvg = Math.round(statusCounts.CANCELLED / divisionFactor);
      
      console.log("[PERFORMANCE_METRICS] Calculated averages:", { 
        pendingAvg, 
        activeAvg, 
        cancelledAvg,
        timeframe
      });
      
      // Verify sum matches
      const totalAvg = pendingAvg + activeAvg + cancelledAvg;
      const totalDataPointsSum = data.reduce((sum, point) => sum + point.value, 0);
      console.log("[PERFORMANCE_METRICS] Total average:", totalAvg);
      console.log("[PERFORMANCE_METRICS] Sum of data points:", totalDataPointsSum);
      
      // Create date range based on startDate and endDate from performance metrics
      const dateRangeForKPI = {
        from: startDate,
        to: endDate
      };
      
      // Update shared state with dateRange and dealerFilter
      updatePerformanceData(
        data, 
        timeframe, 
        dateRangeForKPI, 
        '', // Empty dealerFilter for performance metrics page
        {
          pending: pendingAvg,
          active: activeAvg,
          cancelled: cancelledAvg
        }
      );
      
    }
    
    // Run the effect
    fetchStatusAverages();
    
  }, [statusFetchKey, startDate, endDate, updatePerformanceData]); 

  // Custom subnavbar for the timeframe filter
  const timeframeSubnavbar = (
    <div className="flex justify-center items-center w-full">
      <TimeframeFilter 
        selected={timeframe} 
        onChange={handleTimeframeChange}
      />
    </div>
  );

  return (
    <Dashboard
      onDateRangeChange={handleDateRangeChange}
      kpiSection={<KPISection />}
      pageTitle="Performance Metrics"
      subnavbar={timeframeSubnavbar}
    >
      <div className="w-full max-w-5xl mx-auto">
        <InteractiveBarChart 
          data={data}
          timeframe={timeframe}
          isLoading={loading}
          onPeriodChange={handlePeriodChange}
          currentOffset={periodOffset}
          className="w-full"
        />
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mt-4">
            <p>Error loading data: {error.message}</p>
          </div>
        )}
      </div>
    </Dashboard>
  );
};

export default PerformanceMetrics;
