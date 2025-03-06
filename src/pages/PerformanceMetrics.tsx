
import React, { useState, useCallback } from 'react';
import TimeframeFilter, { TimeframeOption } from '@/components/filters/TimeframeFilter';
import InteractiveBarChart from '@/components/charts/InteractiveBarChart';
import { usePerformanceMetricsData } from '@/hooks/usePerformanceMetricsData';
import Dashboard from '@/components/layout/Dashboard';
import KPISection from '@/components/metrics/KPISection';
import { DateRange } from '@/lib/dateUtils';

const PerformanceMetrics: React.FC = () => {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('month');
  const [periodOffset, setPeriodOffset] = useState<number>(0);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(),
    to: new Date(),
  });

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
  const { data, loading, error } = usePerformanceMetricsData(timeframe, periodOffset);

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
      kpiSection={<KPISection dateRange={dateRange} />}
      subnavbar={metricsNavigation}
    >
      <div className="space-y-6 max-w-5xl mx-auto">
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
