
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
        
        // Fetch agreement status counts for this period
        const [pendingResult, activeResult, cancelledResult] = await Promise.all([
          supabase
            .from('agreements')
            .select('*', { count: 'exact' })
            .eq('AgreementStatus', 'PENDING')
            .gte('EffectiveDate', fromDate)
            .lte('EffectiveDate', toDate),
          
          supabase
            .from('agreements')
            .select('*', { count: 'exact' })
            .eq('AgreementStatus', 'ACTIVE')
            .gte('EffectiveDate', fromDate)
            .lte('EffectiveDate', toDate),
          
          supabase
            .from('agreements')
            .select('*', { count: 'exact' })
            .eq('AgreementStatus', 'CANCELLED')
            .gte('EffectiveDate', fromDate)
            .lte('EffectiveDate', toDate)
        ]);
        
        // Get counts from results
        const pendingCount = pendingResult.count || 0;
        const activeCount = activeResult.count || 0; 
        const cancelledCount = cancelledResult.count || 0;

        // Calculate division factor based on timeframe
        let divisionFactor = 1;
        switch (timeframe) {
          case 'week':
            divisionFactor = 7; // Days in a week
            break;
          case 'month':
            // Approximate days in a month
            divisionFactor = 30;
            break;
          case '6months':
            divisionFactor = 6; // Number of months
            break;
          case 'year':
            divisionFactor = 12; // Months in a year
            break;
        }
        
        // Calculate averages
        const pendingAvg = Math.round(pendingCount / divisionFactor);
        const activeAvg = Math.round(activeCount / divisionFactor);
        const cancelledAvg = Math.round(cancelledCount / divisionFactor);
        
        // Update shared state
        updatePerformanceData(data, timeframe, {
          pending: pendingAvg,
          active: activeAvg,
          cancelled: cancelledAvg
        });
        
      } catch (e) {
        console.error("Error fetching status averages:", e);
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
