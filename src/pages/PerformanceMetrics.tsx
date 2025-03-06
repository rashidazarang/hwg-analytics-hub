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
  
  const { updatePerformanceData } = useSharedPerformanceData();

  const handleTimeframeChange = useCallback((newTimeframe: TimeframeOption) => {
    setTimeframe(newTimeframe);
    setPeriodOffset(0);
  }, []);

  const handlePeriodChange = useCallback((newOffset: number) => {
    setPeriodOffset(newOffset);
  }, []);

  const handleDateRangeChange = useCallback((range: DateRange) => {
    setDateRange(range);
  }, []);

  const { data, loading, error, startDate, endDate } = usePerformanceMetricsData(timeframe, periodOffset);

  const statusFetchKey = useMemo(() => 
    `${timeframe}-${periodOffset}-${data.length}`,
    [timeframe, periodOffset, data.length]
  );

  useEffect(() => {
    if (loading || data.length === 0) {
      return;
    }

    // Calculate the status averages for KPI cards
    const calculateStatusAverages = () => {
      // Sum all status counts across all data points
      const totalPending = data.reduce((sum, point) => sum + point.pending, 0);
      const totalActive = data.reduce((sum, point) => sum + point.active, 0);
      const totalCancelled = data.reduce((sum, point) => sum + point.cancelled, 0);
      
      // Find non-zero data points for averaging
      const nonZeroDataPoints = data.filter(point => point.value > 0).length;
      const divisionFactor = Math.max(nonZeroDataPoints, 1);
      
      console.log("[PERFORMANCE_METRICS] Status totals:", { 
        totalPending, 
        totalActive, 
        totalCancelled,
        nonZeroDataPoints
      });
      
      // Calculate averages
      const pendingAvg = Math.round(totalPending / divisionFactor);
      const activeAvg = Math.round(totalActive / divisionFactor);
      const cancelledAvg = Math.round(totalCancelled / divisionFactor);
      
      return {
        pending: pendingAvg,
        active: activeAvg,
        cancelled: cancelledAvg
      };
    };
    
    // Update shared performance data
    const statusAverages = calculateStatusAverages();
    const dateRangeForKPI = {
      from: startDate,
      to: endDate
    };
    
    updatePerformanceData(
      data, 
      timeframe, 
      dateRangeForKPI, 
      '',
      statusAverages
    );
    
  }, [statusFetchKey, startDate, endDate, data, updatePerformanceData]);

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
      <div className="w-full">
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
